import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { applyRegionalRules } from '../src/domain/disposal/regions.js';
import { largeWasteHelp, DISTRICT_HOMEPAGES } from '../src/domain/disposal/large-waste.js';
import { isHeicFile, PHOTO_ACCEPT } from '../src/services/assistance-photo.js';
import { readJudgementRegion, rememberJudgementRegion } from '../src/services/judgement-region.js';
import { SEOUL_DISTRICTS, DAEJEON_DISTRICTS } from '../src/domain/disposal/regions.js';

const judge = (itemName, region) => { const input = { itemName, region }; return applyRegionalRules(input, judgeDisposal(input)); };
const gangnam = { province: '서울특별시', district: '강남구' };

test('대형폐기물 결과에 우리 구 누리집·신고 검색 링크와 수수료 안내를 붙인다', () => {
  const help = largeWasteHelp(judge('소파', gangnam));
  assert.equal(help.place, '서울 강남구');
  assert.equal(help.homepage, 'https://www.gangnam.go.kr');
  assert.match(help.searchUrl, /^https:\/\/search\.naver\.com\/search\.naver\?query=/);
  assert.match(decodeURIComponent(help.searchUrl), /서울 강남구 대형폐기물 배출 신고/);
  assert.match(help.feeNote, /수수료/);
  assert.ok(largeWasteHelp(judge('냉장고', gangnam)));
});
test('지역이 없으면 검색 링크만, 일반 재활용품에는 신고 안내를 붙이지 않는다', () => {
  const help = largeWasteHelp(judge('책상', null));
  assert.equal(help.homepage, null); assert.equal(help.place, '');
  assert.equal(largeWasteHelp(judge('페트병', gangnam)), null);
});
test('지원하는 서울 25개 구·대전 5개 구 모두 구청 누리집 주소가 있다', () => {
  for (const d of SEOUL_DISTRICTS) assert.match(DISTRICT_HOMEPAGES['서울특별시'][d], /^https:\/\/www\./, d);
  for (const d of DAEJEON_DISTRICTS) assert.match(DISTRICT_HOMEPAGES['대전광역시'][d], /^https:\/\/www\./, d);
});
test('아이폰 HEIC 사진을 받는다', () => {
  assert.ok(isHeicFile({ type: 'image/heic', name: 'a.heic' }));
  assert.ok(isHeicFile({ type: '', name: 'IMG_0001.HEIC' }));
  assert.ok(!isHeicFile({ type: 'image/jpeg', name: 'a.jpg' }));
  assert.ok(!isHeicFile({ type: 'text/plain', name: 'a.heic' }));
  assert.match(PHOTO_ACCEPT, /image\/heic/);
});
test('판별 지역은 기본으로 브라우저(localStorage)에 기억해 다음 접속에도 유지한다', () => {
  const entries = new Map();
  globalThis.localStorage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  try {
    rememberJudgementRegion(gangnam, null);
    assert.deepEqual(readJudgementRegion(null), gangnam);
    assert.equal(entries.size, 1);
  } finally { delete globalThis.localStorage; }
});

import handler, { hideSharedGuess } from '../api/classify.js';
import { reportAiGuess, requestAiGuess } from '../src/services/ai-classify.js';

test('AI 답 신고: 같은 이름·별칭의 공용 답을 숨김 처리한다', async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, options }); return { ok: true }; };
  assert.equal(await hideSharedGuess('실리콘주걱', { fetcher, serviceKey: 'secret' }), true);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].options.body), { hidden: true });
  const filter = decodeURIComponent(new URL(calls[0].url).searchParams.get('or') ? new URL(calls[0].url).search : '');
  assert.match(filter, /name_key\.eq\."실리콘주걱"/); assert.match(filter, /canonical_key\.eq\."실리콘주걱"/);
  assert.equal(await hideSharedGuess('실리콘주걱', { fetcher, serviceKey: '' }), false, '서버 키가 없으면 건너뜀');
});
test('AI 답 신고 API: 올바른 신고만 받는다', async () => {
  const res = () => { const r = { headers: {}, statusCode: 200, body: '' }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = c => { r.statusCode = c; return r; }; r.send = b => { r.body = b; }; return r; };
  const bad = res(); await handler({ method: 'POST', body: { action: 'other', name: '주걱' }, headers: {} }, bad); assert.equal(bad.statusCode, 400);
  const ok = res(); await handler({ method: 'POST', body: JSON.stringify({ action: 'report', name: '주걱' }), headers: {} }, ok);
  assert.equal(ok.statusCode, 200); assert.equal(JSON.parse(ok.body).reported, true); assert.equal(ok.headers['Cache-Control'], 'no-store');
});
test('신고한 이름은 브라우저 캐시를 피해 새로 묻는다', async () => {
  const urls = [];
  const fetcher = async (url, options) => { urls.push({ url, options }); return { ok: true, json: async () => ({ guess: null }) }; };
  await requestAiGuess('신고물건', fetcher);
  await reportAiGuess('신고물건', fetcher);
  assert.equal(urls[1].options.method, 'POST');
  await requestAiGuess('신고물건', fetcher);
  assert.equal(urls.length, 3, '신고 후에는 기억한 답을 쓰지 않음');
  assert.ok(new URL(urls[2].url, 'https://e.com').searchParams.get('r'));
});

