import { expandedItemEntries } from './expanded-catalog.js';
import { ITEM_VARIANTS } from './item-variants.js';
import { BATTERY_PACKAGING_NAMES, detectItemCategory, splitItemList } from './category-keywords.js';
import { ALUMINUM_CAPSULE_SOURCE, GEL_ICE_PACK_SOURCE, LAMP_DISPOSAL_SOURCE, MIXED_CAPSULE_SOURCE, PAPER_DISPOSAL_SOURCE, PAPER_NOODLE_CUP_SOURCE, RECYCLING_APPENDIX_SOURCE, WATER_ICE_PACK_SOURCE, WET_WIPE_SOURCE } from './catalog-sources.js';
// 정확한 품목명만 일치시킵니다. 대표 구성은 별도 메타데이터로 관리합니다.
export const bundledItemEntries = [
  [['우유팩', '두유팩', '주스팩', '쥬스팩', '멸균우유팩', '멸균팩', '종이팩'], '종이', 'carton'],
  [['신문', '신문지', '책', '노트', '종이상자', '택배상자', '골판지상자'], '종이', 'paper'],
  [['생수병', '생수페트병', '페트병', '음료페트병'], '페트병', '', '색상과 용도를 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['투명생수페트병', '무색생수페트병', '투명생수병'], '페트병', 'clear-drink'],
  [['유색페트병', '세제페트병', '식용유페트병'], '페트병', 'other-pet'],
  [['종이컵'], '종이', '', '양면 코팅 여부를 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['유리병', '소주병', '맥주병'], '유리', '', '깨짐 여부와 일반 유리병인지 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['음료캔', '맥주캔', '통조림캔', '참치캔', '콜라캔'], '금속·캔', 'food-can'],
  [['비닐봉투', '과자봉지'], '비닐', 'packaging'],
  [['플라스틱용기', '플라스틱트레이', '플라스틱도시락용기', '플라스틱반찬통', '플라스틱컵'], '플라스틱', 'container'],
  [['스티로폼상자', '스티로폼완충재', '전자제품포장완충재'], '스티로폼', 'packaging'],
  [['종이쇼핑백', '골판지', '복사용지', '전단지'], '종이', 'paper'],
  [['감열영수증', '감열지', '사진용지', '종이호일', '사용한휴지'], '종이', 'excluded'],
  [['양면코팅종이컵', '분리되지않는코팅종이'], '종이', 'coated'],
  [['깨진유리병', '깨진유리'], '유리', 'broken'],
  [['내열유리용기', '거울', '판유리', '크리스탈'], '유리', 'special'],
  [['부탄가스용기', '살충제용기', '페인트캔'], '금속·캔', 'hazard'],
  [['칫솔', '플라스틱옷걸이'], '플라스틱', 'other'],
  [['알루미늄호일'], '금속·캔', 'other'],
  [['고무장갑', '장판'], '비닐', 'other'],
  // 재질이 여러 가지인 이름도 추천하되 재질은 자동으로 확정하지 않습니다.
  [['용기', '도시락용기', '반찬통', '배달용기', '컵', '병', '포장재', '뚜껑', '라벨', '테이프', '장난감', '건전지', '배터리', '형광등', '보조배터리', '전자담배', '블루투스이어폰', '멀티탭', '충전기', '휴대폰'], '', ''],
  [['밥', '남은밥', '국수', '면'], '음식물류', 'soft', '포장재·뼈 등 이물질을 제거하고 지역 음식물 수거 방식을 확인해 주세요.'],
  [['사과껍질', '바나나껍질', '수박껍질'], '음식물류', 'soft', '단단한 씨앗과 포장재를 분리하고 지역 안내를 확인해 주세요.'],
  [['달걀껍데기', '달걀껍질', '계란껍질', '계란껍데기', '조개껍데기', '닭뼈', '생선뼈', '복숭아씨'], '음식물류', 'excluded'],
  [['음식물', '과일껍질', '채소찌꺼기'], '음식물류', '', '단단한 껍데기·뼈·씨앗 포함 여부를 확인한 뒤 종류를 선택해 주세요.'],
];

const localEntries = [
  ...expandedItemEntries,
  ...bundledItemEntries,
  [BATTERY_PACKAGING_NAMES, '', ''],
  [['일회용숟가락', '일회용수저', '일회용스푼'], '', '', '숟가락의 재질을 확인해 주세요.'],
  [['배달용기뚜껑', '포장용기뚜껑', '배달용기포장필름', '배달포장필름'], '', '', '용기와 분리한 부속품의 실제 재질과 상태를 확인해 주세요.'],
];
const aliases = {
  '종이박스': '종이상자', '택배박스': '택배상자', 'pet병': '페트병', '음료수캔': '음료캔',
  '일회용나무젓갈': '나무젓가락', '일회용목재젓가락': '나무젓가락',
  '배달음식용기': '배달용기', '배달음식통': '배달용기',
  '포장용기뚜껑': '배달용기뚜껑', '배달포장필름': '배달용기포장필름',
  '택배종이박스': '택배상자', '우유종이팩': '우유팩',
  '콜라깡통': '콜라캔', '캔음료': '음료캔',
  '감열지영수증': '감열영수증',
  '택배뽁뽁이': '뽁뽁이',
  '종이우유팩': '우유팩', '키보드': '컴퓨터키보드',
  '택배송장': '감열택배송장', '감열배송송장': '감열택배송장',
  '택배운송장': '감열택배송장', '택배송장스티커': '감열택배송장', '운송장스티커': '감열택배송장',
  '물티슈뚜껑': '플라스틱물티슈캡', '물티슈캡': '플라스틱물티슈캡',
};
const spellingSuggestions = {
  패트병: ['페트병'], 투명생수패트병: ['투명생수병'], 생수패트병: ['생수병'],
  패트병뚜껑: ['플라스틱용기뚜껑', '생수병'], 패트병라벨: ['비닐포장필름', '종이포장지', '생수병'],
  컵라면두껑: ['금속박종이포장지', '비닐포장필름', '플라스틱용기뚜껑'],
  페트병뚜겅: ['플라스틱용기뚜껑', '생수병'], 컵라면뚜겅: ['금속박종이포장지', '비닐포장필름', '플라스틱용기뚜껑'],
};
// These names require a choice even if a server catalog has an old entry.
const requiredVariants = [
  { names: ['장난감', '완구', '플라스틱장난감', '플라스틱완구', '인형'],
    variants: ['비전동플라스틱장난감', '전동장난감', '봉제인형', '대형장난감'],
    title: '장난감의 작동 방식과 재질 확인', question: '어떤 장난감을 버리나요?',
    hint: '전기·전지로 작동하는지, 천이나 솜으로 만든 인형인지, 일반 수거함에 들어갈 크기인지 확인해 주세요.',
    unknown: '분리되지 않는 다른 재질이 붙거나 종류가 불분명하면 관할 지역에 수거 여부를 확인해 주세요.',
    reason: '작은 비전동 플라스틱 완구, 전동 완구, 봉제인형과 큰 완구는 수거 경로가 달라요.', sources: [RECYCLING_APPENDIX_SOURCE] },
  { names: ['컵라면', '컵라면용기', '컵라면컵', '라면컵'],
    variants: ['종이컵라면용기', '스티로폼컵라면용기', '단단한플라스틱컵라면용기'],
    title: '컵라면 용기의 재질 확인', question: '용기 본체는 어떤 재질인가요?',
    hint: '국물을 비운 뒤 용기 바닥이나 겉면에 적힌 분리배출 표시를 보세요.',
    unknown: '겉포장과 뚜껑은 각각 확인해 주세요. 본체 재질을 모르면 관할 지역의 컵라면 용기 안내를 확인해 주세요.',
    reason: '종이·스티로폼·단단한 플라스틱은 수거 경로가 다르고, 씻어도 국물이나 기름이 남으면 재활용이 어려워요.', sources: [PAPER_NOODLE_CUP_SOURCE] },
  { names: ['컵라면뚜껑', '컵라면덮개', '라면컵뚜껑', '컵라면은박뚜껑', '은박라면뚜껑', '은박컵라면뚜껑'],
    variants: ['금속박종이포장지', '비닐포장필름', '플라스틱용기뚜껑'],
    title: '컵라면 포장에서 버릴 부분 확인', question: '컵에서 떼어낸 부분은 어떤 재질인가요?',
    hint: '종이에 붙은 은색 코팅인지, 비닐 표시가 있는 필름인지, 단단한 플라스틱 뚜껑인지 살펴보세요.',
    unknown: '포장에 표시가 없거나 겹친 재질을 구분하기 어려우면 관할 지역에 배출 방법을 확인해 주세요.',
    reason: '떼어낸 덮개와 겉비닐은 컵라면 본체와 재질이 다를 수 있어요.', sources: [] },
  { names: ['컵밥껍데기', '컵밥껍질', '컵밥포장'],
    variants: ['플라스틱즉석밥용기', '비닐포장필름', '플라스틱용기뚜껑', '종이포장지'],
    title: '밥 포장에서 버릴 부분 확인', question: '밥을 담았던 그릇인가요, 떼어낸 포장인가요?',
    hint: '버릴 부분에 적힌 분리배출 표시를 보고 골라 주세요.',
    unknown: '복합재질이거나 표시가 없으면 관할 지역에 이 부분의 배출 방법을 확인해 주세요.',
    reason: '그릇, 덮개와 겉포장은 각각 재질과 오염 상태에 따라 처리해요.', sources: [] },
  { names: ['컵밥뚜껑', '컵밥필름', '햇반뚜껑', '즉석밥뚜껑', '컵라면겉포장', '컵라면겉비닐'],
    variants: ['비닐포장필름', '플라스틱용기뚜껑', '금속박종이포장지'],
    title: '떼어낸 식품 포장의 재질 확인', question: '떼어낸 덮개나 겉포장은 어떤 재질인가요?',
    hint: '필름에 비닐류 표시가 있는지, 단단한 플라스틱이나 코팅 종이인지 확인해 주세요.',
    unknown: '겹친 재질을 구분하기 어려우면 해당 포장의 지역 배출 방법을 확인해 주세요.',
    reason: '덮개와 겉포장은 제품마다 재질이 달라요.', sources: [] },
  { names: ['생수병비닐', '생수병라벨', '페트병비닐', '페트병라벨', '물병라벨', '생수병상표'],
    variants: ['비닐포장필름', '종이포장지', '생수병'],
    title: '생수병에서 버릴 부분 확인', question: '병에서 떼어낸 라벨인가요, 병 본체인가요?',
    hint: '라벨을 떼었다면 라벨에 적힌 재질을 확인해 주세요.',
    unknown: '라벨의 재질이 불확실하면 제품의 표시나 관할 지역 안내를 확인해 주세요.',
    reason: '라벨과 페트병 본체는 수거 방법이 달라요.', sources: [] },
  { names: ['생수병뚜껑', '페트병뚜껑', '생수병마개', '페트병마개', '생수병캡', '페트병캡', '플라스틱병뚜껑'],
    variants: ['플라스틱용기뚜껑', '생수병'],
    title: '생수병 뚜껑의 배출 형태 확인', question: '뚜껑만 따로 버리나요, 병에 다시 닫아 버리나요?',
    hint: '무색 투명한 음료용 페트병과 함께 버린다면 생수병 안내를 확인해 주세요.',
    unknown: '뚜껑만 있고 재질을 모르면 제품에 적힌 표시나 관할 지역 안내를 확인해 주세요.',
    reason: '따로 떼어낸 뚜껑과 뚜껑을 닫은 투명 페트병은 배출 준비가 달라요.', sources: [] },
  { names: ['물티슈', '물티슈포장', '물티슈봉지'],
    variants: ['사용한물티슈', '비닐물티슈겉포장', '플라스틱물티슈캡'],
    title: '물티슈에서 버릴 부분 확인', question: '어느 부분을 버리나요?',
    hint: '물티슈 낱장은 종량제봉투에 넣어요. 포장은 버릴 부분을 골라 확인해 주세요.',
    unknown: '겉포장과 뚜껑의 재질은 포장에 적힌 분리배출 표시를 확인해 주세요.',
    reason: '물티슈 낱장과 포장은 재질이 달라 배출 방법도 달라요.', sources: [WET_WIPE_SOURCE] },
  { names: ['전구', '전등', '전구램프', '조명전구', '다쓴전구', '고장난전구', '폐전구'],
    variants: ['LED전구', '전구형형광등', '백열전구', '깨진전구'],
    title: '전구 종류와 깨짐 여부 확인', question: '어떤 전구인가요?',
    hint: '깨졌다면 ‘깨진 전구’를 고르고, 온전하다면 제품에 적힌 종류를 확인해 주세요.',
    unknown: '종류를 모르겠으면 깨지지 않게 보관하고 지역 조명 수거 기준을 확인해 주세요.',
    reason: 'LED·형광등·백열전구와 깨진 조명은 수거 기준이 달라질 수 있어요.', sources: [LAMP_DISPOSAL_SOURCE] },
  { names: ['영수증', '영수', '종이영수증', '카드영수증', '마트영수증', '전표', '영수중', '영수즹', '영슈증', '영수쯩'],
    pattern: /^(?:가게|편의점|매장|은행|계산대|결제|구매|카드결제|현금|식당|카페|종이로된)영수증$/,
    variants: ['감열영수증', '일반종이영수증'],
    title: '영수증의 종이 종류 확인', question: '어떤 영수증인가요?',
    hint: '용지 표시를 보거나, 일반 프린터에서 코팅 없는 종이에 인쇄한 것인지 확인해 주세요.',
    unknown: '재질이 불확실하면 일반 종이류 수거함에 넣지 말고 지역 안내를 확인해 주세요.',
    reason: '감열지와 코팅 없는 일반 인쇄용지는 배출 방법이 달라요.', sources: [PAPER_DISPOSAL_SOURCE] },
  { names: ['아이스팩', '아이쓰팩', '아이스펙', '배송아이스팩', '택배아이스팩', '냉매팩', '냉동아이스팩'],
    variants: ['물아이스팩', '젤아이스팩'],
    title: '아이스팩의 내용물 확인', question: '어떤 아이스팩인가요?',
    hint: '팩에 적힌 내용물 표시를 확인해 주세요.',
    unknown: '내용물을 모르겠으면 팩을 뜯지 말고 지역의 아이스팩 배출 기준을 확인해 주세요.',
    reason: '내용물이 물인지 젤인지에 따라 버리는 방법이 달라요.', sources: [WATER_ICE_PACK_SOURCE, GEL_ICE_PACK_SOURCE] },
  { names: ['커피캡슐', '캡슐커피', '일회용커피캡슐', '사용한커피캡슐', '다쓴커피캡슐'],
    variants: ['알루미늄커피캡슐', '플라스틱커피캡슐'],
    title: '커피캡슐의 재질 확인', question: '어떤 커피캡슐인가요?',
    hint: '상자나 제품 안내에 적힌 캡슐 본체 재질을 확인해 주세요.',
    unknown: '재질을 모르겠으면 제조사 회수 여부나 지역의 커피캡슐 배출 기준을 확인해 주세요.',
    reason: '캡슐 본체 재질에 따라 이용할 수 있는 회수 방법이 달라요.', sources: [ALUMINUM_CAPSULE_SOURCE, MIXED_CAPSULE_SOURCE] },
];
// Other vague names get helpful choices before ordinary catalog matches.
const variantNames = [
  { names: ['햇반그릇', '햇반통', '즉석밥그릇'], variants: ['플라스틱즉석밥용기', '즉석밥용기'] },
  { names: ['샴푸펌프', '샴푸통펌프', '세제펌프', '세제통펌프', '로션펌프', '로션통펌프'], variants: ['스프링이든복합재질펌프', '펌프형플라스틱샴푸통'] },
  { names: ['흡수패드', '고기받침', '고기밑종이', '고기밑패드'], variants: ['식품포장흡수패드', '랩포장스티로폼정육트레이'] },
  { names: ['컵'], variants: ['종이컵', '플라스틱컵', '유리컵', '도자기컵'] },
  { names: ['병'], variants: ['생수병', '유리병', '유색페트병'] },
  { names: ['음료병', '음료수병'], variants: ['투명탄산음료페트병', '유리음료병', '유색음료페트병'] },
  { names: ['뚜껑', '마개'], variants: ['플라스틱용기뚜껑', '플라스틱컵뚜껑', '유리냄비뚜껑'] },
  { names: ['컵뚜껑', '커피컵뚜껑', '테이크아웃컵뚜껑'], variants: ['플라스틱컵뚜껑', '플라스틱테이크아웃컵', '종이컵'] },
  { names: ['그릇', '접시'], variants: ['도자기그릇', '유리그릇', '플라스틱용기'] },
  { names: ['깨진접시', '깨진그릇'], variants: ['깨진도자기', '깨진유리'] },
  { names: ['코팅된종이', '코팅종이'], variants: ['분리되지않는코팅종이', '금속박종이포장지', '복사용지'] },
  { names: ['완충재', '택배완충재'], variants: ['뽁뽁이', '스티로폼완충재', '종이완충재'] },
  { names: ['포장지'], variants: ['종이포장지', '비닐봉투', '금속박종이포장지'] },
  { names: ['소스통', '소스용기', '소스병', '양념통'], variants: ['플라스틱용기', '유리병'] },
  { names: ['김치통', '식품보관통'], variants: ['플라스틱김치통', '유리병'] },
  { names: ['요구르트병', '요거트통'], variants: ['요구르트용기', '유리병'] },
  { names: ['테이크아웃컵', '커피테이크아웃컵'], variants: ['플라스틱테이크아웃컵', '종이컵'] },
  { names: ['콜라병', '탄산음료병'], variants: ['투명탄산음료페트병', '유리음료병'] },
  { names: ['송장', '택배전표', '배송라벨', '택배박스라벨', '송장스티커'], variants: ['택배송장', '택배상자'] },
  { names: ['코팅컵', '일회용컵', '커피컵'], variants: ['종이컵', '양면코팅종이컵', '플라스틱테이크아웃컵'] },
];
const foldItemName = name => typeof name === 'string' ? name.normalize('NFKC').replace(/\s+/g, '').toLowerCase() : '';
export const normalizeItemName = name => {
  const value = foldItemName(name);
  return Object.hasOwn(aliases, value) ? aliases[value] : value;
};

export function itemMatchLabel(query, name) {
  if (foldItemName(query) === foldItemName(name)) return '입력한 이름';
  if (normalizeItemName(query) === normalizeItemName(name)) return '다른 표기';
  return itemCandidateHint(name) || '비슷한 이름';
}

const candidateHints = {
  비전동플라스틱장난감: '전지·전기를 쓰지 않는 작은 플라스틱 완구',
  전동장난감: '건전지·충전·전원으로 작동하는 완구',
  봉제인형: '천과 솜으로 만든 인형',
  대형장난감: '플라스틱 수거함에 함께 넣기 어려운 크기',
  비닐포장필름: '떼어낸 라벨·덮개에 비닐류 표시가 있을 때',
  플라스틱즉석밥용기: '덮개를 떼고 남은 그릇',
  즉석밥용기: '그릇과 떼어내는 덮개',
  스프링이든복합재질펌프: '병에서 뗀 금속 스프링이 든 펌프',
  종이컵라면용기: '종이류 표시가 있는 컵라면 본체',
  스티로폼컵라면용기: '가볍고 푹신한 발포 소재의 본체',
  단단한플라스틱컵라면용기: '플라스틱 표시가 있는 단단한 본체',
  식품포장흡수패드: '고기·생선 아래에서 물기를 흡수하는 패드',
  랩포장스티로폼정육트레이: '고기를 담았던 발포 스티로폼 받침',
  사용한물티슈: '포장을 제외한 물티슈 낱장',
  비닐물티슈겉포장: '물티슈를 담았던 비닐 포장',
  플라스틱물티슈캡: '겉포장에서 떼어낸 플라스틱 뚜껑',
  led전구: '제품에 LED라고 적힌 전구',
  전구형형광등: '형광등·삼파장으로 표시된 전구',
  백열전구: '백열·할로겐 전구',
  깨진전구: '금이 가거나 파편이 생긴 전구',
  감열영수증: '감열지에 인쇄된 영수증',
  일반종이영수증: '코팅 없는 일반 인쇄용지',
  감열택배송장: '상자나 봉투에서 떼어낸 송장',
  물아이스팩: '내용물 표시: 물',
  젤아이스팩: '내용물 표시: 젤·겔 또는 SAP',
  알루미늄커피캡슐: '캡슐 본체가 알루미늄',
  플라스틱커피캡슐: '캡슐 본체가 플라스틱 또는 복합재질',
  플라스틱테이크아웃컵: '단단한 플라스틱 컵',
  종이컵: '종이컵 · 코팅 확인',
  양면코팅종이컵: '안팎에 코팅된 종이컵',
  택배상자: '송장을 떼고 남는 골판지 상자',
  플라스틱용기뚜껑: '용기에서 떼어낸 플라스틱 뚜껑',
  플라스틱컵뚜껑: '컵에서 떼어낸 플라스틱 뚜껑',
  유리냄비뚜껑: '내열·특수 유리',
  분리되지않는코팅종이: '코팅층을 떼기 어려운 종이',
  복사용지: '코팅 없는 일반 인쇄용지',
};
const candidateTitles = {
  비전동플라스틱장난감: '비전동 플라스틱 장난감',
  비닐포장필름: '떼어낸 비닐 라벨·필름',
  플라스틱즉석밥용기: '플라스틱 즉석밥 그릇',
  즉석밥용기: '즉석밥 용기 전체',
  스프링이든복합재질펌프: '스프링이 든 펌프',
  종이컵라면용기: '종이 컵라면 용기',
  스티로폼컵라면용기: '스티로폼 컵라면 용기',
  단단한플라스틱컵라면용기: '단단한 플라스틱 컵라면 용기',
  식품포장흡수패드: '고기·생선 포장의 흡수패드',
  랩포장스티로폼정육트레이: '스티로폼 받침과 비닐 랩',
  사용한물티슈: '물티슈 낱장',
  비닐물티슈겉포장: '물티슈 비닐 겉포장',
  플라스틱물티슈캡: '물티슈 플라스틱 뚜껑',
};
export const itemCandidateTitle = name => {
  const key = normalizeItemName(name);
  return Object.hasOwn(candidateTitles, key) ? candidateTitles[key] : name;
};
export const itemCandidateHint = name => {
  const key = normalizeItemName(name);
  return Object.hasOwn(candidateHints, key) ? candidateHints[key] : '';
};

export function itemTypeClarification(name) {
  const key = searchableName(name);
  return requiredVariants.find(({ names, pattern }) => names.includes(key) || pattern?.test(key)) || null;
}

function entryIndex(source) {
  const index = new Map();
  for (const entry of source) for (const name of entry[0]) {
    const key = normalizeItemName(name);
    if (!index.has(key)) index.set(key, entry);
  }
  return index;
}
const expandedIndex = entryIndex(expandedItemEntries);

function catalogIndex(source) {
  const index = new Map();
  for (const [key, entry] of entryIndex(source)) {
    const local = expandedIndex.get(key);
    // 검토한 전용 경로와 숟가락 기준은 이전 카탈로그의 일반 플라스틱 분류보다 우선합니다.
    const chosen = local && (local[4]?.handling || local[2] === 'utensil' || !entry[1]) ? local : entry;
    const [, material, type, note = '실제 재질 표시를 확인해 주세요. 오염과 결합 상태는 직접 선택해 주세요.'] = chosen;
    const compatible = local && local[1] === material && (!type || local[2] === type || local[4]?.defaults?.type === type);
    index.set(key, { material, type, note: compatible ? local[3] : note,
      ...(compatible ? structuredClone(local[4]) : {}),
      ...(compatible && ITEM_VARIANTS[key] ? { variants: structuredClone(ITEM_VARIANTS[key]) } : {}) });
  }
  return index;
}

function searchIndex(source) {
  const names = [...new Set([...bundledItemEntries, ...source].flatMap(([names]) => names))];
  const keys = new Set(names.map(normalizeItemName));
  const extra = Object.keys(aliases).filter(alias => keys.has(aliases[alias]));
  return [...new Set([...names, ...extra])].filter(name => !itemTypeClarification(name))
    .map(name => ({ name, spelling: foldItemName(name), key: normalizeItemName(name) }));
}

export function nearbyItemNames(query) {
  const key = searchableName(query);
  const group = itemTypeClarification(key) || variantNames.find(({ names }) => names.includes(key));
  return group?.variants.filter(name => items.get(normalizeItemName(name))?.material) || [];
}
let items = catalogIndex(localEntries);
let suggestions = searchIndex(localEntries);

export function setItemCatalog(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !row ||
    typeof row.id !== 'string' || !Array.isArray(row.aliases) || !row.aliases.length ||
    row.aliases.some(name => typeof name !== 'string' || !name.trim()) ||
    typeof row.material !== 'string' || typeof row.item_type !== 'string' || typeof row.note !== 'string')) {
    throw new Error('품목 데이터 형식을 확인해 주세요.');
  }
  const seen = new Map();
  for (const row of rows) for (const name of row.aliases) {
    const key = normalizeItemName(name), previous = seen.get(key);
    if (previous && (previous.material !== row.material || previous.item_type !== row.item_type)) {
      throw new Error('같은 품목 이름에 서로 다른 재질·종류가 설정되어 있어요.');
    }
    seen.set(key, row);
  }
  // 조회마다 모든 이름을 정규화하지 않고, DB 갱신 시 한 번만 색인을 구성합니다.
  const source = [...rows.map(row => [row.aliases.slice(), row.material, row.item_type, row.note]), ...localEntries];
  const nextItems = catalogIndex(source), nextSuggestions = searchIndex(source);
  items = nextItems; suggestions = nextSuggestions;
}

