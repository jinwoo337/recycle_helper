import { largeWasteHelp, DISTRICT_HOMEPAGES } from './large-waste.js';
import { MEDICINE_SOURCES } from './medicine-guide.js';
import { cityGuide } from './city-guides.js';
import { METRO_GUIDES } from './metro-guides.js';
import { DAEJEON_GUIDES } from './daejeon-guides.js';
import { REGIONAL_SOURCES, regionLabel } from './regions.js';

const batteries = ['battery', 'rechargeable', 'damaged-battery'];
const batterySources = {
  '인천광역시 부평구': { url: 'https://www.icbp.go.kr/main/life/clean/batteries.jsp', scope: '인천 부평구', office: '부평구 자원순환과 재활용팀', phone: '032-509-6634' },
  '충청남도 아산시': { url: 'https://www.asan.go.kr/main/cms/?no=588', scope: '충남 아산시', office: '아산시 자원순환과', phone: '041-540-2335', housing: [
    ['공동주택', '단지 안 폐건전지 수거함의 위치와 접수 품목을 관리사무소에 확인해 주세요.'],
    ['공동주택 외', '읍·면·동 행정복지센터 또는 마을회관의 폐건전지 수거함을 확인해 주세요.'],
  ] },
  '서울특별시 노원구': { url: 'https://www.nowon.kr/www/minwon/minwon4/minwon4_03/minwon4_03_07.jsp', scope: '서울 노원구', office: '노원구 폐기물 담당 부서', housing: [
    ['공동주택', '500가구 이상은 관리사무소, 그보다 작은 단지는 자체 수거함이나 동 주민센터에 수거 위치를 확인해 주세요.'],
    ['단독주택', '관할 동 주민센터에 폐건전지 수거함 위치를 확인해 주세요.'],
  ] },
};
const seoulMedicineMap = 'https://map.seoul.go.kr/smgis2/short/6OiGm';

export function collectionAction(input, result) {
  const { handling, region, regional } = result;
  const large = largeWasteHelp(result);
  const scope = region ? regionLabel(region) : '';
  if (large?.reportUrl && !large.maybe) return {
    url: large.reportUrl, scope: large.place,
    label: `${large.office} 대형폐기물 ${large.directReport ? '배출 신청' : '공식 안내'}`,
    note: '품목·크기에 맞는 수수료, 배출일과 장소는 신청 페이지에서 확인해 주세요.',
  };
  if (large && !large.maybe) return {
    url: large.homepage, scope, label: `${large.office} 공식 누리집`,
    note: '관할 지자체 대형폐기물 담당 부서에 품목과 크기를 알려 접수 방법·수수료·배출 장소를 확인해 주세요.',
  };
  const isBattery = batteries.includes(handling);
  const brokenGlass = input.material === '유리' && input.type === 'broken';
  if (region && result.status === 'check' && ['unknown', 'material-only'].includes(input.category)) {
    const metro = METRO_GUIDES[region.province]?.districts[region.district];
    const city = cityGuide(region);
    const official = (region.province === '대전광역시' ? DAEJEON_GUIDES[region.district]?.recycle : null)
      || metro?.recycle || city?.recycle;
    const home = metro?.home || city?.home || DISTRICT_HOMEPAGES[region.province]?.[region.district];
    if (official || home) return { url: official || home, scope,
      label: official ? '지역 폐기물 공식 안내' : '관할 지자체 공식 누리집',
      note: '제품의 실제 용도와 재질이 수거 대상에 해당하는지 확인해 주세요.' };
  }
  if (handling !== 'medicine' && !isBattery && !brokenGlass) return null;
  if (handling === 'medicine') {
    const official = regional?.sources?.find(url => Object.values(MEDICINE_SOURCES).includes(url));
    if (official) return { url: official, scope: regional.cityLabel || scope, label: '공식 폐의약품 수거처·접수 안내',
      ...(official === MEDICINE_SOURCES.seoul ? { extraUrl: seoulMedicineMap, extraLabel: '서울시 공식 수거함 지도' } : {}),
      note: '방문 전 실제 접수 여부, 포장 처리 방법과 이용 시간을 확인해 주세요.' };
  }
  if (isBattery && region) {
    const battery = batterySources[`${region.province} ${region.district}`];
    if (battery) return {
      ...battery, housing: handling !== 'damaged-battery' && input.handlingCondition === 'undamaged' ? battery.housing : undefined,
      label: handling === 'damaged-battery' ? `${battery.scope} 폐전지 담당 부서 안내` : `${battery.scope} 폐전지 배출 안내`,
      note: handling === 'damaged-battery'
        ? '담당 부서에 전지 종류와 손상 상태를 알려 회수 방법을 확인해 주세요. 정상 전지 수거함에 바로 넣지 마세요.'
        : input.handlingCondition === 'undamaged'
          ? '수거함의 정확한 위치, 접수 품목과 이용 시간은 수거처에 확인해 주세요.'
          : '먼저 전지에 손상이 있는지 확인해 주세요. 확실하지 않으면 담당 부서에 상태와 회수 방법을 문의해 주세요.',
    };
  }
  const glassSource = brokenGlass && regional?.comparisonKey?.startsWith('glass:')
    && regional.sources?.find(url => [REGIONAL_SOURCES.gimpoWaste, REGIONAL_SOURCES.seoulrecycle, DAEJEON_GUIDES['서구'].recycle].includes(url));
  if (glassSource) {
    return { url: glassSource, scope: regional.cityLabel || scope, label: '깨진 유리 공식 배출 안내',
      note: glassSource === REGIONAL_SOURCES.gimpoWaste
        ? '백색마대 판매소·배출 문의처는 김포시 안내에서 확인해 주세요.'
        : '양이 많거나 봉투에 담기 어려운 경우 관할 구청에 처리 방법을 문의해 주세요.' };
  }
  const district = region && METRO_GUIDES[region.province]?.districts[region.district];
  const city = region && cityGuide(region);
  const url = brokenGlass
    ? (region?.province === '대전광역시' ? DAEJEON_GUIDES[region.district]?.recycle : null) || district?.recycle || city?.recycle
    : null;
  return { url: url || district?.home || city?.home || (region && DISTRICT_HOMEPAGES[region.province]?.[region.district]),
    scope, label: url ? '지역 폐기물 공식 안내' : '관할 지자체 공식 누리집',
    note: handling === 'medicine' ? '보건소나 폐기물 담당 부서에 폐의약품 접수 장소, 포장 처리 방법과 이용 시간을 확인해 주세요.'
      : isBattery ? '관할 지자체 폐기물 담당 부서에 전지 종류와 상태를 알려 접수 장소와 회수 방법을 확인해 주세요.'
        : '관할 지자체 폐기물 담당 부서에 깨진 유리의 양과 크기를 알려 봉투 종류와 배출 장소를 확인해 주세요.',
  };
}
