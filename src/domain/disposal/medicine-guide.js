import { normalizeItemName } from './item-suggestions.js';

export const MEDICINE_SOURCES = {
  seoul: 'https://news.seoul.go.kr/env/archives/564807',
  daejeon: 'https://www.daejeon.go.kr/drh/depart/board/boardNormalView.do?boardId=normal_0096&menuSeq=1631&ntatcSeq=1438964404',
  donggu: 'https://www.donggu.go.kr/dg/kor/article/noticeDong13/142796',
};

export const MEDICINE_SAFETY_STEPS = [
  '약은 종량제봉투나 재활용품에 넣거나 하수구에 버리지 마세요.',
  '약이 섞이거나 새지 않게 보관하고 개인정보가 적힌 겉봉투는 따로 처리해 주세요.',
];

export function medicineRegionalGuidance(region, itemName) {
  const name = normalizeItemName(itemName);
  const solid = ['알약', '가루약', '캡슐약'].includes(name);
  const liquid = ['물약', '시럽약', '연고', '안약'].includes(name);
  const checkPackaging = '이 약의 포장 처리 방법과 접수 여부를 가져가기 전에 수거처에 확인해 주세요.';
  if (region.province === '서울특별시') {
    return {
      scope: 'city', source: MEDICINE_SOURCES.seoul, key: 'medicine:seoul',
      preparation: solid ? '약이 든 포장은 개봉하지 않은 상태로 준비해 주세요.'
        : liquid ? '용기의 마개를 닫아 내용물이 새지 않게 해 주세요.' : checkPackaging,
      collection: solid ? '지정 수거함에 넣거나, 봉투를 밀봉해 ‘폐의약품’이라고 표시한 뒤 서울의 우체통을 이용해 주세요.'
        : '스마트서울맵에서 가까운 폐의약품 전용 수거함을 찾아 가져가 주세요.',
    };
  }
  if (region.province === '대전광역시') {
    const confirmedPackaging = region.district === '동구' && ['알약', '가루약'].includes(name);
    return {
      scope: confirmedPackaging ? 'district' : 'city', source: confirmedPackaging ? MEDICINE_SOURCES.donggu : MEDICINE_SOURCES.daejeon,
      key: confirmedPackaging ? 'medicine:daejeon-donggu' : 'medicine:daejeon',
      preparation: confirmedPackaging ? '알약이나 가루약은 약이 든 포장 그대로 가져가 주세요.' : checkPackaging,
      collection: '동 행정복지센터나 보건소의 폐의약품 수거함을 이용해 주세요. 약국은 수거 여부를 먼저 확인해 주세요.',
    };
  }
  return null;
}
