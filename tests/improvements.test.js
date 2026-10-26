import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal, normalizePart } from '../src/domain/disposal/rules.js';
import { searchItemNames, suggestItemInfo } from '../src/domain/disposal/item-suggestions.js';
import { filterDisposalHistory, categoryOf } from '../src/domain/disposal/statistics.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { createMemberTools } from '../src/services/member-tools.js';
import { fetchWithTimeout } from '../src/utils/network.js';
import { localHistoryRepository, saveDisposalRecord, getAllDisposalHistory } from '../src/services/disposal-history.js';

test('음식물류: 부드러운 품목·단단한 수거 제외 품목·이물질 미분리를 구분한다', () => {
  const input = { itemName: '사과껍질', material: '음식물류', type: 'soft', foodSeparated: 'yes' };
  const result = judgeDisposal(input);
  assert.equal(result.status, 'recycle');
  assert.equal(categoryOf({ input, result }), 'food');
  assert.equal(judgeDisposal({ ...input, foodSeparated: 'no' }).status, 'check');
  assert.equal(judgeDisposal({ ...input, foodSeparated: '' }).status, 'check');
  for (const itemName of ['닭뼈', '계란껍질', '조개껍데기', '복숭아씨']) {
    assert.equal(judgeDisposal({ itemName, material: '음식물류', type: 'excluded' }).status, 'general');
    assert.equal(judgeDisposal({ itemName, material: '음식물류', type: 'soft', foodSeparated: 'yes' }).status, 'check');
  }
  assert.equal(judgeDisposal({ ...input, itemName: '모르는열매껍질' }).status, 'check');
  assert.deepEqual(normalizePart({ ...input, contaminated: 'yes', washed: 'yes' }), { material: '음식물류', type: 'soft', foodSeparated: 'yes' });
  assert.match(resultToText(input, result), /1\./);
  assert.match(resultToText(input, result), /거주지/);
});

test('등록된 유사 명칭만 연결하며 부분 이름으로 재질을 확정하지 않는다', () => {
  assert.equal(suggestItemInfo('택배 박스').type, 'paper');
  assert.equal(suggestItemInfo('PET병').material, '페트병');
  assert.ok(searchItemNames('박스').includes('택배박스'));
  assert.equal(suggestItemInfo('나의 종이 박스'), null);
});

test('기록 필터는 한국 날짜 경계·유형·정렬을 적용하고 원본을 바꾸지 않는다', () => {
  const make = (id, date, status = 'recycle') => ({ id, itemName: `물품${id}`, createdAt: date, input: { material: '종이', type: 'paper' }, result: { status } });
  const records = [make('a', '2026-10-25T14:59:59Z'), make('b', '2026-10-25T15:00:00Z'), make('c', '2026-10-26T14:59:59Z', 'general'), { id: 'legacy', itemName: '물품', legacy: true }];
  assert.deepEqual(filterDisposalHistory(records, { from: '2026-10-26', to: '2026-10-26' }).map(row => row.id), ['c', 'b']);
  assert.deepEqual(filterDisposalHistory(records, { category: 'general' }).map(row => row.id), ['c']);
  assert.deepEqual(filterDisposalHistory(records, { sort: 'oldest' }).map(row => row.id), ['a', 'b', 'c', 'legacy']);
  assert.equal(records[0].id, 'a');
});

test('비회원 즐겨찾기는 기존 기록을 건드리지 않고 저장·해제하며 제보는 로그인이 필요하다', async () => {
  const values = new Map([['existing-records', 'keep']]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const tools = createMemberTools({ getMember: () => null, isReady: () => true });
  const input = { itemName: '우유팩', material: '종이', type: 'carton' };
  try {
    await tools.setFavorite(input, true); await tools.setFavorite(input, true);
    assert.equal((await tools.listFavorites()).length, 1);
    assert.equal((await tools.listFavorites())[0].input.type, 'carton');
    await tools.setFavorite(input, false); assert.deepEqual(await tools.listFavorites(), []);
    assert.equal(values.get('existing-records'), 'keep');
    await assert.rejects(tools.submitFeedback({ kind: 'missing_item', input, message: '새로운 품목 안내가 필요합니다.' }), /로그인/);
  } finally { delete globalThis.localStorage; }
});

test('회원 편의 기능은 계정 전환·인증 확인 실패·잘못된 제보를 거절한다', async () => {
  let member = { id: 'owner' };
  const tools = createMemberTools({ isReady: () => true, getMember: () => member, getClient: async () => { member = null; return {}; } });
  await assert.rejects(tools.listFavorites(), /계정이 변경/);
  const blocked = createMemberTools({ isReady: () => false });
  await assert.rejects(blocked.listFavorites(), /로그인 상태/);
  const invalid = createMemberTools({ isReady: () => true, getMember: () => ({ id: 'owner' }) });
  await assert.rejects(invalid.submitFeedback({ kind: 'approved', input: { itemName: '용기' }, message: '짧음' }), /제보 종류/);
});

test('네트워크가 응답하지 않으면 요청을 중단하고 호출자의 취소도 전달한다', async () => {
  const pendingFetch = (_resource, { signal }) => new Promise((_resolve, reject) => {
    const abort = () => reject(new Error('aborted'));
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
  await assert.rejects(fetchWithTimeout('/test', {}, 5, pendingFetch), /aborted/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchWithTimeout('/test', { signal: controller.signal }, 5, pendingFetch), /aborted/);
});

test('같은 탭에서 동시에 저장해도 비회원 기록을 덮어쓰지 않는다', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    const input = { itemName: '우유팩', material: '종이', type: 'carton', contaminated: 'no', combined: 'no' };
    await Promise.all(Array.from({ length: 20 }, () => saveDisposalRecord(input, judgeDisposal(input), localHistoryRepository)));
    assert.equal((await getAllDisposalHistory(localHistoryRepository)).length, 20);
  } finally { delete globalThis.localStorage; }
});

test('회원 즐겨찾기와 제보 요청은 본인 ID·검토 대기 상태만 전달한다', async () => {
  const calls = [], input = { itemName: '우유팩', material: '종이', type: 'carton' };
  const client = { from(table) {
    const query = { upsert(value, options) { calls.push({ table, value, options }); return Promise.resolve({ data: null, error: null }); },
      insert(value) { calls.push({ table, value }); return query; }, select() { return query; },
      async single() { return { data: { id: 'report-id', status: 'pending' }, error: null }; } };
    return query;
  } };
  const tools = createMemberTools({ getMember: () => ({ id: 'owner' }), isReady: () => true, getClient: async () => client });
  await tools.setFavorite(input, true);
  const response = await tools.submitFeedback({ kind: 'correction', input, message: '실제 지역 안내와 달라서 확인을 요청합니다.' });
  assert.equal(calls[0].value.user_id, 'owner'); assert.equal(calls[0].options.onConflict, 'user_id,item_key');
  assert.equal(calls[1].table, 'disposal_feedback'); assert.equal(calls[1].value.status, 'pending');
  assert.equal(response.status, 'pending');
  assert.equal(calls.some(call => call.table === 'disposal_items'), false);
});
