import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { applyRegionalRules, normalizeRegion, districtsFor, regionalSourceLabel } from '../src/domain/disposal/regions.js';
import { METRO_GUIDES } from '../src/domain/disposal/metro-guides.js';
import { largeWasteHelp } from '../src/domain/disposal/large-waste.js';
import { localGuideMarkup, sourceLineMarkup } from '../src/pages/item-input/item-input.js';

const judge = (input, province, district) => { const full = { ...input, region: { province, district } }; return applyRegionalRules(full, judgeDisposal(full)); };
const can = { itemName: '콜라캔', material: '금속·캔', type: 'food-can', combined: 'no', contaminated: 'no' };

test('5개 광역시의 구·군을 목록에서 고를 수 있다(2026년 인천 개편 반영)', () => {
  assert.equal(districtsFor('부산광역시').length, 16);
  assert.equal(districtsFor('대구광역시').length, 9);
  assert.deepEqual(districtsFor('인천광역시').slice().sort(), ['강화군', '검단구', '계양구', '남동구', '미추홀구', '부평구', '서해구', '연수구', '영종구', '옹진군', '제물포구'].sort());
  assert.deepEqual(districtsFor('광주광역시'), ['동구', '서구', '남구', '북구', '광산구']);
  assert.equal(districtsFor('울산광역시').length, 5);
  assert.deepEqual(districtsFor('경기도'), []);
  for (const [province, guide] of Object.entries(METRO_GUIDES)) {
    for (const [district, links] of Object.entries(guide.districts)) {
      for (const url of Object.values(links)) assert.match(url, /^https:\/\/[^/]+\.(go\.kr|daegu\.kr|ulsan\.kr|gwangju\.kr|donggu\.kr|suseong\.kr)/, `${province} ${district}`);
    }
  }
});

test('개편 전 이름으로 저장된 인천 지역은 새 이름으로 옮기고, 나뉜 중구는 다시 고르게 한다', () => {
  assert.deepEqual(normalizeRegion({ province: '인천광역시', district: '서구' }), { province: '인천광역시', district: '서해구' });
  assert.deepEqual(normalizeRegion({ province: '인천광역시', district: '동구' }), { province: '인천광역시', district: '제물포구' });
  assert.equal(normalizeRegion({ province: '인천광역시', district: '중구' }), null);
  assert.equal(normalizeRegion({ province: '부산광역시', district: '없는구' }), null);
});

test('대구·광주·울산은 시 공통 안내 문장과 출처를 붙이고 구청 공식 안내 링크를 보여 준다', () => {
  const daegu = judge(can, '대구광역시', '수성구');
  assert.equal(daegu.regional.coverage, 'verified');
  assert.equal(daegu.regional.cityLabel, '대구시');
  assert.ok(daegu.steps.some(step => step.startsWith('대구시는 캔을')));
  assert.match(daegu.notice, /대구시 공통 안내/);
  assert.match(sourceLineMarkup(daegu, daegu.sourceUrls), /대구시 분리배출 안내/);
  assert.match(localGuideMarkup(daegu, '콜라캔'), /수성구 공식 안내: .*재활용.*음식물.*대형폐기물/);

  const food = judge({ itemName: '바나나껍질', material: '음식물류', type: 'soft', foodSeparated: 'yes', contaminated: 'no' }, '광주광역시', '광산구');
  assert.equal(food.regional.coverage, 'verified');
  assert.ok(food.steps.some(step => step.includes('RFID')));
  assert.match(sourceLineMarkup(food, food.sourceUrls), /광주시 음식물 안내/);
  assert.match(localGuideMarkup(food, '바나나껍질'), /구청 누리집/, '세부 페이지가 없으면 누리집으로');

  assert.equal(judge({ itemName: '무라벨생수병', material: '페트병', type: 'clear-drink', combined: 'no', contaminated: 'no' }, '울산광역시', '남구').regional.cityLabel, '울산시');
  assert.equal(regionalSourceLabel(METRO_GUIDES['울산광역시'].city.recycle), '울산시 분리배출 안내');
});

test('부산·인천은 지역 기준이라고 하지 않고 구청 공식 안내로 연결한다', () => {
  const busan = judge(can, '부산광역시', '강서구');
  assert.notEqual(busan.regional.coverage, 'verified');
  const line = localGuideMarkup(busan, '콜라캔');
  assert.match(line, /강서구의 품목별 기준은 아직 정리하지 못해/);
  assert.match(line, /bsgangseo\.go\.kr/);
  const incheon = judge(can, '인천광역시', '검단구');
  assert.match(localGuideMarkup(incheon, '콜라캔'), /geomdan\.go\.kr/);
  // 다른 광역시 자료를 대표 출처로 쓰지 않음
  assert.doesNotMatch(sourceLineMarkup(busan, [...busan.sourceUrls, METRO_GUIDES['대구광역시'].city.recycle]), /대구/);
});

test('광역시 대형폐기물 안내는 구청 대형폐기물 페이지로 바로 연결한다', () => {
  const help = largeWasteHelp(judge({ itemName: '소파' }, '인천광역시', '부평구'));
  assert.equal(help.place, '인천 부평구');
  assert.equal(help.reportUrl, 'https://www.icbp.go.kr/main/life/clean/remove.jsp');
  assert.equal(help.homepage, 'https://www.icbp.go.kr');
  const noPage = largeWasteHelp(judge({ itemName: '소파' }, '부산광역시', '해운대구'));
  assert.equal(noPage.reportUrl, null);
  assert.equal(noPage.homepage, 'https://www.haeundae.go.kr');
});
