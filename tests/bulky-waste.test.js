import assert from 'node:assert/strict';
import test from 'node:test';
import { bulkyWasteLocality, filterBulkyWasteFees, groupBulkyWasteFees, loadBulkyWasteFees } from '../src/domain/disposal/bulky-waste.js';

test('지역별 신고 링크와 해당 지역의 규격별 수수료를 연결한다', async () => {
  const yuseong = bulkyWasteLocality({ province: '대전광역시', district: '유성구' });
  const seogu = bulkyWasteLocality({ province: '대전광역시', district: '서구' });
  assert.equal(yuseong.action.url, 'https://www.yuseong.go.kr/clean/html/sub03/0301.html');
  assert.equal(seogu.action.url, 'https://www.seogu.go.kr/waste/main.do');
  const [yuseongFees, seoguFees] = await Promise.all([loadBulkyWasteFees(yuseong.key), loadBulkyWasteFees(seogu.key)]);
  assert.deepEqual(filterBulkyWasteFees(yuseongFees.rows, '책상 양수'), [['책상', '양수', 6000]]);
  assert.deepEqual(filterBulkyWasteFees(seoguFees.rows, '책상 세트'), []);
  assert.deepEqual(groupBulkyWasteFees(filterBulkyWasteFees(yuseongFees.rows, '책상')), [
    ['책상', [['세트(상판+책장+서랍장)', 10000], ['양수', 6000], ['컴퓨터용', 3000], ['편수', 5000]]],
  ]);
});

test('세종과 시 소속 행정구를 지원하고 무료 품목과 표기 변형을 검색한다', async () => {
  const sejong = bulkyWasteLocality({ province: '세종특별자치시' });
  const suwon = bulkyWasteLocality({ province: '경기도', district: '수원시 영통구' });
  const [sejongFees, suwonFees] = await Promise.all([loadBulkyWasteFees(sejong.key), loadBulkyWasteFees(suwon.key)]);
  assert.deepEqual(filterBulkyWasteFees(sejongFees.rows, '안마의자'), [['안마의자', '모든 규격', 0]]);
  assert.equal(suwon.key, '경기도 수원시');
  assert.deepEqual(filterBulkyWasteFees(suwonFees.rows, '쇼파 3인용'), [['소파', '3인용', 7000]]);
});

test('지자체 자체 수수료표와 수수료 미등록 지역을 구분한다', async () => {
  const gimpo = bulkyWasteLocality({ province: '경기도', district: '김포시' });
  const gimpoFees = await loadBulkyWasteFees(gimpo.key);
  assert.equal(gimpoFees.source, 'https://www.gimpo.go.kr/portal/contents.do?key=1438');
  assert.deepEqual(filterBulkyWasteFees(gimpoFees.rows, '대리석 식탁 6인 미만'), [['대리석 식탁', '6인 미만', 10000]]);
  const eunpyeong = bulkyWasteLocality({ province: '서울특별시', district: '은평구' });
  assert.equal(await loadBulkyWasteFees(eunpyeong.key), null);
  assert.equal(eunpyeong.action.url, 'https://ai-waste.ep.go.kr/');
  assert.equal(bulkyWasteLocality(null), null);
});
