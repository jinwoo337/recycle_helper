import test from 'node:test';
import assert from 'node:assert/strict';
import { bulkyWasteLocality } from '../src/domain/disposal/bulky-waste.js';
import { CITY_GUIDES } from '../src/domain/disposal/city-guides.js';
import { METRO_DISTRICTS, SEOUL_DISTRICTS, DAEJEON_DISTRICTS } from '../src/domain/disposal/regions.js';
import { collectionAction } from '../src/domain/disposal/collection-action.js';
import { collectionActionMarkup } from '../src/components/collection-action.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

const regions = [
  ...Object.entries(CITY_GUIDES).flatMap(([province, cities]) => Object.keys(cities).map(district => ({ province, district }))),
  ...Object.entries({ ...METRO_DISTRICTS, '서울특별시': SEOUL_DISTRICTS, '대전광역시': DAEJEON_DISTRICTS }).flatMap(([province, districts]) => districts.map(district => ({ province, district }))),
  { province: '세종특별자치시', district: '' },
];

test('전국 17개 시·도에 등록된 모든 시·군·구에 관할 공식 사이트와 신고 절차가 있다', () => {
  assert.equal(new Set(regions.map(region => region.province)).size, 17);
  for (const region of regions) {
    const local = bulkyWasteLocality(region);
    assert.ok(local, JSON.stringify(region));
    assert.notEqual(local.action.kind, 'directory', local.label);
    assert.match(local.action.url, /^https?:\/\//);
    assert.equal(local.steps.length, 3);
    const action = collectionAction({ itemName: '책상' }, { handling: 'large', region });
    assert.equal(action.url, local.action.url);
    assert.equal(action.scope, local.label);
    assert.match(collectionActionMarkup({}, { region }, action), /신고|납부/);
  }
});

test('동명 구와 군을 시·도로 구분하고 행정구는 관할 시 신고로 연결한다', () => {
  assert.notEqual(bulkyWasteLocality({ province: '서울특별시', district: '강서구' }).action.url,
    bulkyWasteLocality({ province: '부산광역시', district: '강서구' }).action.url);
  assert.notEqual(bulkyWasteLocality({ province: '강원특별자치도', district: '고성군' }).action.url,
    bulkyWasteLocality({ province: '경상남도', district: '고성군' }).action.url);
  assert.equal(bulkyWasteLocality({ province: '경기도', district: '수원시 영통구' }).key, '경기도 수원시');
});

test('신고 링크가 미등록된 지역은 공식 누리집과 접수 방법 확인을 안내하며 온라인 접수로 단정하지 않는다', () => {
  const local = bulkyWasteLocality({ province: '강원특별자치도', district: '태백시' });
  assert.equal(local.action.kind, 'home');
  assert.match(local.steps[0], /온라인·전화·방문/);
  assert.match(local.note, /운영 여부/);
  assert.equal(bulkyWasteLocality(null), null);
  assert.match(collectionAction({}, { handling: 'large', region: null }).label, /지역 선택/);
  assert.equal(collectionAction({}, { handling: 'clothing', region: null }), null);
});

test('지역 변경에 따라 결과·저장 결과·복사 안내의 신고 사이트도 달라진다', () => {
  const input = { itemName: '책상', category: 'large' };
  for (const region of [{ province: '서울특별시', district: '은평구' }, { province: '경기도', district: '김포시' }, { province: '제주특별자치도', district: '서귀포시' }]) {
    const result = judgeDisposal({ ...input, region });
    const local = bulkyWasteLocality(region);
    assert.ok(resultMarkup(input, result).includes(local.action.url));
    assert.ok(resultMarkup(input, result, '2026-11-19').includes(local.action.url));
    assert.ok(resultToText(input, result).includes(local.action.url));
    assert.ok(resultToText(input, result).includes(local.steps[0]));
  }
});
