import { databaseError, readAllPages } from './database.js';
import { statisticsFromCounts } from '../domain/disposal/statistics.js';

const fields = 'id,item_name,input,result,created_at';
const fromRow = row => ({ schemaVersion: 2, id: row.id, itemName: row.item_name,
  input: row.input, result: row.result, createdAt: row.created_at });
const toRow = (record, owner) => ({ id: record.id, user_id: owner, item_name: record.itemName,
  input: record.input, result: record.result, created_at: record.createdAt });

export function createCloudHistoryRepository(client, owner, getMember, validate) {
  let imported;
  function checkOwner() {
    if (!owner || getMember()?.id !== owner) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 시도해 주세요.');
  }
  async function request(operation, action) {
    checkOwner();
    const { data, error } = await operation();
    checkOwner();
    if (error) throw databaseError(error, action);
    return data;
  }
  async function importLocal() {
    checkOwner();
    function stored(key, valid) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(data) ? data.filter(valid) : [];
      } catch { return []; }
    }
    const records = stored(`recycle-helper.disposal-history.v2.${owner}`, record => validate(record) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id) && record.itemName.trim().length > 0 && record.itemName.length <= 80);
    const names = stored(`recycle-helper.recent-items.v1.${owner}`, name => typeof name === 'string' && name.trim() && name.length <= 80);
    if (!records.length && !names.length) return;
    // 서버의 import receipts가 재시도·다른 탭·삭제 후 재접속 시 중복 및 복원을 막습니다.
    await request(() => client.rpc('import_disposal_history', { p_owner: owner,
      p_records: records.map(record => toRow(record, owner)), p_names: [...new Set(names)] }), '기존 기록을 이전');
  }
  async function ready() {
    if (!imported) imported = importLocal().catch(error => { imported = undefined; throw error; });
    await imported;
    checkOwner();
  }
  return {
    cloud: true,
    async list() {
      await ready();
      const records = [];
      let cursor;
      for (;;) {
        checkOwner();
        let query = client.from('disposal_records').select(fields).eq('user_id', owner)
          .order('created_at', { ascending: false }).order('id', { ascending: false });
        if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
        const { data, error } = await query.range(0, 199);
        checkOwner();
        if (error) throw databaseError(error, '기록을 불러오');
        if (!Array.isArray(data) || !data.every(row => validate(fromRow(row)))) throw new Error('저장된 기록의 형식을 확인하지 못했어요.');
        if (data.length && cursor && data.at(-1).id === cursor.id) throw new Error('기록 페이지를 불러오지 못했어요. 다시 시도해 주세요.');
        records.push(...data);
        if (data.length < 200) break;
        cursor = data.at(-1);
      }
      const legacy = await readAllPages(() => client.from('disposal_legacy_names')
        .select('item_name').eq('user_id', owner).order('item_name'));
      checkOwner();
      const mapped = records.map(fromRow);
      if (!mapped.every(validate)) throw new Error('저장된 기록의 형식을 확인하지 못했어요.');
      const names = new Set(mapped.map(record => record.itemName));
      return [...mapped, ...legacy.filter(row => !names.has(row.item_name)).map(row => ({
        id: `legacy-${encodeURIComponent(row.item_name)}`, itemName: row.item_name, legacy: true,
      }))];
    },
    async save(record) {
      await ready();
      if (!validate(record)) throw new Error('판별 기록의 형식을 확인해 주세요.');
      const row = await request(() => client.from('disposal_records').insert(toRow(record, owner))
        .select(fields).single(), '판별 결과를 저장');
      return fromRow(row);
    },
    async remove(record) {
      await ready();
      await request(() => client.rpc('delete_disposal_history', { p_owner: owner,
        p_id: record.legacy ? null : record.id, p_legacy_name: record.legacy ? record.itemName : null }), '기록을 삭제');
    },
    async clear() {
      await ready();
      await request(() => client.rpc('clear_disposal_history', { p_owner: owner }), '전체 기록을 삭제');
    },
    async statistics() {
      await ready();
      const data = await request(() => client.rpc('get_disposal_statistics', { p_owner: owner }), '통계를 불러오');
      return statisticsFromCounts(data.counts, Number(data.legacy_count || 0));
    },
  };
}