export function lookupItem(name) {
  if (itemTypeClarification(name) || Object.hasOwn(spellingSuggestions, foldItemName(name))) return null;
  const item = items.get(normalizeItemName(name));
  // 호출자가 자동 입력·부속품을 수정해도 다음 검색의 원본은 변하지 않습니다.
  return item ? structuredClone(item) : null;
}

export function disposalQueryName(query) {
  if (typeof query !== 'string') return '';
  const name = query.normalize('NFKC').trim();
  if (name.length > 80) return name;
  const item = name.replace(/[?!.,。？！]+$/u, '')
    .replace(/\s*(?:은|는|을|를)?\s*(?:(?:어디\s*에?|어떻게)\s*(?:버리나요|버릴까요|버려(?:요|야\s*해(?:요)?)?|버리면\s*돼(?:요)?)|분리\s*(?:배출|수거)(?:은|는|을|를)?\s*(?:방법|어떻게\s*(?:하나요|해(?:요|야\s*해(?:요)?)?|하면\s*돼(?:요)?))|버리는\s*법|버리려면|배출\s*방법)$/u, '').trim();
  if (items.get(normalizeItemName(item))?.material) return item;
  return item.replace(/^(?:떼어\s*낸|분리한)\s+(?=.+(?:뚜껑|마개|캡|라벨|상표|필름|펌프))/u, '')
    .replace(/(?:에서\s*(?:떼어\s*낸|분리한)|에\s*붙(?:어\s*있던|어\s*있는|은))\s*(?=(?:뚜껑|마개|캡|라벨|상표|필름|펌프))/u, ' ')
    .replace(/(?<=(?:뚜껑|뚜겅|마개|캡|라벨|상표|필름|펌프))\s*만$/u, '');
}

