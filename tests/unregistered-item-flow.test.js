import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestedItemCategory, validateAiGuess } from '../src/domain/disposal/ai-classification.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { searchItemNames } from '../src/domain/disposal/item-suggestions.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { itemInputPage, resultMarkup } from '../src/pages/item-input/item-input.js';
import { requestAiGuess } from '../src/services/ai-classify.js';

test('나무젓가락과 다른 표기는 질문 없이 종량제 안내와 함께 쓰는 물건을 제공한다', () => {
  const region = { province: '서울특별시', district: '노원구' };
  for (const itemName of ['나무 젓가락', '일회용 나무젓가락', '대나무젓가락']) {
    assert.ok(searchItemNames(itemName).length);
    const input = { ...itemPresetInput(itemName), region };
    const result = judgeDisposal(input);
    assert.equal(result.status, 'general');
    assert.match(result.method, /일반 종량제봉투/);
    assert.equal(result.checkedAt, '2026-11-12');
    assert.ok(result.sourceUrls.includes('https://clean.yongsan.go.kr/resources/images/user/recycleExhaust.pdf'));
    const markup = resultMarkup(input, result);
    assert.match(markup, /data-related-item="플라스틱 숟가락"/);
    assert.match(markup, /data-related-item="배달 용기"/);
    assert.doesNotMatch(markup, /data-related-item="나무젓가락"/);
  }
  assert.notEqual(judgeDisposal({ itemName: '스테인리스젓가락' }).handling, 'wood-chopsticks');
  assert.notEqual(judgeDisposal({ itemName: '일회용숟가락' }).status, 'general');
});

test('미등록 화면은 긴 분류 목록 대신 AI와 재질 확인을 제공한다', () => {
  const markup = itemInputPage();
  assert.doesNotMatch(markup, /<select[^>]+name="category"/);
  assert.match(markup, /AI로 종류 찾기/);
  assert.match(markup, /이 종류가 맞아요/);
  assert.match(markup, /data-category-choice="material-only"/);
  assert.match(markup, /data-category-choice="unknown"/);
  const materialOnly = judgeDisposal({ itemName: '처음 보는 복합 물건', category: 'material-only', material: '플라스틱' });
  assert.equal(materialOnly.status, 'check');
  assert.match(materialOnly.steps.join(' '), /재질\(플라스틱\).*수거 경로/);
});

test('일회용 숟가락은 재질을 확인하고 플라스틱 숟가락은 오염에 따라 안내한다', () => {
  const page = itemInputPage();
  assert.match(page, /data-item-variant="플라스틱 숟가락"/);
  assert.match(page, /data-item-variant="나무 숟가락"/);
  assert.equal(judgeDisposal(itemPresetInput('나무 숟가락')).status, 'general');
  const spoon = { ...itemPresetInput('플라스틱 숟가락'), combined: 'no', region: { province: '서울특별시', district: '노원구' } };
  assert.equal(spoon.type, 'utensil');
  assert.equal(judgeDisposal(spoon).status, 'check');
  const clean = judgeDisposal({ ...spoon, contaminated: 'no' });
  assert.equal(clean.status, 'recycle');
  assert.match(clean.method, /지역 수거 확인/);
  assert.equal(clean.regional.coverage, 'unverified', '일반 플라스틱 용기 지역 안내를 숟가락에 적용하지 않는다');
  assert.ok(clean.sourceUrls.includes('https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=416'));
  assert.equal(judgeDisposal({ ...spoon, contaminated: 'yes', washed: 'yes', removable: 'no' }).status, 'general');
});

test('AI가 확인하지 못한 용도를 포장재나 전용 수거 품목으로 제안하지 않는다', () => {
  const base = { itemName: '브랜드 부속품', confidence: 'high', route: 'recyclable', material: '플라스틱', type: 'container' };
  const suggest = extra => suggestedItemCategory(validateAiGuess({ ...base, ...extra }));
  assert.equal(suggest({ category: 'packaging' }), 'packaging');
  assert.equal(suggest({ category: 'unknown' }), '');
  assert.equal(suggest({ type: 'other' }), '');
  assert.equal(suggest({ category: 'packaging', confidence: 'low' }), '');
  assert.equal(suggest({ category: 'medicine', route: 'general' }), '');
  assert.equal(suggest({ category: 'battery', route: 'hazardous' }), 'battery');
  assert.equal(suggest({ category: 'food', route: 'hazardous', material: '음식물류', type: 'soft' }), '');
});

test('종류 알아보기 요청이 모의 AI 분류를 받아도 사용자 조건 전에는 재활용을 확정하지 않는다', async () => {
  const itemName = '제품 전용 작은 포장통';
  const guess = await requestAiGuess(itemName, async url => {
    assert.match(url, /[?&]mode=identify(?:&|$)/);
    return { ok: true, json: async () => ({ guess: { itemName, route: 'recyclable', material: '플라스틱',
      type: 'container', confidence: 'high', category: 'packaging' } }) };
  }, { identify: true });
  assert.equal(suggestedItemCategory(guess), 'packaging');
  const confirmed = { itemName, category: guess.category, material: guess.material, type: guess.type };
  assert.equal(judgeDisposal(confirmed).status, 'check');
  assert.equal(judgeDisposal({ ...confirmed, contaminated: 'no', combined: 'no' }).status, 'recycle');
});
