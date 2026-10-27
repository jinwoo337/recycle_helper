// DOM·저장소에 의존하지 않는 규칙. 입력값을 확인한 뒤에만 재활용을 안내합니다.
import { lookupItem, normalizeItemName } from './item-suggestions.js';
import { judgeFood, FOOD_SOURCE } from './food.js';
import { applyRegionalRules } from './regions.js';
import { specialItemGuide, guideForHandling } from './special-guides.js';
import { validItemCategory, categoryLabel } from './item-categories.js';
import { CATALOG_DETAIL_SOURCES } from './catalog-sources.js';
import { validateAiGuess } from './ai-classification.js';

export const RULE_VERSION = '2026-10-27.v8';
export const RULE_SOURCE = 'https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003';
export const MATERIALS = ['플라스틱', '페트병', '종이', '유리', '금속·캔', '비닐', '스티로폼', '음식물류', '기타', '모르겠어요'];
export const TYPES = {
  '음식물류': [['soft', '확인된 음식물·부드러운 껍질 (뼈·포장 등 제외)'], ['excluded', '단단한 뼈·껍데기·씨앗 등 수거 제외 품목'], ['fibrous', '질긴 뿌리·대·겉껍질 등 수거 제외 부산물'], ['residue', '커피·차·약재 찌꺼기·장류 등 수거 제외 품목'], ['unknown', '종류를 모르겠어요']],
  '플라스틱': [['container', '일반 용기·트레이'], ['other', '그 밖의 플라스틱 제품'], ['unknown', '모르겠어요']],
  '페트병': [['clear-drink', '무색 투명한 생수·음료 페트병'], ['other-pet', '유색 페트병 / 식용유·세제 등 다른 용도'], ['unknown', '모르겠어요']],
  '종이': [['paper', '일반 종이·상자·책'], ['carton', '종이팩 (우유팩·두유팩 등)'], ['cup', '일반 종이컵 (양면 코팅 제외)'], ['food-container', '수거 가능한 종이 식품 용기 (표시·지역 확인)'], ['excluded', '감열 영수증·사진·종이호일·사용한 휴지'], ['coated', '분리되지 않는 코팅 종이·양면 코팅 종이컵'], ['unknown', '모르겠어요']],
  '유리': [['bottle', '깨지지 않은 일반 음료·식품 유리병'], ['broken', '깨진 유리'], ['special', '내열유리·거울·판유리·크리스탈 등'], ['unknown', '모르겠어요']],
  '금속·캔': [['food-can', '음료·식품용 캔'], ['hazard', '가스·스프레이·페인트 등 특수 용기'], ['other', '그 밖의 금속 제품'], ['unknown', '모르겠어요']],
  '비닐': [['packaging', '비닐 봉투·포장재·랩'], ['other', '고무장갑·장판 등 그 밖의 제품'], ['unknown', '모르겠어요']],
  '스티로폼': [['packaging', '포장용 상자·완충재'], ['other', '건축용·코팅 제품 등'], ['unknown', '모르겠어요']],
};

export function supportsState(part = {}) {
  return ({ '플라스틱': ['container'], '페트병': ['clear-drink', 'other-pet'],
    '종이': ['paper', 'carton', 'cup', 'food-container'], '유리': ['bottle'], '금속·캔': ['food-can'],
    '비닐': ['packaging'], '스티로폼': ['packaging'] })[part.material]?.includes(part.type) || false;
}

export function needsWashQuestion(part = {}) {
  return supportsState(part) && !(part.material === '종이' && part.type === 'paper');
}

// 숨겨진 답변을 제거해 화면과 판별이 같은 조건을 사용하게 합니다.
export function normalizePart(part = {}) {
  if (!part || typeof part !== 'object' || Array.isArray(part)) part = {};
  const clean = { material: part.material || '', type: part.type || '' };
  if (typeof part.label === 'string' && part.label.trim()) clean.label = part.label.trim().slice(0,40);
  if (clean.material === '음식물류' && clean.type === 'soft') return { ...clean, foodSeparated: part.foodSeparated || '' };
  if (!supportsState(clean)) return clean;
  clean.contaminated = part.contaminated || '';
  if (clean.contaminated === 'yes') {
    clean.removable = part.removable || '';
    if (needsWashQuestion(clean)) clean.washed = part.washed || '';
  }
  return clean;
}

