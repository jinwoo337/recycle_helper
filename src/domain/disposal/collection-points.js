import { normalizeRegion } from './regions.js';
import { detectItemCategory } from './category-keywords.js';
import { lookupItem } from './item-suggestions.js';

// 전용 수거처가 필요한 물건은 지도에서 가까운 수거처를 찾을 수 있게 합니다.
// "폐건전지 수거함" 같은 수거함 자체는 지도에 장소로 등록돼 있지 않아 검색이 안 되므로,
// 수거함이 실제로 놓여 있는 장소(행정복지센터·보건소·약국 등)를 지도에서 찾게 합니다.
const CENTER = { label: '행정복지센터(주민센터)', search: '행정복지센터' };
const HEALTH = { label: '보건소', search: '보건소' };
const PHARMACY = { label: '약국', search: '약국' };
const MART = { label: '대형마트', search: '대형마트' };
const ELECTRONICS = { label: '전자제품 매장', search: '전자제품 매장' };

const POINTS = {
  battery: { name: '폐건전지', targets: [CENTER, MART], note: '전지에 손상이 없는지 먼저 확인하세요. 정상 전지는 근처 시설에 폐건전지 수거함이 있는지 확인해 주세요.' },
  rechargeable: { name: '충전지·보조배터리', targets: [CENTER, ELECTRONICS], note: '전지에 손상이 없는지 먼저 확인하세요. 정상 전지도 충전지·보조배터리를 받는 곳인지 확인해 주세요.' },
  'damaged-battery': { name: '손상 전지', targets: [CENTER], note: '부풀거나 샌 전지는 정상 전지 수거함에 넣지 마세요. 담당 부서 또는 제조사에 안전한 회수 방법을 먼저 물어봐 주세요.', inquiryOnly: true },
  medicine: { name: '폐의약품', targets: [PHARMACY, HEALTH, CENTER], note: '보건소·행정복지센터와 폐의약품을 받는 약국에 수거함이 있어요. 모든 약국이 받지는 않아서 가기 전에 전화로 확인해 주세요.' },
  fluorescent: { name: '폐형광등', targets: [CENTER], note: '행정복지센터와 아파트 단지에 폐형광등 수거함이 있는 경우가 많아요.' },
  'broken-lamp': { name: '깨진 조명', targets: [CENTER], note: '깨진 조명은 정상 형광등 수거함에 넣지 말고 지역의 배출 방법을 문의해 주세요.', inquiryOnly: true },
  led: { name: 'LED 조명', targets: [CENTER], note: '근처 조명 수거함에서 LED 조명을 받는지 확인해 주세요.' },
  bulb: { name: '전구', targets: [CENTER], note: '전구 수거 여부는 행정복지센터에 확인해 주세요.', inquiryOnly: true },
  electronic: { name: '소형 폐가전', targets: [CENTER, ELECTRONICS], note: '소형 폐가전 수거함의 접수 품목이나 방문수거 서비스의 접수 조건을 확인해 주세요.', pickup: true },
  'large-electronic': { name: '폐가전', targets: [ELECTRONICS], note: '판매처 회수나 방문수거를 이용할 수 있는지 확인해 주세요. 방문수거는 품목과 설치 상태에 따라 접수 조건이 달라요.', pickup: true },
  'cooking-oil': { name: '폐식용유', targets: [CENTER], note: '행정복지센터와 아파트 단지에 폐식용유 수거함이 있는 경우가 많아요.' },
  clothing: { name: '헌 옷', targets: [CENTER], note: '깨끗하고 다시 쓸 수 있는 의류인지 확인하세요. 수거함 위치는 행정복지센터에, 접수 품목은 수거함 표시에서 확인해 주세요.' },
};

export const COLLECTION_HOURS_NOTE = '방문 전에 해당 시설에 접수 여부와 수거함 이용 시간 또는 운영시간을 확인해 주세요.';
export const PICKUP_SERVICE = { label: '폐가전 무상 방문수거 예약', url: 'https://www.15990903.or.kr' };

const shortPlace = region => region ? [region.province.replace(/특별시|광역시|특별자치시|특별자치도/, ''), region.district].filter(Boolean).join(' ') : '';

// 종류 정보가 없는 결과(AI 설명·사진 안내, AI 추정)는 물건 이름과 안내 문장으로 수거처 종류를 알아냅니다.
const TEXT_RULES = [
  [/의약품|약국|보건소|알약|물약/, 'medicine'],
  [/건전지|폐전지|보조배터리|충전지/, 'battery'],
  [/형광등/, 'fluorescent'],
  [/폐식용유|식용유/, 'cooking-oil'],
  [/폐가전|소형가전|소형 가전|전기·전자제품/, 'electronic'],
  [/의류수거함|의류 수거함|헌옷/, 'clothing'],
];
export function inferCollectionHandling(result) {
  if (result?.handling === 'clothing' && result.handlingCondition === 'unusable') return null;
  if (POINTS[result?.handling]) return result.handling;
  if (result?.handling || result?.ruleVersion) return null;
  const byName = detectItemCategory(result?.itemName || '')?.category;
  if (POINTS[byName]) return byName;
  // 등록된 일반 품목이나 사용자가 직접 확인한 물건의 안내 문장에는
  // 다른 품목을 피하라는 주의가 나올 수 있으므로 그 문장으로 수거처를 정하지 않습니다.
  if (lookupItem(result?.itemName)?.material || /포장|상자|박스|케이스|라벨|뚜껑/.test(result?.itemName || '')) return null;
  const text = [result?.itemName, result?.method, ...(result?.steps || [])].filter(Boolean).join(' ');
  return TEXT_RULES.find(([pattern]) => pattern.test(text))?.[1] || null;
}
// 지역명을 생략하면 Google 지도가 사용 가능한 현재 위치를 기준으로 시설을 찾습니다.
export const googleSearchUrl = query => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export function collectionPointHelp(result, regionValue = result?.region) {
  const point = POINTS[inferCollectionHandling(result)];
  if (!point) return null;
  const place = shortPlace(normalizeRegion(regionValue));
  return {
    name: point.name, note: point.note, place, hours: COLLECTION_HOURS_NOTE,
    inquiryOnly: Boolean(point.inquiryOnly),
    targets: point.targets.map(target => {
      const query = [place, target.search].filter(Boolean).join(' ');
      return { ...target, query, mapUrl: googleSearchUrl(target.search), regionMapUrl: place ? googleSearchUrl(query) : '' };
    }),
    pickup: point.pickup ? PICKUP_SERVICE : null,
  };
}
