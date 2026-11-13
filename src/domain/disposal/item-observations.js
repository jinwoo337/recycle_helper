import { MATERIALS, TYPES, needsWashQuestion, supportsState } from './rules.js';
import { stateAnswers } from './input-state.js';
import { normalizeItemName } from './item-suggestions.js';

const fields = {
  material: MATERIALS.filter(value => value !== '모르겠어요'),
  state: ['clean', 'dirty', 'washed-dirty'],
  combined: ['yes', 'no'],
  separable: ['yes', 'no'],
  handlingCondition: ['undamaged', 'damaged', 'reusable', 'unusable'],
};
const partNames = { body: '본체', lid: '뚜껑', label: '라벨', film: '포장 필름' };
const partAliases = {
  lid: ['뚜껑', '마개', '병뚜껑'], label: ['라벨', '비닐라벨', '분리한라벨'],
  film: ['포장필름', '비닐포장필름', '떼어내는비닐포장필름'],
};
const stateNames = { clean: '깨끗함', dirty: '오염 있음 · 세척 전', 'washed-dirty': '세척 후에도 오염 있음' };
const handlingNames = { undamaged: '전지 · 손상 없음', damaged: '전지 · 팽창·누액 또는 파손 있음', reusable: '의류·잡화 · 다시 쓸 수 있음', unusable: '의류·잡화 · 심한 오염 또는 훼손 있음' };
const descriptionSource = 'description';

// Gemini only proposes values from the same vocabulary used by the form.
export function cleanItemObservations(raw) {
  if (!Array.isArray(raw) || raw.length > 12) return [];
  const clean = new Map(), ambiguous = new Set();
  for (const entry of raw) {
    if (!entry || !Object.hasOwn(partNames, entry.part) || !Object.hasOwn(fields, entry.field)) continue;
    const { part, field, value } = entry;
    if (!fields[field].includes(value) || (part !== 'body' && ['combined', 'separable', 'handlingCondition'].includes(field))) continue;
    const type = field === 'material' && TYPES[value]?.some(([id]) => id === entry.type && id !== 'unknown') ? entry.type : '';
    const key = `${part}:${field}`, prior = clean.get(key);
    if (prior && (prior.value !== value || prior.type !== type)) ambiguous.add(key);
    clean.set(key, { part, field, value, ...(type ? { type } : {}) });
  }
  return [...clean].filter(([key]) => !ambiguous.has(key)).map(([, entry]) => entry);
}

// Only match explicit phrases. Everything else is left to the question form.
export function observationsFromDescription(value) {
  const entries = [];
  const source = String(value || '').normalize('NFKC');
  if (/건전지|충전지|배터리|\bAAA?\s*전지\b/.test(source)) {
    const undamaged = /(?:손상|파손|누액)(?:이|은)?\s*(?:전혀\s*)?없|부풀거나.{0,35}깨진\s*곳(?:이|은)?\s*없|손상되지\s*않/.test(source);
    const damaged = /액체(?:가|는)?\s*새(?:요|고|어|는)|(?:옆면|껍질|외관)(?:이|은|도)?\s*찌그러졌|손상됐|파손됐|부풀어\s*올랐|부풀었/.test(source);
    if (damaged || undamaged) entries.push({ part: 'body', field: 'handlingCondition', value: damaged ? 'damaged' : 'undamaged' });
  }
  let part = 'body';
  for (const chunk of source.split(/[,.!?;·\n]|그리고/)) {
    const clause = chunk.trim();
    if (!clause || /아닌|아니|같아|같고|인 듯|아마|추정|불확실|모르|인가|일까|라면|라든지/.test(clause)) continue;
    if (/^(본체|몸체|용기|통|안에|안에는|속에|내부)/.test(clause)) part = 'body';
    else if (/^(뚜껑|캡)/.test(clause)) part = 'lid';
    else if (/^라벨/.test(clause)) part = 'label';
    else if (/^(포장\s*)?필름/.test(clause)) part = 'film';
    if (/다른\s*재질(?:이|은)?\s*(?:전혀\s*)?(?:없어요|없습니다|붙어\s*있지\s*않아요|붙지\s*않았어요)(?=\s*$)/.test(clause)) {
      entries.push({ part: 'body', field: 'combined', value: 'no' });
    } else if (/(?:붙어\s*있|달려\s*있)(?:어요|습니다|는\s*상태|고\s|$)/.test(clause) && /라벨|뚜껑|캡|필름/.test(clause)) {
      entries.push({ part: 'body', field: 'combined', value: 'yes' });
    }
    const separable = /(?:분리|떼어\s*낼)\s*(?:할\s*)?수\s*없|분리되지\s*않|떼어지지\s*않/.test(clause) ? 'no'
      : /(?:분리|떼어\s*낼)\s*(?:할\s*)?수\s*있|분리돼요/.test(clause) ? 'yes' : '';
    if (separable) entries.push({ part: 'body', field: 'separable', value: separable });
    const possibleCodes = clause.match(/\b(?:PP|HDPE|LDPE|PE|PS|PET)\b/gi) || [];
    if (/(?:재질(?:은|이)?\s*)?비닐(?:류|이에요|입니다|이고|이예요|\s|$)/.test(clause)) entries.push({ part, field: 'material', value: '비닐' });
    else if (possibleCodes.length && !/표시.{0,9}없|표기가?\s*없|또는|[\/]\s*(?:PP|PE|PS|PET)\b/i.test(clause)) {
      for (const code of new Set(possibleCodes.map(value => value.toUpperCase()))) {
        entries.push({ part, field: 'material', value: code === 'PET' ? '페트병' : '플라스틱' });
      }
    }
    const clean = /(?:오염(?:이|은)?\s*(?:없어요|없습니다)|깨끗(?:해요|합니다|하네요|한\s*상태(?:예요|입니다)?))\s*$/.test(clause)
      && !/깨끗.{0,8}(?:않|못)|않(?:아|습)|못(?:했|해)/.test(clause);
    const dirty = /(?:음식물|내용물|기름기|오염|얼룩)(?:이|가|은)?\s*(?:조금\s*)?(?:남았어요|남았습니다|남아\s*있어요|남아\s*있습니다|묻었어요|묻어\s*있어요|있어요|있습니다)|오염된\s*상태/.test(clause)
      && !/남아\s*있지\s*않|남아\s*있진\s*않|남[은아].{0,9}없/.test(clause);
    if (clean) entries.push({ part, field: 'state', value: 'clean' });
    if (dirty) entries.push({ part, field: 'state', value: /씻(?:었는데|어도)|세척(?:했지만|해도)/.test(clause) ? 'washed-dirty' : 'dirty' });
  }
  return cleanItemObservations(entries);
}