function outcome(status, method, reason, steps = []) {
  return { status, method, reasons: [reason], steps };
}

function judgePart(raw, itemName = '') {
  const p = normalizePart(raw);
  if (p.material === '음식물류') return judgeFood(p);
  if (!MATERIALS.includes(p.material) || !TYPES[p.material]) {
    return outcome('check', '추가 확인 필요', '지원하지 않거나 확인되지 않은 재질이에요.', ['포장의 재질 표시와 지역 수거 기준을 확인해 주세요.']);
  }
  if (!TYPES[p.material].some(([value]) => value === p.type) || p.type === 'unknown') {
    return outcome('check', '추가 확인 필요', '세부 종류를 알아야 배출 방법을 정할 수 있어요.', ['제품의 용도와 재질 표시를 확인해 주세요.']);
  }
  // 이름은 예외를 놓치지 않기 위한 보조 신호로만 사용합니다.
  const electronic = /전자제품|전기제품|휴대폰|충전기/.test(itemName)
    && !(p.material === '스티로폼' && p.type === 'packaging' && /완충재/.test(itemName));
  if (electronic || /배터리|건전지|형광등|약품|농약|부탄|살충제|페인트|락카|스프레이/.test(itemName) || (p.material === '금속·캔' && p.type === 'hazard')) {
    return outcome('check', '추가 확인 필요', '별도 수거 또는 안전한 처리가 필요한 물품일 수 있어요.', ['내용물을 임의로 붓거나 용기에 구멍을 내지 말고 지자체의 품목별 안내를 확인해 주세요.']);
  }
  const compactName = itemName.replace(/\s+/g, '');
  const nameConflict = (p.material === '종이' && p.type === 'paper' && /영수증|감열지|사진용지|종이호일|사용한휴지/.test(compactName))
    || (p.material === '종이' && p.type === 'cup' && /양면코팅/.test(compactName))
    || (p.material === '유리' && p.type === 'bottle' && /깨진|내열|거울|판유리|크리스탈|도자기/.test(compactName))
    || (p.material === '플라스틱' && p.type === 'container' && /칫솔|CD|DVD/.test(compactName))
    || (p.material === '금속·캔' && p.type === 'food-can' && /호일/.test(compactName))
    || (p.material === '페트병' && p.type === 'clear-drink' && /유색|갈색|녹색|세제|식용유/.test(compactName));
  if (nameConflict) {
    return outcome('check', '추가 확인 필요', '물건 이름에 일반 수거 제외 품목의 단서가 있어 선택한 종류를 확인해야 해요.', ['실제 재질과 세부 종류를 다시 확인해 주세요. 이름만으로 배출 방법을 확정하지 않아요.']);
  }
  if (p.material === '종이' && ['excluded', 'coated'].includes(p.type)) {
    return outcome('general', '종량제봉투로 배출', '감열지·사용한 휴지 또는 분리되지 않는 코팅 종이는 일반 종이류로 재활용하기 어려워요.', ['재활용 종이와 섞지 말고 지역 종량제 배출 기준을 따라 주세요.']);
  }
  if (!supportsState(p)) {
    return outcome('check', '추가 확인 필요', '일반 재활용 수거 대상과 처리 방식이 다를 수 있는 종류예요.',
      p.material === '유리' ? ['깨진 부분은 다치지 않도록 싸서 표시해 주세요.', '유리병 수거함에 넣지 말고 지역의 종량제봉투·특수규격마대·대형폐기물 기준을 확인해 주세요.']
        : ['지역의 품목별 수거 안내 또는 관리사무소에 처리 방법을 확인해 주세요.']);
  }
  if (!['yes', 'no'].includes(p.contaminated)) {
    return outcome('check', '추가 확인 필요', '현재 이물질이 남아 있는지 확인되지 않았어요.', ['안쪽의 음식물·기름·이물질을 확인하고 다시 판별해 주세요.']);
  }
  if (p.contaminated === 'yes' && !['yes', 'no'].includes(p.removable)) {
    return outcome('check', '추가 확인 필요', '남은 오염을 제거할 수 있는지 확인이 필요해요.', ['종이는 오염 부분을 떼어낼 수 있는지, 용기류는 이물질을 제거할 수 있는지 확인해 주세요.']);
  }
  if (p.contaminated === 'yes' && needsWashQuestion(p) && !['yes', 'no'].includes(p.washed)) {
    return outcome('check', '추가 확인 필요', '세척 상태가 입력되지 않았어요.', ['세척 여부를 입력하고 다시 판별해 주세요.']);
  }
  if (p.contaminated === 'yes' && p.removable === 'no') {
    if (['유리', '금속·캔'].includes(p.material)) {
      return outcome('check', '추가 확인 필요', '이물질이 제거되지 않아 일반 수거 기준만으로 확정하기 어려워요.', ['남아 있는 내용물의 종류와 지역 수거 기준을 확인해 주세요.']);
    }
    return outcome('general', '종량제봉투로 배출', '제거할 수 없는 오염이 남아 재활용하기 어려워요.', ['내용물은 해당 배출 기준에 따라 따로 비우고, 오염된 물품은 지역 종량제 기준에 따라 배출해 주세요.']);
  }
  const routes = {
    '플라스틱': ['플라스틱류로 분리배출', '일반 플라스틱 용기·트레이예요.', '내용물을 비우고 물기를 제거해 주세요.'],
    '페트병': p.type === 'clear-drink'
      ? ['투명 페트병으로 별도 분리배출', '무색 투명한 생수·음료 페트병은 별도 수거 대상이에요.', '라벨을 제거하고 가능한 압착한 뒤 뚜껑을 닫아 주세요.']
      : ['플라스틱류로 분리배출', '유색 또는 다른 용도의 페트병은 투명 생수·음료 페트병 수거 대상이 아니에요.', '내용물을 비우고 라벨·부속품을 확인해 주세요.'],
    '종이': p.type === 'carton'
      ? ['종이팩으로 분리배출', '종이팩은 일반 종이와 구분해 수거해요.', '종이팩은 내용물을 비우고 헹궈 말린 뒤 전용 수거함에 넣어 주세요. 수거함이 없으면 지역 안내를 확인해 주세요.']
      : p.type === 'cup'
        ? ['종이컵으로 분리배출', '일반 종이컵은 별도 확인이 필요한 코팅 제품과 구분해 배출해요.', '양면 코팅 여부를 확인하고, 내용물을 비우고 헹궈 모아 주세요. 양면 코팅이면 지역 안내를 확인해 주세요.']
        : p.type === 'food-container'
          ? ['종이 식품 용기로 분리배출 · 지역 수거 확인', '수거 가능한 종이 식품 용기는 내용물과 오염 제거가 필요해요.', '내용물을 비우고 헹궈 음식물·이물질을 제거한 뒤 말려 주세요. 도포·첩합 표시나 분리 불가한 다른 재질이 있으면 일반 수거 대상으로 단정하지 말고 다시 확인해 주세요.']
        : ['종이류로 분리배출', '일반 종이류이며 제거할 수 없는 오염·코팅이 확인되지 않았어요.', '물에 씻지 말고 물기에 젖지 않게 펴거나 접어 모아 주세요.'],
    '유리': ['유리병으로 분리배출', '깨지지 않은 일반 식품·음료 유리병이에요.', '내용물을 비우고 깨뜨리지 마세요. 보증금 대상 병은 소매점 반납이 가능해요.'],
    '금속·캔': ['금속캔으로 분리배출', '일반 음료·식품용 금속캔이에요.', '내용물을 비우고 날카로운 가장자리에 주의해 주세요.'],
    '비닐': ['비닐류로 분리배출', '이물질을 제거한 봉투·포장재는 비닐류 수거 대상이에요.', '물기를 제거하고 흩날리지 않게 투명·반투명 봉투에 모아 주세요.'],
    '스티로폼': ['스티로폼으로 분리배출', '일반 포장용 발포 합성수지예요.', '테이프·상표를 제거하고 물기를 말려 주세요.'],
  };
  const [method, reason, step] = routes[p.material];
  const result = outcome('recycle', method, reason, [step]);
  if (p.contaminated === 'yes') {
    result.method = `오염 제거 후 ${method}`;
    result.steps.unshift(p.material === '종이' && p.type === 'paper' ? '오염된 부분을 떼어내고 깨끗한 종이만 분리배출해 주세요.' : '남은 오염을 제거하고 깨끗해졌는지 확인해 주세요. 제거되지 않으면 다시 판별해 주세요.');
    result.reasons.push(p.washed === 'yes' ? '세척했더라도 현재 오염이 남아 있어 추가 처리가 필요해요.' : '현재 오염이 남아 있어 제거가 완료된 경우에만 재활용을 안내해요.');
  } else result.reasons.push('현재 음식물이나 이물질이 없다고 입력했어요.');
  return result;
}

