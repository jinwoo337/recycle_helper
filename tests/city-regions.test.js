import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { applyRegionalRules } from '../src/domain/disposal/regions.js';
import { CITY_GUIDES, cityGuide } from '../src/domain/disposal/city-guides.js';
import { largeWasteHelp } from '../src/domain/disposal/large-waste.js';
import { localGuideMarkup, largeWasteMarkup } from '../src/pages/item-input/item-input.js';

const judge = (input, province, district) => { const full = { ...input, region: { province, district } }; return applyRegionalRules(full, judgeDisposal(full)); };
const can = { itemName: '콜라캔', material: '금속·캔', type: 'food-can', combined: 'no', contaminated: 'no' };

test('큰 도시는 "시 이름 + 구"로 입력해도 시청 안내를 찾는다', () => {
  assert.equal(cityGuide({ province: '경기도', district: '수원시 영통구' }).name, '수원시');
  assert.equal(cityGuide({ province: '경기도', district: '수원 영통구' }).name, '수원시');
  assert.equal(cityGuide({ province: '경상남도', district: '창원시' }).name, '창원시');
  assert.equal(cityGuide({ province: '경기도', district: '광주시' }).home, 'https://www.gjcity.go.kr', '경기 광주시는 광주광역시와 구분');
  assert.equal(cityGuide({ province: '경기도', district: '창원시' }), null, '다른 도의 시는 찾지 않음');
  assert.equal(cityGuide({ province: '강원특별자치도', district: '가상군' }), null);
  for (const [province, cities] of Object.entries(CITY_GUIDES)) {
    for (const [city, links] of Object.entries(cities)) {
      assert.ok(links.home, `${province} ${city}`);
      for (const url of Object.values(links)) assert.match(url, /^https?:\/\/[^/]+\.(go\.kr|co\.kr|ycg\.kr)(\/|$)/, `${province} ${city}`);
    }
  }
});

test('큰 도시 결과는 전국 공통 기준이라고 밝히고 시청 공식 안내로 연결한다', () => {
  const result = judge(can, '경기도', '수원시 영통구');
  assert.notEqual(result.regional?.coverage, 'verified');
  const line = localGuideMarkup(result, '콜라캔');
  assert.match(line, /수원시의 품목별 기준은 아직 정리하지 못해/);
  assert.match(line, /수원시 공식 안내: .*재활용.*음식물.*대형폐기물/);
  assert.doesNotMatch(localGuideMarkup(judge(can, '경기도', '양주시'), '콜라캔'), /음식물 ↗|대형폐기물 ↗/, '찾지 못한 링크는 넣지 않음');
  // 세부 페이지가 없는 도시는 시청 누리집으로
  assert.match(localGuideMarkup(judge(can, '강원특별자치도', '홍천군'), '콜라캔'), /홍천군 공식 안내: .*hongcheon\.go\.kr.*군청 누리집/);
  // 목록에 없는 시·군은 지금처럼 검색 링크
  assert.match(localGuideMarkup(judge(can, '강원특별자치도', '가상군'), '콜라캔'), /공식 안내 찾기/);
});

test('김포시 지역 기준 결과에도 시청 공식 안내 링크를 붙인다', () => {
  const pet = judge({ itemName: '무라벨생수병', material: '페트병', type: 'clear-drink', combined: 'no', contaminated: 'no' }, '경기도', '김포시');
  assert.equal(pet.regional.coverage, 'verified');
  assert.match(localGuideMarkup(pet, '무라벨생수병'), /김포시 공식 안내/);
});

test('큰 도시 대형폐기물은 구가 있어도 시청 안내로 연결한다', () => {
  const help = largeWasteHelp(judge({ itemName: '소파' }, '경기도', '고양시 일산동구'));
  assert.equal(help.office, '고양시');
  assert.equal(help.homepage, 'https://www.goyang.go.kr');
  assert.match(help.reportUrl, /goyang\.go\.kr/);
  assert.equal(largeWasteHelp(judge({ itemName: '소파' }, '경기도', '양주시')).reportUrl, null);
  const sofa = judge({ itemName: '소파' }, '충청북도', '청주시 흥덕구');
  const markup = largeWasteMarkup(sofa);
  assert.match(markup, /clean\.cheongju\.go\.kr/);
  assert.match(markup, /청주시 대형폐기물 안내/);
  assert.match(markup, /청주시청 누리집/);
  // 광역시는 그대로 구청 이름
  assert.equal(largeWasteHelp(judge({ itemName: '소파' }, '인천광역시', '부평구')).office, '부평구');
});

test('경기도는 31개 시·군 전체를 시청·군청 공식 안내로 연결하고 추천 목록으로 보여 준다', async () => {
  const { citySuggestionsFor } = await import('../src/domain/disposal/regions.js');
  const gyeonggi = '수원 고양 용인 화성 성남 부천 남양주 안산 평택 시흥 파주 김포 의정부 안양 광주 하남 광명 군포 양주 오산 이천 구리 안성 의왕 포천 여주 동두천 과천'.split(' ').map(name => `${name}시`).concat(['양평군', '가평군', '연천군']);
  assert.deepEqual(citySuggestionsFor('경기도').slice().sort(), gyeonggi.slice().sort());
  assert.deepEqual(citySuggestionsFor('서울특별시'), []);
  const sofa = judge({ itemName: '소파' }, '경기도', '가평군');
  assert.match(largeWasteMarkup(sofa), /가평군 대형폐기물 안내.*가평군청 누리집/s);
  assert.match(localGuideMarkup(judge(can, '경기도', '연천군'), '콜라캔'), /연천군 공식 안내: .*재활용/);
});

test('8개 도의 모든 시·군을 시청·군청 공식 안내로 연결한다', async () => {
  const { citySuggestionsFor } = await import('../src/domain/disposal/regions.js');
  const counts = { '경기도': 31, '강원특별자치도': 18, '충청북도': 11, '충청남도': 15, '전북특별자치도': 14, '전라남도': 22, '경상북도': 22, '경상남도': 18, '제주특별자치도': 2 };
  for (const [province, count] of Object.entries(counts)) assert.equal(citySuggestionsFor(province).length, count, province);
  assert.ok(!citySuggestionsFor('경상북도').includes('군위군'), '군위군은 2023년부터 대구광역시');
  // 같은 이름(고성군)도 도에 따라 다른 군청으로
  assert.equal(cityGuide({ province: '강원특별자치도', district: '고성군' }).home, 'https://www.gwgs.go.kr');
  assert.equal(cityGuide({ province: '경상남도', district: '고성군' }).home, 'https://www.goseong.go.kr');
  assert.match(localGuideMarkup(judge(can, '전라남도', '신안군'), '콜라캔'), /신안군 공식 안내: .*군청 누리집/);
  assert.match(largeWasteMarkup(judge({ itemName: '소파' }, '경상남도', '진주시')), /진주시 대형폐기물 안내/);
});
