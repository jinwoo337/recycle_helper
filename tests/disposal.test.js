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

test('정확한 이름과 재질·종류의 충돌은 전체와 재질별 안내 모두 보류한다', () => {
  for (const [itemName, material, type] of [
    ['우유팩', '플라스틱', 'container'], ['우유팩', '종이', 'paper'],
    ['참치캔', '유리', 'bottle'], ['과자봉지', '종이', 'paper'], ['종이컵', '종이', 'paper'],
    ['투명생수병', '페트병', 'other-pet'], ['신문지', '종이', 'carton'], ['칫솔', '종이', 'paper'],
  ]) {
    const result = judgeDisposal({ ...clean, itemName, material, type, combined: 'yes', separable: 'yes',
      components: [{ material: '비닐', type: 'packaging', contaminated: 'no' }] });
    assert.equal(result.status, 'check', itemName);
    assert.ok(result.parts.every(part => part.status === 'check'));
    assert.ok(result.reasons.some(reason => reason.includes('맞지')));
  }
});

test('다양한 실제 물품 이름의 정상·예외 안내', () => {
  for (const [itemName, material, type, expected] of [
    ['우유팩', '종이', 'carton', 'recycle'], ['멸균우유팩', '종이', 'carton', 'recycle'],
    ['생수병', '페트병', 'clear-drink', 'recycle'], ['생수병', '페트병', 'other-pet', 'recycle'],
    ['세제페트병', '페트병', 'other-pet', 'recycle'], ['종이컵', '종이', 'cup', 'recycle'],
    ['신문지', '종이', 'paper', 'recycle'], ['유리병', '유리', 'bottle', 'recycle'],
    ['참치캔', '금속·캔', 'food-can', 'recycle'], ['과자봉지', '비닐', 'packaging', 'recycle'],
    ['스티로폼상자', '스티로폼', 'packaging', 'recycle'], ['플라스틱도시락용기', '플라스틱', 'container', 'recycle'],
    ['감열영수증', '종이', 'excluded', 'general'], ['양면코팅종이컵', '종이', 'coated', 'general'],
    ['깨진유리병', '유리', 'broken', 'check'], ['내열유리용기', '유리', 'special', 'check'],
    ['칫솔', '플라스틱', 'other', 'check'], ['고무장갑', '비닐', 'other', 'check'],
  ]) assert.equal(judgeDisposal({ ...clean, itemName, material, type }).status, expected, itemName);
});

test('미등록·부분 이름·복수 물품은 선택한 재질만으로 확정하지 않는다', () => {
  for (const itemName of ['정체불명제품', '우유', '우유팩 모양 장난감', '우유팩과 생수병', '생수병 뚜껑', '', 42, null]) {
    const result = judgeDisposal({ ...clean, itemName });
    assert.equal(result.status, 'check', String(itemName));
    assert.ok(result.parts.every(part => part.status === 'check'));
  }
  for (const invalid of [null, 42, [], '용기']) assert.equal(judgeDisposal(invalid).status, 'check');
  assert.deepEqual(normalizePart(null), { material: '', type: '' });
});

test('띄어 쓴 위험 품목과 복합 전자제품은 부속품도 임의 수거 안내하지 않는다', () => {
  for (const itemName of ['보조 배터리', '부 탄 가 스 용기', '전자 담배', '블루투스 이어폰', '멀티 탭', '충전기']) {
    const result = judgeDisposal({ ...clean, itemName, combined: 'yes', separable: 'yes',
      components: [{ material: '플라스틱', type: 'container', contaminated: 'no' }] });
    assert.equal(result.status, 'check');
    assert.ok(result.steps.some(step => step.includes('임의')));
    assert.ok(result.parts.every(part => part.status === 'check'));
  }
  const result = judgeDisposal({ ...clean, combined: 'yes', separable: 'yes', components: [null] });
  assert.equal(result.status, 'check'); assert.equal(result.parts[1].status, 'check');
});

test('주요 재질의 오염·세척·결합 조건 7680개 조합 검증', () => {
  const supported = [['플라스틱', 'container'], ['페트병', 'clear-drink'], ['페트병', 'other-pet'],
    ['종이', 'paper'], ['종이', 'carton'], ['종이', 'cup'], ['유리', 'bottle'], ['금속·캔', 'food-can'], ['비닐', 'packaging'], ['스티로폼', 'packaging']];
  let count = 0;
  for (const [material, type] of supported)
    for (const contaminated of ['yes', 'no', 'unknown', ''])
      for (const removable of ['yes', 'no', 'unknown', ''])
        for (const washed of ['yes', 'no', ''])
          for (const combined of ['yes', 'no', 'unknown', ''])
            for (const separable of ['yes', 'no', 'unknown', '']) {
              const input = { ...clean, material, type, contaminated, removable, washed, combined, separable,
                components: [{ material: '비닐', type: 'packaging', contaminated: 'no' }] };
              const result = judgeDisposal(input);
              const missing = !['yes', 'no'].includes(contaminated)
                || (contaminated === 'yes' && (!['yes', 'no'].includes(removable) || (needsWashQuestion(input) && !['yes', 'no'].includes(washed))))
                || !['yes', 'no'].includes(combined) || (combined === 'yes' && separable !== 'yes');
              if (missing) assert.equal(result.status, 'check', JSON.stringify(input));
              else if (contaminated === 'yes' && removable === 'no') {
                assert.equal(result.status, ['유리', '금속·캔'].includes(material) ? 'check' : combined === 'yes' ? 'mixed' : 'general');
              } else assert.equal(result.status, 'recycle', JSON.stringify(input));
              assert.ok(result.steps.length && result.reasons.length && result.parts.length);
              count++;
            }
  assert.equal(count, 7680);
});
