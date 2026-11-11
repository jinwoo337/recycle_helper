// 광역시가 아닌 시·군(인구 많은 순)의 시청 공식 안내 주소입니다(2026-11-11 확인).
// 품목별 문장은 정리하지 않았으므로 "지역 기준"이라고 하지 않고, 결과 화면에서 시청 안내로 바로 연결만 합니다.
// recycle: 재활용품 배출 요령, food: 음식물, large: 대형폐기물 신고·안내. 찾지 못한 항목은 비워 두고 누리집으로 연결합니다.
// 사용자는 "수원시 영통구"처럼 직접 입력하므로 첫 낱말(시·군 이름)로 찾습니다.
export const CITY_CHECKED_AT = '2026-11-11';

export const CITY_GUIDES = {
  '경기도': {
    수원시: { home: 'https://www.suwon.go.kr', recycle: 'https://www.suwon.go.kr/sw-www/deptHome/dep_env/env_03/env_03_09.jsp', large: 'https://www.suwon.go.kr/sw-www/deptHome/dep_env/env_03/env_03_11/env_03_01.jsp' },
    고양시: { home: 'https://www.goyang.go.kr', recycle: 'https://www.goyang.go.kr/www/www03/www03_3/www03_3_2/www03_3_2_tab1.jsp' },
    용인시: { home: 'https://www.yongin.go.kr', recycle: 'https://www.yongin.go.kr/home/www/www12/www12_08/www12_08_03/www12_08_03_03.jsp', food: 'https://www.yongin.go.kr/home/www/www12/www12_08/www12_08_03/www12_08_03_01.jsp', large: 'https://www.yongin.go.kr/home/www/www12/www12_08/www12_03/www12_03_02/www12_03_02_01.jsp' },
    화성시: { home: 'https://www.hscity.go.kr', recycle: 'https://www.hscity.go.kr/www/partInfo/trnsportEnvrn/trashProcessInfo.jsp', large: 'https://waste.hscity.go.kr/Waste/index.jsp' },
    성남시: { home: 'https://www.seongnam.go.kr', recycle: 'https://recycle.seongnam.go.kr/platforminfo/recycle/method', large: 'https://waste.isdc.co.kr' },
    부천시: { home: 'https://www.bucheon.go.kr', recycle: 'https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148006007006003', food: 'https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148006007006002', large: 'https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148006007006004' },
    남양주시: { home: 'https://www.nyj.go.kr', recycle: 'https://www.nyj.go.kr/www/contents.do?key=3004', large: 'https://smartclean.nyj.go.kr' },
    안산시: { home: 'https://www.ansan.go.kr', large: 'https://www.ansan.go.kr/waste/pc/web/info/info.do' },
    평택시: { home: 'https://www.pyeongtaek.go.kr', recycle: 'https://www.pyeongtaek.go.kr/pyeongtaek/contents.do?mId=1601030000', large: 'https://www.pyeongtaek.go.kr/waste/contents.do?mId=0100000000' },
    시흥시: { home: 'https://www.siheung.go.kr', recycle: 'https://www.siheung.go.kr/portal/contents.do?mId=0703010300', large: 'https://smartclean.siheung.go.kr' },
    파주시: { home: 'https://www.paju.go.kr', recycle: 'https://www.paju.go.kr/www/www_02/environment/environment_05/environment_05_01/environment_05_01_02.jsp', large: 'https://www.paju.go.kr/www/www_02/environment/environment_05/environment_05_01/environment_05_01_04.jsp' },
    김포시: { home: 'https://www.gimpo.go.kr', recycle: 'https://gimpo.go.kr/portal/contents.do?key=1435' },
    의정부시: { home: 'https://www.ui4u.go.kr', recycle: 'https://www.ui4u.go.kr/depart/contents.do?mId=0602030000', food: 'https://www.ui4u.go.kr/depart/contents.do?mId=0602050000', large: 'https://www.ui4u.go.kr/depart/contents.do?mId=0602040000' },
    안양시: { home: 'https://www.anyang.go.kr', recycle: 'https://www.anyang.go.kr/main/contents.do?key=806' },
    광주시: { home: 'https://www.gjcity.go.kr' },
    하남시: { home: 'https://www.hanam.go.kr' },
    광명시: { home: 'https://www.gm.go.kr' },
    군포시: { home: 'https://www.gunpo.go.kr' },
    양주시: { home: 'https://www.yangju.go.kr' },
    오산시: { home: 'https://www.osan.go.kr' },
    이천시: { home: 'https://www.icheon.go.kr' },
    구리시: { home: 'https://www.guri.go.kr' },
    안성시: { home: 'https://www.anseong.go.kr' },
    의왕시: { home: 'https://www.uiwang.go.kr' },
    포천시: { home: 'https://www.pocheon.go.kr' },
  },
  '경상남도': {
    창원시: { home: 'https://www.changwon.go.kr', recycle: 'https://www.changwon.go.kr/depart/contents.do?mId=1005010100', large: 'https://www.changwon.go.kr/depart/contents.do?mId=1004020000' },
    김해시: { home: 'https://www.gimhae.go.kr', recycle: 'https://www.gimhae.go.kr/01544/02643/01739.web', food: 'https://www.gimhae.go.kr/01544/02643/01738.web', large: 'https://www.gimhae.go.kr/01544/02643/01740.web' },
    진주시: { home: 'https://www.jinju.go.kr' },
    양산시: { home: 'https://www.yangsan.go.kr' },
    거제시: { home: 'https://www.geoje.go.kr' },
  },
  '충청북도': {
    청주시: { home: 'https://www.cheongju.go.kr', recycle: 'https://www.cheongju.go.kr/www/contents.do?key=23182', large: 'https://clean.cheongju.go.kr/a/a/viewMain.do' },
    충주시: { home: 'https://www.chungju.go.kr' },
  },
  '충청남도': {
    천안시: { home: 'https://www.cheonan.go.kr', large: 'https://www.cheonan.go.kr/kor/sub01_03_06.do' },
    아산시: { home: 'https://www.asan.go.kr' },
  },
  '전북특별자치도': {
    전주시: { home: 'https://www.jeonju.go.kr', recycle: 'https://www.jeonju.go.kr/index.9is?contentUid=ff8080818990c349018b041acc483bef', food: 'https://www.jeonju.go.kr/index.9is?contentUid=ff8080818990c349018b041acaef3be6' },
    익산시: { home: 'https://www.iksan.go.kr' },
    군산시: { home: 'https://www.gunsan.go.kr' },
  },
  '전라남도': {
    순천시: { home: 'https://www.suncheon.go.kr' },
    여수시: { home: 'https://www.yeosu.go.kr' },
    목포시: { home: 'https://www.mokpo.go.kr' },
  },
  '경상북도': {
    포항시: { home: 'https://www.pohang.go.kr', recycle: 'https://www.pohang.go.kr/dept/contents.do?mid=0202010000', large: 'https://waste.pohang.go.kr' },
    구미시: { home: 'https://www.gumi.go.kr' },
    경산시: { home: 'https://www.gbgs.go.kr' },
    경주시: { home: 'https://www.gyeongju.go.kr' },
  },
  '강원특별자치도': {
    원주시: { home: 'https://www.wonju.go.kr' },
    춘천시: { home: 'https://www.chuncheon.go.kr' },
    강릉시: { home: 'https://www.gn.go.kr' },
  },
  '제주특별자치도': {
    제주시: { home: 'https://www.jejusi.go.kr', recycle: 'http://echo.jejusi.go.kr/garbage/dic.do', large: 'http://echo.jejusi.go.kr/garbage/big/pay.do' },
    서귀포시: { home: 'https://www.seogwipo.go.kr' },
  },
};

// "수원시 영통구", "수원 영통구", "수원시" 모두 수원시 안내를 찾습니다.
export function cityGuide(region) {
  const cities = region && CITY_GUIDES[region.province];
  if (!cities) return null;
  const first = String(region.district || '').trim().split(/\s+/)[0] || '';
  const name = cities[first] ? first : cities[`${first}시`] ? `${first}시` : cities[`${first}군`] ? `${first}군` : null;
  return name ? { name, ...cities[name] } : null;
}