import { collectionPointHelp, nearbyMapUrl } from '../src/domain/disposal/collection-points.js';
import { normalizeCollectionDays, collectionSummary, buildCollectionIcs } from '../src/domain/disposal/collection-days.js';
import { queueDescription, takeQueuedDescription } from '../src/services/input-draft.js';

test('전용 수거처 물건은 수거함이 놓인 실제 장소(행정복지센터·약국 등)를 지도에서 찾게 한다', () => {
  const help = collectionPointHelp(judge('건전지', gangnam));
  assert.equal(help.targets[0].query, '서울 강남구 행정복지센터');
  assert.match(help.targets[0].mapUrl, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.ok(help.targets.every(target => !/수거함/.test(target.query)), '지도에 없는 "수거함" 낱말로 검색하지 않음');
  assert.match(help.hours, /운영시간/);
  assert.deepEqual(collectionPointHelp(judge('감기약', gangnam)).targets.map(t => t.search), ['약국', '보건소', '행정복지센터']);
  assert.ok(collectionPointHelp(judge('드라이기', null)).pickup);
  assert.equal(collectionPointHelp(judge('페트병', gangnam)), null);
  assert.equal(nearbyMapUrl('행정복지센터', 37.5, 127.03), 'https://www.google.com/maps/search/%ED%96%89%EC%A0%95%EB%B3%B5%EC%A7%80%EC%84%BC%ED%84%B0/@37.50000,127.03000,15z');
});
test('수거 요일: 오늘·내일 안내와 매주 반복 알림 캘린더 파일', () => {
  const settings = normalizeCollectionDays({ days: { recycle: [2, '4', 9], food: [3] }, hour: 20 });
  assert.deepEqual(settings.days, { recycle: [2, 4], general: [], food: [3] });
  const tuesday = new Date(2026, 10, 3); // 화요일
  assert.match(collectionSummary(settings, tuesday).text, /^오늘\(화\)은 ♻️ 재활용품/);
  assert.match(collectionSummary(settings, new Date(2026, 10, 2)).text, /^내일\(화\)/);
  assert.equal(collectionSummary(normalizeCollectionDays(null), tuesday), null);
  const ics = buildCollectionIcs(settings, tuesday);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=TU/);
  assert.match(ics, /DTSTART;TZID=Asia\/Seoul:20261105T200000/);
  assert.match(ics, /BEGIN:VALARM/);
});
test('상태 대신 설명하기로 넘어갈 때 물건 이름을 미리 적어 둔다', () => {
  queueDescription('컵라면 용기인데, 상태는 ');
  assert.equal(takeQueuedDescription(), '컵라면 용기인데, 상태는 ');
  assert.equal(takeQueuedDescription(), '');
});

