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
  '세종특별자치시': 'https://www.sjwaste.kr/',
  '경기도 성남시': 'https://waste.isdc.co.kr/',
  '경기도 부천시': 'https://clean.bucheon.go.kr/',
  '충청남도 아산시': 'https://smartclean.asan.go.kr/',
  '강원특별자치도 춘천시': 'https://clean.chuncheon.go.kr/',
};

const reportGuides = {
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
  const action = report ? { url: report, label: '공식 배출 신고' }
    : guide ? { url: guide, label: '지자체 신고 안내' }
      : home ? { url: home, label: '관할 지자체 누리집' }
        : { url: municipalityDirectory, label: '관할 지자체 찾기' };
  return { key, label: regionLabel(region), action, hasReportGuide: Boolean(report || guide), feePage: feePages[key] };
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
