import { normalizeRegion } from './regions.js';
import { detectItemCategory } from './category-keywords.js';

// 전용 수거처가 필요한 물건은 지도에서 가까운 수거처를 찾을 수 있게 합니다.
// "폐건전지 수거함" 같은 수거함 자체는 지도에 장소로 등록돼 있지 않아 검색이 안 되므로,
// 수거함이 실제로 놓여 있는 장소(행정복지센터·보건소·약국 등)를 지도에서 찾게 합니다.
const CENTER = { label: '행정복지센터(주민센터)', search: '행정복지센터' };
const HEALTH = { label: '보건소', search: '보건소' };
const PHARMACY = { label: '약국', search: '약국' };
const MART = { label: '대형마트', search: '대형마트' };
const ELECTRONICS = { label: '전자제품 매장', search: '전자제품 매장' };

const POINTS = {
  battery: { name: '폐건전지', targets: [CENTER, MART], note: '행정복지센터와 대형마트·아파트 단지에 폐건전지 수거함이 있는 경우가 많아요.' },
  rechargeable: { name: '충전지·보조배터리', targets: [CENTER, ELECTRONICS], note: '행정복지센터의 폐건전지 수거함이나 전자제품 매장 회수함을 이용해요.' },
  'damaged-battery': { name: '손상 전지', targets: [CENTER], note: '부풀거나 샌 전지는 수거함에 넣기 전에 행정복지센터에 먼저 물어봐 주세요.' },
  medicine: { name: '폐의약품', targets: [PHARMACY, HEALTH, CENTER], note: '보건소·행정복지센터와 폐의약품을 받는 약국에 수거함이 있어요. 모든 약국이 받지는 않아서 가기 전에 전화로 확인해 주세요.' },
  fluorescent: { name: '폐형광등', targets: [CENTER], note: '행정복지센터와 아파트 단지에 폐형광등 수거함이 있는 경우가 많아요.' },
  'broken-lamp': { name: '깨진 조명', targets: [CENTER], note: '깨진 형광등은 수거함에 넣지 말고 행정복지센터에 처리 방법을 물어봐 주세요.' },
  led: { name: 'LED 조명', targets: [CENTER], note: '행정복지센터와 아파트 단지의 폐형광등·LED 수거함을 이용해요.' },
  bulb: { name: '전구', targets: [CENTER], note: '전구 수거 여부는 행정복지센터에 확인해 주세요.' },
  electronic: { name: '소형 폐가전', targets: [CENTER, ELECTRONICS], note: '행정복지센터·아파트 단지의 소형 폐가전 수거함을 이용하거나, 5개 이상이면 무상 방문수거를 예약할 수 있어요.', pickup: true },
  'large-electronic': { name: '폐가전', targets: [ELECTRONICS], note: '냉장고·세탁기처럼 큰 가전은 무상 방문수거를 예약하면 집으로 가지러 와요.', pickup: true },
  'cooking-oil': { name: '폐식용유', targets: [CENTER], note: '행정복지센터와 아파트 단지에 폐식용유 수거함이 있는 경우가 많아요.' },
  clothing: { name: '헌 옷', targets: [CENTER], note: '의류수거함은 지도에 잘 나오지 않아요. 아파트 단지나 길가 수거함을 이용하고, 위치는 행정복지센터에 물어볼 수 있어요.' },
};

export const COLLECTION_HOURS_NOTE = '운영시간은 지도에서 장소를 누르면 나와요. 행정복지센터·보건소는 보통 평일 9시~18시이고, 약국·마트는 영업시간에만 이용할 수 있어요.';
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
  if (POINTS[result?.handling]) return result.handling;
  if (result?.handling) return null;
  const byName = detectItemCategory(result?.itemName || '')?.category;
  if (POINTS[byName]) return byName;
  const text = [result?.itemName, result?.method, ...(result?.steps || [])].filter(Boolean).join(' ');
  return TEXT_RULES.find(([pattern]) => pattern.test(text))?.[1] || null;
}

export const kakaoSearchUrl = query => `https://map.kakao.com/?q=${encodeURIComponent(query)}`;
export const naverSearchUrl = query => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;

export function collectionPointHelp(result, regionValue = result?.region) {
  const point = POINTS[inferCollectionHandling(result)];
  if (!point) return null;
  const place = shortPlace(normalizeRegion(regionValue));
  return {
    name: point.name, note: point.note, place, hours: COLLECTION_HOURS_NOTE,
    targets: point.targets.map(target => {
      const query = [place, target.search].filter(Boolean).join(' ');
      return { ...target, query, kakaoUrl: kakaoSearchUrl(query), naverUrl: naverSearchUrl(query) };
    }),
    pickup: point.pickup ? PICKUP_SERVICE : null,
  };
}

// 내 위치 주변 검색 주소(위치는 지도 주소에만 쓰고 저장·전송하지 않음).
export function nearbyMapUrl(keyword, latitude, longitude) {
  const lat = Number(latitude).toFixed(5), lng = Number(longitude).toFixed(5);
  return `https://www.google.com/maps/search/${encodeURIComponent(keyword)}/@${lat},${lng},15z`;
}
