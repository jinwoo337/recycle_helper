import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSingleMaterialInput } from '../src/domain/disposal/input-shortcuts.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

test('깨끗한 단일 재질 바로가기: 명시한 상태만 설정하고 이전 오염·부속품 답변을 제거한다', () => {
  const input = { itemName:'우유팩',material:'종이',type:'carton',contaminated:'yes',washed:'yes',removable:'no',combined:'yes',separable:'yes',components:[{material:'금속·캔',type:'hazard'}],region:{province:'대전광역시',district:'유성구'} };
  const original = structuredClone(input);
  const next = cleanSingleMaterialInput(input);
  assert.equal(next.contaminated,'no'); assert.equal(next.combined,'no');
  for (const key of ['washed','removable','separable','components']) assert.equal(next[key],undefined);
  assert.deepEqual(input,original); assert.deepEqual(next.region,input.region);
  assert.equal(judgeDisposal(next).status,'recycle');
  assert.equal(judgeDisposal(next).regional.coverage,'verified');
});
test('바로가기는 이름 불명·재질 충돌·세부 종류 누락·특수 품목을 건너뛰지 않는다', () => {
  for (const input of [null,{}, {itemName:'모르는물건',material:'플라스틱',type:'container'}, {itemName:'우유팩',material:'플라스틱',type:'container'}, {itemName:'생수병',material:'페트병',type:''}, {itemName:'깨진유리',material:'유리',type:'broken'}, {itemName:'양면코팅종이컵',material:'종이',type:'coated'}, {itemName:'밥',material:'음식물류',type:'soft'}]) assert.equal(cleanSingleMaterialInput(input),null);
});
test('바로가기와 같은 상태를 직접 선택한 판별은 동일하며, 오염 답변은 별도 경로를 유지한다', () => {
  for (const input of [{itemName:'과자봉지',material:'비닐',type:'packaging'},{itemName:'투명생수병',material:'페트병',type:'clear-drink'},{itemName:'종이상자',material:'종이',type:'paper'}]) {
    assert.deepEqual(judgeDisposal(cleanSingleMaterialInput(input)),judgeDisposal({...input,contaminated:'no',combined:'no'}));
  }
  const dirty = judgeDisposal({itemName:'과자봉지',material:'비닐',type:'packaging',contaminated:'yes',washed:'yes',removable:'no',combined:'no'});
  assert.equal(dirty.status,'general');
});
