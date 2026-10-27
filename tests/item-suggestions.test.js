import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestItemInfo, searchItemNames, lookupItem } from '../src/domain/disposal/item-suggestions.js';

test('명확한 품목은 재질과 종류를 채우되 상태를 추정하지 않는다', () => {
  const carton = suggestItemInfo(' 우유 팩 ');
  assert.equal(carton.material, '종이'); assert.equal(carton.type, 'carton');
  assert.equal(carton.contaminated, undefined); assert.equal(carton.combined, undefined);
  assert.equal(suggestItemInfo('두유팩').type, 'carton');
  assert.equal(suggestItemInfo('참치캔').type, 'food-can');
  assert.equal(suggestItemInfo('과자봉지').material, '비닐');
});
test('생수병은 수정 가능한 대표 구성을 제공하며 모호한 종이컵은 종류 확인을 유지한다', () => {
  assert.equal(suggestItemInfo('생수병').material, '페트병');
  assert.equal(suggestItemInfo('생수병').type, 'clear-drink');
  assert.equal(lookupItem('생수병').type, ''); // 판별 시 다른 실제 종류로 수정할 수 있음
  assert.match(suggestItemInfo('생수병').note, /유색.*수정/);
  assert.equal(suggestItemInfo('투명 생수 페트병').type, 'clear-drink');
  assert.equal(suggestItemInfo('유색페트병').type, 'other-pet');
  assert.equal(suggestItemInfo('종이컵').type, '');
  assert.equal(suggestItemInfo('유리병').type, '');
});
test('이름 부분 일치와 여러 물품은 자동 입력하지 않는다', () => {
  for (const name of ['우유팩과 생수병', '우유팩 모양 장난감', '생수병 뚜껑', '모르는 물건', '', null]) {
    assert.equal(suggestItemInfo(name), null);
  }
});

test('부분 이름 추천은 재질 자동 입력과 분리하며 개수를 제한한다', () => {
  assert.ok(searchItemNames('우유').includes('우유팩'));
  assert.ok(searchItemNames(' 생 수 ').includes('생수병'));
  assert.ok(searchItemNames('캔').includes('참치캔'));
  assert.ok(searchItemNames('팩').includes('우유팩'));
  assert.equal(suggestItemInfo('우유'), null);
  assert.equal(searchItemNames('병', 2).length, 2);
  for (const query of ['', '   ', null, 42, '<script>', '우유팩과생수병', '없는물품']) assert.deepEqual(searchItemNames(query), []);
  assert.deepEqual(searchItemNames('병', -1), []);
  assert.equal(new Set(searchItemNames('병', 10)).size, searchItemNames('병', 10).length);
});

test('정확한 예외 품목은 안전한 세부 종류를 채우고 모호한 이름은 재질을 추정하지 않는다', () => {
  assert.equal(suggestItemInfo('깨진 유리병').type, 'broken');
  assert.equal(suggestItemInfo('감열영수증').type, 'excluded');
  assert.equal(suggestItemInfo('칫솔').type, 'other');
  assert.ok(lookupItem('도시락 용기'));
  assert.equal(suggestItemInfo('도시락용기'), null);
});
