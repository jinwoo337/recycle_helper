import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudHistoryRepository } from '../src/services/cloud-history.js';
import { validRecord } from '../src/services/disposal-history.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { categoryOf } from '../src/domain/disposal/statistics.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';

const owner = '11111111-1111-4111-8111-111111111111';
const input = { itemName: '우유팩', material: '종이', type: 'carton', contaminated: 'no', combined: 'no' };
const makeRecord = () => ({ schemaVersion: 2, id: crypto.randomUUID(), itemName: input.itemName,
  input: structuredClone(input), result: judgeDisposal(input), createdAt: new Date().toISOString() });
const row = record => ({ id: record.id, user_id: owner, item_name: record.itemName,
  input: record.input, result: record.result, created_at: record.createdAt });

test('클라우드: 대표 구성의 수정한 부속품 이름은 결과·저장·다시 불러오기에 보존된다', async () => {
  const db = fakeDatabase();
  const repo = createCloudHistoryRepository(db,owner,()=>({id:owner}),validRecord);
  const configured = {...itemPresetInput('두부용기'),contaminated:'no'};
  configured.components = configured.components.map(part=>({...part,label:'직접 확인한 포장 필름',contaminated:'no'}));
  const record = {...makeRecord(),itemName:configured.itemName,input:configured,result:judgeDisposal(configured)};
  assert.equal(validRecord(record),true);
  assert.equal(record.result.parts[1].label,'직접 확인한 포장 필름');
  await repo.save(record);
  const [restored] = await createCloudHistoryRepository(db,owner,()=>({id:owner}),validRecord).list();
  assert.deepEqual(restored,record);
  assert.equal(validRecord({...record,input:{...configured,components:[{...configured.components[0],label:42}]}}),false);
  assert.equal(validRecord({...record,input:{...configured,components:[{...configured.components[0],label:'가'.repeat(41)}]}}),false);
});

function fakeDatabase(initial = []) {
  const rows = structuredClone(initial), legacy = [], calls = [], receipts = new Set();
  let error = null;
  return { rows, calls, setError(value) { error = value; },
    from(table) {
      const filters = [];
      let cursor;
      let inserted;
      const query = {
        select() { return query; }, eq(key, value) { filters.push([key, value]); return query; },
        order() { return query; }, insert(value) { inserted = value; return query; },
        or(value) { const match = value.match(/created_at\.lt\.(.*?),and\(created_at\.eq\..*?,id\.lt\.(.*?)\)/); cursor = { date: match[1], id: match[2] }; return query; },
        async range(start, end) {
          calls.push({ table, filters, start, end });
          return { data: (table === 'disposal_records' ? rows : legacy)
            .filter(record => filters.every(([key, value]) => record[key] === value))
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || (b.id || '').localeCompare(a.id || ''))
            .filter(record => !cursor || record.created_at < cursor.date || (record.created_at === cursor.date && record.id < cursor.id)).slice(start, end + 1), error };
        },
        async single() { calls.push({ table, inserted }); if (!error) rows.push(structuredClone(inserted)); return { data: inserted, error }; },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (error) return { error };
      if (name === 'import_disposal_history') {
        for (const record of args.p_records) if (!receipts.has(record.id)) { receipts.add(record.id); rows.push(structuredClone(record)); }
        for (const item_name of args.p_names) if (!receipts.has(item_name)) { receipts.add(item_name); legacy.push({ user_id: args.p_owner, item_name }); }
      }
      if (name === 'get_disposal_statistics') {
        const counts = {};
        for (const record of rows.filter(record => record.user_id === args.p_owner)) {
          const category = categoryOf(record); counts[category] = (counts[category] || 0) + 1;
        }
        return { data: { counts, legacy_count: legacy.length }, error: null };
      }
      if (name === 'clear_disposal_history') { rows.splice(0); legacy.splice(0); }
      return { data: null, error: null };
    },
  };
}

