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
  assert.match(help.targets[0].kakaoUrl, /^https:\/\/map\.kakao\.com\/\?q=/);
  assert.match(help.targets[0].naverUrl, /^https:\/\/map\.naver\.com\/p\/search\//);
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
});

import { sourceLineMarkup, localGuideMarkup } from '../src/pages/item-input/item-input.js';
test('대전 유성구에서 약을 찾으면 서울시 자료를 대표 출처로 쓰지 않고, 지역 자료가 없는 이유를 정확히 말한다', () => {
  const yuseong = { province: '대전광역시', district: '유성구' };
  const result = judge('약', yuseong);
  const line = sourceLineMarkup(result, result.sourceUrls);
  assert.doesNotMatch(line, /서울/);
  const guide = localGuideMarkup(result, '약');
  assert.match(guide, /유성구 자료에는 이 물건의 배출 방법이 따로 나와 있지 않아/);
  assert.doesNotMatch(guide, /확인하지 못해/);
  const seoul = judge('약', gangnam);
  assert.match(sourceLineMarkup(seoul, seoul.sourceUrls), /서울시/);
  assert.match(localGuideMarkup(judge('약', { province: '경기도', district: '수원시' }), '약'), /아직 지역 자료를 모으지 못해/);
});
