import { cityGuide } from './city-guides.js';
import { DISTRICT_HOMEPAGES } from './district-homepages.js';
import { metroDistrict } from './metro-guides.js';
import { normalizeRegion, REGIONAL_SOURCES, regionLabel } from './regions.js';

export const BULKY_WASTE_FEE_SOURCE = 'https://www.data.go.kr/data/15114146/standard.do';
const municipalityDirectory = 'https://www.laiis.go.kr/lips/mlo/lcl/representationList.do';

const reportSites = {
  '대전광역시 동구': 'https://www.donggu.go.kr/dg/kor/60/wasteApply',
  '대전광역시 중구': 'https://www.djjunggu.go.kr/clean/html/sub03/03.html',
  '대전광역시 서구': 'https://www.seogu.go.kr/waste/main.do',
  '대전광역시 유성구': 'https://www.yuseong.go.kr/clean/html/sub03/0301.html',
  '대전광역시 대덕구': 'https://www.daedeok.go.kr/was/WAS.do',
  '서울특별시 종로구': 'https://jongno.go.kr/waste/pc/web/main/siteMap.do',
  '서울특별시 도봉구': 'https://smartclean.dobong.go.kr/online/bulky/request',
  '서울특별시 서대문구': 'https://www.sdm.go.kr/civil/print/xpay/reg.do',
  '서울특별시 마포구': 'https://smartclean.mapo.go.kr/',
  '서울특별시 강남구': 'https://clean.gangnam.go.kr/use/biwa/USEBIWA01000000.do',
  '서울특별시 송파구': 'https://smartclean.songpa.go.kr/',
  '서울특별시 은평구': 'https://ai-waste.ep.go.kr/',
  '세종특별자치시': 'https://www.sjwaste.kr/',
  '경기도 성남시': 'https://waste.isdc.co.kr/',
  '경기도 부천시': 'https://clean.bucheon.go.kr/',
  '경기도 김포시': 'https://bbegi.com',
  '충청남도 아산시': 'https://smartclean.asan.go.kr/',
  '강원특별자치도 춘천시': 'https://clean.chuncheon.go.kr/',
};

const reportGuides = {
  '충청남도 논산시': 'https://nonsan.go.kr/clean/html/sub01/0101.html',
  '서울특별시 중구': 'https://www.junggu.seoul.kr/content.do?cmsid=14192',
  '서울특별시 성동구': 'https://www.sd.go.kr/main/contents.do?key=1670',
  '서울특별시 동대문구': 'https://www.ddm.go.kr/www/contents.do?key=82',
  '서울특별시 서초구': 'https://www.seocho.go.kr/site/seocho/01/10103070301002018030701.jsp',
  '광주광역시 광산구': 'https://www.gwangsan.go.kr/contentsView.do?pageId=www933',
  '경기도 광주시': 'https://www.gjcity.go.kr/portal/contents.do?mId=0408090700',
  '경기도 김포시': 'https://www.gimpo.go.kr/portal/contents.do?key=1439',
  '경기도 하남시': 'https://www.hanam.go.kr/www/contents.do?key=6422',
};

const feePages = {
  '대전광역시 유성구': REGIONAL_SOURCES.yuseongLargeFees,
  '대전광역시 동구': 'https://www.donggu.go.kr/dg/kor/contents/169',
  '대전광역시 중구': 'https://www.djjunggu.go.kr/kr/sub02_02_07.do',
  '서울특별시 마포구': 'https://smartclean.mapo.go.kr/online/bulky/item',
  '경기도 성남시': 'https://waste.isdc.co.kr/contents/order_item.php?cIdx=4',
  '경기도 부천시': 'https://clean.bucheon.go.kr/site/main/wasteCleaning/wasteItemList?main=01&sub=02',
  '경기도 광주시': 'https://www.gjcity.go.kr/portal/wastePrice/list.do?mId=0408090400',
};

export function bulkyWasteLocality(value) {
  const region = normalizeRegion(value);
  if (!region) return null;
  const city = cityGuide(region);
  const municipality = city ? { ...region, district: city.name } : region;
  const key = regionLabel(municipality);
  const metro = metroDistrict(region);
  const report = reportSites[key];
  const guide = reportGuides[key] || metro?.large || city?.large;
  const home = metro?.home || city?.home || DISTRICT_HOMEPAGES[region.province]?.[region.district];
  const action = report ? { url: report, label: '공식 배출 신고', kind: 'report' }
    : guide ? { url: guide, label: '지자체 신고 안내', kind: 'guide' }
      : home ? { url: home, label: '관할 지자체 누리집', kind: 'home' }
        : { url: municipalityDirectory, label: '관할 지자체 찾기', kind: 'directory' };
  const steps = [
    report ? `${regionLabel(municipality)} 신고 사이트에서 배출할 품목·크기·수량과 배출 주소를 입력해 주세요.`
      : `${regionLabel(municipality)} 공식 누리집에서 ‘대형폐기물’을 찾아 온라인·전화·방문 중 운영하는 신고 방법을 확인해 주세요.`,
    '관할 지자체의 품목별 수수료와 수거 가능 여부를 확인하고 안내된 방법으로 신고·납부해 주세요.',
    '신고필증 부착이나 접수번호 표시 방법을 확인하고, 접수한 날짜와 지정된 장소에 배출해 주세요.',
  ];
  const note = report ? '신고 사이트에서 최종 수수료와 배출 일시·장소를 확인해 주세요.'
    : '온라인 신고 운영 여부와 전화·방문 접수처는 관할 지자체 안내를 확인해 주세요.';
  if (key === '경기도 김포시') steps[0] = '김포시가 안내하는 빼기 홈페이지에서 배출 지역을 김포시로 선택하고 품목·배출 주소를 입력해 주세요.';
  if (key === '서울특별시 은평구') steps[0] = '은평구 대형폐기물 처리 시스템에서 온라인 신청하거나 관할 동주민센터에 방문해 신고해 주세요.';
  return { key, label: regionLabel(region), action, steps, note, home,
    sourceUrl: reportGuides[key] || guide || home,
    hasReportGuide: Boolean(report || guide), feePage: feePages[key] };
}

export async function loadBulkyWasteFees(key) {
  if (key === '경기도 김포시') return (await import('./gimpo-bulky-waste-fees.js')).default;
  const { default: fees } = await import('./bulky-waste-fees.generated.js');
  return Object.hasOwn(fees, key) ? fees[key] : null;
}

const searchKey = text => text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu, '').replace(/쇼파/g, '소파');

export function filterBulkyWasteFees(rows, query) {
  const terms = query.trim().split(/\s+/).map(searchKey).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter(([name, size]) => {
    const key = searchKey(`${name} ${size}`);
    return terms.every(term => key.includes(term));
  });
}

export function groupBulkyWasteFees(rows) {
  const items = new Map();
  for (const [name, size, fee] of rows) {
    if (!items.has(name)) items.set(name, []);
    items.get(name).push([size, fee]);
  }
  return [...items];
}
