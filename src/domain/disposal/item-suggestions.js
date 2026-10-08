// 명확한 품목명만 일치시킵니다. 상태/색상/결합 여부를 이름으로 추정하지 않습니다.
const entries = [
  [['우유팩', '두유팩', '주스팩', '쥬스팩', '멸균우유팩', '멸균팩', '종이팩'], '종이', 'carton'],
  [['신문', '신문지', '책', '노트', '종이상자', '택배상자', '골판지상자'], '종이', 'paper'],
  [['생수병', '생수페트병', '페트병', '음료페트병'], '페트병', '', '색상과 용도를 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['투명생수페트병', '무색생수페트병', '투명생수병'], '페트병', 'clear-drink'],
  [['유색페트병', '세제페트병', '식용유페트병'], '페트병', 'other-pet'],
  [['종이컵'], '종이', '', '양면 코팅 여부를 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['유리병', '소주병', '맥주병'], '유리', '', '깨짐 여부와 일반 유리병인지 확인한 뒤 세부 종류를 선택해 주세요.'],
  [['음료캔', '맥주캔', '통조림캔', '참치캔', '콜라캔'], '금속·캔', 'food-can'],
  [['비닐봉투', '과자봉지'], '비닐', 'packaging'],
];

export function suggestItemInfo(name) {
  if (typeof name !== 'string') return null;
  const normalized = name.trim().replace(/\s+/g, '');
  const entry = entries.find(([names]) => names.includes(normalized));
  if (!entry) return null;
  const [, material, type, note = '실제 재질 표시를 확인해 주세요. 오염과 결합 상태는 직접 선택해 주세요.'] = entry;
  return { material, type, note };
}