export function judgeDisposal(input = {}) {
  const safe = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const base = judgeBaseDisposal(safe);
  const item = lookupItem(safe.itemName), source = item?.source;
  if (item && (item.handling || (item.material === safe.material && (!item.type || item.type === safe.type))) && Object.hasOwn(CATALOG_DETAIL_SOURCES, source)) base.sourceUrls = [...new Set([...base.sourceUrls,source])];
  return applyRegionalRules(safe, base);
}

function judgeBaseDisposal(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const name = normalizeItemName(input.itemName);
  const known = lookupItem(name);
  // 별도 수거 품목은 재질 미입력으로 막지 않고 검토된 품목 경로를 우선합니다.
  const special = known?.handling && known.material === '기타' ? guideForHandling(known.handling) : specialItemGuide(known, input);
  if (special) return { ...finish(special, [{label:'물품 전체',material:known.material,...structuredClone(special)}]), handling: known.handling };
  const dangerous = /전자제품|전기제품|휴대폰|충전기|배터리|건전지|형광등|약품|농약|부탄|살충제|페인트|락카|스프레이|전자담배|이어폰|멀티탭|전기완구|전동/.test(name)
    && !(name === '전자제품포장완충재' && input.material === '스티로폼' && input.type === 'packaging');
  const category = !known?.material && validItemCategory(input.category) ? input.category : '';
  const manualGuide = category && guideForHandling(category);
  if (manualGuide) {
    manualGuide.reasons.push(`직접 선택한 물건 종류(${categoryLabel(category)})를 기준으로 안내해요. 이름으로 확인된 품목은 아니에요.`);
    const result = finish(manualGuide, [{ label: '물품 전체', material: '기타', ...structuredClone(manualGuide) }]);
    if (category === 'medicine') result.sourceUrls.push('https://news.seoul.go.kr/env/archives/564807');
    return { ...result, handling: category };
  }
  if (category === 'unknown') return finish(outcome('check', '물건 종류·수거처 확인 필요', '이름과 선택한 정보만으로 배출 경로를 확정할 수 없어요.', ['제품 이름·용도와 분리배출 표시를 확인해 주세요.', '제품 사진·설명서를 준비해 제조사나 거주지 폐기물 담당 부서에 수거 경로를 문의해 주세요.']));
  if (category === 'large') return finish(outcome('check', '대형폐기물 품목·접수 조건 확인', '가구·큰 생활용품으로 직접 선택했어요.', ['구청 대형폐기물 안내에서 실제 품목·크기에 맞는 접수 대상을 확인해 주세요.', '접수 후 안내받은 필증·배출일·지정 장소에 따라 배출해 주세요.']));
  const manualMaterial = (category === 'packaging' && ['플라스틱', '페트병', '종이', '유리', '금속·캔', '비닐', '스티로폼'].includes(input.material)) || (category === 'food' && input.material === '음식물류');
  const ai = known || category ? null : validateAiGuess(input.aiGuess, input.itemName);
  if (ai && !dangerous && ai.route !== 'recyclable') return finishAi(aiOnlyOutcome(ai), input, ai);
  // AI가 재활용 대상으로 분류한 미등록 품목은 AI 재질을 기준 품목처럼 사용하고 나머지는 규칙으로 판별합니다.
  const reference = known || (manualMaterial ? { material: input.material, type: input.type } : null) || (ai ? { material: ai.material, type: ai.type } : null);
  const allowedTypes = name === '종이컵' ? ['cup', 'coated'] : null;
  const acceptedVariant = known?.variants?.[input.material]?.includes(input.type);
  const conflict = reference?.material && !acceptedVariant && (input.material !== reference.material || (reference.type && input.type !== reference.type) || (allowedTypes && !allowedTypes.includes(input.type)));
  // 이름·재질 충돌이나 미등록 품목을 확인하기 전에는 재질별 배출도 확정하지 않습니다.
  if (dangerous || !reference || conflict) {
    const guarded = dangerous
      ? outcome('check', '추가 확인 필요', '별도 수거 또는 안전한 처리가 필요한 물품일 수 있어요.', ['내용물을 임의로 붓거나 용기에 구멍을 내지 말고 지자체의 품목별 안내를 확인해 주세요.'])
      : conflict
        ? outcome('check', '추가 확인 필요', '물품 이름과 선택한 재질 또는 세부 종류가 서로 맞지 않아요.', ['물품 이름, 실제 재질 표시와 세부 종류를 다시 확인해 주세요.'])
        : outcome('check', '추가 확인 필요', name ? '등록되지 않은 물품 이름이어서 일반 수거 대상인지 확인할 수 없어요.' : '물품 이름이 확인되지 않았어요.', ['추천에서 실제 물품과 일치하는 이름을 선택하거나, 품목별 지역 안내를 확인해 주세요. 비슷한 이름을 임의로 선택하지 마세요.']);
    return finish(guarded, [{ label: '물품 전체', material: input.material || '미확인', ...structuredClone(guarded) }]);
  }
  const result = judgePart(input, input.itemName || '');
  if (manualMaterial) result.reasons.push(`직접 확인한 물건 종류(${categoryLabel(category)})와 재질·상태를 기준으로 안내해요. 이름으로 확인된 품목은 아니에요.`);
  const parts = [{ label: '본체', material: input.material || '미확인', ...structuredClone(result) }];
  if (supportsState(input)) {
    if (!['yes', 'no'].includes(input.combined)) {
      if (result.status !== 'check') result.steps = [];
      result.status = 'check'; result.method = '추가 확인 필요';
      result.reasons.push('다른 재질의 결합 여부가 확인되지 않았어요.');
      result.steps.push('라벨·뚜껑·테이프 등 다른 재질을 확인해 주세요.');
    } else if (input.combined === 'yes' && input.separable !== 'yes') {
      if (result.status !== 'check') result.steps = [];
      result.status = 'check'; result.method = '추가 확인 필요';
      result.reasons.push('분리되지 않거나 분리 가능 여부가 불확실한 복합재질이에요.');
      result.steps.push('분리배출 표시와 지역의 복합재질 수거 기준을 확인해 주세요.');
    } else if (input.combined === 'yes') {
      if (result.status !== 'check') result.steps.unshift('다른 재질의 부속품을 본체에서 분리해 주세요.');
      const components = Array.isArray(input.components) ? input.components : [];
      components.forEach((component, index) => parts.push({ label: normalizePart(component).label || `부속품 ${index + 1}`, material: component?.material || '미확인', ...judgePart(component) }));
      if (!components.length || parts.some(part => part.status === 'check')) {
        result.status = 'check'; result.method = '일부 재질 추가 확인 필요';
        result.reasons.push('본체 또는 부속품의 정보를 더 확인해야 해요. 재질별 안내를 확인해 주세요.');
        if (!components.length) result.steps.push('분리한 부속품의 재질과 상태를 입력해 주세요.');
      } else {
        result.status = parts.every(part => part.status === 'general') ? 'general' : parts.some(part => part.status === 'general') ? 'mixed' : 'recycle';
        result.method = result.status === 'general' ? '본체와 부속품 모두 종량제봉투로 배출' : '본체와 부속품을 각각 분리배출';
        result.reasons.push('분리 가능한 부속품은 본체와 별도로 재질·오염 상태에 따라 판단했어요.');
      }
    }
  }
  // 결합 불명/분리 불가이면 본체 역시 단독 배출을 확정하지 않습니다.
  if (supportsState(input) && (input.combined !== 'no' && !(input.combined === 'yes' && input.separable === 'yes'))) {
    parts[0] = { label: '본체와 결합 재질', material: input.material || '미확인', ...structuredClone(result) };
  }
  return ai ? finishAi(result, input, ai, parts) : finish(result, parts);
}

