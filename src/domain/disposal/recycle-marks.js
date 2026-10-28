// 포장에 인쇄된 분리배출 표시(마크)를 눌러 재질·세부 종류를 고르게 합니다.
// 표시는 재질을 알려 줄 뿐 오염·결합 상태는 알려 주지 않으므로, 상태 질문은 그대로 이어집니다.
export const RECYCLE_MARKS = [
  { id: 'clear-pet', label: '투명페트', hint: '무색 생수·음료병', material: '페트병', type: 'clear-drink' },
  { id: 'pet', label: '페트', hint: '유색·다른 용도 페트', material: '페트병', type: 'other-pet' },
  { id: 'plastic', label: '플라스틱', hint: 'PP·PE·PS 등 용기', material: '플라스틱', type: 'container' },
  { id: 'vinyl', label: '비닐류', hint: '봉지·포장 비닐', material: '비닐', type: 'packaging' },
  { id: 'can', label: '캔류', hint: '철·알루미늄 캔', material: '금속·캔', type: 'food-can' },
  { id: 'paper', label: '종이', hint: '상자·종이 포장', material: '종이', type: 'paper' },
  { id: 'carton', label: '종이팩', hint: '일반팩·멸균팩', material: '종이', type: 'carton' },
  { id: 'glass', label: '유리', hint: '음료·식품 유리병', material: '유리', type: 'bottle' },
];

export const markById = id => RECYCLE_MARKS.find(mark => mark.id === id) || null;
