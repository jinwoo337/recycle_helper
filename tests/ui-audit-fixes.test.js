import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal, normalizePart, RULE_VERSION, MATERIALS } from '../src/domain/disposal/rules.js';
import { resultForDisplay, resultPendingQuestion } from '../src/domain/disposal/result-display.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';
import { categoryAllowsMaterial } from '../src/domain/disposal/item-categories.js';
import { parseRoute, GUIDE_SECTIONS } from '../src/utils/routes.js';
import { guidePage } from '../src/pages/guide/guide.js';
import { practiceFinishMessage } from '../src/pages/game/game.js';
import { compareRegionalDisposal } from '../src/domain/disposal/regional-comparison.js';
import { comparisonPanelMarkup, comparisonHighlights } from '../src/components/regional-comparison.js';
import { localHistoryRepository, saveDisposalRecord, getAllDisposalHistory } from '../src/services/disposal-history.js';

test('이전 약·전지·미등록 AI 결과는 현재 안내로 표시·복사하고 원본은 보존한다', () => {
  for (const itemName of ['약', '건전지', '정체불명새물건']) {
    const input = { itemName, aiGuess: { itemName, route: 'hazardous', material: '기타', confidence: 'high' } };
    const saved = { ...judgeDisposal(input), ruleVersion: '2026-10-25.v7', steps: ['폐가전 1599-0903에 전자제품 수거를 요청하세요.'] };
    const before = structuredClone({input, saved});
    const current = resultForDisplay(input, saved);
    assert.equal(current.ruleVersion, RULE_VERSION);
    assert.equal(current.aiAssisted, undefined);
    assert.doesNotMatch(current.steps.join(' '), /폐가전|1599/);
    const markup = resultMarkup(input, saved, '2026-10-25T10:00:00Z');
    assert.match(markup, /현재 기준으로 다시 확인/);
    assert.doesNotMatch(markup, /1599-0903/);
    assert.doesNotMatch(resultToText(input, saved), /1599-0903/);
    assert.deepEqual({input, saved}, before);
    assert.equal(resultForDisplay(input, current), current);
  }
});

test('종류와 재질의 조합은 화면과 규칙 양쪽에서 동일하게 제한한다', () => {
  for (const category of ['packaging', 'food']) for (const material of MATERIALS) {
    const allowed = categoryAllowsMaterial(category, material);
    const result = judgeDisposal({ itemName: '분류테스트품목', category, material, type: 'soft', contaminated: 'no', foodSeparated: 'yes', combined: 'no' });
    if (!allowed) {
      assert.equal(result.status, 'check');
      assert.match(result.method, /종류와 재질/);
    }
  }
  assert.equal(categoryAllowsMaterial('packaging', '음식물류'), false);
  assert.equal(categoryAllowsMaterial('food', '플라스틱'), false);
});

const vinyl = { itemName: '과자봉지', material: '비닐', type: 'packaging', contaminated: 'yes', washed: 'yes', removable: 'no', combined: 'no', region: { province: '서울특별시', district: '강남구' } };
test('서울 비닐은 액체 자국·고형물·미확인을 구분하고 이유와 행동이 모순되지 않는다', () => {
  const oily = judgeDisposal({ ...vinyl, vinylResidue: 'liquid-only' });
  assert.equal(oily.status, 'recycle');
  assert.doesNotMatch(oily.reasons.join(' '), /재활용하기 어려워/);
  for (const vinylResidue of [undefined, 'unknown', 'solids', 'invalid']) {
    const result = judgeDisposal({ ...vinyl, vinylResidue });
    assert.equal(result.status, 'check');
    assert.doesNotMatch(result.reasons.join(' '), /재활용하기 어려워/);
    assert.deepEqual(result.parts[0].reasons, result.reasons.slice(0, -1));
  }
  const solid = judgeDisposal({ ...vinyl, vinylResidue: 'solids', removable: 'yes' });
  assert.equal(solid.status, 'recycle'); assert.match(solid.method, /고형물 제거 후/);
  assert.equal(judgeDisposal({ ...vinyl, vinylResidue: 'liquid-only', region: { province: '대전광역시', district: '유성구' } }).status, 'general');
  assert.equal(judgeDisposal({ ...vinyl, vinylResidue: 'liquid-only', combined: 'yes', separable: 'no' }).status, 'check');
  assert.equal(judgeDisposal({ ...vinyl, itemName: '새약품용기', vinylResidue: 'liquid-only' }).status, 'check');
});

test('서울 비닐의 기름 자국만 확인되면 제거 가능 여부를 추가로 요구하지 않는다', () => {
  const input = { ...vinyl, vinylResidue: 'liquid-only', removable: '' };
  const result = judgeDisposal(input);
  assert.equal(result.status, 'recycle');
  assert.doesNotMatch(result.steps.join(' '), /이물질을 제거할 수 있는지/);
  const comparison = compareRegionalDisposal(input, result);
  assert.ok(comparison.groups.some(group => group.regions.some(region => region.district === '유성구')));
  assert.equal(judgeDisposal({ ...input, vinylResidue: 'unknown' }).pendingCondition, 'vinyl-residue');
  assert.equal(judgeDisposal({ ...input, combined: 'yes', separable: 'no' }).status, 'check');
});