// 재활용 외 경로는 정해진 문구만 사용합니다. AI 응답 문장은 판단 근거로만 표시합니다.
function aiOnlyOutcome(ai) {
  if (ai.route === 'hazardous') return outcome('check', '물건 종류 확인 후 별도 수거 · AI 추정', '별도 수거 또는 안전한 처리가 필요한 물품일 수 있어요.', [
    '일반 쓰레기·재활용품과 섞지 말고 따로 보관해 주세요.',
    '위의 물건 종류 질문에서 실제 제품에 맞는 종류를 선택해 주세요. 재질을 몰라도 전용 안내를 받을 수 있어요.',
    '종류를 모르겠으면 제품 표시·설명서와 거주지 폐기물 담당 부서의 수거 방법을 확인해 주세요.']);
  if (ai.route === 'unknown' || ai.confidence === 'low') return outcome('check', '추가 확인 필요', 'AI도 이 물건의 분류를 확신하지 못했어요.', ['제품의 분리배출 표시와 재질 표시를 확인해 주세요.', '확인이 어려우면 지역 안내나 관리사무소에 문의해 주세요.']);
  if (ai.route === 'large') return outcome('check', '대형폐기물 신고 후 배출 · AI 추정', '종량제봉투에 들어가지 않는 대형 생활용품일 가능성이 높아요.', ['구청·주민센터 또는 지자체 누리집에서 대형폐기물 배출을 신고해 주세요.', '신고 후 받은 스티커(필증)를 붙여 지정 장소에 배출해 주세요.', '작게 분해해 종량제봉투에 들어가면 일반 배출이 가능한지 지역 안내를 확인해 주세요.']);
  return outcome(ai.confidence === 'high' ? 'general' : 'check', '종량제봉투로 배출 · AI 추정', '재활용 수거 대상이 아닌 생활용품일 가능성이 높아요.', ['종량제봉투에 담아 배출해 주세요.', '제품에 분리배출 표시가 있으면 표시를 우선 따라 주세요.']);
}

function finishAi(result, input, ai, parts) {
  const note = `AI(Gemini)가 물건 이름으로 추정한 분류예요${ai.reason ? `: ${ai.reason}` : '.'} 실제 제품 표시와 다를 수 있어요.`;
  result.reasons.push(note);
  const finished = finish(result, parts || [{ label: '물품 전체', material: ai.material, ...structuredClone(result) }]);
  return { ...finished, aiAssisted: true, aiGuess: structuredClone(ai) };
}

function finish(result, parts) {
  parts ||= [{ label: '물품 전체', material: '미확인', ...structuredClone(result) }];
  return { ...result, parts, ruleVersion: RULE_VERSION,
    sourceUrls: parts.some(part => part.material === '음식물류') ? [RULE_SOURCE, FOOD_SOURCE] : [RULE_SOURCE],
    sourceUrl: parts.some(part => part.material === '음식물류') ? FOOD_SOURCE : RULE_SOURCE, checkedAt: '2026-10-27',
    notice: '공개된 분리배출 지침을 참고한 안내예요. 지역별 수거 대상·수거함·배출일이 다를 수 있으므로 거주지 안내를 확인해 주세요.' };
}
