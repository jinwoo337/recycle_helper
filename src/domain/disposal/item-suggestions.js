import { expandedItemEntries } from './expanded-catalog.js';
import { ITEM_VARIANTS } from './item-variants.js';
import { BATTERY_PACKAGING_NAMES } from './category-keywords.js';
import { ALUMINUM_CAPSULE_SOURCE, GEL_ICE_PACK_SOURCE, MIXED_CAPSULE_SOURCE, PAPER_DISPOSAL_SOURCE, WATER_ICE_PACK_SOURCE } from './catalog-sources.js';
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
  '종이박스': '종이상자', '택배박스': '택배상자', '패트병': '페트병', 'pet병': '페트병', '음료수캔': '음료캔',
  '일회용나무젓갈': '나무젓가락', '일회용목재젓가락': '나무젓가락',
  '배달음식용기': '배달용기', '배달음식통': '배달용기',
  '포장용기뚜껑': '배달용기뚜껑', '배달포장필름': '배달용기포장필름',
  '택배종이박스': '택배상자', '투명생수패트병': '투명생수병', '우유종이팩': '우유팩',
  '콜라깡통': '콜라캔', '캔음료': '음료캔',
  '감열지영수증': '감열영수증',
  '택배뽁뽁이': '뽁뽁이',
  '종이우유팩': '우유팩', '키보드': '컴퓨터키보드',
  '택배송장': '감열택배송장', '감열배송송장': '감열택배송장',
  '택배운송장': '감열택배송장', '택배송장스티커': '감열택배송장', '운송장스티커': '감열택배송장',
};
// These names require a choice even if a server catalog has an old entry.
const requiredVariants = [
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
  { names: ['컵'], variants: ['종이컵', '플라스틱컵', '유리컵', '도자기컵'] },
  { names: ['병'], variants: ['생수병', '유리병', '유색페트병'] },
  { names: ['음료병', '음료수병'], variants: ['투명탄산음료페트병', '유리음료병', '유색음료페트병'] },
  { names: ['뚜껑', '마개'], variants: ['플라스틱용기뚜껑', '플라스틱컵뚜껑', '유리냄비뚜껑'] },
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
  if (itemTypeClarification(name)) return null;
  const item = items.get(normalizeItemName(name));
  // 호출자가 자동 입력·부속품을 수정해도 다음 검색의 원본은 변하지 않습니다.
  return item ? structuredClone(item) : null;
}

function searchableName(query) {
  const raw = foldItemName(query).replace(/[?!.,。？！]+$/u, '');
  return raw.replace(/(?:은|는|을|를)?(?:(?:어디에?|어떻게)(?:버리나요|버릴까요|버려(?:요|야해(?:요)?)?|버리면돼(?:요)?)|분리배출방법|분리수거방법|버리는법|버리려면|배출방법)$/u, '');
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

function appendUnique(names, limit, exact = '') {
  const seen = new Set(), result = [];
  for (const name of names) {
    const key = normalizeItemName(name);
    if (seen.has(key) || (exact && key === exact)) continue;
    seen.add(key);
    result.push(name);
    if (result.length >= limit) break;
  }
  return result;
}

function candidatesFor(query, limit, { confirmedOnly = false } = {}) {
  const raw = foldItemName(query), search = searchableName(query);
  const normalized = normalizeItemName(search);
  if (!normalized || !Number.isInteger(limit) || limit < 1) return [];
  const capacity = Math.min(limit, 10);
  const variants = nearbyItemNames(search);
  // Variants present meaningfully different possibilities before repeated aliases.
  if (itemTypeClarification(search)) return variants.slice(0, capacity);
  const eligible = entry => !confirmedOnly || items.get(entry.key)?.material;
  const matches = suggestions.filter(entry => eligible(entry) && (entry.key.includes(normalized) || entry.spelling.includes(search)))
    .sort((a, b) => Number(b.spelling === raw) - Number(a.spelling === raw)
      || Number(b.key === normalized) - Number(a.key === normalized)
      || Number(b.key.endsWith(normalized)) - Number(a.key.endsWith(normalized))
      || Number(b.key.startsWith(normalized)) - Number(a.key.startsWith(normalized))
      || Number(Boolean(items.get(b.key)?.material)) - Number(Boolean(items.get(a.key)?.material))
      || a.name.length - b.name.length);
  const names = [...matches.filter(entry => entry.spelling === raw).map(entry => entry.name), ...variants, ...matches.map(entry => entry.name)];
  if (!names.length && /^[가-힣]{3,14}$/.test(search)) {
    const fuzzy = suggestions.filter(entry => eligible(entry) && items.get(entry.key)?.material
      && entry.spelling[0] === search[0] && oneEdit(search, entry.spelling))
      .sort((a, b) => Number(b.spelling.slice(0, 2) === search.slice(0, 2)) - Number(a.spelling.slice(0, 2) === search.slice(0, 2))
        || Math.abs(a.name.length - search.length) - Math.abs(b.name.length - search.length) || a.name.length - b.name.length);
    names.push(...fuzzy.map(entry => entry.name));
  }
  return confirmedOnly ? appendUnique(names, capacity, items.get(normalizeItemName(query))?.material ? normalizeItemName(query) : '') : [...new Set(names)].slice(0, capacity);
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
  if (text.length <= 80 && (items.get(normalizeItemName(text))?.material || itemTypeClarification(text))) return text;
  const shortName = text.replace(/[.!?。？！]+$/u, '');
  if (shortName.length <= 80 && items.get(normalizeItemName(shortName))?.material) return shortName;
  const first = text.split(/[.!?。？！;\n]/u, 1)[0];
  if (/[\s,](?:아니|다른 물건|모르|같아)|(?:아니고|모르겠|같기도)/u.test(text)) return '';
  const stated = /^(.{1,75}?)(?:이에요|예요|입니다|이라고 해요)(?=$|[,\s])/u.exec(first)?.[1].trim();
  if (stated && (items.get(normalizeItemName(stated))?.material || itemTypeClarification(stated))) return stated;
  return '';
}

export function suggestItemInfo(name) {
  const item = lookupItem(name);
  return item?.material ? { ...item, type: item.type || item.defaults?.type || '' } : null;
}