function searchableName(query) {
  return foldItemName(disposalQueryName(query));
}

// Exact catalog names win, including registered combinations of a body and its attachments.
export function disposalItemList(query) {
  const name = disposalQueryName(query);
  if (!name || name.length > 80 || items.get(normalizeItemName(query))?.material || items.get(normalizeItemName(name))?.material) return [];
  const explicit = splitItemList(name);
  if (explicit.length) return explicit;
  const recognized = part => part.length > 0 && part.length <= 32 &&
    (items.has(normalizeItemName(part)) || itemTypeClarification(part));
  const connectors = [...name.matchAll(/하고|이랑|랑|와|과/gu)];
  function readParts(start, remaining) {
    const rest = name.slice(start).trim();
    if (start && recognized(rest)) return [rest];
    if (remaining <= 1) return [];
    for (const { index, 0: connector } of connectors) {
      if (index <= start) continue;
      const first = name.slice(start, index).trim();
      if (!recognized(first)) continue;
      const following = readParts(index + connector.length, remaining - 1);
      if (following.length) return [first, ...following];
    }
    return [];
  }
  const parts = readParts(0, 6);
  const unique = [...new Map(parts.map(part => [normalizeItemName(part), part])).values()];
  return unique.length > 1 ? unique : [];
}

// A single insertion, deletion, substitution, or adjacent swap. Never an exact match for rules.
function oneEdit(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  while (i < left.length && left[i] === right[i]) i++;
  if (left.length === right.length) {
    if (i === left.length) return false;
    return left.slice(i + 1) === right.slice(i + 1)
      || (left[i] === right[i + 1] && left[i + 1] === right[i] && left.slice(i + 2) === right.slice(i + 2));
  }
  return left.length < right.length ? left.slice(i) === right.slice(i + 1) : left.slice(i + 1) === right.slice(i);
}

