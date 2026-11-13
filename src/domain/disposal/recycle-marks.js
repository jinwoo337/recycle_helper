// 포장에 인쇄된 분리배출 표시(마크)를 눌러 재질·세부 종류를 고르게 합니다.
// 표시는 재질을 알려 줄 뿐 오염·결합 상태는 알려 주지 않으므로, 상태 질문은 그대로 이어집니다.
export const RECYCLE_MARK_SOURCE = 'https://www.keco.or.kr/web/lay1/S1T183C1049/contents.do';
export const RECYCLE_MARKS = [
  { id: 'clear-pet', label: '무색페트', hint: '투명한 생수·음료병', material: '페트병', type: 'clear-drink' },
  { id: 'pet', label: '플라스틱 PET', hint: '유색·다른 용도 페트병', material: '페트병', type: 'other-pet' },
  { id: 'plastic', label: '플라스틱', hint: 'PP·HDPE·LDPE·PS 용기', material: '플라스틱', type: 'container' },
  { id: 'vinyl', label: '비닐류', hint: '봉지·포장 비닐', material: '비닐', type: 'packaging' },
  { id: 'can', label: '캔류', hint: '철·알루미늄 캔', material: '금속·캔', type: 'food-can' },
  { id: 'paper', label: '종이', hint: '상자·종이 포장', material: '종이', type: 'paper' },
  { id: 'carton', label: '일반팩', hint: '우유팩 등', material: '종이', type: 'carton' },
  { id: 'aseptic-carton', label: '멸균팩', hint: '안쪽에 은색 층이 있는 팩', material: '종이', type: 'carton' },
  { id: 'glass', label: '유리', hint: '음료·식품 유리병', material: '유리', type: 'bottle' },
  { id: 'other', label: 'OTHER', hint: '플라스틱·비닐류 아래에 표시', material: '기타', type: '' },
];

export const markById = id => RECYCLE_MARKS.find(mark => mark.id === id) || null;

// A resin code does not tell us whether this is a rigid container or a film.
const photoMaterialCodes = {
  PP: '플라스틱', PE: '플라스틱', HDPE: '플라스틱', LDPE: '플라스틱', PS: '플라스틱',
  PET: '페트병', '무색페트': '페트병', '플라스틱': '플라스틱', '비닐류': '비닐',
  '종이': '종이', '일반팩': '종이', '멸균팩': '종이', '종이팩': '종이', '유리': '유리', '캔류': '금속·캔',
};
function photoMarkCode(marking) {
  return String(marking || '').normalize('NFKC').trim().toUpperCase()
    .replace(/^(?:본체|몸체|뚜껑|마개|라벨|필름)\s*:\s*/, '');
}
export function photoMarkMaterial(marking) {
  const code = photoMarkCode(marking).replace(/^플라스틱\s+(?=[A-Z]+$)/, '');
  return Object.hasOwn(photoMaterialCodes, code) ? photoMaterialCodes[code] : '';
}

export function confirmedPhotoMark(marking, part, shape) {
  const code = photoMarkCode(marking);
  const material = photoMarkMaterial(marking);
  if (!material) return null;
  if (material === '비닐' || (material === '플라스틱' && (part === 'film' || shape === 'film'))) {
    return { material: '비닐', type: 'packaging' };
  }
  if (material === '플라스틱' && shape === 'container') return { material, type: 'container' };
  // A plain PET code doesn't tell us whether the packaging is a clear beverage bottle.
  const mark = RECYCLE_MARKS.find(entry => entry.label === code);
  const bodyOnly = ['clear-pet', 'carton', 'aseptic-carton', 'glass', 'can'].includes(mark?.id);
  const type = mark && (!bodyOnly || part === 'body') && mark.id !== 'plastic' ? mark.type : '';
  return { material, type };
}
