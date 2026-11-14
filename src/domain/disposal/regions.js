export const PROVINCES = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'];
export const SEOUL_DISTRICTS = '종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구'.split(' ');
export { DAEJEON_DISTRICTS } from './daejeon-guides.js';
import { DAEJEON_DISTRICTS, DAEJEON_GUIDES, DAEJEON_SOURCES, YUSEONG_WASTE_GUIDE, yuseongDisposalSchedule } from './daejeon-guides.js';
import { SEOUL_SOURCES, SEOUL_RECYCLE_NOTES, SEOUL_SCOPE_NOTE, SEOUL_VINYL_NOTE } from './seoul-guides.js';
import { MEDICINE_SAFETY_STEPS, MEDICINE_SOURCES, medicineRegionalGuidance } from './medicine-guide.js';
import { METRO_GUIDES, METRO_DISTRICTS, METRO_CITY_SOURCES, METRO_CHECKED_AT } from './metro-guides.js';
import { CITY_GUIDES } from './city-guides.js';
import { usesGelIcePackCondition } from './special-guides.js';
export { METRO_DISTRICTS } from './metro-guides.js';
export const citySuggestionsFor = province => Object.keys(CITY_GUIDES[province] || {});
export const districtsFor = province => province === '서울특별시' ? SEOUL_DISTRICTS
  : province === '대전광역시' ? DAEJEON_DISTRICTS : METRO_DISTRICTS[province] || [];
export const COMPARISON_REGIONS = [
  ...SEOUL_DISTRICTS.map(district => ({ province: '서울특별시', district })),
  ...DAEJEON_DISTRICTS.map(district => ({ province: '대전광역시', district })),
  { province: '경기도', district: '김포시' },
  { province: '경기도', district: '구리시' },
  { province: '경기도', district: '광주시' },
  { province: '경기도', district: '성남시' },
  { province: '경기도', district: '용인시' },
  { province: '인천광역시', district: '부평구' },
  ...Object.entries(METRO_GUIDES).flatMap(([province, guide]) => guide.city
    ? Object.keys(guide.districts).map(district => ({ province, district })) : []),
];
export function normalizeRegion(value) {
  if (!value || !PROVINCES.includes(value.province)) return null;
  const district = value.province === '세종특별자치시' ? '' : String(value.district || '').trim().replace(/\s+/g, ' ');
  if (value.province !== '세종특별자치시' && (!/^[가-힣 ]{2,20}$/.test(district) || !/[시군구]$/.test(district))) return null;
  if (value.province === '서울특별시' && !SEOUL_DISTRICTS.includes(district)) return null;
  if (value.province === '대전광역시' && !DAEJEON_DISTRICTS.includes(district)) return null;
  const metro = METRO_GUIDES[value.province];
  if (metro) {
    // 행정구역 개편 전 이름으로 저장된 지역은 새 이름으로 옮깁니다(예: 인천 서구 → 서해구).
    const current = metro.renamed?.[district] || district;
    return metro.districts[current] ? { province: value.province, district: current } : null;
  }
  return { province: value.province, district };
}
export const regionLabel = value => { const region = normalizeRegion(value); return region ? [region.province, region.district].filter(Boolean).join(' ') : '지역 미설정'; };
export const usesSeoulVinylQuestions = region => region?.province === '서울특별시' && region.district !== '도봉구';
export const cityGuidanceLabel = result => `${result.regional?.cityLabel || '서울시'} 공통 안내`;

export function resultRegionLabel(result) {
  const { regional, region } = result;
  if (!regional) return '지역 미기록';
  if (regional.coverage !== 'verified' && result.disposalSchedule) return `${regional.label} · 지역 배출 일정 적용`;
  if (regional.coverage !== 'verified') return `${regional.label} · ${region ? '기본 안내 · 지역 기준 확인 필요' : '기본 안내'}`;
  return `${regional.label} · ${regional.scope === 'city' ? `${cityGuidanceLabel(result)} · 구·군별 수거 확인 필요` : '지역 기준 적용'}`;
}

