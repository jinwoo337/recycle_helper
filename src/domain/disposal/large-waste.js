import { normalizeRegion, REGIONAL_SOURCES } from './regions.js';
import { METRO_GUIDES } from './metro-guides.js';
import { cityGuide } from './city-guides.js';

// 구청 누리집 주소(지원 지역). 신고 메뉴 주소는 구청 개편 때마다 자주 바뀌어서
// 누리집 첫 화면과 "구 이름 + 대형폐기물 신고" 검색 링크를 함께 보여 줍니다.
export const DISTRICT_HOMEPAGES = {
  '서울특별시': {
    종로구: 'https://www.jongno.go.kr', 중구: 'https://www.junggu.seoul.kr', 용산구: 'https://www.yongsan.go.kr',
    성동구: 'https://www.sd.go.kr', 광진구: 'https://www.gwangjin.go.kr', 동대문구: 'https://www.ddm.go.kr',
    중랑구: 'https://www.jungnang.go.kr', 성북구: 'https://www.sb.go.kr', 강북구: 'https://www.gangbuk.go.kr',
    도봉구: 'https://www.dobong.go.kr', 노원구: 'https://www.nowon.kr', 은평구: 'https://www.ep.go.kr',
    서대문구: 'https://www.sdm.go.kr', 마포구: 'https://www.mapo.go.kr', 양천구: 'https://www.yangcheon.go.kr',
    강서구: 'https://www.gangseo.seoul.kr', 구로구: 'https://www.guro.go.kr', 금천구: 'https://www.geumcheon.go.kr',
    영등포구: 'https://www.ydp.go.kr', 동작구: 'https://www.dongjak.go.kr', 관악구: 'https://www.gwanak.go.kr',
    서초구: 'https://www.seocho.go.kr', 강남구: 'https://www.gangnam.go.kr', 송파구: 'https://www.songpa.go.kr',
    강동구: 'https://www.gangdong.go.kr',
  },
  '대전광역시': {
    동구: 'https://www.donggu.go.kr', 중구: 'https://www.djjunggu.go.kr', 서구: 'https://www.seogu.go.kr',
    유성구: 'https://www.yuseong.go.kr', 대덕구: 'https://www.daedeok.go.kr',
  },
};

export const LARGE_WASTE_FEE_NOTE = '수수료는 지역과 품목·크기에 따라 달라요. 신청하기 전에 관할 지자체의 품목표에서 금액을 확인해 주세요.';
export const YUSEONG_LARGE_WASTE_REPORT = 'https://www.yuseong.go.kr/clean/html/sub03/0301.html';
const ASAN_LARGE_WASTE_REPORT = 'https://smartclean.asan.go.kr/online/bulky/request';
const ASAN_LARGE_WASTE_GUIDE = 'https://www.asan.go.kr/main/cms/?no=566';
const GIMPO_LARGE_WASTE_GUIDE = 'https://m.gimpo.go.kr/portal/contents.do?key=1437';
const NOWON_LARGE_WASTE_REPORT = 'https://smartclean.nowon.kr/';
const NOWON_LARGE_WASTE_GUIDE = 'https://www.nowon.kr/www/minwon/minwon4/minwon4_03/minwon4_03_05/minwon4_03_05_01.jsp';
export const LARGE_WASTE_STEPS = ['구청 누리집이나 동 주민센터에서 대형폐기물 배출을 신고해요.', '안내받은 수수료를 내고 신고필증(스티커·번호)을 받아요.', '필증을 물건에 붙이거나 번호를 적어 정해진 날짜·장소에 내놓아요.'];

const LARGE_HANDLINGS = ['large', 'large-electronic'];
// 이불·베개 같은 침구는 크기에 따라 대형폐기물일 수 있어 "크면" 안내로 붙입니다.
const MAYBE_LARGE_HANDLINGS = ['bedding'];
// 종류 정보가 없는 결과(AI 추정 등)는 결과 제목에 대형폐기물이 있을 때만 붙입니다.
// 옷·도자기처럼 단계 문장에 "대형폐기물 기준 확인"이 한 번 나오는 물건에는 붙이지 않습니다.
const titleMentionsLargeWaste = result => !result.handling && String(result.method || '').includes('대형폐기물');

// 대형폐기물 신고가 필요할 수 있는 결과에만 신고 경로를 붙입니다.
export function largeWasteHelp(result, regionValue = result?.region) {
  if (!result) return null;
  const maybe = MAYBE_LARGE_HANDLINGS.includes(result.handling);
  if (!(LARGE_HANDLINGS.includes(result.handling) || maybe || titleMentionsLargeWaste(result))) return null;
  const region = normalizeRegion(regionValue);
  const place = region ? [region.province.replace(/특별시|광역시|특별자치시|특별자치도/, ''), region.district].filter(Boolean).join(' ') : '';
  const metroDistrict = region ? METRO_GUIDES[region.province]?.districts[region.district] : null;
  // 큰 도시는 구가 있어도 대형폐기물 신고를 시에서 받으므로 시청 안내로 연결합니다(예: 수원시 영통구 → 수원시).
  const city = region && !metroDistrict ? cityGuide(region) : null;
  const homepage = region ? DISTRICT_HOMEPAGES[region.province]?.[region.district] || metroDistrict?.home || city?.home || null : null;
  // 광역시 구·군청이나 시청의 대형폐기물 안내 페이지를 찾았으면 바로 연결합니다.
  const yuseong = region?.province === '대전광역시' && region.district === '유성구';
  const asan = region?.province === '충청남도' && region.district === '아산시';
  const gimpo = region?.province === '경기도' && region.district === '김포시';
  const nowon = region?.province === '서울특별시' && region.district === '노원구';
  const directReport = Boolean(yuseong || asan || nowon);
  const reportUrl = yuseong ? YUSEONG_LARGE_WASTE_REPORT : asan ? ASAN_LARGE_WASTE_REPORT : nowon ? NOWON_LARGE_WASTE_REPORT
    : gimpo ? GIMPO_LARGE_WASTE_GUIDE : metroDistrict?.large || city?.large || null;
  // 버튼에 쓰는 기관 이름: 광역시는 구·군, 큰 도시는 시 이름입니다.
  const office = city?.name || (region?.district ? region.district.split(' ').pop() : '');
  const query = `${place ? `${place} ` : ''}대형폐기물 배출 신고`;
  return {
    place, office, homepage, reportUrl, query, maybe, directReport,
    feeUrl: yuseong ? REGIONAL_SOURCES.yuseongLargeFees : asan ? ASAN_LARGE_WASTE_GUIDE : nowon ? NOWON_LARGE_WASTE_GUIDE : null,
    feeLabel: yuseong ? '유성구 품목·수수료표' : `${office} 배출 절차·문의`,
    searchUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
    feeNote: LARGE_WASTE_FEE_NOTE, steps: LARGE_WASTE_STEPS,
  };
}
