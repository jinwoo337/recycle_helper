// 서울·대전 밖 광역시(부산·대구·인천·광주·울산)의 구·군 목록과 공식 안내 주소입니다. 확인일: 2026-11-06.
// - home: 구청·군청 누리집, recycle·food·large: 재활용·음식물·대형폐기물 안내 페이지(찾은 곳만).
// - city: 시청이 공통으로 안내하는 분리배출 자료. 문장은 시청 원문을 줄여 옮겼고, 구별 수거 요일·장소는 구청 안내를 따릅니다.
// - 2026-07-01 인천 행정체제 개편(제물포구·영종구·서해구·검단구)을 반영했습니다.
// - 광주광역시는 2026-07-01 전남광주통합특별시로 통합됐지만, 앱에서는 사람들이 찾기 쉬운 '광주광역시'로 고르게 합니다.
export const METRO_CHECKED_AT = '2026-11-06';

const busan = (host, extra = {}) => ({ home: `https://${host}`, ...extra });
export const METRO_GUIDES = {
  '부산광역시': {
    short: '부산',
    districts: {
      중구: busan('www.bsjunggu.go.kr', { recycle: 'https://www.bsjunggu.go.kr/index.junggu?menuCd=DOM_000000109001001009' }),
      서구: busan('www.bsseogu.go.kr'),
      동구: busan('www.bsdonggu.go.kr', {
        recycle: 'https://www.bsdonggu.go.kr/index.donggu?menuCd=DOM_000000104005002000',
        food: 'https://www.bsdonggu.go.kr/index.donggu?menuCd=DOM_000000104005003000',
        large: 'https://www.bsdonggu.go.kr/index.donggu?menuCd=DOM_000000104005004000',
      }),
      영도구: busan('www.yeongdo.go.kr'),
      부산진구: busan('www.busanjin.go.kr'),
      동래구: busan('www.dongnae.go.kr'),
      남구: busan('www.bsnamgu.go.kr'),
      북구: busan('www.bsbukgu.go.kr', { recycle: 'https://www.bsbukgu.go.kr/index.bsbukgu?menuCd=DOM_000000103005001002' }),
      해운대구: busan('www.haeundae.go.kr'),
      사하구: busan('www.saha.go.kr'),
      금정구: busan('www.geumjeong.go.kr'),
      강서구: busan('www.bsgangseo.go.kr', {
        recycle: 'https://www.bsgangseo.go.kr/portal/contents.do?mid=0304010400',
        food: 'https://www.bsgangseo.go.kr/portal/contents.do?mid=0304010200',
        large: 'https://www.bsgangseo.go.kr/portal/contents.do?mid=0304010500',
      }),
      연제구: busan('www.yeonje.go.kr', {
        food: 'https://www.yeonje.go.kr/portal/contents.do?mId=0602020600',
        large: 'https://www.yeonje.go.kr/portal/contents.do?mId=0602020300',
      }),
      수영구: busan('www.suyeong.go.kr', { recycle: 'https://www.suyeong.go.kr/index.suyeong?menuCd=DOM_000000112005003000' }),
      사상구: busan('www.sasang.go.kr', { recycle: 'https://www.sasang.go.kr/index.sasang?menuCd=DOM_000000110001001000' }),
      기장군: busan('www.gijang.go.kr'),
    },
  },
  '대구광역시': {
    short: '대구',
    city: {
      label: '대구시', recycle: 'https://www.daegu.go.kr/env/index.do?menu_id=00001319', food: 'https://www.daegu.go.kr/env/index.do?menu_id=00001320',
      notes: {
        paper: '대구시는 종이류를 물기에 젖지 않게 하고 스프링·테이프 등을 떼어 묶어서 배출하도록 안내해요.',
        carton: '대구시는 종이팩을 비우고 가급적 헹군 뒤 종이류와 섞이지 않게 따로 배출하도록 안내해요.',
        pet: '대구시는 무색 투명 페트병을 비우고 라벨을 떼어 압착한 뒤 뚜껑을 닫아 전용 수거함에 배출하도록 안내해요.',
        container: '대구시는 플라스틱 용기의 뚜껑을 떼고 내용물을 비워 배출하도록 안내해요.',
        can: '대구시는 캔을 비운 뒤 압착하고 플라스틱 뚜껑을 떼어 배출하도록 안내해요.',
        glass: '대구시는 유리병 뚜껑을 떼고 비워 배출하고, 빈용기보증금 대상 병은 소매점에서 환불받도록 안내해요.',
        vinyl: '대구시는 비닐 포장재를 완전히 비운 뒤 차곡차곡 쌓아 묶어서 배출하도록 안내해요. 음식찌꺼기가 묻은 봉지는 제외해요.',
        foam: '대구시는 스티로폼의 이물질·상표를 떼어 배출하고, 가전제품 완충재는 가급적 산 곳에 돌려주도록 안내해요.',
        where: '대구시: 공동주택은 단지 분리수거함에, 일반주택은 대문 앞 구·군 지정 장소에 수거차량이 오는 주기에 맞춰 종류별로 내놓아요.',
      },
      foodNote: '대구시는 공동주택에서도 단지별·세대별 종량제를 시행해요. 비닐·병뚜껑·이쑤시개 같은 이물질은 꼭 빼고 배출해 주세요.',
    },
    districts: {
      중구: { home: 'https://www.jung.daegu.kr' },
      동구: { home: 'https://dong.daegu.kr', recycle: 'https://dong.daegu.kr/portal/contents.do?mid=0405130400', food: 'https://dong.daegu.kr/portal/contents.do?mid=0405130200', large: 'https://dong.daegu.kr/portal/contents.do?mid=0405130300' },
      서구: { home: 'https://www.dgs.go.kr', recycle: 'https://www.dgs.go.kr/portal/contents.do?mid=0207090000', food: 'https://www.dgs.go.kr/portal/contents.do?mid=0207100000', large: 'https://www.dgs.go.kr/portal/contents.do?mid=0207150000' },
      남구: { home: 'https://nam.daegu.kr', recycle: 'https://nam.daegu.kr/index.do?menu_id=00002191' },
      북구: { home: 'https://www.buk.daegu.kr', recycle: 'https://www.buk.daegu.kr/index.do?menu_id=00001795' },
      수성구: { home: 'https://www.suseong.kr', recycle: 'https://www.suseong.kr/index.do?menu_id=00000362', food: 'https://www.suseong.kr/index.do?menu_id=00031390', large: 'https://www.suseong.kr/index.do?menu_id=00030810' },
      달서구: { home: 'https://www.dalseo.daegu.kr', recycle: 'https://www.dalseo.daegu.kr/index.do?menu_id=00001252', large: 'https://www.dalseo.daegu.kr/index.do?menu_id=00001415' },
      달성군: { home: 'https://www.dalseong.daegu.kr', recycle: 'https://www.dalseong.daegu.kr/index.do?menu_id=00004530', large: 'https://www.dalseong.daegu.kr/index.do?menu_id=00000365' },
      군위군: { home: 'https://www.gunwi.go.kr' },
    },
  },
  '인천광역시': {
    short: '인천',
    // 인천시 '폐기물 처리' 페이지가 구·군별 공식 안내 주소를 모아 둡니다(2026-07-03 업데이트).
    hub: 'https://www.incheon.go.kr/recycle/RC1001001',
    districts: {
      제물포구: { home: 'https://www.jemulpo.go.kr', recycle: 'https://www.jemulpo.go.kr/main/area/clean/waste_recycle.jsp', food: 'https://www.jemulpo.go.kr/main/area/clean/waste_food.jsp', large: 'https://www.jemulpo.go.kr/main/area/clean/waste_large.jsp' },
      영종구: { home: 'https://www.yeongjong.go.kr', recycle: 'https://www.yeongjong.go.kr/main/content/view.do?sn=288', food: 'https://www.yeongjong.go.kr/main/content/view.do?sn=281', large: 'https://www.yeongjong.go.kr/main/content/view.do?sn=297' },
      미추홀구: { home: 'https://www.michuhol.go.kr', recycle: 'https://www.michuhol.go.kr/main/content.do?sq=446', food: 'https://www.michuhol.go.kr/main/content.do?sq=445', large: 'https://www.michuhol.go.kr/main/content.do?sq=442' },
      연수구: { home: 'https://www.yeonsu.go.kr', recycle: 'https://www.yeonsu.go.kr/main/part/clean/recycle.asp', food: 'https://www.yeonsu.go.kr/main/part/clean/food.asp', large: 'https://www.yeonsu.go.kr/main/part/clean/large.asp' },
      남동구: { home: 'https://www.namdong.go.kr', recycle: 'https://www.namdong.go.kr/main/area/clean/recycle/intro.jsp', food: 'https://www.namdong.go.kr/main/area/clean/food.jsp', large: 'https://www.namdong.go.kr/main/area/clean/dumps.jsp' },
      부평구: { home: 'https://www.icbp.go.kr', recycle: 'https://www.icbp.go.kr/main/life/clean/recycle_emit.jsp', food: 'https://www.icbp.go.kr/main/life/clean/foodwaste.jsp', large: 'https://www.icbp.go.kr/main/life/clean/remove.jsp' },
      계양구: { home: 'https://www.gyeyang.go.kr', recycle: 'https://www.gyeyang.go.kr/open_content/main/part/clean/recycle.jsp', food: 'https://www.gyeyang.go.kr/open_content/main/part/clean/food.jsp', large: 'https://www.gyeyang.go.kr/open_content/main/part/clean/waste.jsp' },
      서해구: { home: 'https://www.seohae.go.kr', recycle: 'https://www.seohae.go.kr/open_content/main/part/clean/detritus_recycle.jsp', food: 'https://www.seohae.go.kr/open_content/main/part/clean/detritus_food.jsp', large: 'https://www.seohae.go.kr/open_content/main/part/clean/detritus_big.jsp' },
      검단구: { home: 'https://www.geomdan.go.kr', recycle: 'https://www.geomdan.go.kr/main/part/clean/detritus_recycle.jsp', food: 'https://www.geomdan.go.kr/main/part/clean/detritus_food.jsp', large: 'https://www.geomdan.go.kr/main/part/clean/detritus_big.jsp' },
      강화군: { home: 'https://www.ganghwa.go.kr', recycle: 'https://www.ganghwa.go.kr/open_content/main/part/clean/detritus_recycle.jsp', food: 'https://www.ganghwa.go.kr/open_content/main/part/clean/detritus_food.jsp', large: 'https://www.ganghwa.go.kr/open_content/main/part/clean/detritus_large.jsp' },
      옹진군: { home: 'https://www.ongjin.go.kr', recycle: 'https://www.ongjin.go.kr/open_content/main/environment/cleaning/recycle.jsp', food: 'https://www.ongjin.go.kr/open_content/main/environment/cleaning/excretion_food.jsp', large: 'https://www.ongjin.go.kr/open_content/main/environment/cleaning/excretion_large.jsp' },
    },
    // 개편 전 이름으로 저장된 지역을 새 이름으로 옮깁니다. 중구는 내륙(제물포구)과 영종도(영종구)로 나뉘어 다시 고르게 합니다.
    renamed: { 동구: '제물포구', 서구: '서해구', 남구: '미추홀구' },
  },
  '광주광역시': {
    short: '광주',
    city: {
      label: '광주시', recycle: 'https://www.gwangju.go.kr/envi/contentsView.do?pageId=envi246', food: 'https://www.gwangju.go.kr/envi/contentsView.do?pageId=envi247',
      notes: {
        paper: '광주시는 신문지를 펴서 쌓아 묶고, 책·노트는 비닐 코팅 종이와 스프링을 떼어 배출하도록 안내해요.',
        carton: '광주시는 종이팩을 헹궈 말리고 빨대·비닐을 뗀 뒤 종이팩 전용수거함에 넣고, 전용함이 없으면 끈으로 묶어 종이류와 구분하도록 안내해요.',
        vinyl: '광주시는 비닐을 헹궈 이물질을 없애고 흩날리지 않게 투명·반투명 봉투에 담아 배출하도록 안내해요.',
      },
      foodNote: '광주시: 단독주택·소형음식점은 전용수거용기(3·6·15·120L)에 수수료 스티커를 붙이고, 공동주택은 120L 전용용기나 세대별 RFID 기기에 배출해요. 단독주택은 일요일·공휴일에 수거하지 않아요.',
    },
    districts: {
      동구: { home: 'https://www.donggu.kr', recycle: 'https://www.donggu.kr/menu.es?mid=a10408010300' },
      서구: { home: 'https://www.seogu.gwangju.kr', recycle: 'https://www.seogu.gwangju.kr/menu.es?mid=a10308010100' },
      남구: { home: 'https://www.namgu.gwangju.kr' },
      북구: { home: 'https://bukgu.gwangju.kr' },
      광산구: { home: 'https://www.gwangsan.go.kr' },
    },
  },
  '울산광역시': {
    short: '울산',
    city: {
      label: '울산시', recycle: 'https://www.ulsan.go.kr/u/envi/contents.ulsan?mId=001005002002000000',
      notes: {
        pet: '울산시는 무색 투명 페트병을 비우고 라벨을 떼어 가능한 압착한 뒤 뚜껑을 닫아 배출하도록 안내해요.',
        vinyl: '울산시는 비닐을 헹궈 이물질을 없애고 흩날리지 않게 투명·반투명 봉투에 담아 배출하도록 안내해요.',
        foam: '울산시는 스티로폼을 비우고 상표를 떼며 이물질이 묻었으면 씻어서 배출하도록 안내해요.',
      },
    },
    districts: {
      중구: { home: 'https://www.junggu.ulsan.kr' },
      남구: { home: 'https://www.ulsannamgu.go.kr', recycle: 'https://www.ulsannamgu.go.kr/fieldInfo/garbageWaste01.jsp' },
      동구: { home: 'https://www.donggu.ulsan.kr', recycle: 'https://www.donggu.ulsan.kr/donggu/contents/contents.do?mId=7050301' },
      북구: { home: 'https://www.bukgu.ulsan.kr' },
      울주군: { home: 'https://www.ulju.ulsan.kr' },
    },
  },
};

export const METRO_DISTRICTS = Object.fromEntries(Object.entries(METRO_GUIDES).map(([province, guide]) => [province, Object.keys(guide.districts)]));
export const metroGuide = region => region ? METRO_GUIDES[region.province] || null : null;
export const metroDistrict = region => metroGuide(region)?.districts[region.district] || null;
export const METRO_CITY_SOURCES = Object.values(METRO_GUIDES).flatMap(guide => guide.city ? [guide.city.recycle, guide.city.food].filter(Boolean) : []);