export function uniqueItemNames(names, limit, exact = '') {
  const seen = new Set(), result = [];
  for (const name of names) {
    const key = normalizeItemName(name);
    if (!key || seen.has(key) || key === exact) continue;
    seen.add(key);
    result.push(name);
    if (result.length >= limit) break;
  }
  return result;
}

function candidatesFor(query, limit, { confirmedOnly = false } = {}) {
  if (disposalItemList(query).length) return [];
  const raw = foldItemName(query), search = searchableName(query);
  const normalized = normalizeItemName(search);
  if (!normalized || !Number.isInteger(limit) || limit < 1) return [];
  const capacity = Math.min(limit, 10);
  const variants = Object.hasOwn(spellingSuggestions, search) ? spellingSuggestions[search] : nearbyItemNames(search);
  // Variants present meaningfully different possibilities before repeated aliases.
  if (itemTypeClarification(search) || Object.hasOwn(spellingSuggestions, search)) return variants.slice(0, capacity);
  const eligible = entry => !confirmedOnly || items.get(entry.key)?.material;
  const partSuffix = /(?:뚜껑|라벨|마개|덮개|필름|펌프|캡|상표)$/;
  const requestedPart = partSuffix.exec(search)?.[0];
  const matchingPart = entry => Boolean(requestedPart && (entry.spelling.endsWith(requestedPart) || entry.key.endsWith(requestedPart)));
  const matches = suggestions.filter(entry => eligible(entry) && (entry.key.includes(normalized) || entry.spelling.includes(search)))
    .sort((a, b) => Number(b.spelling === raw) - Number(a.spelling === raw)
      || Number(b.key === normalized) - Number(a.key === normalized)
      || Number(matchingPart(b)) - Number(matchingPart(a))
      || Number(b.key.endsWith(normalized)) - Number(a.key.endsWith(normalized))
      || Number(b.key.startsWith(normalized)) - Number(a.key.startsWith(normalized))
      || Number(Boolean(items.get(b.key)?.material)) - Number(Boolean(items.get(a.key)?.material))
      || a.name.length - b.name.length);
  const names = [...matches.filter(entry => entry.spelling === raw).map(entry => entry.name), ...variants, ...matches.map(entry => entry.name)];
  if (!names.length && /^[가-힣]{3,14}$/.test(search)) {
    const fuzzy = suggestions.filter(entry => eligible(entry) && items.get(entry.key)?.material
      && (entry.spelling[0] === search[0] || (search.length >= 4 && entry.spelling.slice(1) === search.slice(1)))
      && oneEdit(search, entry.spelling))
      .sort((a, b) => Number(matchingPart(b)) - Number(matchingPart(a))
        || Number(b.spelling.slice(0, 2) === search.slice(0, 2)) - Number(a.spelling.slice(0, 2) === search.slice(0, 2))
        || Math.abs(a.name.length - search.length) - Math.abs(b.name.length - search.length) || a.name.length - b.name.length);
    names.push(...fuzzy.map(entry => entry.name));
  }
  return uniqueItemNames(names, capacity, confirmedOnly && items.get(normalizeItemName(query))?.material ? normalizeItemName(query) : '');
}

