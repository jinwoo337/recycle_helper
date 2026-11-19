import test from 'node:test';
import assert from 'node:assert/strict';
import { reuseAdvice } from '../src/domain/disposal/reuse.js';
import { reuseAdviceMarkup } from '../src/components/reuse-advice.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';
import { assistanceResultMarkup } from '../src/pages/assistance/assistance.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

test('사용 가능한 의류는 재사용 방법을 바로 추천하고 청결만 확인한 물건은 상태 확인을 안내한다', () => {
  const good = { itemName: '옷', handlingCondition: 'reusable' };
  assert.equal(reuseAdvice(good).confirmed, true);
  assert.match(reuseAdviceMarkup(good), /수선|나눔/);
  assert.doesNotMatch(reuseAdviceMarkup(good), /<details>/);
  assert.match(reuseAdviceMarkup({ itemName: '종이상자', contaminated: 'no' }), /<details><summary>깨끗하고 파손 없이/);
});

test('물건 종류에 맞는 재사용 방법을 구분한다', () => {
  for (const [itemName, expected] of [['종이상자', /정리함/], ['유리병', /꽃병/], ['책', /기증/], ['머그컵', /연필/], ['옷', /수선/], ['책상', /수납 가구/]]) {
    assert.match(reuseAdvice({ itemName }).tips.join(' '), expected, itemName);
  }
  assert.equal(reuseAdvice({ itemName: '옷걸이' }), null);
});

test('오염·파손·위험 물건과 종류가 불명확한 물건에는 재사용을 권하지 않는다', () => {
  for (const input of [
    { itemName: '옷', handlingCondition: 'unusable' }, { itemName: '종이상자', contaminated: 'yes' },
    { itemName: '유리병', type: 'broken' }, { itemName: '깨진 유리병' }, { itemName: '곰팡이 핀 책' },
    { itemName: '유리병', currentState: 'washed-dirty' }, { itemName: '세제 유리병' },
    { itemName: '종이상자', category: 'medicine' }, { itemName: '건전지', handlingCondition: 'undamaged' },
    { itemName: '알 수 없는 물건' }, { itemName: '일회용 컵' },
  ]) assert.equal(reuseAdvice(input), null, JSON.stringify(input));
});

test('판별 결과·저장 결과·복사 텍스트에 기존 배출 안내와 재사용 추천을 함께 제공한다', () => {
  const input = { ...itemPresetInput('옷'), handlingCondition: 'reusable' };
  const result = judgeDisposal(input);
  for (const createdAt of [undefined, '2026-11-19T00:00:00Z']) {
    const markup = resultMarkup(input, result, createdAt);
    assert.ok(markup.includes(result.method)); assert.match(markup, /버리기 전에 재사용/);
  }
  assert.match(resultToText(input, result), /재사용[\s\S]*수선/);
  const damaged = { ...input, handlingCondition: 'unusable' };
  assert.doesNotMatch(resultMarkup(damaged, judgeDisposal(damaged)), /reuse-advice/);
});

test('사진·설명 모드도 확인된 안내에 추천을 표시하고 물건 확인 전에는 보류한다', () => {
  const input = { ...itemPresetInput('옷'), handlingCondition: 'reusable' };
  const guide = { ...judgeDisposal(input), condition: 'reusable' };
  const answer = { itemName: '옷', evidence: 'object', confidence: 'high', questions: [], markings: [], cautions: [], steps: [] };
  assert.match(assistanceResultMarkup(answer, null, { guide }), /reuse-advice/);
  assert.doesNotMatch(assistanceResultMarkup(answer, null, { guide, confirmIdentity: true }), /reuse-advice/);
  assert.doesNotMatch(assistanceResultMarkup(answer, null, { guide: null }), /reuse-advice/);
});
