// 사전에 없는 이름도 사용자가 확인한 종류로 분류합니다. 이름/AI 추정으로 종류를 대신 선택하지 않습니다.
export const ITEM_CATEGORIES = [
  ['packaging', '재질·분리배출 표시를 확인한 포장재·용기'],
  ['food', '음식물·조리 부산물'],
  ['medicine', '남은 약·폐의약품 (건강기능식품 제외)'],
  ['battery', '건전지·분리된 전지'],
  ['rechargeable', '충전지·보조배터리'],
  ['damaged-battery', '부풀거나 새거나 파손된 전지'],
  ['electronic', '소형 전기·전자제품'],
  ['large-electronic', '대형 전기·전자제품'],
  ['fluorescent', '깨지지 않은 형광등'],
  ['broken-lamp', '깨진 형광등·조명'],
  ['led', 'LED 조명'],
  ['bulb', '백열·할로겐 전구'],
  ['pressure-can', '가스·스프레이 등 압력 용기'],
  ['chemical-can', '도료·윤활유·화학제품'],
  ['clothing', '의류·신발·가방'],
  ['bedding', '이불·베개·쿠션'],
  ['ceramic', '도자기·사기 식기'],
  ['large', '가구·큰 생활용품 (전기제품 제외)'],
  ['unknown', '종류를 모르겠어요 / 위에 없어요'],
];
export const validItemCategory = value => ITEM_CATEGORIES.some(([id]) => id === value);
export const categoryLabel = value => ITEM_CATEGORIES.find(([id]) => id === value)?.[1] || '';

export const PACKAGING_MATERIALS = ['플라스틱', '페트병', '종이', '유리', '금속·캔', '비닐', '스티로폼'];
export function categoryAllowsMaterial(category, material) {
  if (category === 'packaging') return PACKAGING_MATERIALS.includes(material) || ['기타', '모르겠어요'].includes(material);
  if (category === 'food') return material === '음식물류';
  return true;
}
