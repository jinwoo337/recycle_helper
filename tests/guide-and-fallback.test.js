import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { ITEM_CATEGORIES } from '../src/domain/disposal/item-categories.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { lookupItem, setItemCatalog } from '../src/domain/disposal/item-suggestions.js';
import { compareRegionalDisposal } from '../src/domain/disposal/regional-comparison.js';
import { COMPARISON_REGIONS, SEOUL_DISTRICTS, DAEJEON_DISTRICTS } from '../src/domain/disposal/regions.js';
import { regionalComparisonMarkup, comparisonPanelMarkup } from '../src/components/regional-comparison.js';
import { validRecord } from '../src/services/disposal-history.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { mainPage } from '../src/pages/main/main.js';
import { guidePage } from '../src/pages/guide/guide.js';

test('약과 전지류는 이름만으로 전용 경로를 안내하고 재질이나 AI를 요구하지 않는다', () => {
  for (const itemName of ['약', '알약', '가루약', '물약', '연고', '안약']) {
    const result = judgeDisposal({ itemName });
    assert.match(result.method, /폐의약품/); assert.equal(result.aiAssisted, undefined);
    assert.doesNotMatch(result.steps.join(' '), /전자제품|폐가전|배터리|건전지/);
    assert.ok(result.sourceUrls.includes('https://news.seoul.go.kr/env/archives/564807'));
  }
  for (const itemName of ['건전지', '폐건전지', '보조배터리', '부푼배터리', '누액건전지']) {
    const result = judgeDisposal({ itemName }); assert.equal(result.status, 'check');
    assert.match(result.method, /전지|배터리/); assert.doesNotMatch(result.steps.join(' '), /물약|폐의약품/);
  }
  assert.match(judgeDisposal({ itemName: '배터리', category: 'battery' }).method, /전지 전용/);
  assert.equal(lookupItem('약과'), null); assert.equal(lookupItem('약봉지모양새물건'), null);
});
test('모든 수동 종류는 미등록 이름에 대해 AI 없이 경로를 제공하고 부족한 정보는 확정하지 않는다', () => {
  for (const [category] of ITEM_CATEGORIES) {
    if (['packaging', 'food'].includes(category)) continue;
    const input = { itemName: '사전에없는새물건', category };
    const result = judgeDisposal(input);
    assert.equal(result.status, 'check', category); assert.ok(result.steps.length, category);
    assert.equal(result.aiAssisted, undefined);
    assert.equal(validRecord({ schemaVersion: 2, id: category, itemName: input.itemName, input, result, createdAt: new Date().toISOString() }), true, category);
  }
  const medicine = judgeDisposal({ itemName: '새로운상표의물건', category: 'medicine', aiGuess: { itemName: '새로운상표의물건', route: 'general', material: '기타', confidence: 'high' } });
  assert.match(medicine.method, /폐의약품/); assert.equal(medicine.aiAssisted, undefined);
  const unknown = judgeDisposal({ itemName: '아무물건', category: 'unknown' });
  assert.doesNotMatch(unknown.steps.join(' '), /전지|전자제품|폐가전|물약/);
});
test('미등록 포장재는 직접 고른 재질·오염·결합 상태를 확인하고 미등록 음식물도 종류를 확인한다', () => {
  const input = { itemName: '새상표포장용기', category: 'packaging', material: '플라스틱', type: 'container' };
  assert.equal(judgeDisposal(input).status, 'check');
  assert.equal(judgeDisposal({ ...input, contaminated: 'no', combined: 'no' }).status, 'recycle');
  assert.equal(judgeDisposal({ ...input, contaminated: 'yes', washed: 'yes', removable: 'no', combined: 'no' }).status, 'general');
  assert.equal(judgeDisposal({ itemName: '어떤음식부산물', category: 'food', material: '음식물류', type: 'excluded' }).status, 'general');
  assert.match(resultToText({ ...input }, judgeDisposal(input)), /직접 선택한 종류/);
});
test('AI가 위험 경로만 알고 종류를 모르면 다른 품목의 구체적인 처리법을 섞지 않는다', () => {
  const itemName = '이름만으로모르는제품';
  const result = judgeDisposal({ itemName, aiGuess: { itemName, material: '기타', route: 'hazardous', confidence: 'high' } });
  assert.equal(result.aiAssisted, true); assert.equal(result.status, 'check');
  assert.doesNotMatch(result.steps.join(' '), /폐가전|1599|폐건전지|배터리를 분리|물약/);
  assert.match(result.steps.join(' '), /종류/);
});
test('서울 25개 구와 대전 5개 구는 모두 주요 재활용품 지역 안내와 출처를 제공한다', () => {
  assert.equal(SEOUL_DISTRICTS.length, 25); assert.equal(DAEJEON_DISTRICTS.length, 5);
  assert.equal(COMPARISON_REGIONS.length, 31);
  for (const region of COMPARISON_REGIONS.filter(region => region.province !== '경기도')) {
    const input = { ...itemPresetInput('신문지'), contaminated: 'no', combined: 'no', region };
    const result = judgeDisposal(input); assert.equal(result.regional.coverage, 'verified', region.district);
    assert.ok(result.regional.sources.length); if (region.province === '서울특별시') assert.equal(result.regional.scope, 'city');
  }
});
test('비교는 같은 입력·상태의 검증된 배출 방식만 묶고 현재 지역과 원본을 변경하지 않는다', () => {
  const input = { itemName: '깨진유리', material: '유리', type: 'broken', region: { province: '대전광역시', district: '서구' } };
  const before = structuredClone(input), comparison = compareRegionalDisposal(input);
  assert.deepEqual(input, before); assert.equal(comparison.groups.length, 2);
  assert.ok(comparison.groups.some(group => group.regions.length === 25));
  assert.ok(comparison.groups.some(group => group.regions.some(region => region.district === '김포시')));
  assert.ok(comparison.groups.every(group => group.result.regional.coverage === 'verified'));
  assert.match(regionalComparisonMarkup(input, comparison.current), /다른 지역은 어떨까\?/);
  assert.match(comparisonPanelMarkup(comparison), /25개 구/);
  assert.match(comparisonPanelMarkup(comparison), /백색마대/);
});
test('방법이 같은 종이는 비교를 제안하지 않고 미확인 지역을 다른 방법이라고 간주하지 않는다', () => {
  const paper = { itemName: '신문지', material: '종이', type: 'paper', contaminated: 'no', combined: 'no' };
  assert.deepEqual(compareRegionalDisposal(paper).groups, []);
  assert.equal(regionalComparisonMarkup(paper, judgeDisposal(paper)), '');
  const unknown = { itemName: '새이름', category: 'unknown' };
  assert.deepEqual(compareRegionalDisposal(unknown).groups, []);
  const dirty = { itemName: '과자봉지', material: '비닐', type: 'packaging', contaminated: 'yes', washed: 'yes', removable: 'no', combined: 'no', region: { province: '대전광역시', district: '유성구' } };
  assert.ok(compareRegionalDisposal(dirty).groups.some(group => group.result.regional.scope === 'city'));
  assert.equal(judgeDisposal({ ...dirty, region: { province: '서울특별시', district: '강남구' } }).status, 'check', '오염 종류가 확인되지 않은 비닐을 바로 재활용으로 확정하지 않음');
});
test('홈 바로가기는 로그인 상태와 무관하게 안내 페이지로 연결하고 재질별 안내와 종류별 진입을 제공한다', () => {
  for (const member of [null, { nickname: '테스트' }]) {
    assert.ok(mainPage(member).includes('href="#/guide"')); assert.ok(!mainPage(member).includes('#/profile'));
  }
  const markup = guidePage(); assert.match(markup, /먼저 기억할 네 가지/); assert.match(markup, /data-guide-item="약"/); assert.match(markup, /data-guide-item="건전지"/);
});
test('운영 DB의 오래된 건전지 재질값이 검토한 전지 전용 경로를 가리지 않는다', () => {
  setItemCatalog([{ id: 'old-battery', aliases: ['건전지'], material: '금속·캔', item_type: 'other', note: '이전 값' }]);
  assert.equal(lookupItem('건전지').handling, 'battery');
  assert.match(judgeDisposal({ itemName: '건전지' }).method, /전지 전용 수거/);
});
