import test from 'node:test';
import assert from 'node:assert/strict';
import { getDisposalHistory, getAllDisposalHistory, saveDisposalRecord, deleteDisposalRecord, clearDisposalHistory } from '../src/services/disposal-history.js';
import { saveRecentItem } from '../src/services/recent-items.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { login, logout } from '../src/services/auth.js';
import { getDisposalStatistics } from '../src/domain/disposal/statistics.js';

test('입력과 결과 보존, 같은 이름의 다른 상태, 계정 구분, v1 보존과 저장 실패', async () => {
  const stored = new Map(); const session = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  globalThis.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) };
  saveRecentItem('옛 물품');
  assert.equal((await getDisposalHistory())[0].legacy, true);
  const input = { itemName: '도시락 용기', material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no' };
  const record = await saveDisposalRecord(input, judgeDisposal(input));
  input.itemName = '수정'; assert.equal(record.input.itemName, '도시락 용기');
  const loaded = await getDisposalHistory();
  assert.deepEqual(loaded[0], record); assert.equal(loaded[1].legacy, true);
  assert.ok(stored.has('recycle-helper.recent-items.v1.guest'));
  const dirty = { ...record.input, contaminated: 'yes', washed: 'yes', removable: 'no' };
  await saveDisposalRecord(dirty, judgeDisposal(dirty));
  assert.equal((await getDisposalHistory())[0].result.status, 'general');
  assert.equal((await getDisposalHistory())[1].result.status, 'recycle');
  const reloaded = await import('../src/services/disposal-history.js?reload');
  assert.deepEqual(await reloaded.getDisposalHistory(), await getDisposalHistory());
  await login('demo@example.com', 'recycle1234'); assert.deepEqual(await getDisposalHistory(), []);
  await saveDisposalRecord(dirty, judgeDisposal(dirty)); assert.equal((await getDisposalHistory()).length, 1);
  logout(); assert.equal((await getDisposalHistory()).length, 3);
  for (let index = 0; index < 9; index++) await saveDisposalRecord(dirty, judgeDisposal(dirty));
  assert.equal((await getDisposalHistory()).length, 8);
  assert.equal((await getAllDisposalHistory()).filter(record => !record.legacy).length, 11);
  stored.set('recycle-helper.disposal-history.v2.guest', '[null, {}, {"schemaVersion":2}]');
  assert.equal((await getDisposalHistory())[0].legacy, true);
  stored.set('recycle-helper.disposal-history.v2.guest', '{broken');
  assert.equal((await getDisposalHistory())[0].legacy, true);
  localStorage.setItem = () => { throw Error('blocked'); };
  await assert.rejects(saveDisposalRecord(dirty, judgeDisposal(dirty)), /저장하지 못/);
});

test('최근 8개를 넘는 전체 기록 보관·오래된 기록 삭제·통계와 변경 알림', async () => {
  const stored = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  globalThis.sessionStorage = { getItem: () => null, removeItem: () => {} };
  logout();
  globalThis.window = new EventTarget(); let notifications = 0;
  window.addEventListener('disposal-history-changed', () => { notifications++; });
  try {
    const input = { itemName: '용기', material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no' };
    const saved = [];
    for (let index = 0; index < 12; index++) saved.push(await saveDisposalRecord({ ...input, itemName: `용기 ${index}` }, judgeDisposal(input)));
    assert.equal((await getDisposalHistory()).length, 8);
    assert.equal((await getAllDisposalHistory()).length, 12);
    const reloaded = await import('../src/services/disposal-history.js?all-records');
    assert.equal((await reloaded.getAllDisposalHistory()).length, 12);
    assert.equal(getDisposalStatistics(await getAllDisposalHistory()).total, 12);
    await deleteDisposalRecord(saved[0]);
    const remaining = await getAllDisposalHistory();
    assert.equal(remaining.length, 11); assert.ok(!remaining.some(record => record.id === saved[0].id));
    assert.equal((await getDisposalHistory()).length, 8);
    assert.equal(getDisposalStatistics(remaining).total, 11); assert.equal(notifications, 13);
    await clearDisposalHistory(); assert.equal(getDisposalStatistics(await getAllDisposalHistory()).total, 0);
    assert.equal(notifications, 14);
  } finally { delete globalThis.window; }
});

test('개별·전체 삭제는 현재 계정에만 적용하고 이전 이름 기록이 되살아나지 않는다', async () => {
  const stored = new Map(); const session = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  globalThis.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) };
  logout();
  const input = { itemName: '생수병', material: '페트병', type: 'clear-drink', contaminated: 'no', combined: 'no' };
  saveRecentItem('생수병'); saveRecentItem('옛 상자');
  const first = await saveDisposalRecord(input, judgeDisposal(input));
  const second = await saveDisposalRecord(input, judgeDisposal(input));
  await deleteDisposalRecord(second);
  assert.equal((await getDisposalHistory()).filter(record => !record.legacy).length, 1);
  assert.equal((await getDisposalHistory())[0].id, first.id);
  await deleteDisposalRecord(first);
  assert.deepEqual((await getDisposalHistory()).map(record => record.itemName), ['옛 상자']);
  const legacy = (await getDisposalHistory())[0];
  await deleteDisposalRecord(legacy); assert.deepEqual(await getDisposalHistory(), []);
  saveRecentItem('비회원 이름'); await saveDisposalRecord(input, judgeDisposal(input));
  await login('demo@example.com', 'recycle1234');
  saveRecentItem('회원 이름'); await saveDisposalRecord(input, judgeDisposal(input));
  await clearDisposalHistory(); assert.deepEqual(await getDisposalHistory(), []);
  logout(); assert.equal((await getDisposalHistory()).length, 2);
  await clearDisposalHistory(); assert.deepEqual(await getDisposalHistory(), []);
  assert.deepEqual(await (await import('../src/services/disposal-history.js?after-delete')).getDisposalHistory(), []);
  await clearDisposalHistory(); assert.deepEqual(await getDisposalHistory(), []);
});

test('두 번째 저장소의 삭제 쓰기가 실패하면 이전 기록을 복원한다', async () => {
  const stored = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  globalThis.sessionStorage = { getItem: () => null, removeItem: () => {} };
  logout(); saveRecentItem('옛 물품');
  const input = { itemName: '용기', material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no' };
  const record = await saveDisposalRecord(input, judgeDisposal(input));
  const before = await getDisposalHistory();
  localStorage.setItem = (key, value) => {
    if (key.includes('recent-items.v1')) throw Error('blocked');
    stored.set(key, value);
  };
  await assert.rejects(deleteDisposalRecord(record), /삭제하지 못/);
  assert.deepEqual(await getDisposalHistory(), before);
  await assert.rejects(clearDisposalHistory(), /삭제하지 못/);
  assert.deepEqual(await getDisposalHistory(), before);
});