export const REGIONAL_SOURCES = {
  ...Object.fromEntries(Object.entries(SEOUL_SOURCES).map(([key, url]) => [`seoul${key}`, url])),
  ...Object.fromEntries(DAEJEON_SOURCES.map((url, index) => [`daejeon${index}`, url])),
  ...Object.fromEntries(METRO_CITY_SOURCES.map((url, index) => [`metro${index}`, url])),
  gimpoWaste: 'https://m.gimpo.go.kr/portal/contents.do?key=2723',
  dobongWaste: 'https://www.dobong.go.kr/subsite/waste/Contents.asp?code=10007366',
  dobongIcePack: 'https://www.dobong.go.kr/dong/bbs.asp?bmode=D&code=10009780&intPage=3&pcode=12732434',
  gangnamWaste: 'https://clean.gangnam.go.kr/use/guid/USEGUID01000000.do?contentId=con2411150005',
  gangdongWaste: 'https://biz.gangdong.go.kr/web/newportal/contents/gdp_005_004_010_001',
  nowonCarton: 'https://www.elis.go.kr/allalr/selectAlrBdtOne?alrNo=11350111235024&histNo=001',
  songpaWaste: 'https://www.songpa.go.kr/www/contents.do?key=3166',
  seochoIcePack: 'https://www.seocho.go.kr/site/seocho/04/10414041500002021100804.jsp',
  bupyeongIcePack: 'https://www.icbp.go.kr/bbs/bbsMsgDetail.do?bcd=notice&msg_seq=36979',
  yonginIcePack: 'https://www.yongin.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1020&q_bbscttSn=20221213083134581',
  gyeonggiGwangjuIcePack: 'https://www.gjcity.go.kr/depart/contents.do?mId=0901070200',
  gyeonggiGwangjuRecycle: 'https://www.gjcity.go.kr/depart/contents.do?mId=0901050000',
  gimpoRecycle: 'https://gimpo.go.kr/portal/contents.do?key=1435',
  seongnamCarton: 'https://snvision.seongnam.go.kr/data/snvision/pdf/202604/2026043022123157.pdf',
  geumcheonFood: 'https://geumcheon.go.kr/portal/contents.do?key=818',
  yuseongWaste: YUSEONG_WASTE_GUIDE,
  yuseongLargeFees: 'https://www.yuseong.go.kr/clean/html/sub02/02.html',
  ...Object.fromEntries(Object.entries(MEDICINE_SOURCES).map(([key, url]) => [`medicine-${key}`, url])),
};
const baggedGelIcePack = {
  '서울특별시 서초구': { source: REGIONAL_SOURCES.seochoIcePack, effective: '2026-10-30' },
  '인천광역시 부평구': { source: REGIONAL_SOURCES.bupyeongIcePack, published: '2025-10-28', effective: '2025-12-01' },
  '경기도 용인시': { source: REGIONAL_SOURCES.yonginIcePack, published: '2022-12-13', effective: '2023-01-01' },
};
const sourceDetails = {
  ...Object.fromEntries(Object.entries(baggedGelIcePack).map(([scope, { source, ...dates }]) => [source, { scope, ...dates }])),
  [REGIONAL_SOURCES.dobongIcePack]: { scope: '서울특별시 도봉구', effective: '2025-01-02' },
  [REGIONAL_SOURCES.dobongWaste]: { scope: '서울특별시 도봉구' },
  [REGIONAL_SOURCES.gangdongWaste]: { scope: '서울특별시 강동구' },
  [REGIONAL_SOURCES.nowonCarton]: { scope: '서울특별시 노원구', effective: '2026-04-16' },
  [REGIONAL_SOURCES.gimpoRecycle]: { scope: '경기도 김포시', updated: '2026-10-20' },
  [REGIONAL_SOURCES.seongnamCarton]: { scope: '경기도 성남시 공동주택', published: '2026-05' },
  [REGIONAL_SOURCES.gyeonggiGwangjuIcePack]: { scope: '경기도 광주시' },
  [REGIONAL_SOURCES.gyeonggiGwangjuRecycle]: { scope: '경기도 광주시' },
  [REGIONAL_SOURCES.yuseongWaste]: { scope: '대전광역시 유성구' },
  [MEDICINE_SOURCES.guri]: { scope: '경기도 구리시', published: '2026-02-19' },
  [MEDICINE_SOURCES.seongnam]: { scope: '경기도 성남시', published: '2026-08-25' },
};
const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function regionalSourceDetail(url) {
  const details = sourceDetails[url];
  if (!details) return '';
  const { scope, published, effective, updated } = details;
  return [scope, published && `게시 ${published}`, effective && `시행 ${effective}`, updated && `최종 수정 ${updated}`].filter(Boolean).join(' · ');
}
export function regionalSourceLabel(url) {
  if (url === REGIONAL_SOURCES.dobongWaste) return '도봉구 · 품목별 분리배출 안내';
  if (url === REGIONAL_SOURCES.dobongIcePack) return '도봉구 · 아이스팩 배출 안내';
  if (url === REGIONAL_SOURCES.gangnamWaste) return '강남구 · 생활폐기물 배출 안내';
  if (url === REGIONAL_SOURCES.gangdongWaste) return '강동구 · 생활폐기물 배출 안내';
  if (url === REGIONAL_SOURCES.nowonCarton) return '노원구 · 종이팩 자원순환 조례';
  if (url === REGIONAL_SOURCES.songpaWaste) return '송파구 · 생활폐기물 배출 안내';
  if (url === REGIONAL_SOURCES.seochoIcePack) return '서초구 · 아이스팩 수거 종료 안내';
  if (url === REGIONAL_SOURCES.bupyeongIcePack) return '부평구 · 아이스팩 수거 종료 안내';
  if (url === REGIONAL_SOURCES.yonginIcePack) return '용인시 · 아이스팩 수거 종료 안내';
  if (url === REGIONAL_SOURCES.gyeonggiGwangjuIcePack) return '경기 광주시 · 아이스팩 수거함 위치';
  if (url === REGIONAL_SOURCES.gyeonggiGwangjuRecycle) return '경기 광주시 · 재활용품 배출 안내';
  if (url === REGIONAL_SOURCES.seongnamCarton) return '성남시 · 공동주택 종이팩 전용 수거함';
  if (url === MEDICINE_SOURCES.seoul) return '서울시 폐의약품 수거 안내';
  if (url === MEDICINE_SOURCES.daejeon) return '대전시 가정 내 폐의약품 안내';
  if (url === MEDICINE_SOURCES.donggu) return '대전 동구 폐의약품 배출 안내';
  if (url === MEDICINE_SOURCES.guri) return '구리시보건소 폐의약품 수거 안내';
  if (url === MEDICINE_SOURCES.seongnam) return '성남시 폐의약품 수거함 설치 안내';
  if (url === REGIONAL_SOURCES.yuseongWaste) return '유성구 · 생활쓰레기 배출 시간과 장소';
  if (url === REGIONAL_SOURCES.yuseongLargeFees) return '유성구 대형폐기물 품목·수수료표';
  const seoulLabels = { recycle: '서울시 분리배출 안내', vinyl: '서울시 폐비닐 안내', scope: '서울시 자치구 적용 범위', food: '서울시 음식물 RFID 안내' };
  for (const [key, source] of Object.entries(SEOUL_SOURCES)) if (url === source) return seoulLabels[key];
  for (const [district, guide] of Object.entries(DAEJEON_GUIDES)) {
    if (url === guide.recycle) return `대전 ${district} 재활용 안내`;
    if (url === guide.food) return `대전 ${district} 음식물 안내`;
  }
  for (const guide of Object.values(METRO_GUIDES)) {
    if (url === guide.city?.recycle) return `${guide.city.label} 분리배출 안내`;
    if (url === guide.city?.food) return `${guide.city.label} 음식물 안내`;
  }
  return url === REGIONAL_SOURCES.geumcheonFood ? '금천구 음식물 안내 (기본 참고 자료)'
    : url === REGIONAL_SOURCES.gimpoWaste ? '김포시 생활폐기물 안내' : '김포시 재활용 안내';
}
// 재활용 품목의 재질·세부 종류에 맞는 서울시 공통 안내 문장 이름(SEOUL_RECYCLE_NOTES의 키)입니다.
function seoulRecycleKey({ material, type }) {
  if (['utensil', 'toy'].includes(type)) return null;
  if (material === '종이') return ({ paper: 'paper', carton: 'carton', cup: 'cup' })[type] || null;
  if (material === '페트병' && type === 'clear-drink') return 'pet';
  if (material === '스티로폼') return 'foam';
  return ['플라스틱', '페트병', '유리', '금속·캔'].includes(material) ? 'container' : null;
}
// 광역시(대구·광주·울산) 시청 공통 안내에서 재질에 맞는 문장 이름을 고릅니다.
function metroRecycleKey({ material, type }) {
  if (['utensil', 'toy'].includes(type)) return null;
  if (material === '종이') return ({ paper: 'paper', carton: 'carton' })[type] || null;
  if (material === '페트병') return type === 'clear-drink' ? 'pet' : 'container';
  if (material === '플라스틱') return 'container';
  if (material === '금속·캔') return 'can';
  if (material === '유리') return type === 'bottle' ? 'glass' : null;
  if (material === '비닐') return type === 'packaging' ? 'vinyl' : null;
  return material === '스티로폼' ? 'foam' : null;
}
// 대전 구청 자료에서 재질에 맞는 안내 문장을 고릅니다. 자료가 없으면 null입니다.
function daejeonRecycleNote(guide, { material, type }) {
  if (['utensil', 'toy'].includes(type)) return null;
  const key = material === '종이' ? (type === 'carton' ? 'carton' : type === 'paper' ? 'paper' : null)
    : material === '비닐' ? 'vinyl' : ['플라스틱', '페트병', '유리', '금속·캔', '스티로폼'].includes(material) ? 'container' : null;
  if (!key) return null;
  return guide[key] || (key === 'carton' ? guide.container : null) || null;
}
// 지역·품목별로 검증한 규칙만 적용합니다. 위험 품목/이름 충돌/미등록 품목의 판단을 뒤집지 않습니다.
export function applyRegionalRules(input, base, asOf = dateFormat.format(new Date())) {
  const region = normalizeRegion(input.region);
  const result = structuredClone(base);
  const yuseong = region?.province === '대전광역시' && region.district === '유성구';
  result.region = region;
  result.regional = { coverage: 'unverified', label: regionLabel(region), checkedAt: '2026-10-27', sources: [], notes: [], comparisonKey: `basic:${base.status}:${base.method}` };
  const single = input.combined !== 'yes' && !input.components?.length;
  const knownGlass = result.disposalKind === 'broken-glass';
  const set = (url, note, comparisonKey) => {
    result.regional.coverage = 'verified';
    result.regional.sources.push(url); result.regional.notes.push(note);
    if (comparisonKey) result.regional.comparisonKey = comparisonKey;
    result.sourceUrls = [...new Set([...result.sourceUrls, url])];
  };
  function applyLocalMethod({ method, reason, steps, status = 'check', source, note, key, pendingCondition }) {
    Object.assign(result, { status, method, steps, reasons: [reason] });
    delete result.pendingCondition;
    if (pendingCondition) result.pendingCondition = pendingCondition;
    result.parts[0] = { label: result.parts[0].label, material: result.parts[0].material, status, method, steps: [...steps], reasons: [reason],
      ...(pendingCondition ? { pendingCondition } : {}) };
    result.regional.checkedAt = '2026-11-14';
    set(source, note, key);
  }
  const carton = input.material === '종이' && input.type === 'carton' && result.parts[0]?.status === 'recycle';
  const detachedCarton = carton && input.combined === 'yes' && input.separable === 'yes' && result.parts.length > 1;
  const cartonRule = carton && (input.combined === 'no' || detachedCarton) && ({
    '경기도 김포시': {
      source: REGIONAL_SOURCES.gimpoRecycle, key: 'carton:separate-pack-types',
      reason: '김포시는 일반팩과 멸균팩을 구분해서 모아요.',
      route: '일반팩과 멸균팩을 구분해 전용 수거함에 넣거나, 종류별로 묶어 종이류 수거함에 넣어 주세요.',
    },
    '경기도 성남시': {
      source: REGIONAL_SOURCES.seongnamCarton, key: 'carton:apartment-dedicated-separated',
      reason: '성남시 공동주택에서는 종이팩을 일반팩과 멸균팩으로 구분해 모아요.',
      route: '공동주택은 단지 내 종이팩 전용 수거함에 일반팩과 멸균팩을 구분해 넣어 주세요. 일반주택은 거주지의 수거 장소를 확인해 주세요.',
    },
    '서울특별시 노원구': {
      source: REGIONAL_SOURCES.nowonCarton, key: 'carton:separate-clear-bag-fallback',
      reason: '노원구는 일반 폐지와 종이팩을 따로 수거해요.',
      route: '종이팩 전용 수거함을 이용해 주세요. 전용함이 없으면 일반 종이와 구분해 투명봉투에 담아 지정 장소에 내놓아요.',
    },
  })[result.regional.label];
  const localCarton = cartonRule && asOf >= (sourceDetails[cartonRule.source]?.effective || '');
  if (localCarton) {
    const { source, key, reason, route } = cartonRule;
    const body = result.parts[0];
    const steps = [...body.steps.slice(0, -1), '내용물을 비우고 깨끗하게 헹궈 말려 주세요.', route];
    const note = '붙어 있던 빨대·비닐 등 다른 재질은 따로 배출해 주세요.';
    if (detachedCarton) {
      result.parts[0] = { ...body, reasons: [reason, ...body.reasons], steps };
      result.regional.checkedAt = '2026-11-14';
      set(source, note, key);
    } else {
      applyLocalMethod({ method: result.method, reason, steps, status: result.status, source, note, key });
    }
  }
  const medicine = region && result.handling === 'medicine' && medicineRegionalGuidance(region, input.itemName);
  if (medicine) {
    result.regional.scope = medicine.scope;
    if (medicine.scope === 'city') result.regional.cityLabel = region.province === '대전광역시' ? '대전시' : '서울시';
    result.regional.checkedAt = medicine.checkedAt || '2026-11-11';
    result.sourceUrls = result.sourceUrls.filter(url => url !== MEDICINE_SOURCES.seoul);
    result.steps = [...MEDICINE_SAFETY_STEPS, medicine.preparation];
    if (yuseong) result.steps.push(medicine.collection);
    result.parts[0].steps = yuseong ? [...result.steps] : [...result.steps, medicine.collection];
    set(medicine.source, medicine.collection, medicine.key);
  }
  if (region?.province === '경기도' && region.district === '김포시') {
    if (single && knownGlass && input.material === '유리' && input.type === 'broken') {
      const method = '깨진 유리 · 김포시 백색마대봉투로 배출';
      const steps = ['날카로운 유리를 안전하게 감싸고 깨진 유리가 들어 있음을 표시해 주세요.', '김포시 불연성 가정특수폐기물용 백색마대봉투에 담아 배출해 주세요.', '대량·대형 유리는 수거 가능 여부를 김포시에 먼저 확인해 주세요.'];
      result.method = method; result.steps = steps;
      result.reasons = ['깨진 유리는 유리병과 따로 수거하고, 김포시는 가정에서 나온 깨진 유리에 백색마대봉투 사용을 안내해요.'];
      // 일반 종량제와 다른 불연성 전용 배출이므로 추가 확인 분류를 유지합니다.
      result.parts[0] = { ...result.parts[0], method, steps: [...steps], reasons: [...result.reasons] };
      set(REGIONAL_SOURCES.gimpoWaste, '김포시는 깨진 유리를 불연성 가정특수폐기물로 구분하고 백색마대봉투 사용을 안내해요.', 'glass:gimpo-sack');
    }
    if (single && result.status === 'recycle' && input.material === '페트병' && input.type === 'clear-drink' && input.combined === 'no') {
      set(REGIONAL_SOURCES.gimpoRecycle, '김포시: 공동주택은 투명 페트병 전용 수거함, 단독주택 등은 전용봉투 또는 투명·반투명 봉투에 담아 배출해요.', 'pet:gimpo-collection');
    }
  }
  const geumcheonFood = region?.province === '서울특별시' && region.district === '금천구' && single && input.material === '음식물류';
  const baggedGel = result.handling === 'gel-ice-pack' && Object.hasOwn(baggedGelIcePack, result.regional.label) && baggedGelIcePack[result.regional.label];
  if (baggedGel && asOf >= baggedGel.effective) {
    applyLocalMethod({
      method: '젤 아이스팩 · 종량제봉투로 배출',
      reason: `${region.district}는 아이스팩 전용 수거를 종료해 젤 아이스팩을 종량제봉투로 안내해요.`,
      steps: ['팩을 뜯거나 내용물을 하수구에 붓지 마세요.', '팩을 통째로 지역 종량제봉투에 넣어 주세요.'],
      status: 'general', source: baggedGel.source, note: '아이스팩 전용 수거함 운영이 종료됐어요.', key: 'ice-pack:volume-bag',
    });
  }
  if (result.handling === 'gel-ice-pack' && yuseong) {
    applyLocalMethod({
      method: '젤 아이스팩 · 통째로 유성구 일반 종량제봉투',
      reason: '젤 아이스팩은 통째로 전용 수거함이나 일반 종량제봉투에 배출할 수 있어요. 종량제봉투로 버릴 때는 유성구 생활쓰레기 배출 기준을 따라요.',
      steps: [
        '팩을 뜯지 말고 통째로 유성구 일반 종량제봉투에 넣어 주세요. 내용물을 하수구에 붓지 마세요.',
        '이용할 수 있는 아이스팩 전용 수거함이 있다면 깨끗하고 터지지 않은 팩은 통째로 넣어 재사용할 수 있어요.',
      ],
      status: 'general', source: REGIONAL_SOURCES.yuseongWaste,
      note: '유성구청의 일반쓰레기 시간·장소와 분리배출 품목사전의 젤 아이스팩 배출 방법을 적용했어요.', key: 'ice-pack:reuse-or-volume-bag',
    });
  }
  if (region?.province === '서울특별시' && region.district === '도봉구' && result.handling === 'gel-ice-pack'
      && asOf >= sourceDetails[REGIONAL_SOURCES.dobongIcePack].effective) {
    applyLocalMethod({
      method: '젤 아이스팩 · 도봉구 특수종량제 마대로 배출',
      reason: '도봉구는 젤 아이스팩 전용 수거를 종료해 특수종량제 마대를 사용해요.',
      steps: ['팩을 뜯거나 내용물을 하수구에 붓지 마세요.', '팩을 통째로 도봉구 특수종량제 마대에 넣어 주세요.'],
      source: REGIONAL_SOURCES.dobongIcePack, note: '도봉구 아이스팩 전용 수거는 2025년 1월 2일에 종료됐어요.', key: 'ice-pack:dobong-sack',
    });
  }
  if (result.handling === 'gel-ice-pack' && usesGelIcePackCondition(region)) {
    const reusable = input.handlingCondition === 'reusable';
    const unusable = input.handlingCondition === 'unusable';
    const handling = ['팩을 뜯거나 내용물을 하수구에 붓지 마세요.'];
    applyLocalMethod(unusable ? {
      method: '오염·훼손된 젤 아이스팩 · 종량제봉투로 배출',
      reason: '경기 광주시는 재사용할 수 있는 깨끗하고 온전한 팩만 전용 수거함으로 받아요.',
      steps: [...handling, '오염됐거나 터진 팩은 내용물이 새지 않게 담아 종량제봉투로 배출해 주세요.'],
      status: 'general', source: REGIONAL_SOURCES.gyeonggiGwangjuRecycle, note: '재사용 수거함에는 오염·훼손된 팩을 넣지 마세요.', key: 'ice-pack:volume-bag',
    } : {
      method: reusable ? '깨끗하고 온전한 젤 아이스팩 · 경기 광주시 전용 수거함' : '젤 아이스팩 상태 확인 · 경기 광주시 전용 수거함',
      reason: '경기 광주시는 오염이나 파손이 없는 젤 아이스팩을 모아 세척하고 재사용해요.',
      steps: [...handling, reusable ? '시에서 안내하는 젤 아이스팩 전용 수거함에 넣어 주세요.' : '팩 겉면에 오염이 있거나 내용물이 새는지 확인해 주세요.'],
      pendingCondition: reusable ? undefined : 'handling',
      source: REGIONAL_SOURCES.gyeonggiGwangjuIcePack, note: '광주시청 안내에 행정복지센터 등 전용 수거함 위치가 있어요.',
      key: reusable ? 'ice-pack:gyeonggi-gwangju-reuse' : 'ice-pack:gyeonggi-gwangju-check',
    });
  }
  if (region?.province === '서울특별시' && single && result.parts.length === 1 && result.parts[0].label === '본체' && !geumcheonFood) {
    const city = (url, note, key) => {
      set(url, note, key);
      result.regional.scope = 'city'; result.regional.cityLabel = '서울시';
      result.regional.notes.push(SEOUL_SCOPE_NOTE);
      result.regional.sources.push(SEOUL_SOURCES.scope);
      result.sourceUrls = [...new Set([...result.sourceUrls, SEOUL_SOURCES.scope])];
    };
    if (knownGlass && region.district === '강남구') {
      applyLocalMethod({
        method: '깨진 유리 · 강남구 불연성 PP봉투로 배출',
        reason: '강남구는 깨진 유리를 태워서는 안 되는 쓰레기로 분류해 전용 PP봉투를 안내해요.',
        steps: ['파편을 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '강남구 불연성 PP봉투에 담아 배출해 주세요. 20L 봉투 10개 분량을 초과하면 대형생활폐기물 배출 절차를 확인해 주세요.'],
        source: REGIONAL_SOURCES.gangnamWaste, note: '봉투에 담기 어려운 크기나 양은 강남구에 배출 방법을 확인해 주세요.', key: 'glass:gangnam-pp-sack',
      });
    } else if (knownGlass && region.district === '강동구') {
      applyLocalMethod({
        method: '깨진 유리 · 강동구 특수 종량제 마대',
        reason: '강동구는 가정에서 나온 깨진 유리를 불연성 폐기물로 구분해 특수 종량제 마대를 사용해요.',
        steps: ['파편을 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '강동구 특수 종량제 마대에 담아 배출해 주세요. 가정에서 나온 깨진 유리는 배출 신고 없이 내놓아요.'],
        source: REGIONAL_SOURCES.gangdongWaste, note: '공사장에서 나온 폐기물은 강동구의 별도 신고 안내를 확인해 주세요.', key: 'glass:gangdong-sack-no-report',
      });
    } else if (knownGlass && region.district === '송파구') {
      applyLocalMethod({
        method: '깨진 유리 · 송파구 특수마대에 담아 신고 후 배출',
        reason: '송파구는 유리 조각을 재활용 수거 대상에서 제외하고 별도 배출 절차를 안내해요.',
        steps: ['파편을 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '주소지 지정판매소의 특수마대에 담은 뒤 관할 청소대행업체에 신고하고 안내받은 장소에 배출해 주세요.'],
        source: REGIONAL_SOURCES.songpaWaste, note: '지정판매소와 담당 청소대행업체는 송파구에 확인해 주세요.', key: 'glass:songpa-sack-report',
      });
    } else if (knownGlass && region.district === '도봉구') {
      applyLocalMethod({
        method: '깨진 유리 · 양에 따라 봉투 선택',
        reason: '유리 파편에 다치지 않도록 감싸고, 도봉구 품목별 안내에 따라 양에 맞는 봉투를 사용해요.',
        steps: ['파편을 신문지 등으로 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '도봉구는 소량이면 종량제봉투, 다량이면 특수규격봉투(PP마대)를 안내해요.'],
        source: REGIONAL_SOURCES.dobongWaste, note: '봉투에 담기 어려운 크기나 양은 도봉구에 배출 방법을 확인해 주세요.', key: 'glass:seoul-amount',
      });
    } else if (knownGlass && input.material === '유리' && input.type === 'broken') {
      result.method = '깨진 유리 · 서울시 공통 안내 확인';
      result.reasons = ['서울시 공통 안내는 깨진 유리를 일반 유리병과 구분하고, 양에 따라 봉투나 마대를 달리 사용해요.'];
      result.steps = ['파편을 신문지 등으로 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '서울시 표준안은 소량은 종량제봉투, 다량은 특수규격마대를 안내해요. 크기·수량과 해당 구의 수거 기준을 먼저 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], method: result.method, steps: [...result.steps], reasons: [...result.reasons] };
      city(SEOUL_SOURCES.recycle, '깨진 유리는 일반 유리병 수거함에 넣지 말고 양과 구별 수거 기준을 확인해 주세요.', 'glass:seoul-amount');
    } else if (input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && !usesSeoulVinylQuestions(region)
        && (['recycle', 'general'].includes(result.status) || result.pendingCondition === 'removable')) {
      const note = '도봉구는 이물질을 완전히 제거한 비닐만 투명봉투에 모아 배출해요.';
      const reason = result.status === 'general' ? '도봉구는 이물질이 묻은 비닐을 종량제봉투로 안내해요.'
        : result.pendingCondition === 'removable' ? '도봉구는 이물질이 남은 비닐을 받지 않아서 제거할 수 있는지 확인해야 해요.'
          : note;
      applyLocalMethod({ method: result.method, reason, steps: result.steps, status: result.status, pendingCondition: result.pendingCondition,
        source: REGIONAL_SOURCES.dobongWaste, note, key: result.regional.comparisonKey });
    } else if (input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && input.contaminated === 'no' && result.status === 'recycle') {
      city(SEOUL_SOURCES.vinyl, '비닐류는 다른 재활용품과 섞지 않고 투명 봉투에 모아 배출해 주세요.');
    } else if (input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && (['recycle', 'general'].includes(result.status) || result.pendingCondition === 'removable')) {
      if (input.contaminated === 'yes') {
        delete result.pendingCondition;
        if (input.vinylResidue === 'liquid-only') {
          result.status = 'recycle'; result.method = '비닐류로 분리배출 · 서울시 공통 안내';
          result.reasons = ['내용물을 비웠고 고형물 없이 기름·물 자국만 남았다고 확인했어요. 서울시 폐비닐 수거 안내를 적용해요.'];
          result.steps = ['음식물·소스·부스러기 등 고형물이 없는지 다시 확인해 주세요.', '폐비닐 전용봉투가 있으면 사용하고, 없으면 투명 봉투에 비닐끼리 모아 배출해 주세요.'];
        } else if (input.vinylResidue === 'solids' && input.removable === 'yes' && result.status === 'recycle') {
          result.method = '고형물 제거 후 비닐류로 분리배출 · 서울시 공통 안내';
          result.reasons = ['고형물이 남아 있어 헹궈 제거한 뒤 배출해야 해요. 기름·물 자국만 남는 것은 수거할 수 있어요.'];
          result.steps = ['내용물을 비우고 음식물·소스 등 고형물을 물로 헹궈 제거해 주세요.', '고형물을 제거한 뒤 전용봉투 또는 투명 봉투에 비닐끼리 모아 배출해 주세요. 제거되지 않으면 구청·관리사무소에 수거 방법을 확인해 주세요.'];
        } else {
          result.status = 'check'; result.method = input.vinylResidue !== 'solids'
            ? '비닐의 내용물·고형물 확인 필요 · 서울시 안내'
            : input.removable === 'no' ? '고형물이 남은 비닐 · 지역 배출 방법 확인'
              : '비닐에 남은 고형물 제거 가능 여부 확인';
          if (input.vinylResidue !== 'solids') result.pendingCondition = 'vinyl-residue';
          else if (!['yes', 'no'].includes(input.removable)) result.pendingCondition = 'removable';
          result.reasons = [input.vinylResidue !== 'solids' ? '서울시는 기름·물 자국과 고형물이 남은 경우를 다르게 안내해요.'
            : input.removable === 'no' ? '제거하기 어려운 고형물이 남아 있어 구별 수거 기준을 확인해야 해요.'
              : '고형물을 제거할 수 있는지 확인해야 비닐류로 배출할 수 있는지 알 수 있어요.'];
          result.steps = input.vinylResidue !== 'solids'
            ? ['내용물을 비우고 비닐에 남은 것이 기름·물 자국인지 고형물인지 확인해 주세요.']
            : input.removable === 'no'
              ? ['제거하기 어려운 고형물이 붙은 비닐은 관할 구청이나 관리사무소에 배출 방법을 확인해 주세요.']
              : ['음식물·소스·부스러기를 비우거나 헹궈 제거할 수 있는지 확인해 주세요.'];
        }
        result.parts[0] = { label: result.parts[0].label, material: result.parts[0].material, status: result.status, method: result.method, reasons: [...result.reasons], steps: [...result.steps],
          ...(result.pendingCondition ? { pendingCondition: result.pendingCondition } : {}) };
      }
      city(SEOUL_SOURCES.vinyl, SEOUL_VINYL_NOTE, 'vinyl:seoul-expanded');
    } else if (result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft') {
      city(SEOUL_SOURCES.food, '음식물은 물기를 줄여 구에서 지정한 방식으로 배출해 주세요. RFID 기기가 설치된 곳은 해당 기기를 이용하고, 그 외 봉투·용기 방식은 거주지 안내를 확인해 주세요.', 'food:seoul-local');
    } else if (result.status === 'general' && input.material === '음식물류' && ['excluded', 'fibrous'].includes(input.type)) {
      city(SEOUL_SOURCES.recycle, '단단한 뼈·껍데기와 질긴 뿌리 등은 음식물 수거에 섞지 말고 일반폐기물 배출 기준을 확인해 주세요.');
    } else if (result.status === 'recycle' && input.combined === 'no' && region.district === '도봉구'
        && input.material === '종이' && input.type === 'carton') {
      applyLocalMethod({
        method: '종이팩으로 분리배출 · 도봉구',
        reason: '종이팩은 일반 종이와 수거 방법이 달라요. 도봉구는 종이팩을 씻어 압착한 뒤 따로 모아요.',
        steps: ['내용물을 비우고 깨끗하게 헹궈 주세요.', '종이팩을 납작하게 눌러 투명봉투에 넣거나 묶어서 배출해 주세요.'],
        status: 'recycle', source: REGIONAL_SOURCES.dobongWaste, note: '일반 종이와 섞이지 않도록 종이팩만 모아 주세요.', key: 'carton:dobong-clear-bag-or-bundle',
      });
    } else if (result.regional.coverage !== 'verified' && result.status === 'recycle' && input.combined === 'no') {
      const key = seoulRecycleKey(input);
      if (key) city(SEOUL_SOURCES.recycle, SEOUL_RECYCLE_NOTES[key], key === 'carton' ? 'carton:separate-with-paper-fallback' : undefined);
    }
  }
  if (region?.province === '경기도' && region.district === '광주시' && single && input.combined === 'no'
      && input.material === '비닐' && input.type === 'packaging' && result.status === 'general') {
    applyLocalMethod({
      method: result.method,
      reason: '경기 광주시는 음식물이나 스티커를 제거할 수 없는 비닐은 종량제봉투로 안내해요.',
      steps: result.steps, status: result.status, source: REGIONAL_SOURCES.gyeonggiGwangjuRecycle,
      note: '비닐류 수거 전에 내용물과 이물질을 제거해 주세요.', key: result.regional.comparisonKey,
    });
  }
  if (geumcheonFood && input.type === 'residue' && result.status === 'check' && result.parts.length===1 && result.parts[0].label==='본체') {
    result.status = 'general'; result.method = '금천구 음식물 수거 제외 · 일반규격봉투 배출';
    result.reasons = ['금천구 안내에서 이 찌꺼기는 음식물 수거 대상에서 제외돼요.'];
    result.steps = ['포장·이물질을 따로 분리해 주세요.', '금천구 안내에 따라 생활폐기물 일반규격봉투로 배출해 주세요.', '커피박 등 별도 회수 사업을 이용하려면 해당 접수 조건을 먼저 확인해 주세요.'];
    result.parts[0] = {...result.parts[0],status:result.status,method:result.method,steps:[...result.steps],reasons:[...result.reasons]};
  }
  if (geumcheonFood && ['general', 'recycle'].includes(result.status)) {
    set(REGIONAL_SOURCES.geumcheonFood, result.status === 'general'
      ? '금천구는 해당 음식물 수거 제외 품목을 생활폐기물 일반규격봉투로 배출하도록 안내해요. 별도 회수 사업이 있으면 해당 안내를 확인해 주세요.'
      : '금천구 안내에 따라 음식물 외 이물질과 수분을 제거하고 음식물류 수거 방식에 맞춰 배출해 주세요.');
    if (input.type === 'soft') result.regional.comparisonKey = 'food:seoul-local';
    if (input.type === 'residue') result.regional.comparisonKey = 'food:geumcheon-residue';
  }
  const daejeon = region?.province === '대전광역시' && DAEJEON_GUIDES[region.district];
  if (daejeon && single) {
    if (result.handling === 'large' && region.district === '유성구' && /책상/.test(input.itemName || '')) {
      result.method = '책상 · 유성구 대형폐기물 품목 확인 후 신청';
      result.steps = ['서랍이 한쪽인지 양쪽인지, 컴퓨터용인지, 책장·서랍장이 포함된 세트인지 확인해 주세요.', '유성구 품목표에서 맞는 책상 항목과 수수료를 확인해 배출 신청하세요.', '신청 후 안내받은 필증·배출일·지정 장소를 따라 주세요.'];
      result.parts[0] = { ...result.parts[0], method: result.method, steps: [...result.steps] };
      result.regional.checkedAt = '2026-11-11';
      set(REGIONAL_SOURCES.yuseongLargeFees, '유성구 품목표는 책상을 양수, 편수, 컴퓨터용, 세트로 구분해요.', 'desk:yuseong-types');
    } else if (yuseong && (knownGlass || result.handling === 'ceramic')) {
      const name = knownGlass ? '깨진 유리' : '도자기류';
      applyLocalMethod({
        method: `${name} · 유성구 특수규격봉투(마대)로 배출`,
        reason: '유성구는 깨진 유리와 도자기류를 불연성 폐기물로 수거해요.',
        steps: ['날카로운 조각은 신문지 등으로 감싸고 내용물을 표시해 주세요.', '유성구 특수규격봉투에 담아 배출한 뒤 봉투 상단에 적힌 수거업체에 신고해 주세요.'],
        status: 'general', source: YUSEONG_WASTE_GUIDE,
        note: '특수규격봉투는 구청, 동 행정복지센터, 지정 판매처에서 살 수 있어요.',
        key: knownGlass ? 'glass:yuseong-sack' : 'ceramic:yuseong-sack',
      });
    } else if (knownGlass && region.district === '서구' && input.material === '유리' && input.type === 'broken') {
      result.status = 'general'; result.method = '깨진 유리 · 안전 포장 후 서구 종량제봉투로 배출';
      result.reasons = ['파편으로 다칠 수 있어 대전 서구는 유리를 안전하게 감싼 뒤 봉투에 위험물 표시를 하도록 안내해요.'];
      result.steps = ['유리 조각을 신문지 등으로 안전하게 감싸 주세요.', '종량제봉투 겉면에 위험물이라고 크게 표시해 주세요.', '봉투에 담기 어려운 크기·양은 서구에 별도 처리 방법을 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps], reasons: [...result.reasons] };
      set(daejeon.recycle, '대전 서구는 깨진 유리를 안전하게 포장하고 종량제봉투에 위험물 표시를 하도록 안내해요.', 'glass:seogu-bag');
    } else if (result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft') {
      const foodMethods = { 중구: 'sticker-3-or-5l', 대덕구: 'sticker-3-or-5l', 동구: 'sticker-5l', 서구: 'container', 유성구: 'cleannet' };
      set(daejeon.food, daejeon.foodNote, `food:daejeon-${foodMethods[region.district]}`);
      result.steps = result.steps.filter(step => !step.includes('전용 봉투·전용 용기·RFID'));
      result.parts[0].steps = [...result.steps, daejeon.foodNote];
    } else if (result.status === 'recycle' && input.combined === 'no' && region.district === '유성구' && input.material === '스티로폼') {
      result.status = 'check'; result.method = '스티로폼 색상·이물질 추가 확인 필요';
      result.reasons = ['유성구는 색이 있거나 이물질이 남은 스티로폼을 일반 재활용품으로 수거하지 않아요.'];
      result.steps = ['테이프·운송장을 제거하고 이물질이 남아 있지 않은지 확인해 주세요.', '유성구 안내에서 유색 스티로폼은 수거 제외 대상이므로 색상과 실제 수거 여부를 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps], reasons: [...result.reasons] };
      set(daejeon.recycle, '유성구는 색이 있거나 이물질이 남은 스티로폼을 일반 재활용 수거 대상에서 제외해요.', 'foam:yuseong-color');
    } else if ((result.status === 'general' || result.pendingCondition === 'removable') && input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && region.district === '유성구') {
      set(daejeon.recycle, daejeon.vinyl);
    } else if (result.status === 'recycle' && input.combined === 'no') {
      const note = daejeonRecycleNote(daejeon, input);
      if (note) set(daejeon.recycle, note, daejeonComparisonKey(region.district, input));
    }
  }
  // 라벨·뚜껑을 떼어 각각 분리배출하는 물건(예: 라벨 붙은 생수병)도 본체에는 지역 기준을 붙입니다.
  // 부속품마다 다른 지역 문장을 섞으면 헷갈리므로 본체 재질의 문장 하나만 더합니다.
  const separated = input.combined === 'yes' && input.separable === 'yes' && input.components?.length
    && result.parts[0]?.label === '본체' && result.parts[0].status === 'recycle';
  const regionalBody = separated && (result.status !== 'recycle' || Boolean(detachedCarton && localCarton));
  if (separated && result.regional.coverage !== 'verified') {
    if (region?.province === '서울특별시') {
      const key = seoulRecycleKey(input);
      if (key) {
        set(SEOUL_SOURCES.recycle, SEOUL_RECYCLE_NOTES[key], key === 'carton' ? 'carton:separate-with-paper-fallback' : undefined);
        result.regional.scope = 'city'; result.regional.cityLabel = '서울시';
        result.regional.notes.push(SEOUL_SCOPE_NOTE);
        result.regional.sources.push(SEOUL_SOURCES.scope);
        result.sourceUrls = [...new Set([...result.sourceUrls, SEOUL_SOURCES.scope])];
      }
    } else if (region?.province === '경기도' && region.district === '김포시' && input.material === '페트병' && input.type === 'clear-drink') {
      set(REGIONAL_SOURCES.gimpoRecycle, '김포시: 공동주택은 투명 페트병 전용 수거함, 단독주택 등은 전용봉투 또는 투명·반투명 봉투에 담아 배출해요.', 'pet:gimpo-collection');
    } else if (daejeon && input.material !== '비닐') {
      const note = daejeonRecycleNote(daejeon, input);
      if (note) set(daejeon.recycle, note, daejeonComparisonKey(region.district, input));
    }
  }
  // 광역시(대구·광주·울산): 시청 공통 안내 문장을 붙입니다. 구·군별 수거 요일·장소는 구청 안내를 따릅니다.
  const metro = METRO_GUIDES[region?.province]?.city;
  if (metro && result.regional.coverage !== 'verified' && result.parts[0]?.label === '본체') {
    const bodyRecyclable = separated || (result.status === 'recycle' && input.combined === 'no');
    const notes = [];
    const isFood = single && result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft' && Boolean(metro.foodNote);
    if (isFood) notes.push(metro.foodNote);
    else if (bodyRecyclable && !(input.material === '비닐' && input.contaminated === 'yes')) {
      const note = metro.notes[metroRecycleKey(input)];
      if (note) notes.push(note, ...(metro.notes.where ? [metro.notes.where] : []));
    }
    if (notes.length) {
      const scopeNote = `${metro.label} 공통 안내예요. 구·군마다 수거 요일·장소가 다를 수 있으니 구청·관리사무소 안내를 함께 확인해 주세요.`;
      const methodKey = isFood ? `food:${region.province}`
        : region.province === '대구광역시' && input.material === '비닐' ? 'vinyl:daegu-bundle'
          : region.province === '광주광역시' && input.material === '종이' && input.type === 'carton' ? 'carton:separate-with-paper-fallback'
            : undefined;
      for (const note of notes) set(isFood ? metro.food || metro.recycle : metro.recycle, note, methodKey);
      result.regional.scope = 'city'; result.regional.cityLabel = metro.label; result.regional.scopeNote = scopeNote; result.regional.checkedAt = METRO_CHECKED_AT;
      result.regional.notes.push(scopeNote);
      if (isFood) result.steps = result.steps.filter(step => !step.includes('전용 봉투·전용 용기·RFID'));
    }
  }
  if (result.regional.coverage === 'verified') {
    const scopeNotes = [SEOUL_SCOPE_NOTE, result.regional.scopeNote].filter(Boolean);
    const notes = result.regional.notes.filter(note => !scopeNotes.includes(note) && !(note === SEOUL_VINYL_NOTE && input.contaminated === 'yes'));
    const target = regionalBody ? result.parts[0] : result;
    target.steps = [...new Set([...target.steps, ...notes])];
    result.reasons.push(result.regional.scope === 'city' ? `${cityGuidanceLabel(result)}를 적용했어요. 해당 구·군의 수거 기준도 확인해 주세요.` : `${regionLabel(region)} 공식 자료로 확인한 해당 품목의 지역 기준을 적용했어요.`);
    result.notice = medicine ? '수거함 위치와 접수 가능 여부는 방문 전에 확인해 주세요.' : result.regional.scope === 'city' ? result.regional.scopeNote || SEOUL_SCOPE_NOTE : '표시된 품목의 지역 기준을 적용했어요. 배출일·시간·장소는 동별·주택 유형·관리사무소 안내를 확인해 주세요.';
  }
  if (region && input.combined === 'yes' && input.separable === 'yes' && result.parts.length > 1) {
    const componentKeys = [];
    result.parts = result.parts.map((part, index) => {
      const condition = input.components?.[index - 1];
      if (condition?.material !== '비닐' || condition.type !== 'packaging' || condition.contaminated !== 'yes'
          || !['recycle', 'general'].includes(part.status) && part.pendingCondition !== 'removable') return part;
      const local = applyRegionalRules({ ...condition, region, combined: 'no' }, {
        ...part, parts: [{ ...part, label: '본체' }], sourceUrls: [],
      }, asOf);
      if (local.regional.coverage !== 'verified') return part;
      const wasVerified = result.regional.coverage === 'verified';
      result.regional.coverage = 'verified';
      result.regional.sources = [...new Set([...result.regional.sources, ...local.regional.sources])];
      result.sourceUrls = [...new Set([...result.sourceUrls, ...local.sourceUrls])];
      if (!wasVerified) {
        for (const key of ['scope', 'cityLabel', 'scopeNote']) result.regional[key] = local.regional[key];
        result.notice = local.notice;
      } else if (result.regional.scope === 'city' && !local.regional.scope) {
        for (const key of ['scope', 'cityLabel', 'scopeNote']) delete result.regional[key];
        result.notice = '본체는 서울시 공통 안내를, 오염된 비닐 부속품은 구청 기준을 적용했어요.';
      }
      result.regional.checkedAt = [result.regional.checkedAt, local.regional.checkedAt].sort().at(-1);
      componentKeys.push(`${index}:${local.regional.comparisonKey}`);
      const { status, method, reasons, steps, pendingCondition } = local;
      return { ...part, status, method, reasons, steps, pendingCondition };
    });
    if (componentKeys.length) {
      result.regional.comparisonKey += `|${componentKeys.join('|')}`;
      if (result.parts.some(part => part.status === 'check')) {
        result.status = 'check'; result.method = '일부 재질 추가 확인 필요';
      } else if (result.parts.every(part => part.status === 'general')) {
        result.status = 'general'; result.method = '본체와 부속품 모두 종량제봉투로 배출';
      } else {
        result.status = result.parts.some(part => part.status === 'general') ? 'mixed' : 'recycle';
        result.method = '본체와 부속품을 각각 분리배출';
      }
    }
  }
  if (yuseong) {
    const rows = yuseongDisposalSchedule(result);
    if (rows.length) {
      result.disposalSchedule = { district: region.district, source: YUSEONG_WASTE_GUIDE, rows };
      result.sourceUrls = [...new Set([...result.sourceUrls, YUSEONG_WASTE_GUIDE])];
      if (result.status !== 'check') result.notice = '표시된 배출 일정은 유성구청 생활쓰레기 안내를 적용했어요.';
    }
  }
  if (result.regional.coverage !== 'verified' && !result.disposalSchedule) {
    result.regional.notes.push(region ? '이 지역의 해당 품목에 대한 세부 기준은 아직 검증하지 못했어요. 아래 기본 안내를 참고하고 관할 시·군·구 청소 담당 부서 또는 관리사무소에 확인해 주세요.' : '지역을 설정하면 확인된 지역별 기준을 적용할 수 있어요. 현재는 기본 안내예요.');
  }
  return result;
}

function daejeonComparisonKey(district, input) {
  if (input.material !== '종이' || input.type !== 'carton') return;
  if (['동구', '중구'].includes(district)) return 'carton:separate-with-recycling-fallback';
  if (district === '유성구') return 'carton:separate-from-paper';
}