import { inferCollectionHandling } from '../src/domain/disposal/collection-points.js';
test('종류 정보가 없는 AI 설명·사진 결과도 이름과 안내 문장으로 수거처 안내를 붙인다', () => {
  assert.equal(inferCollectionHandling({ itemName: '타이레놀', method: '폐의약품 수거함에 배출', steps: [] }), 'medicine');
  assert.equal(inferCollectionHandling({ itemName: '식용유', method: '추가 확인 필요', steps: [] }), 'cooking-oil');
  assert.equal(inferCollectionHandling({ itemName: '리모컨 건전지', method: '', steps: [] }), 'battery');
  assert.equal(inferCollectionHandling({ itemName: '컵라면 용기', method: '플라스틱으로 배출', steps: ['내용물을 비워 주세요.'] }), null);
  assert.equal(inferCollectionHandling({ handling: 'large', itemName: '소파' }), null);
  assert.equal(inferCollectionHandling({ itemName: '건전지 포장', ...judge('건전지 포장', gangnam) }), null);
  const packageOnly = { itemName: '건전지 포장', material: '종이', type: 'paper', contaminated: 'no', combined: 'no' };
  const packagingResult = judgeDisposal(packageOnly);
  assert.match(packagingResult.method, /종이류/);
  assert.match(packagingResult.steps[0], /전지가 남아 있지 않은지/);
  assert.equal(judgeDisposal({ ...packageOnly, material: '모르겠어요' }).status, 'check');
});

test('철제 책상은 유성구 품목표의 형태 구분과 공식 신청 주소를 복사에도 유지한다', async () => {
  const { resultToText } = await import('../src/domain/disposal/result-text.js');
  const input = { itemName: '철제 책상', region: { province: '대전광역시', district: '유성구' } };
  const result = judgeDisposal(input);
  assert.equal(result.regional.coverage, 'verified');
  assert.match(result.steps[0], /한쪽인지 양쪽인지/);
  assert.match(resultToText(input, result), /yuseong\.go\.kr\/clean\/html\/sub03\/0301\.html/);
  assert.match(resultToText(input, result), /yuseong\.go\.kr\/clean\/html\/sub02\/02\.html/);
});

import { sourceLineMarkup, localGuideMarkup } from '../src/pages/item-input/item-input.js';
test('대전 유성구 약 안내는 대전시 수거 기준을 사용하고 미확인 품목과 구분한다', () => {
  const yuseong = { province: '대전광역시', district: '유성구' };
  const result = judge('약', yuseong);
  const line = sourceLineMarkup(result, result.sourceUrls);
  assert.doesNotMatch(line, /서울/);
  assert.match(line, /대전시/);
  assert.equal(result.regional.coverage, 'verified');
  assert.match(result.steps.join(' '), /접수 여부/);
  const guide = localGuideMarkup(judge('건전지', yuseong), '건전지');
  assert.match(guide, /유성구 자료에는 이 물건의 배출 방법이 따로 나와 있지 않아/);
  assert.doesNotMatch(guide, /확인하지 못해/);
  const seoul = judge('약', gangnam);
  assert.match(sourceLineMarkup(seoul, seoul.sourceUrls), /서울시/);
  assert.match(localGuideMarkup(judge('약', { province: '강원특별자치도', district: '가상군' }), '약'), /아직 지역 자료를 모으지 못해/);
});

test('대형폐기물 신고 안내는 큰 물건에만 붙고 옷·도자기에는 붙이지 않는다', () => {
  for (const name of ['티셔츠', '운동화', '도자기컵']) assert.equal(largeWasteHelp(judge(name, gangnam)), null, name);
  const bedding = largeWasteHelp(judge('이불', gangnam));
  assert.ok(bedding?.maybe, '침구는 "봉투에 안 들어가면" 안내');
  assert.equal(largeWasteHelp(judge('소파', gangnam)).maybe, false);
  // 종류 정보가 없는 AI 추정 결과는 제목에 대형폐기물이 있을 때만
  assert.ok(largeWasteHelp({ method: '대형폐기물 신고 후 배출 · AI 추정', steps: [] }));
  assert.equal(largeWasteHelp({ method: '종량제봉투로 배출', steps: ['크면 대형폐기물 기준을 확인해 주세요.'] }), null);
});

test('서울은 시 전체 자료라서 "서울시 자료"라고 말한다', () => {
  const guide = localGuideMarkup(judge('약', gangnam), '약');
  if (guide) { assert.match(guide, /서울시 자료에는/); assert.doesNotMatch(guide, /강남구 자료에는/); assert.match(guide, /강남구 공식 안내 찾기/); }
});

