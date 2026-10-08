import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestItemInfo } from '../src/domain/disposal/item-suggestions.js';

test('명확한 품목은 재질과 종류를 채우되 상태를 추정하지 않는다', () => {
  const carton = suggestItemInfo(' 우유 팩 ');
  assert.equal(carton.material, '종이'); assert.equal(carton.type, 'carton');
  assert.equal(carton.contaminated, undefined); assert.equal(carton.combined, undefined);
  assert.equal(suggestItemInfo('두유팩').type, 'carton');
  assert.equal(suggestItemInfo('참치캔').type, 'food-can');
  assert.equal(suggestItemInfo('과자봉지').material, '비닐');
});
test('생수병의 색상과 종이컵의 코팅을 이름만으로 확정하지 않는다', () => {
  assert.equal(suggestItemInfo('생수병').material, '페트병');
  assert.equal(suggestItemInfo('생수병').type, '');
  assert.equal(suggestItemInfo('투명 생수 페트병').type, 'clear-drink');
  assert.equal(suggestItemInfo('유색페트병').type, 'other-pet');
  assert.equal(suggestItemInfo('종이컵').type, '');
  assert.equal(suggestItemInfo('유리병').type, '');
});
test('이름 부분 일치와 여러 물품은 자동 입력하지 않는다', () => {
  for (const name of ['깨진 유리병', '우유팩과 생수병', '우유팩 모양 장난감', '생수병 뚜껑', '모르는 물건', '', null]) {
    assert.equal(suggestItemInfo(name), null);
  }
});
