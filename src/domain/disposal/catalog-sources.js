export const PAPER_DISPOSAL_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/typeItemHtml.do';
export const LAMP_DISPOSAL_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=538';
export const WET_WIPE_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=375';
export const PAPER_NOODLE_CUP_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=406';
export const FOAM_NOODLE_CUP_SOURCE = 'https://www.kca.go.kr/smartconsumer/sub.do?menukey=7740';
export const FOOD_PAD_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=454';
export const RICE_CONTAINER_SOURCE = 'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=98';
export const WATER_ICE_PACK_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=779';
export const GEL_ICE_PACK_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=179';
export const ALUMINUM_CAPSULE_SOURCE = 'https://www.koreapost.go.kr/user/extra/kpost/99/1205/bbs/pressRelease/pressReleaseView/jsp/ExtraUser.do?bbsDataIdx=100087072';
export const MIXED_CAPSULE_SOURCE = 'https://www.kca.go.kr/smartconsumer/sub.do?cate2=00000406&menukey=7800&mode=view&no=1003195658&page=18';
export const RECYCLING_APPENDIX_SOURCE = 'https://www.law.go.kr/flDownload.do?bylClsCd=200201&flSeq=160907851';
export const APARTMENT_CARTON_SOURCE = 'https://www.korea.kr/multi/visualNewsView.do?newsId=148973111';
export const SHAMPOO_SOURCE = 'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=590';
// 실제 검토한 공개 자료만 결과 화면의 출처로 허용합니다.
export const CATALOG_DETAIL_SOURCES = {
  [PAPER_DISPOSAL_SOURCE]: '분리배출 누리집 · 종이, 택배 송장, 감열 영수증',
  [LAMP_DISPOSAL_SOURCE]: '품목사전 · 조명제품',
  [WET_WIPE_SOURCE]: '품목사전 · 물티슈와 포장재',
  [PAPER_NOODLE_CUP_SOURCE]: '품목사전 · 종이 컵라면 용기',
  [FOAM_NOODLE_CUP_SOURCE]: '한국소비자원 · 재질별 배출 안내',
  [FOOD_PAD_SOURCE]: '품목사전 · 식품 포장 흡수패드',
  [RICE_CONTAINER_SOURCE]: '품목사전 · 즉석밥 용기',
  'https://news.seoul.go.kr/env/archives/564807': '서울시 · 폐의약품 수거 안내',
  'https://www.daejeon.go.kr/drh/depart/board/boardNormalView.do?boardId=normal_0096&menuSeq=1631&ntatcSeq=1438964404': '대전시 · 폐의약품 안내 (2023)',
  'https://www.donggu.go.kr/dg/kor/article/noticeDong13/142796': '대전 동구 · 폐의약품 안내 (2026)',
  'https://www.nowon.kr/www/minwon/minwon4/minwon4_03/minwon4_03_02.jsp':'노원구 · 생활폐기물 배출 안내',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316':'품목사전 · 연필·필기구',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=325':'품목사전 · 지우개',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=312':'품목사전 · 분필',
  'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622':'품목사전 · 비닐 식품 포장',
  'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=409':'품목사전 · 알루미늄 호일',
  'https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=593':'품목사전 · 플라스틱 치약 용기',
  [WATER_ICE_PACK_SOURCE]: '품목사전 · 물 아이스팩',
  [GEL_ICE_PACK_SOURCE]: '품목사전 · 젤 아이스팩',
  [ALUMINUM_CAPSULE_SOURCE]: '우정사업본부 · 알루미늄 커피캡슐 회수',
  [MIXED_CAPSULE_SOURCE]: '한국소비자원 · 커피캡슐 재질 조사',
  [RECYCLING_APPENDIX_SOURCE]: '기후에너지환경부 · 재활용가능자원 분리수거 지침 별표 1',
  [APARTMENT_CARTON_SOURCE]: '기후에너지환경부 · 공동주택 종이팩 별도 배출',
  [SHAMPOO_SOURCE]: '품목사전 · 샴푸 용기와 펌프',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=638': '품목사전 · 유색 스티로폼 포장재',
  'https://clean.yongsan.go.kr/resources/images/user/recycleExhaust.pdf': '재활용품 분리배출 가이드라인 · 나무젓가락',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=416': '품목사전 · 작은 플라스틱 숟가락',
  'https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=775': '품목사전 · 목재 숟가락',
};
