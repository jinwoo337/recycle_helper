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