export function mergeItemObservations(ai, description) {
  const explicit = observationsFromDescription(description);
  const byKey = new Map(cleanItemObservations(ai).map(entry => [`${entry.part}:${entry.field}`, { ...entry, source: 'ai' }]));
  for (const entry of explicit) {
    const key = `${entry.part}:${entry.field}`;
    const previous = byKey.get(key);
    if (entry.field === 'handlingCondition' && entry.value === 'undamaged' && previous?.value === 'damaged') {
      byKey.set(key, { ...previous, conflicts: true });
    } else byKey.set(key, { ...entry, source: descriptionSource });
  }
  return [...byKey.values()];
}

export function observationLabel(entry) {
  const label = partNames[entry.part];
  if (entry.field === 'material') return `${label} · ${entry.value}${entry.type ? ` (${TYPES[entry.value].find(([id]) => id === entry.type)[1]})` : ''}`;
  if (entry.field === 'state') return `${label} · ${stateNames[entry.value]}`;
  if (entry.field === 'combined') return entry.value === 'yes' ? '다른 재질이 붙어 있어요' : '다른 재질이 없어요';
  if (entry.field === 'handlingCondition') return handlingNames[entry.value];
  return entry.value === 'yes' ? '붙은 재질을 분리할 수 있어요' : '붙은 재질을 분리할 수 없어요';
}

// Apply only checked suggestions. A mentioned part is never assumed separable.
export function applyItemObservations(input, observations) {
  const next = structuredClone(input);
  const parts = new Map();
  const entries = cleanItemObservations(observations);
  for (const entry of entries) {
    if (['combined', 'separable', 'handlingCondition'].includes(entry.field)) next[entry.field] = entry.value;
    else {
      if (!parts.has(entry.part)) parts.set(entry.part, {});
      parts.get(entry.part)[entry.field] = entry;
    }
  }
  function applyPart(part, evidence) {
    const { material, state } = evidence;
    if (material) {
      const changed = part.material !== material.value || Boolean(material.type && part.type !== material.type);
      if (changed) {
        Object.assign(part, { material: material.value, type: material.type || '' });
        for (const field of ['contaminated', 'washed', 'removable', 'vinylResidue', 'foodSeparated']) delete part[field];
      }
    }
    if (state && supportsState(part)) {
      for (const field of ['contaminated', 'washed', 'removable', 'vinylResidue']) delete part[field];
      delete part.observedState;
      const washable = needsWashQuestion(part);
      Object.assign(part, stateAnswers(state.value === 'washed-dirty' && !washable ? 'dirty' : state.value, washable));
    } else if (state) {
      // Form applies this only after a compatible subtype is chosen.
      part.observedState = state.value;
    }
  }
  if (parts.has('body')) applyPart(next, parts.get('body'));
  const attachments = [...parts].filter(([key]) => key !== 'body');
  const checkedSeparation = entries.some(entry => entry.field === 'separable');
  if (attachments.length || checkedSeparation) {
    if (next.combined !== 'yes' && !checkedSeparation) delete next.separable;
    next.combined = 'yes';
  }
  if (attachments.length) {
    next.components ||= [];
    for (const [key, evidence] of attachments) {
      const label = partNames[key];
      let part = next.components.find(item => partAliases[key].includes(normalizeItemName(item.label)));
      if (!part) {
        if (next.components.length >= 5) continue;
        next.components.push(part = { label });
      }
      applyPart(part, evidence);
    }
  }
  if (next.combined !== 'yes') { delete next.separable; delete next.components; }
  return next;
}
