import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal, normalizePart, needsWashQuestion } from '../src/domain/disposal/rules.js';

const clean = { itemName: '용기', material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no' };
test('주요 7개 재질의 깨끗한 수거 대상', () => {
  for (const [material, type, method] of [
    ['플라스틱', 'container', '플라스틱류'], ['페트병', 'clear-drink', '투명 페트병'],
    ['종이', 'paper', '종이류'], ['유리', 'bottle', '유리병'], ['금속·캔', 'food-can', '금속캔'],
    ['비닐', 'packaging', '비닐류'], ['스티로폼', 'packaging', '스티로폼'],
  ]) {
    const result = judgeDisposal({ ...clean, material, type });
    assert.equal(result.status, 'recycle'); assert.ok(result.method.includes(method));
    assert.ok(result.steps.length); assert.ok(result.reasons.length);
  }
});

test('종이팩·종이컵의 오염은 자르기가 아니라 세척으로 안내한다', () => {
  for (const type of ['carton', 'cup']) {
    const input = { ...clean, material: '종이', type, contaminated: 'yes', washed: 'yes', removable: 'yes' };
    assert.equal(needsWashQuestion(input), true);
    assert.equal(normalizePart(input).washed, 'yes');
    const result = judgeDisposal(input);
    assert.equal(result.status, 'recycle');
    assert.ok(result.steps.some(step => step.includes('헹')));
    assert.ok(!result.steps.some(step => step.includes('떼어내고 깨끗한 종이')));
    assert.ok(result.reasons.some(reason => reason.includes('세척했더라도')));
  }
  assert.equal(needsWashQuestion({ material: '종이', type: 'paper' }), false);
});
test('위험 품목 안내를 결합 질문이 덮어쓰지 않고 일반 완충재는 오인하지 않는다', () => {
  const hazardous = judgeDisposal({ ...clean, itemName: '페인트 용기', combined: 'unknown' });
  assert.equal(hazardous.status, 'check');
  assert.ok(hazardous.steps.some(step => step.includes('구멍')));
  const can = judgeDisposal({ ...clean, material: '금속·캔', type: 'hazard', itemName: '용기' });
  assert.equal(can.status, 'check'); assert.ok(can.steps.some(step => step.includes('구멍')));
  assert.equal(judgeDisposal({ ...clean, itemName: '전자제품 포장 완충재', material: '스티로폼', type: 'packaging' }).status, 'recycle');
  const combined = judgeDisposal({ ...clean, material: '종이', type: 'carton', combined: 'yes', separable: 'no' });
  assert.equal(combined.status, 'check');
  assert.ok(!combined.steps.some(step => step.includes('수거함에 넣')));
});
test('이름과 선택한 종류가 충돌하는 제외 품목은 재확인을 요청한다', () => {
  for (const [itemName, material, type] of [['감열 영수증', '종이', 'paper'], ['깨진 유리병', '유리', 'bottle'],
    ['내열유리 용기', '유리', 'bottle'], ['알루미늄 호일', '금속·캔', 'food-can'], ['칫솔', '플라스틱', 'container'], ['식용유 페트병', '페트병', 'clear-drink']]) {
    assert.equal(judgeDisposal({ ...clean, itemName, material, type }).status, 'check');
  }
});
test('모든 재질이 일반 배출이면 재활용 혼합 안내로 표시하지 않는다', () => {
  const result = judgeDisposal({ ...clean, contaminated: 'yes', washed: 'no', removable: 'no', combined: 'yes', separable: 'yes',
    components: [{ material: '종이', type: 'coated' }] });
  assert.equal(result.status, 'general');
  assert.match(result.method, /모두 종량제봉투/);
  assert.ok(result.parts.every(part => part.status === 'general'));
});
test('같은 물건도 남은 오염과 제거 가능 여부에 따라 달라진다', () => {
  const dirty = { ...clean, contaminated: 'yes', washed: 'yes' };
  assert.equal(judgeDisposal({ ...dirty, removable: 'no' }).status, 'general');
  const removable = judgeDisposal({ ...dirty, removable: 'yes' });
  assert.equal(removable.status, 'recycle'); assert.match(removable.method, /오염 제거 후/);
  assert.ok(removable.reasons.some(reason => reason.includes('세척했더라도')));
  assert.equal(judgeDisposal({ ...dirty, removable: 'unknown' }).status, 'check');
  assert.equal(judgeDisposal({ ...clean, contaminated: 'unknown' }).status, 'check');
});
test('페트 용도와 종이 종류를 구분한다', () => {
  assert.match(judgeDisposal({ ...clean, material: '페트병', type: 'other-pet' }).method, /플라스틱류/);
  assert.match(judgeDisposal({ ...clean, material: '종이', type: 'carton' }).method, /종이팩/);
  assert.equal(judgeDisposal({ ...clean, material: '종이', type: 'coated' }).status, 'general');
  const paper = judgeDisposal({ ...clean, material: '종이', type: 'paper', contaminated: 'yes', removable: 'yes' });
  assert.match(paper.steps[0], /오염된 부분/);
});
test('분리 가능한 복합 물품은 부속품의 오염도 따로 판단한다', () => {
  const input = { ...clean, combined: 'yes', separable: 'yes', components: [
    { material: '비닐', type: 'packaging', contaminated: 'no' },
    { material: '종이', type: 'paper', contaminated: 'yes', removable: 'no' },
  ] };
  const result = judgeDisposal(input);
  assert.equal(result.status, 'mixed'); assert.equal(result.parts.length, 3);
  assert.equal(result.parts[0].status, 'recycle'); assert.equal(result.parts[1].status, 'recycle'); assert.equal(result.parts[2].status, 'general');
  assert.equal(judgeDisposal({ ...input, components: [{ material: '모르겠어요' }] }).status, 'check');
  assert.equal(judgeDisposal({ ...input, components: [] }).status, 'check');
});
test('불명확한 정보·특수 품목은 확정하지 않는다', () => {
  for (const input of [{}, { ...clean, combined: 'unknown' }, { ...clean, combined: 'yes', separable: 'no' },
    { ...clean, material: '유리', type: 'broken' }, { ...clean, material: '금속·캔', type: 'hazard' },
    { ...clean, itemName: '부탄가스 용기' }, { ...clean, material: '기타' }, { ...clean, type: 'unknown' }]) {
    assert.equal(judgeDisposal(input).status, 'check');
  }
});
test('숨겨진 이전 세척·오염 답변은 판별에 사용하지 않는다', () => {
  const part = normalizePart({ ...clean, washed: 'yes', removable: 'no' });
  assert.equal(part.washed, undefined); assert.equal(part.removable, undefined);
  assert.equal(judgeDisposal({ ...clean, washed: 'yes', removable: 'no', separable: 'no' }).status, 'recycle');
});