export function searchItemNames(query, limit = 6) {
  return candidatesFor(query, limit);
}

// Show actual catalog options after submitting an unregistered name. Keep exact lookup separate.
export function relatedItemCandidates(query, limit = 4) {
  return candidatesFor(query, limit, { confirmedOnly: true });
}

// A narrow grammar for explicit descriptions; bare receipts still need a choice.
export function describedReceiptName(description) {
  const value = foldItemName(description).replace(/[.!?。？！]+$/, '');
  if (/^(?:감열(?:지)?영수증|(?:감열지|감열용지)(?:에|로)(?:출력한|인쇄한)영수증)(?:이에요|입니다|예요)?$/.test(value)) return '감열영수증';
  if (/^(?:(?:코팅없는)?일반(?:종이|인쇄용지|복사용지)(?:에출력한|에인쇄한)?영수증)(?:이에요|입니다|예요)?$/.test(value)) return '일반종이영수증';
  return '';
}

// A short explicit name can be followed by a description of its state.
// Don't pick a catalog name just because it appears somewhere in the text.
export function explicitDescriptionItemName(description) {
  if (typeof description !== 'string') return '';
  const receipt = describedReceiptName(description);
  if (receipt) return receipt;
  const text = description.trim();
  if (text.length <= 80 && items.get(normalizeItemName(text))?.material) return text;
  const shortName = text.replace(/[.!?。？！]+$/u, '');
  if (shortName.length <= 80 && items.get(normalizeItemName(shortName))?.material) return shortName;
  const questionName = disposalQueryName(text);
  if (questionName.length <= 80 && (items.get(normalizeItemName(questionName))?.material || itemTypeClarification(questionName))) return questionName;
  const clauses = text.split(/[.!?。？！;\n]/u);
  const first = clauses[0];
  if (/[\s,](?:아니|다른 물건|모르|같아)|(?:아니고|모르겠|같기도)/u.test(text)) return '';
  const statedName = clause => /^(.{1,75}?)(?:이에요|예요|입니다|이라고 해요)(?=$|[,\s])/u.exec(clause.trim())?.[1].trim();
  const knownName = name => Boolean(items.get(normalizeItemName(name))?.material || itemTypeClarification(name) || detectItemCategory(name));
  const subject = /^(.{1,75}?)(?:은|는)?(?:\s*[,]\s*|\s+)(?=(?:안(?:에|에는)|속(?:에|에는)|겉(?:에|에는)|본체(?:는|가|에)|뚜껑(?:은|이|에)|라벨(?:은|이|에))\s)/u.exec(first)?.[1].trim();
  const stated = statedName(first) || subject;
  if (!stated || !(items.get(normalizeItemName(stated))?.material || itemTypeClarification(stated))) return '';
  const otherItem = clauses.slice(1).some(clause => {
    const other = statedName(clause);
    return other && normalizeItemName(other) !== normalizeItemName(stated) && knownName(other);
  });
  return otherItem ? '' : stated;
}

export function suggestItemInfo(name) {
  const item = lookupItem(name);
  return item?.material ? { ...item, type: item.type || item.defaults?.type || '' } : null;
}
