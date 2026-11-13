import test from 'node:test';
import assert from 'node:assert/strict';
import { describedReceiptName, disposalItemList, disposalQueryName, explicitDescriptionItemName, itemMatchLabel, relatedItemCandidates, suggestItemInfo, searchItemNames, lookupItem } from '../src/domain/disposal/item-suggestions.js';

test('명확한 품목은 재질과 종류를 채우되 상태를 추정하지 않는다', () => {
  const carton = suggestItemInfo(' 우유 팩 ');
  assert.equal(carton.material, '종이'); assert.equal(carton.type, 'carton');
  assert.equal(carton.contaminated, undefined); assert.equal(carton.combined, undefined);
  assert.equal(suggestItemInfo('두유팩').type, 'carton');
  assert.equal(suggestItemInfo('참치캔').type, 'food-can');
  assert.equal(suggestItemInfo('과자봉지').material, '비닐');
});

test('영수증은 감열지와 일반 인쇄용지를 후보로 묻고 일반 명칭이나 오타로 자동 확정하지 않는다', () => {
  for (const term of ['영수증', '마트 영수증', '영수증은 어디에 버려요?', '영수증어디버려', '영수즹', '영슈증']) {
    assert.deepEqual(searchItemNames(term), ['감열영수증', '일반종이영수증']);
    assert.deepEqual(relatedItemCandidates(term), ['감열영수증', '일반종이영수증']);
    assert.equal(suggestItemInfo(term), null);
  }
  assert.equal(describedReceiptName('감열지에 출력한 영수증이에요.'), '감열영수증');
  assert.equal(describedReceiptName('코팅 없는 일반 인쇄용지에 출력한 영수증이에요.'), '일반종이영수증');
  assert.equal(describedReceiptName('감열지인지 모르는 영수증이에요.'), '');
});

test('짧은 질문과 한 글자 오타는 후보를 내되 정확한 품목 조회와 분리한다', () => {
  assert.equal(relatedItemCandidates('우유퍽')[0], '우유팩');
  assert.equal(relatedItemCandidates('우유팩은 어디에 버려요?')[0], '우유팩');
  assert.equal(lookupItem('우유퍽'), null);
  assert.equal(lookupItem('우유팩은 어디에 버려요?'), null);
  assert.equal(relatedItemCandidates('배송 라벨')[0], '택배송장');
  assert.equal(lookupItem('택배 송장')?.type, 'excluded');
  assert.equal(disposalQueryName(' 우유 팩은 어디에 버려요? '), '우유 팩');
  assert.equal(disposalQueryName('우유팩 모양 장난감은 어디에 버려요?'), '우유팩 모양 장난감');
  assert.equal(relatedItemCandidates('부조배터리')[0], '보조배터리');
  assert.equal(lookupItem('부조배터리'), null);
});

test('생활어로 연결한 물건은 분리하고 사전에 등록된 본체와 부속품 이름은 유지한다', () => {
  assert.deepEqual(disposalItemList('건전지랑 우유팩은 어떻게 버려요?'), ['건전지', '우유팩']);
  assert.deepEqual(disposalItemList('생수병과 우유팩'), ['생수병', '우유팩']);
  assert.deepEqual(disposalItemList('생수병과우유팩'), ['생수병', '우유팩']);
  assert.deepEqual(disposalItemList('과자봉지랑 우유팩'), ['과자봉지', '우유팩']);
  assert.deepEqual(disposalItemList('종이컵과 플라스틱 뚜껑'), []);
  assert.deepEqual(disposalItemList('본체는 PP, 라벨은 비닐'), ['본체는 PP', '라벨은 비닐']);
});

test('재질을 모르는 흔한 이름에서 물건 자체를 장식이 붙은 다른 물건보다 먼저 제안한다', () => {
  assert.equal(relatedItemCandidates('뚜껑')[0], '플라스틱용기뚜껑');
  assert.equal(relatedItemCandidates('생수병 뚜껑')[0], '플라스틱용기뚜껑');
  assert.equal(lookupItem('생수병 뚜껑'), null);
  assert.deepEqual(relatedItemCandidates('컵'), ['종이컵', '플라스틱컵', '유리컵', '도자기컵']);
  assert.deepEqual(relatedItemCandidates('택배 아이스팩'), ['물아이스팩', '젤아이스팩']);
  assert.equal(lookupItem('아이스팩'), null);
  assert.deepEqual(relatedItemCandidates('물티슈'), ['사용한물티슈', '비닐물티슈겉포장', '플라스틱물티슈캡']);
  assert.equal(lookupItem('물티슈 뚜껑')?.material, '플라스틱');
  assert.equal(lookupItem('사용한 물티슈')?.handling, 'wet-wipe');
  assert.equal(relatedItemCandidates('햇반 그릇')[0], '플라스틱즉석밥용기');
  assert.equal(relatedItemCandidates('샴푸 펌프')[0], '스프링이든복합재질펌프');
});

test('설명 첫 문장에 물건을 명시하면 확인한 이름만 조건 선택으로 넘긴다', () => {
  assert.equal(explicitDescriptionItemName('우유팩이에요. 안에 내용물이 남았어요.'), '우유팩');
  assert.equal(explicitDescriptionItemName('우유팩 안에 내용물이 남았어요.'), '우유팩');
  assert.equal(explicitDescriptionItemName('우유팩은 안에 내용물이 남았어요.'), '우유팩');
  assert.equal(explicitDescriptionItemName('젤 아이스팩.'), '젤 아이스팩');
  assert.equal(explicitDescriptionItemName('영수증이에요. 글씨가 잘 안 보여요.'), '영수증');
  assert.equal(explicitDescriptionItemName('건전지예요. 우유팩이에요.'), '');
  for (const text of ['우유팩인지 모르겠어요.', '깨끗한 우유팩 모양의 용기예요.', '유리병이에요, 아니고 플라스틱 같아요.', '우유팩 모양의 용기 안에 내용물이 남았어요.']) {
    assert.equal(explicitDescriptionItemName(text), '');
  }
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
  assert.equal(suggestItemInfo('도시락용기').material, '플라스틱');
  assert.ok(suggestItemInfo('도시락용기').variants['종이']);
});

test('같은 품목의 표기 차이와 배출 방법이 다른 이름을 구분한다', () => {
  assert.equal(searchItemNames('건전지 포장')[0], '건전지포장');
  assert.equal(itemMatchLabel('건전지', '건전지포장'), '비슷한 이름');
  assert.equal(itemMatchLabel('유리병', '깨진유리병'), '비슷한 이름');
  assert.equal(itemMatchLabel('깨진 유리병', '깨진유리병'), '입력한 이름');
  assert.equal(searchItemNames('ｐｅｔ병')[0], 'pet병');
  assert.equal(itemMatchLabel('ｐｅｔ병', '페트병'), '다른 표기');
  assert.deepEqual(searchItemNames('constructor'), []);
});
