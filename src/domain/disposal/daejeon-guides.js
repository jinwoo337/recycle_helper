// 구청 공식 자료 확인일: 2026-10-26. 동별 배출일·공동주택 예외는 원문에서 확인합니다.
export const DAEJEON_DISTRICTS = ['동구', '중구', '서구', '유성구', '대덕구'];
export const DAEJEON_GUIDES = {
  '동구': {
    recycle: 'https://www.donggu.go.kr/dg/kor/contents/618',
    food: 'https://donggu.go.kr/dg/kor/contents/168',
    carton: '종이팩은 비우고 헹군 뒤 일반 폐지와 분리해 주세요. 전용 수거함이 없으면 다른 재활용품과 함께 구분해 배출해요.',
    paper: '종이는 젖지 않게 묶고 상자의 테이프·철핀과 책의 스프링을 제거해 주세요.',
    container: '용기의 내용물을 비우고 본체와 다른 재질의 뚜껑·상표·부속품을 분리해 주세요.',
    foodNote: '동구는 가정용 음식물을 5L 전용용기에 납부필증을 붙여 배출하도록 안내해요. 공동주택은 단지의 지정 용기·수거 방식을 확인해 주세요.',
  },
  '중구': {
    recycle: 'https://www.djjunggu.go.kr/kr/sub06_05_09_05.do',
    food: 'https://www.djjunggu.go.kr/kr/sub06_05_09_06.do',
    carton: '내용물을 비우고 헹군 종이팩을 일반 종이와 따로 모아 주세요. 전용 수거함이 없으면 다른 재활용품과 구분해 배출해요.',
    paper: '종이는 젖지 않게 묶고 비닐 코팅 표지·테이프·스프링을 제거해 주세요.',
    container: '내용물과 이물질을 제거하고 용기 본체와 다른 재질을 분리해 배출해 주세요.',
    foodNote: '중구 단독주택은 3L·5L 전용용기에 용량에 맞는 납부스티커를 매번 붙여 배출해요. 공동주택은 단지의 공동 수거용기를 이용해 주세요.',
  },
  '서구': {
    recycle: 'https://seogu.go.kr/kor/sub06_11_02_01.do',
    food: 'https://www.seogu.go.kr/kor/sub06_11_01_02.do',
    paper: '서구 단독주택은 신문·책 등을 끈으로 묶어 따로 배출할 수 있어요.',
    vinyl: '서구 단독주택은 비닐 포장재를 투명 비닐봉투에 따로 모아 묶어서 배출해 주세요.',
    container: '내용물을 비우고 쓰레기를 섞지 말아 주세요. 공동주택은 단지 수거 안내를 함께 확인해 주세요.',
    foodNote: '서구는 이물질과 물기를 줄여 음식물 전용 수거용기에 담아 배출하도록 안내해요. 공동주택은 지정 용기·관리사무소 안내를 따라 주세요.',
  },
  '유성구': {
    recycle: 'https://www.yuseong.go.kr/kor/sub07_11_03_03.do',
    food: 'https://www.yuseong.go.kr/kor/sub07_11_03_04.do',
    carton: '유성구는 우유팩·두유팩·음료팩을 폐지와 반드시 분리하도록 안내해요.',
    paper: '코팅된 표지·테이프 등 다른 재질을 제거하고 젖지 않게 모아 배출해 주세요.',
    vinyl: '라면·과자 봉지는 이물질을 제거해 배출하고 오염을 제거하지 못한 포장재는 재활용품과 섞지 마세요.',
    container: '용기의 이물질을 제거하고 다른 재질과 분리해 배출해 주세요. 유색 스티로폼은 별도 수거 여부를 확인해 주세요.',
    foodNote: '유성구 자동크린넷 설치지역은 전용봉투를 시설에 투입해요. 그 외 일반주택은 전용용기에 납부필증을 붙이고 공동주택은 단지의 중간 수거용기를 이용해 주세요.',
  },
  '대덕구': {
    recycle: 'https://www.daedeok.go.kr/was/goContents.do?link=%2Fwas%2Fwas01%2FWAS010206&menuId=WAS010206',
    food: 'https://www.daedeok.go.kr/was/goContents.do?link=%2Fwas%2Fwas01%2FWAS010204&menuId=WAS010204',
    carton: '대덕구 종이팩은 씻어 펼치고 말린 뒤 배출해 주세요. 이물질이 남은 종이팩은 재활용 대상에서 제외돼요.',
    paper: '신문·책·상자는 코팅 표지 등 다른 재질을 떼고 젖지 않게 묶어 배출해 주세요.',
    vinyl: '과자봉지 등 비닐류는 이물질을 제거한 뒤 배출해 주세요.',
    container: '내용물과 이물질을 제거하고 다른 재질을 분리해 주세요. 무색 페트병은 별도로 모아 배출해요.',
    foodNote: '대덕구 일반주택은 3L·5L 전용용기에 납부필증을 붙여 배출해요. 공동주택은 단지의 지정 수거용기를 이용하고 비닐 등 이물질을 넣지 마세요.',
  },
};
export const DAEJEON_SOURCES = [...new Set(Object.values(DAEJEON_GUIDES).flatMap(guide => [guide.recycle, guide.food]))];