test('복사 결과는 공통 준비와 부속품별 처리 단계를 빠짐없이 담고 중복하지 않는다', () => {
  const input = { itemName: '투명생수병', material: '페트병', type: 'clear-drink', contaminated: 'no', combined: 'yes', separable: 'yes',
    components: [{ label: '분리한 라벨', material: '비닐', type: 'packaging', contaminated: 'no' }] };
  const result = judgeDisposal(input);
  const text = resultToText(input, result);
  assert.match(text, /입력한 조건\n주요 재질 · 페트병/);
  assert.match(text, /분리한 라벨\n주요 재질 · 비닐/);
  assert.match(text, /먼저 할 일\n1\. 다른 재질/);
  assert.match(text, /분리한 라벨 \(비닐\)/);
  for (const part of result.parts) {
    for (const step of part.steps) assert.equal(text.split(step).length - 1, 1, step);
  }
});

test('확인할 부속품과 전지 상태를 결과 상단에서 바로 찾을 수 있다', () => {
  const input = {
    itemName: '투명생수병', material: '페트병', type: 'clear-drink', contaminated: 'no', combined: 'yes', separable: 'yes',
    components: [{ label: '라벨', material: '비닐', type: 'packaging', contaminated: 'unknown' }],
  };
  const result = judgeDisposal(input);
  const pending = resultPendingQuestion(input, result);
  assert.deepEqual(pending, { condition: 'state', prefix: 'part0-', label: '라벨 · 오염 상태 확인하기' });
  const html = resultMarkup(input, result);
  assert.match(html, /id="edit-item">라벨 · 오염 상태 확인하기/);
  assert.equal([...html.matchAll(/id="edit-item"/g)].length, 1);
  assert.ok(html.indexOf('id="edit-item"') < html.indexOf('data-new-item'));
  const battery = { itemName: '건전지', handlingCondition: 'unknown' };
  assert.equal(resultPendingQuestion(battery, judgeDisposal(battery)).condition, 'handling');
  battery.handlingCondition = 'undamaged';
  assert.equal(resultPendingQuestion(battery, judgeDisposal(battery)), null);
});

test('비닐 오염 답변은 해당 질문에서만 유지하고 저장·복원된다', async () => {
  const input = { ...vinyl, vinylResidue: 'liquid-only' };
  assert.equal(normalizePart(input).vinylResidue, 'liquid-only');
  for (const change of [{contaminated:'no'}, {material:'플라스틱',type:'container'}, {type:'other'}]) assert.equal(normalizePart({...input,...change}).vinylResidue, undefined);
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    await saveDisposalRecord(input, judgeDisposal(input), localHistoryRepository);
    assert.equal((await getAllDisposalHistory(localHistoryRepository))[0].input.vinylResidue, 'liquid-only');
  } finally { delete globalThis.localStorage; }
});

test('재질별 안내 링크는 직접 열기·새로고침과 이전 링크에서도 동일한 경로를 가리킨다', () => {
  const links = [...guidePage().matchAll(/href="(#[^"]+)" data-guide-anchor/g)].map(match => match[1]);
  assert.equal(links.length, GUIDE_SECTIONS.length);
  for (const [index, link] of links.entries()) {
    assert.deepEqual(parseRoute(link), { path: '/guide', section: GUIDE_SECTIONS[index] });
    assert.deepEqual(parseRoute(`#guide-${GUIDE_SECTIONS[index]}`), parseRoute(link));
  }
  assert.deepEqual(parseRoute('#/guide?material=unknown'), {path:'/guide',section:null});
  assert.equal(parseRoute('#/history').path, '/history');
});

test('지역 비교는 현재 지침을 반복하지 않고 차이를 요약하며 전체 방법을 펼쳐 볼 수 있다', () => {
  const comparison = compareRegionalDisposal({itemName:'깨진유리',material:'유리',type:'broken',region:{province:'대전광역시',district:'서구'}});
  const markup = comparisonPanelMarkup(comparison);
  assert.doesNotMatch(markup.match(/<article class="comparison-current">(.*?)<\/article>/s)[1], /<ol>/);
  assert.equal((markup.match(/전체 배출 방법·근거 보기/g) || []).length, comparison.groups.length);
  for (const group of comparison.groups) {
    assert.ok(comparisonHighlights(group.result, comparison.current).length <= 2);
    assert.ok(comparisonHighlights(group.result, comparison.current).every(step => !comparison.current.steps.includes(step)));
  }
});

test('연습 종료 안내는 회원에게 불필요한 로그인을 요구하지 않는다', () => {
  assert.doesNotMatch(practiceFinishMessage({id:'member'}), /로그인/);
  assert.match(practiceFinishMessage(null), /로그인/);
});
