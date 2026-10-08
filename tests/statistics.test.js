import test from 'node:test';
import assert from 'node:assert/strict';
import { getDisposalStatistics, searchDisposalHistory } from '../src/domain/disposal/statistics.js';
const record = (itemName, material, status = 'recycle', type = '') => ({ itemName, input: { material, type }, result: { status } });
test('유형별 합계와 비율, 추가·삭제 후 재집계', () => {
  const records = [record('플라스틱', '플라스틱'), record('생수병', '페트병', 'recycle', 'clear-drink'),
    record('세제병', '페트병', 'recycle', 'other-pet'), record('종이', '종이'), record('우유팩', '종이', 'recycle', 'carton'),
    record('유리병', '유리'), record('캔', '금속·캔'), record('비닐', '비닐'), record('스티로폼', '스티로폼'),
    record('더러운 용기', '플라스틱', 'general'), record('복합', '플라스틱', 'mixed'), record('미확인', '기타', 'check'),
    { itemName: '이전 이름', legacy: true }];
  const stats = getDisposalStatistics(records);
  assert.equal(stats.total, 12); assert.equal(stats.legacyCount, 1);
  assert.equal(stats.categories.reduce((sum, category) => sum + category.count, 0), 12);
  assert.ok(Math.abs(stats.categories.reduce((sum, category) => sum + category.ratio, 0) - 100) < 0.00001);
  assert.equal(stats.categories.find(category => category.id === 'plastic').count, 2);
  const removed = getDisposalStatistics(records.slice(1));
  assert.equal(removed.total, 11); assert.equal(removed.categories.find(category => category.id === 'plastic').count, 1);
});
test('빈 기록·반복 판별·이름 검색과 공백 처리', () => {
  assert.equal(getDisposalStatistics([]).total, 0);
  assert.ok(getDisposalStatistics([]).categories.every(category => category.ratio === 0));
  const records = [record('우유팩', '종이'), record('우유 팩', '종이'), record('PET 생수병', '페트병')];
  assert.equal(getDisposalStatistics(records).total, 3);
  assert.equal(searchDisposalHistory(records, ' 우유 팩 ').length, 2);
  assert.equal(searchDisposalHistory(records, 'pet').length, 1);
  assert.equal(searchDisposalHistory(records, '없는 이름').length, 0);
});
