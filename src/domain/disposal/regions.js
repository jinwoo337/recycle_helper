export const PROVINCES = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'];
export const SEOUL_DISTRICTS = '종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구'.split(' ');
export { DAEJEON_DISTRICTS } from './daejeon-guides.js';
import { DAEJEON_DISTRICTS, DAEJEON_GUIDES, DAEJEON_SOURCES } from './daejeon-guides.js';
export function normalizeRegion(value) {
  if (!value || !PROVINCES.includes(value.province)) return null;
  const district = value.province === '세종특별자치시' ? '' : String(value.district || '').trim().replace(/\s+/g, ' ');
  if (value.province !== '세종특별자치시' && (!/^[가-힣 ]{2,20}$/.test(district) || !/[시군구]$/.test(district))) return null;
  if (value.province === '서울특별시' && !SEOUL_DISTRICTS.includes(district)) return null;
  if (value.province === '대전광역시' && !DAEJEON_DISTRICTS.includes(district)) return null;
  return { province: value.province, district };
}
export const regionLabel = value => { const region = normalizeRegion(value); return region ? [region.province, region.district].filter(Boolean).join(' ') : '지역 미설정'; };

export const REGIONAL_SOURCES = {
  ...Object.fromEntries(DAEJEON_SOURCES.map((url, index) => [`daejeon${index}`, url])),
  gimpoWaste: 'https://m.gimpo.go.kr/portal/contents.do?key=2723',
  gimpoRecycle: 'https://gimpo.go.kr/portal/contents.do?key=1435',
  geumcheonFood: 'https://geumcheon.go.kr/portal/contents.do?key=818',
};
export function regionalSourceLabel(url) {
  for (const [district, guide] of Object.entries(DAEJEON_GUIDES)) {
    if (url === guide.recycle) return `대전 ${district} 재활용 안내`;
    if (url === guide.food) return `대전 ${district} 음식물 안내`;
  }
  return url === REGIONAL_SOURCES.geumcheonFood ? '금천구 음식물 안내 (기본 참고 자료)'
    : url === REGIONAL_SOURCES.gimpoWaste ? '김포시 생활폐기물 안내' : '김포시 재활용 안내';
}
// 지역·품목별로 검증한 규칙만 적용합니다. 위험 품목/이름 충돌/미등록 품목의 판단을 뒤집지 않습니다.
export function applyRegionalRules(input, base) {
  const region = normalizeRegion(input.region);
  const result = structuredClone(base);
  result.region = region;
  result.regional = { coverage: 'unverified', label: regionLabel(region), checkedAt: '2026-10-26', sources: [], notes: [] };
  const single = input.combined !== 'yes' && !input.components?.length;
  const knownGlass = result.parts.length === 1 && result.parts[0].label === '본체' && result.reasons.some(reason => reason.includes('일반 재활용 수거 대상'));
  const set = (url, note) => {
    result.regional.coverage = 'verified';
    result.regional.sources.push(url); result.regional.notes.push(note);
    result.sourceUrls = [...new Set([...result.sourceUrls, url])];
  };
  if (region?.province === '경기도' && region.district === '김포시') {
    if (single && knownGlass && input.material === '유리' && input.type === 'broken') {
      const method = '깨진 유리 · 김포시 백색마대봉투로 배출';
      const steps = ['날카로운 유리를 안전하게 감싸고 깨진 유리가 들어 있음을 표시해 주세요.', '김포시 불연성 가정특수폐기물용 백색마대봉투에 담아 배출해 주세요.', '대량·대형 유리는 수거 가능 여부를 김포시에 먼저 확인해 주세요.'];
      result.method = method; result.steps = steps;
      // 일반 종량제와 다른 불연성 전용 배출이므로 추가 확인 분류를 유지합니다.
      result.parts[0] = { ...result.parts[0], method, steps: [...steps] };
      set(REGIONAL_SOURCES.gimpoWaste, '김포시는 깨진 유리를 불연성 가정특수폐기물로 구분하고 백색마대봉투 사용을 안내해요.');
    }
    if (single && result.status === 'recycle' && input.material === '페트병' && input.type === 'clear-drink' && input.combined === 'no') {
      set(REGIONAL_SOURCES.gimpoRecycle, '김포시: 공동주택은 투명 페트병 전용 수거함, 단독주택 등은 전용봉투 또는 투명·반투명 봉투에 담아 배출해요.');
    }
  }
  const geumcheonFood = region?.province === '서울특별시' && region.district === '금천구' && single && input.material === '음식물류';
  if (geumcheonFood && input.type === 'residue' && result.status === 'check' && result.parts.length===1 && result.parts[0].label==='본체') {
    result.status = 'general'; result.method = '금천구 음식물 수거 제외 · 일반규격봉투 배출';
    result.steps = ['포장·이물질을 따로 분리해 주세요.', '금천구 안내에 따라 생활폐기물 일반규격봉투로 배출해 주세요.', '커피박 등 별도 회수 사업을 이용하려면 해당 접수 조건을 먼저 확인해 주세요.'];
    result.parts[0] = {...result.parts[0],status:result.status,method:result.method,steps:[...result.steps]};
  }
  if (geumcheonFood && ['general', 'recycle'].includes(result.status)) {
    set(REGIONAL_SOURCES.geumcheonFood, result.status === 'general'
      ? '금천구는 해당 음식물 수거 제외 품목을 생활폐기물 일반규격봉투로 배출하도록 안내해요. 별도 회수 사업이 있으면 해당 안내를 확인해 주세요.'
      : '금천구 안내에 따라 음식물 외 이물질과 수분을 제거하고 음식물류 수거 방식에 맞춰 배출해 주세요.');
  }
  const daejeon = region?.province === '대전광역시' && DAEJEON_GUIDES[region.district];
  if (daejeon && single) {
    if (knownGlass && region.district === '서구' && input.material === '유리' && input.type === 'broken') {
      result.status = 'general'; result.method = '깨진 유리 · 안전 포장 후 서구 종량제봉투로 배출';
      result.steps = ['유리 조각을 신문지 등으로 안전하게 감싸 주세요.', '종량제봉투 겉면에 위험물이라고 크게 표시해 주세요.', '봉투에 담기 어려운 크기·양은 서구에 별도 처리 방법을 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps] };
      set(daejeon.recycle, '대전 서구는 깨진 유리를 안전하게 포장하고 종량제봉투에 위험물 표시를 하도록 안내해요.');
    } else if (result.status === 'recycle' && input.material === '음식물류' && input.type === 'soft') {
      set(daejeon.food, daejeon.foodNote);
      result.steps = result.steps.filter(step => !step.includes('전용 봉투·전용 용기·RFID'));
      result.parts[0].steps = [...result.steps, daejeon.foodNote];
    } else if (result.status === 'recycle' && input.combined === 'no' && region.district === '유성구' && input.material === '스티로폼') {
      result.status = 'check'; result.method = '스티로폼 색상·이물질 추가 확인 필요';
      result.steps = ['테이프·운송장을 제거하고 이물질이 남아 있지 않은지 확인해 주세요.', '유성구 안내에서 유색 스티로폼은 수거 제외 대상이므로 색상과 실제 수거 여부를 확인해 주세요.'];
      result.parts[0] = { ...result.parts[0], status: result.status, method: result.method, steps: [...result.steps] };
      set(daejeon.recycle, '유성구는 색이 있거나 이물질이 남은 스티로폼을 일반 재활용 수거 대상에서 제외해요.');
    } else if (result.status === 'recycle' && input.combined === 'no') {
      const key = input.material === '종이' ? (input.type === 'carton' ? 'carton' : input.type === 'paper' ? 'paper' : null)
        : input.material === '비닐' ? 'vinyl' : ['플라스틱', '페트병', '유리', '금속·캔', '스티로폼'].includes(input.material) ? 'container' : null;
      if (key && (daejeon[key] || (key === 'carton' && daejeon.container))) set(daejeon.recycle, daejeon[key] || daejeon.container);
    }
  }
  if (result.regional.coverage === 'verified') {
    result.steps.push(...result.regional.notes);
    result.reasons.push(`${regionLabel(region)} 공식 자료로 확인한 해당 품목의 지역 기준을 적용했어요.`);
    result.notice = '표시된 품목의 지역 기준을 적용했어요. 배출일·시간·장소는 동별·주택 유형·관리사무소 안내를 확인해 주세요.';
  } else {
    result.regional.notes.push(region ? '이 지역의 해당 품목에 대한 세부 기준은 아직 검증하지 못했어요. 아래 기본 안내를 참고하고 관할 시·군·구 청소 담당 부서 또는 관리사무소에 확인해 주세요.' : '지역을 설정하면 확인된 지역별 기준을 적용할 수 있어요. 현재는 기본 안내예요.');
  }
  return result;
}
