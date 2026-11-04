import { normalizeRegion } from './regions.js';
import { detectItemCategory } from './category-keywords.js';

// 전용 수거처가 필요한 물건은 지도에서 가까운 수거함·회수처를 바로 찾을 수 있게 합니다.
// 수거처 위치·운영시간은 지도 앱의 장소 정보가 가장 최신이라 지도 검색으로 연결합니다.
const POINTS = {
  battery: { keyword: '폐건전지 수거함', places: '주민센터, 아파트 단지, 대형마트·전자제품 매장' },
  rechargeable: { keyword: '폐건전지 수거함', places: '주민센터, 아파트 단지, 대형마트·전자제품 매장' },
  'damaged-battery': { keyword: '폐건전지 수거함', places: '주민센터(손상 전지는 먼저 문의)' },
  medicine: { keyword: '폐의약품 수거함', places: '보건소, 주민센터, 폐의약품을 받는 약국' },
  fluorescent: { keyword: '폐형광등 수거함', places: '주민센터, 아파트 단지' },
  'broken-lamp': { keyword: '폐형광등 수거함', places: '주민센터(깨진 조명은 먼저 문의)' },
  led: { keyword: '폐형광등 수거함', places: '주민센터, 아파트 단지' },
  bulb: { keyword: '폐형광등 수거함', places: '주민센터, 아파트 단지' },
  electronic: { keyword: '소형폐가전 수거함', places: '주민센터, 아파트 단지, 전자제품 매장', pickup: true },
  'large-electronic': { keyword: '폐가전 수거', places: '폐가전 무상 방문수거, 전자제품 판매점', pickup: true },
  'cooking-oil': { keyword: '폐식용유 수거함', places: '주민센터, 아파트 단지' },
  clothing: { keyword: '의류수거함', places: '아파트 단지, 길가 의류수거함' },
};

export const COLLECTION_HOURS_NOTE = '운영시간은 지도에서 장소를 누르면 나와요. 주민센터·보건소는 보통 평일 9시~18시, 약국·마트는 영업시간에만 이용할 수 있어요. 아파트 단지 수거함은 단지 안내를 따라 주세요.';
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

export function collectionPointHelp(result, regionValue = result?.region) {
  const point = POINTS[inferCollectionHandling(result)];
  if (!point) return null;
  const place = shortPlace(normalizeRegion(regionValue));
  const query = [place, point.keyword].filter(Boolean).join(' ');
  return {
    keyword: point.keyword, place, places: point.places, query, hours: COLLECTION_HOURS_NOTE,
    kakaoUrl: `https://map.kakao.com/?q=${encodeURIComponent(query)}`,
    naverUrl: `https://map.naver.com/p/search/${encodeURIComponent(query)}`,
    pickup: point.pickup ? PICKUP_SERVICE : null,
  };
}

// 내 위치 주변 검색(위치는 지도 주소에만 쓰고 저장·전송하지 않음).
export function nearbyMapUrl(keyword, latitude, longitude) {
  const lat = Number(latitude).toFixed(5), lng = Number(longitude).toFixed(5);
  return `https://www.google.com/maps/search/${encodeURIComponent(keyword)}/@${lat},${lng},15z`;
}