test('클라우드: 입력·부속품·결과 스냅샷 저장과 새 저장소에서 복원', async () => {
  const db = fakeDatabase();
  const repository = createCloudHistoryRepository(db, owner, () => ({ id: owner }), validRecord);
  const record = makeRecord();
  assert.deepEqual(await repository.save(record), record);
  assert.deepEqual(db.rows[0], row(record));
  const restored = createCloudHistoryRepository(db, owner, () => ({ id: owner }), validRecord);
  assert.deepEqual(await restored.list(), [record]);
  const stats = await restored.statistics();
  assert.equal(stats.total, 1);
  assert.equal(stats.categories.find(category => category.id === 'carton').count, 1);
});

test('클라우드: 1,000개가 넘는 기록과 최근 8개 밖의 통계를 누락하지 않는다', async () => {
  const db = fakeDatabase(Array.from({ length: 1205 }, () => row(makeRecord())));
  db.rows.push({ ...row(makeRecord()), user_id: 'other' });
  const repository = createCloudHistoryRepository(db, owner, () => ({ id: owner }), validRecord);
  assert.equal((await repository.list()).length, 1205);
  assert.ok(db.calls.filter(call => call.table === 'disposal_records').every(call => call.filters.some(([key, value]) => key === 'user_id' && value === owner)));
  assert.equal((await repository.statistics()).total, 1205);
});

test('클라우드: DB 오류를 빈 기록이나 로컬 저장 성공으로 숨기지 않는다', async () => {
  const db = fakeDatabase();
  db.setError({ code: '42P01' });
  const repository = createCloudHistoryRepository(db, owner, () => ({ id: owner }), validRecord);
  await assert.rejects(repository.list(), /저장 서비스 설정/);
  await assert.rejects(repository.save(makeRecord()), /저장 서비스 설정/);
  assert.equal(db.rows.length, 0);
  db.setError({ code: '42501' });
  await assert.rejects(repository.statistics(), /접근 권한/);
  await assert.rejects(repository.remove(makeRecord()), /접근 권한/);
});

test('클라우드: 작업 중 계정이 바뀌면 이전 계정의 응답과 삭제를 사용하지 않는다', async () => {
  const db = fakeDatabase(); let member = { id: owner };
  const repository = createCloudHistoryRepository(db, owner, () => member, validRecord);
  member = { id: 'other' };
  await assert.rejects(repository.save(makeRecord()), /계정이 변경/);
  await assert.rejects(repository.clear(), /계정이 변경/);
  assert.equal(db.calls.length, 0);
  member = { id: owner };
  db.rpc = async () => { member = null; return { data: { counts: {}, legacy_count: 0 }, error: null }; };
  await assert.rejects(repository.statistics(), /계정이 변경/);
});

test('클라우드: 현재 회원의 이전 기록만 가져오고 서버 이전 이력을 유지한다', async () => {
  const record = makeRecord();
  const values = new Map([
    [`recycle-helper.disposal-history.v2.${owner}`, JSON.stringify([record])],
    [`recycle-helper.recent-items.v1.${owner}`, JSON.stringify(['옛물품'])],
    ['recycle-helper.disposal-history.v2.guest', JSON.stringify([makeRecord()])],
  ]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null };
  try {
    const db = fakeDatabase();
    const repository = () => createCloudHistoryRepository(db, owner, () => ({ id: owner }), validRecord);
    const loaded = await repository().list();
    assert.equal(loaded.length, 2);
    assert.deepEqual(loaded[0], record);
    assert.equal(loaded[1].legacy, true);
    await repository().clear();
    assert.deepEqual(await repository().list(), []);
    assert.ok(values.has(`recycle-helper.disposal-history.v2.${owner}`));
    assert.ok(db.calls.filter(call => call.rpc).every(call => call.args.p_owner === owner));
  } finally { delete globalThis.localStorage; }
});
