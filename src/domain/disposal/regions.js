export const PROVINCES = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'];
export const SEOUL_DISTRICTS = '종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구'.split(' ');
export { DAEJEON_DISTRICTS } from './daejeon-guides.js';
import { DAEJEON_DISTRICTS, DAEJEON_GUIDES, DAEJEON_SOURCES } from './daejeon-guides.js';
import { SEOUL_SOURCES, SEOUL_RECYCLE_NOTES, SEOUL_SCOPE_NOTE, SEOUL_VINYL_NOTE } from './seoul-guides.js';
import { MEDICINE_SAFETY_STEPS, MEDICINE_SOURCES, medicineRegionalGuidance } from './medicine-guide.js';
import { METRO_GUIDES, METRO_DISTRICTS, METRO_CITY_SOURCES, METRO_CHECKED_AT } from './metro-guides.js';
import { CITY_GUIDES } from './city-guides.js';
export { METRO_DISTRICTS } from './metro-guides.js';
export const citySuggestionsFor = province => Object.keys(CITY_GUIDES[province] || {});
export const districtsFor = province => province === '서울특별시' ? SEOUL_DISTRICTS
  : province === '대전광역시' ? DAEJEON_DISTRICTS : METRO_DISTRICTS[province] || [];
export const COMPARISON_REGIONS = [
  ...SEOUL_DISTRICTS.map(district => ({ province: '서울특별시', district })),
  ...DAEJEON_DISTRICTS.map(district => ({ province: '대전광역시', district })),
  { province: '경기도', district: '김포시' },
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
export const cityGuidanceLabel = result => `${result.regional?.cityLabel || '서울시'} 공통 안내`;

export function resultRegionLabel(result) {
  const { regional, region } = result;
  if (!regional) return '지역 미기록';
  if (regional.coverage !== 'verified') return `${regional.label} · ${region ? '기본 안내 · 지역 기준 확인 필요' : '기본 안내'}`;
  return `${regional.label} · ${regional.scope === 'city' ? `${cityGuidanceLabel(result)} · 구·군별 수거 확인 필요` : '지역 기준 적용'}`;
}

export const REGIONAL_SOURCES = {
  ...Object.fromEntries(Object.entries(SEOUL_SOURCES).map(([key, url]) => [`seoul${key}`, url])),
  ...Object.fromEntries(DAEJEON_SOURCES.map((url, index) => [`daejeon${index}`, url])),
  ...Object.fromEntries(METRO_CITY_SOURCES.map((url, index) => [`metro${index}`, url])),
  gimpoWaste: 'https://m.gimpo.go.kr/portal/contents.do?key=2723',
  gimpoRecycle: 'https://gimpo.go.kr/portal/contents.do?key=1435',
  geumcheonFood: 'https://geumcheon.go.kr/portal/contents.do?key=818',
  ...Object.fromEntries(Object.entries(MEDICINE_SOURCES).map(([key, url]) => [`medicine-${key}`, url])),
};
export function regionalSourceLabel(url) {
  if (url === MEDICINE_SOURCES.seoul) return '서울시 폐의약품 수거 안내';
  if (url === MEDICINE_SOURCES.daejeon) return '대전시 가정 내 폐의약품 안내';
  if (url === MEDICINE_SOURCES.donggu) return '대전 동구 폐의약품 배출 안내';
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
  if (material === '종이') return ({ paper: 'paper', carton: 'carton', cup: 'cup' })[type] || null;
  if (material === '페트병' && type === 'clear-drink') return 'pet';
  if (material === '스티로폼') return 'foam';
  return ['플라스틱', '페트병', '유리', '금속·캔'].includes(material) ? 'container' : null;
}
// 광역시(대구·광주·울산) 시청 공통 안내에서 재질에 맞는 문장 이름을 고릅니다.
function metroRecycleKey({ material, type }) {
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
  const key = material === '종이' ? (type === 'carton' ? 'carton' : type === 'paper' ? 'paper' : null)
    : material === '비닐' ? 'vinyl' : ['플라스틱', '페트병', '유리', '금속·캔', '스티로폼'].includes(material) ? 'container' : null;
  if (!key) return null;
  return guide[key] || (key === 'carton' ? guide.container : null) || null;
}
// 지역·품목별로 검증한 규칙만 적용합니다. 위험 품목/이름 충돌/미등록 품목의 판단을 뒤집지 않습니다.
export function applyRegionalRules(input, base) {
  const region = normalizeRegion(input.region);
  const result = structuredClone(base);
  result.region = region;
  result.regional = { coverage: 'unverified', label: regionLabel(region), checkedAt: '2026-10-27', sources: [], notes: [], comparisonKey: `basic:${base.status}:${base.method}` };
  const single = input.combined !== 'yes' && !input.components?.length;
  const knownGlass = result.parts.length === 1 && result.parts[0].label === '본체' && result.reasons.some(reason => reason.includes('일반 재활용 수거 대상'));
  const set = (url, note, comparisonKey) => {
    result.regional.coverage = 'verified';
    result.regional.sources.push(url); result.regional.notes.push(note);
    if (comparisonKey) result.regional.comparisonKey = comparisonKey;
    result.sourceUrls = [...new Set([...result.sourceUrls, url])];
  };
  const medicine = region && result.handling === 'medicine' && medicineRegionalGuidance(region, input.itemName);
  if (medicine) {
    result.regional.scope = medicine.scope;
    if (medicine.scope === 'city') result.regional.cityLabel = region.province === '대전광역시' ? '대전시' : '서울시';
    result.regional.checkedAt = '2026-11-11';
    result.sourceUrls = result.sourceUrls.filter(url => url !== MEDICINE_SOURCES.seoul);
    result.steps = [...MEDICINE_SAFETY_STEPS, medicine.preparation];
    result.parts[0].steps = [...result.steps, medicine.collection];
    set(medicine.source, medicine.collection, medicine.key);
  }
  if (region?.province === '경기도' && region.district === '김포시') {
    if (single && knownGlass && input.material === '유리' && input.type === 'broken') {
      const method = '깨진 유리 · 김포시 백색마대봉투로 배출';
      const steps = ['날카로운 유리를 안전하게 감싸고 깨진 유리가 들어 있음을 표시해 주세요.', '김포시 불연성 가정특수폐기물용 백색마대봉투에 담아 배출해 주세요.', '대량·대형 유리는 수거 가능 여부를 김포시에 먼저 확인해 주세요.'];
      result.method = method; result.steps = steps;
      // 일반 종량제와 다른 불연성 전용 배출이므로 추가 확인 분류를 유지합니다.
      result.parts[0] = { ...result.parts[0], method, steps: [...steps] };
      set(REGIONAL_SOURCES.gimpoWaste, '김포시는 깨진 유리를 불연성 가정특수폐기물로 구분하고 백색마대봉투 사용을 안내해요.', 'glass:gimpo-sack');
    }
    if (single && result.status === 'recycle' && input.material === '페트병' && input.type === 'clear-drink' && input.combined === 'no') {
      set(REGIONAL_SOURCES.gimpoRecycle, '김포시: 공동주택은 투명 페트병 전용 수거함, 단독주택 등은 전용봉투 또는 투명·반투명 봉투에 담아 배출해요.', 'pet:gimpo-collection');
    }
  }
  const geumcheonFood = region?.province === '서울특별시' && region.district === '금천구' && single && input.material === '음식물류';
  if (region?.province === '서울특별시' && single && result.parts.length === 1 && result.parts[0].label === '본체' && !geumcheonFood) {
    const city = (url, note, key) => {
      set(url, note, key);
      result.regional.scope = 'city'; result.regional.cityLabel = '서울시';
      result.regional.notes.push(SEOUL_SCOPE_NOTE);
      result.regional.sources.push(SEOUL_SOURCES.scope);
      result.sourceUrls = [...new Set([...result.sourceUrls, SEOUL_SOURCES.scope])];
    };
    if (knownGlass && input.material === '유리' && input.type === 'broken') {
      result.method = '깨진 유리 · 서울시 공통 안내 확인';
      result.steps = ['파편을 신문지 등으로 감싸 날카로운 부분이 드러나지 않게 해 주세요.', '서울시 표준안은 소량은 종량제봉투, 다량은 특수규격마대를 안내해요. 크기·수량과 해당 구의 수거 기준을 먼저 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], method: result.method, steps: [...result.steps] };
      city(SEOUL_SOURCES.recycle, '깨진 유리는 일반 유리병 수거함에 넣지 말고 양과 구별 수거 기준을 확인해 주세요.', 'glass:seoul-amount');
    } else if (input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && (['recycle', 'general'].includes(result.status) || result.pendingCondition === 'removable')) {
      if (input.contaminated === 'yes') {
        delete result.pendingCondition;
        if (input.vinylResidue === 'liquid-only') {
          result.status = 'recycle'; result.method = '비닐류로 분리배출 · 서울시 공통 안내';
          result.reasons = ['내용물을 비웠고 고형물 없이 기름·물 자국만 남았다고 확인했어요. 서울시 폐비닐 수거 안내를 적용해요.'];
          result.steps = ['음식물·소스·부스러기 등 고형물이 없는지 다시 확인해 주세요.', '폐비닐 전용봉투가 있으면 사용하고, 없으면 투명 봉투에 비닐끼리 모아 배출해 주세요.'];
        } else if (input.vinylResidue === 'solids' && input.removable === 'yes') {
          result.method = '고형물 제거 후 비닐류로 분리배출 · 서울시 공통 안내';
          result.reasons = ['고형물이 남아 있어 헹궈 제거한 뒤 배출해야 해요. 기름·물 자국만 남는 것은 수거할 수 있어요.'];
          result.steps = ['내용물을 비우고 음식물·소스 등 고형물을 물로 헹궈 제거해 주세요.', '고형물을 제거한 뒤 전용봉투 또는 투명 봉투에 비닐끼리 모아 배출해 주세요. 제거되지 않으면 구청·관리사무소에 수거 방법을 확인해 주세요.'];
        } else {
          result.status = 'check'; result.method = '비닐의 내용물·고형물 확인 필요 · 서울시 안내';
          if (input.vinylResidue !== 'solids') result.pendingCondition = 'vinyl-residue';
          result.reasons = [input.vinylResidue === 'solids' ? '제거하기 어려운 고형물이 남아 있어 구별 수거 기준을 확인해야 해요.' : '남은 오염이 기름·물 자국인지 고형물인지 아직 확인되지 않았어요.'];
          result.steps = ['‘조건 수정’에서 비닐에 남은 오염 종류를 확인해 주세요.', '음식물·소스·부스러기는 비우거나 헹궈 제거해 주세요. 제거되지 않는 고형물은 구청·관리사무소에 수거 방법을 확인해 주세요.'];
        }
        result.parts[0] = { label: result.parts[0].label, material: result.parts[0].material, status: result.status, method: result.method, reasons: [...result.reasons], steps: [...result.steps] };
      }
      city(SEOUL_SOURCES.vinyl, SEOUL_VINYL_NOTE, 'vinyl:seoul-expanded');
    } else if (result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft') {
      city(SEOUL_SOURCES.food, '음식물은 물기를 줄여 구에서 지정한 방식으로 배출해 주세요. RFID 기기가 설치된 곳은 해당 기기를 이용하고, 그 외 봉투·용기 방식은 거주지 안내를 확인해 주세요.', 'food:seoul-local');
    } else if (result.status === 'general' && input.material === '음식물류' && ['excluded', 'fibrous'].includes(input.type)) {
      city(SEOUL_SOURCES.recycle, '단단한 뼈·껍데기와 질긴 뿌리 등은 음식물 수거에 섞지 말고 일반폐기물 배출 기준을 확인해 주세요.');
    } else if (result.status === 'recycle' && input.combined === 'no') {
      const key = seoulRecycleKey(input);
      if (key) city(SEOUL_SOURCES.recycle, SEOUL_RECYCLE_NOTES[key], key === 'carton' ? 'carton:seoul-separated' : undefined);
    }
  }
  if (geumcheonFood && input.type === 'residue' && result.status === 'check' && result.parts.length===1 && result.parts[0].label==='본체') {
    result.status = 'general'; result.method = '금천구 음식물 수거 제외 · 일반규격봉투 배출';
    result.steps = ['포장·이물질을 따로 분리해 주세요.', '금천구 안내에 따라 생활폐기물 일반규격봉투로 배출해 주세요.', '커피박 등 별도 회수 사업을 이용하려면 해당 접수 조건을 먼저 확인해 주세요.'];
    result.parts[0] = {...result.parts[0],status:result.status,method:result.method,steps:[...result.steps]};
  }
  if (geumcheonFood && ['general', 'recycle'].includes(result.status)) {
    set(REGIONAL_SOURCES.geumcheonFood, result.status === 'general'
      ? '금천구는 해당 음식물 수거 제외 품목을 생활폐기물 일반규격봉투로 배출하도록 안내해요. 별도 회수 사업이 있으면 해당 안내를 확인해 주세요.'
      : '금천구 안내에 따라 음식물 외 이물질과 수분을 제거하고 음식물류 수거 방식에 맞춰 배출해 주세요.');
    if (input.type === 'soft') result.regional.comparisonKey = 'food:seoul-local';
  }
  const daejeon = region?.province === '대전광역시' && DAEJEON_GUIDES[region.district];
  if (daejeon && single) {
    if (knownGlass && region.district === '서구' && input.material === '유리' && input.type === 'broken') {
      result.status = 'general'; result.method = '깨진 유리 · 안전 포장 후 서구 종량제봉투로 배출';
      result.steps = ['유리 조각을 신문지 등으로 안전하게 감싸 주세요.', '종량제봉투 겉면에 위험물이라고 크게 표시해 주세요.', '봉투에 담기 어려운 크기·양은 서구에 별도 처리 방법을 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps] };
      set(daejeon.recycle, '대전 서구는 깨진 유리를 안전하게 포장하고 종량제봉투에 위험물 표시를 하도록 안내해요.', 'glass:seogu-bag');
    } else if (result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft') {
      set(daejeon.food, daejeon.foodNote, `food:daejeon-${region.district}`);
      result.steps = result.steps.filter(step => !step.includes('전용 봉투·전용 용기·RFID'));
      result.parts[0].steps = [...result.steps, daejeon.foodNote];
    } else if (result.status === 'recycle' && input.combined === 'no' && region.district === '유성구' && input.material === '스티로폼') {
      result.status = 'check'; result.method = '스티로폼 색상·이물질 추가 확인 필요';
      result.steps = ['테이프·운송장을 제거하고 이물질이 남아 있지 않은지 확인해 주세요.', '유성구 안내에서 유색 스티로폼은 수거 제외 대상이므로 색상과 실제 수거 여부를 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps] };
      set(daejeon.recycle, '유성구는 색이 있거나 이물질이 남은 스티로폼을 일반 재활용 수거 대상에서 제외해요.', 'foam:yuseong-color');
    } else if ((result.status === 'general' || result.pendingCondition === 'removable') && input.material === '비닐' && input.type === 'packaging' && input.combined === 'no' && region.district === '유성구') {
      set(daejeon.recycle, daejeon.vinyl);
    } else if (result.status === 'recycle' && input.combined === 'no') {
      const note = daejeonRecycleNote(daejeon, input);
      if (note) set(daejeon.recycle, note);
    }
  }
  // 라벨·뚜껑을 떼어 각각 분리배출하는 물건(예: 라벨 붙은 생수병)도 본체에는 지역 기준을 붙입니다.
  // 부속품마다 다른 지역 문장을 섞으면 헷갈리므로 본체 재질의 문장 하나만 더합니다.
  const separated = input.combined === 'yes' && input.separable === 'yes' && input.components?.length
    && result.status === 'recycle' && result.parts[0]?.label === '본체' && result.parts[0].status === 'recycle';
  if (separated && result.regional.coverage !== 'verified') {
    if (region?.province === '서울특별시') {
      const key = seoulRecycleKey(input);
      if (key) {
        set(SEOUL_SOURCES.recycle, SEOUL_RECYCLE_NOTES[key]);
        result.regional.scope = 'city'; result.regional.cityLabel = '서울시';
        result.regional.notes.push(SEOUL_SCOPE_NOTE);
        result.regional.sources.push(SEOUL_SOURCES.scope);
        result.sourceUrls = [...new Set([...result.sourceUrls, SEOUL_SOURCES.scope])];
      }
    } else if (daejeon && input.material !== '비닐') {
      const note = daejeonRecycleNote(daejeon, input);
      if (note) set(daejeon.recycle, note);
    }
  }
  // 광역시(대구·광주·울산): 시청 공통 안내 문장을 붙입니다. 구·군별 수거 요일·장소는 구청 안내를 따릅니다.
  const metro = METRO_GUIDES[region?.province]?.city;
  if (metro && result.regional.coverage !== 'verified' && result.parts[0]?.label === '본체') {
    const bodyRecyclable = result.status === 'recycle' && (input.combined === 'no' || separated);
    const notes = [];
    const isFood = single && result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft' && Boolean(metro.foodNote);
    if (isFood) notes.push(metro.foodNote);
    else if (bodyRecyclable && !(input.material === '비닐' && input.contaminated === 'yes')) {
      const note = metro.notes[metroRecycleKey(input)];
      if (note) notes.push(note, ...(metro.notes.where ? [metro.notes.where] : []));
    }
    if (notes.length) {
      const scopeNote = `${metro.label} 공통 안내예요. 구·군마다 수거 요일·장소가 다를 수 있으니 구청·관리사무소 안내를 함께 확인해 주세요.`;
      for (const note of notes) set(isFood ? metro.food || metro.recycle : metro.recycle, note);
      result.regional.scope = 'city'; result.regional.cityLabel = metro.label; result.regional.scopeNote = scopeNote; result.regional.checkedAt = METRO_CHECKED_AT;
      result.regional.notes.push(scopeNote);
      if (isFood) result.steps = result.steps.filter(step => !step.includes('전용 봉투·전용 용기·RFID'));
    }
  }
  if (result.regional.coverage === 'verified') {
    const scopeNotes = [SEOUL_SCOPE_NOTE, result.regional.scopeNote].filter(Boolean);
    result.steps = [...new Set([...result.steps, ...result.regional.notes.filter(note => !scopeNotes.includes(note) && !(note === SEOUL_VINYL_NOTE && input.contaminated === 'yes'))])];
    result.reasons.push(result.regional.scope === 'city' ? `${cityGuidanceLabel(result)}를 적용했어요. 해당 구·군의 수거 기준도 확인해 주세요.` : `${regionLabel(region)} 공식 자료로 확인한 해당 품목의 지역 기준을 적용했어요.`);
    result.notice = medicine ? '수거함 위치와 접수 가능 여부는 방문 전에 확인해 주세요.' : result.regional.scope === 'city' ? result.regional.scopeNote || SEOUL_SCOPE_NOTE : '표시된 품목의 지역 기준을 적용했어요. 배출일·시간·장소는 동별·주택 유형·관리사무소 안내를 확인해 주세요.';
  } else {
    result.regional.notes.push(region ? '이 지역의 해당 품목에 대한 세부 기준은 아직 검증하지 못했어요. 아래 기본 안내를 참고하고 관할 시·군·구 청소 담당 부서 또는 관리사무소에 확인해 주세요.' : '지역을 설정하면 확인된 지역별 기준을 적용할 수 있어요. 현재는 기본 안내예요.');
  }
  return result;
}