import { stepIcon } from '../src/components/step-list.js';
test('단계 아이콘은 동작에 맞게 붙는다', () => {
  const icon = text => stepIcon(text).icon;
  assert.equal(icon('제품 이름·용도와 분리배출 표시를 확인해 주세요.'), '🔍');
  assert.equal(icon('다른 재질의 부속품을 본체에서 분리해 주세요.'), '✂️');
  assert.equal(icon('구청 대형폐기물 안내에서 실제 품목·크기에 맞는 접수 대상을 확인해 주세요.'), '🔍');
  assert.equal(icon('구청·주민센터 또는 지자체 누리집에서 대형폐기물 배출을 신고해 주세요.'), '📝');
  assert.equal(icon('크기·소재에 따라 지역의 종량제봉투 또는 대형폐기물 접수 기준을 확인해 주세요.'), '🔍');
  assert.equal(icon('신고 후 받은 스티커(필증)를 붙여 지정 장소에 배출해 주세요.'), '📝');
  assert.equal(icon('안쪽의 음식물·기름·이물질을 확인하고 다시 판별해 주세요.'), '🔍');
  assert.equal(icon('거주지의 음식물 전용 봉투·전용 용기·RFID 수거 방식에 맞춰 배출해 주세요.'), '🍂');
  assert.equal(icon('지역 묶음 접수 조건을 확인해 주세요.'), '🔍');
  assert.equal(icon('끈으로 묶어 배출해 주세요.'), '📦');
  assert.equal(icon('남은 내용물을 비워 주세요.'), '📤');
  assert.equal(icon('불에 태우지 마세요.'), '🚫');
});

import { aiOpinionNeedsReview } from '../src/domain/disposal/ai-classification.js';
test('AI도 대형폐기물이라고 한 대형 물건 결과에는 "기준과 달라요" 경고를 띄우지 않는다', () => {
  assert.equal(aiOpinionNeedsReview({ status: 'check', handling: 'large' }, { route: 'large' }), false);
  assert.equal(aiOpinionNeedsReview({ status: 'check', handling: 'large' }, { route: 'general' }), true);
});

test('라벨을 떼어 버리는 생수병도 본체에는 서울·대전 지역 기준을 붙인다', () => {
  const pet = region => ({ itemName: '투명생수병', material: '페트병', type: 'clear-drink', currentState: 'clean', contaminated: 'no', combined: 'yes', separable: 'yes', components: [{ label: '라벨', material: '비닐', type: 'packaging', currentState: 'clean', contaminated: 'no' }], region });
  const yuseong = pet({ province: '대전광역시', district: '유성구' });
  const result = applyRegionalRules(yuseong, judgeDisposal(yuseong));
  assert.equal(result.regional.coverage, 'verified');
  assert.ok(result.steps.includes('용기의 이물질을 제거하고 다른 재질과 분리해 배출해 주세요.'));
  assert.equal(localGuideMarkup(result, '투명생수병'), '');
  const seoulInput = pet(gangnam);
  const seoul = applyRegionalRules(seoulInput, judgeDisposal(seoulInput));
  assert.equal(seoul.regional.scope, 'city');
  assert.ok(seoul.steps.some(step => step.startsWith('무색 생수·음료 페트병만')));
});

test('유성구 용기 안내에 스티로폼 문장이 캔·페트병까지 붙지 않는다', () => {
  const input = { itemName: '콜라캔', material: '금속·캔', type: 'food-can', combined: 'no', contaminated: 'no', region: { province: '대전광역시', district: '유성구' } };
  const result = applyRegionalRules(input, judgeDisposal(input));
  assert.equal(result.regional.coverage, 'verified');
  assert.ok(result.steps.every(step => !step.includes('스티로폼')));
});

test('부속품이 있는데 본체에 맞는 지역 자료가 없으면 부속품 때문에 공통 기준을 썼다고 말한다', () => {
  const region = { province: '대전광역시', district: '유성구' };
  const input = { itemName: '종이컵', material: '종이', type: 'cup', contaminated: 'no', combined: 'yes', separable: 'yes', components: [{ label: '뚜껑', material: '플라스틱', type: 'container', contaminated: 'no' }], region };
  const result = applyRegionalRules(input, judgeDisposal(input));
  assert.notEqual(result.regional.coverage, 'verified');
  const guide = localGuideMarkup(result, '종이컵');
  assert.match(guide, /부속품이 함께 있는 물건이라 유성구 기준 대신/);
});
