import test from 'node:test';
import assert from 'node:assert/strict';
import { RECYCLE_MARKS, markById } from '../src/domain/disposal/recycle-marks.js';
import { MATERIALS, TYPES, judgeDisposal } from '../src/domain/disposal/rules.js';

test('분리배출 표시 버튼은 실제 재질·세부 종류로 이어진다', () => {
  assert.equal(new Set(RECYCLE_MARKS.map(mark => mark.id)).size, RECYCLE_MARKS.length);
  for (const mark of RECYCLE_MARKS) {
    assert.ok(MATERIALS.includes(mark.material), mark.id);
    assert.ok(TYPES[mark.material].some(([type]) => type === mark.type), mark.id);
  }
  assert.equal(markById('carton').type, 'carton'); assert.equal(markById('없음'), null);
});

test('표시로 고른 미등록 물건도 상태를 답하면 재질 기준으로 안내한다', () => {
  const mark = markById('clear-pet');
  const result = judgeDisposal({ itemName: '줄무늬생수병X', category: 'packaging', material: mark.material, type: mark.type, contaminated: 'no', combined: 'no' });
  assert.equal(result.status, 'recycle');
});
