import { expandedItemEntries } from './expanded-catalog.js';
import { ITEM_VARIANTS } from './item-variants.js';
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

const localEntries = [...expandedItemEntries, ...bundledItemEntries];
const aliases = { '종이박스': '종이상자', '택배박스': '택배상자', '패트병': '페트병', 'pet병': '페트병', '음료수캔': '음료캔' };
export const normalizeItemName = name => {
  const value = typeof name === 'string' ? name.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase() : '';
  return aliases[value] || value;
};

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
    // 검토한 전용 수거 경로를 오래된 DB 값보다 우선하는 기존 정책을 유지합니다.
    const chosen = local && (local[4]?.handling || !entry[1]) ? local : entry;
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
  return [...new Set([...names, ...extra])].map(name => ({ name, key: normalizeItemName(name) }));
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
  const item = items.get(normalizeItemName(name));
  // 호출자가 자동 입력·부속품을 수정해도 다음 검색의 원본은 변하지 않습니다.
  return item ? structuredClone(item) : null;
}

// 부분 일치는 추천 전용이며 재질 자동 입력은 정확히 일치하는 이름에만 적용합니다.
export function searchItemNames(query, limit = 6) {
  const normalized = normalizeItemName(query);
  if (!normalized || !Number.isInteger(limit) || limit < 1) return [];
  const raw = query.trim().toLowerCase();
  return suggestions.filter(entry => entry.key.includes(normalized) || entry.name.includes(raw))
    .sort((a, b) => Number(!a.key.startsWith(normalized)) - Number(!b.key.startsWith(normalized)) || a.name.length - b.name.length)
    .slice(0, Math.min(limit, 10)).map(entry => entry.name);
}

export function suggestItemInfo(name) {
  const item = lookupItem(name);
  return item?.material ? { ...item, type: item.type || item.defaults?.type || '' } : null;
}
