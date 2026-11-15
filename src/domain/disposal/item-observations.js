import { MATERIALS, TYPES, needsWashQuestion, supportsState } from './rules.js';
import { selectedState, stateAnswers } from './input-state.js';
import { normalizeItemName } from './item-suggestions.js';
import { confirmedPhotoMark, laminatedMark } from './recycle-marks.js';

const fields = {
  material: MATERIALS.filter(value => value !== '모르겠어요'),
  state: ['clean', 'dirty', 'washed-dirty'],
  vinylResidue: ['liquid-only', 'solids'],
  combined: ['yes', 'no'],
  separable: ['yes', 'no', 'unknown'],
  handlingCondition: ['undamaged', 'damaged', 'reusable', 'unusable', 'foam-white', 'foam-colored'],
};
const partNames = { body: '본체', lid: '뚜껑', label: '라벨', film: '포장 필름' };
const partAliases = {
  lid: /^(?:플라스틱|종이|금속|유리|알루미늄포일|은박)?(?:병|컵|용기)?(?:뚜껑|마개|덮개|덮개·마개)$/,
  label: /^(?:떼어내는|분리한)?(?:비닐|종이)?(?:라벨|라벨·상표)$/,
  film: /^(?:떼어내는|분리한)?(?:비닐)?(?:포장)?(?:필름|랩)$/,
};
const stateNames = { clean: '깨끗함', dirty: '오염 있음 · 세척 전', 'washed-dirty': '세척 후에도 오염 있음' };
const residueNames = { 'liquid-only': '내용물·고형물 없이 기름·물 자국만 남음', solids: '음식물·부스러기 등 고형물 남음' };
const handlingNames = { undamaged: '전지 · 손상 없음', damaged: '전지 · 팽창·누액 또는 파손 있음', reusable: '다시 쓸 수 있음', unusable: '오염 또는 훼손 있음', 'foam-white': '포장용 스티로폼 · 흰색', 'foam-colored': '포장용 스티로폼 · 색 있음' };
const descriptionSource = 'description';
const partPrefix = /^(?:(?:용기|병|통|컵)\s+)?(본체|몸체|뚜껑|마개|캡|덮개|라벨|상표|(?:포장\s*)?필름)(?:에는|이|가|은|는|에)?(?=[:\s]|$)[:\s]*/;
const explicitParts = { 본체: 'body', 몸체: 'body', 뚜껑: 'lid', 마개: 'lid', 캡: 'lid', 덮개: 'lid', 라벨: 'label', 상표: 'label', 필름: 'film' };
const namedPartPrefix = /^((?:안쪽|바깥(?:쪽)?|내부|외부|겉|속|왼쪽|오른쪽|위쪽|아래쪽)\s*(뚜껑|마개|캡|덮개|라벨|상표|필름))(?:에는|이|가|은|는|에)?(?=[:\s]|$)[:\s]*/;
const partIdentity = entry => entry.targetLabel ? `attachment:${normalizeItemName(entry.targetLabel)}` : entry.part;
export const observationKey = entry => `${partIdentity(entry)}:${entry.field}`;

// Gemini only proposes values from the same vocabulary used by the form.
export function cleanItemObservations(raw, { allowTargetLabels = false } = {}) {
  if (!Array.isArray(raw) || raw.length > 12) return [];
  const clean = new Map(), ambiguous = new Set();
  for (const entry of raw) {
    if (!entry || !Object.hasOwn(partNames, entry.part) || !Object.hasOwn(fields, entry.field)) continue;
    const { part, field, value } = entry;
    if (!fields[field].includes(value) || (part !== 'body' && ['combined', 'separable', 'handlingCondition'].includes(field))) continue;
    const type = field === 'material' && TYPES[value]?.some(([id]) => id === entry.type && id !== 'unknown') ? entry.type : '';
    const targetLabel = allowTargetLabels && part !== 'body' && typeof entry.targetLabel === 'string'
      ? entry.targetLabel.trim().slice(0, 40) : '';
    const observation = { part, field, value, ...(type ? { type } : {}), ...(targetLabel ? { targetLabel } : {}) };
    const key = observationKey(observation), prior = clean.get(key);
    if (prior && (prior.value !== value || prior.type !== observation.type || prior.part !== part)) ambiguous.add(key);
    clean.set(key, observation);
  }
  return [...clean].filter(([key]) => !ambiguous.has(key)).map(([, entry]) => entry);
}

// Only match explicit phrases. Everything else is left to the question form.
export function observationsFromDescription(value) {
  const entries = [];
  const source = String(value || '').normalize('NFKC').replace(/도포\s*[·ㆍ･・⋅./]?\s*첩합/gu, '도포첩합');
  if (/건전지|충전지|배터리|\bAAA?\s*전지\b/.test(source)) {
    const undamaged = /(?:손상|파손|누액)(?:이|은)?\s*(?:전혀\s*)?없|부풀거나.{0,35}깨진\s*곳(?:이|은)?\s*없|손상되지\s*않/.test(source);
    const damaged = /액체(?:가|는)?\s*새(?:요|고|어|는)|(?:옆면|껍질|외관)(?:이|은|도)?\s*찌그러졌|손상됐|파손됐|부풀어\s*올랐|부풀었/.test(source);
    if (damaged || undamaged) entries.push({ part: 'body', field: 'handlingCondition', value: damaged ? 'damaged' : 'undamaged' });
  }
  let part = 'body';
  let targetLabel;
  const clauses = source
    .replace(/(?:고|며|지만|는데)\s+/gu, (connector, index) => {
      const following = source.slice(index + connector.length);
      return (namedPartPrefix.test(following) || partPrefix.test(following)) ? `${connector.trim()}, ` : connector;
    })
    .replace(/(?<=[A-Z가-힣])\s+(?=(?:본체|몸체|뚜껑|마개|캡|라벨|필름)\s+(?:PP|PE|HDPE|LDPE|PS|PET|무색|비닐))/gu, ', ')
    .split(/[,.!?;·\n]|그리고/);
  for (const chunk of clauses) {
    const clause = chunk.trim();
    const named = namedPartPrefix.exec(clause);
    const prefix = named || partPrefix.exec(clause);
    if (prefix) {
      part = explicitParts[named?.[2] || prefix[1]] || 'film';
      targetLabel = named?.[1];
    } else if (/^(용기|통|안에|안에는|속에|내부)/.test(clause)) {
      part = 'body';
      targetLabel = undefined;
    }
    if (!clause || /아닌|아니|같아|같고|인 듯|아마|추정|불확실|모르|인가|일까|라면|라든지/.test(clause)) continue;
    if (part === 'body') {
      const foam = /^(?:(?:흰색|하얀색|백색|유색|색깔\s*있는)\s*스티로폼|스티로폼(?:\s*(?:완충재|상자|용기))?(?:은|는|이|가)?\s*(?:흰색|하얀색|백색|유색|색이\s*있))/.exec(clause)?.[0];
      if (foam) entries.push({ part, field: 'handlingCondition', value: /흰색|하얀색|백색/.test(foam) ? 'foam-white' : 'foam-colored' });
    }
    if (/다른\s*재질(?:이|은)?\s*(?:전혀\s*)?(?:없어요|없습니다|붙어\s*있지\s*않아요|붙지\s*않았어요)(?=\s*$)/.test(clause)) {
      entries.push({ part: 'body', field: 'combined', value: 'no' });
    } else if (/(?:붙어\s*있|달려\s*있)(?:어요|습니다|는\s*상태|고\s|$)/.test(clause) && /라벨|뚜껑|캡|필름/.test(clause)) {
      entries.push({ part: 'body', field: 'combined', value: 'yes' });
    }
    const separable = /(?:분리|떼어\s*낼)\s*(?:할\s*)?수\s*없|분리되지\s*않|떼어지지\s*않/.test(clause) ? 'no'
      : /(?:분리|떼어\s*낼)\s*(?:할\s*)?수\s*있|분리돼요/.test(clause) ? 'yes' : '';
    if (separable) entries.push({ part: 'body', field: 'separable', value: separable });
    const possibleCodes = new Set((clause.match(/(?:플라스틱|비닐류)(?:\s+(?:PET|PP|HDPE|LDPE|PE|PS|OTHER)\b|\s*\((?:PET|PP|HDPE|LDPE|PE|PS|OTHER)\))|\b(?:PP|HDPE|LDPE|PE|PS|PET)\b|무색\s*페트|일반팩|멸균팩|종이팩|비닐류|도포\s*[·ㆍ･・⋅./]?\s*첩합/gi) || [])
      .map(code => code.toUpperCase().replace(/무색\s*페트/, '무색페트')));
    const markText = prefix ? clause.slice(prefix[0].length) : '';
    if (!/표시.{0,9}없|표기가?\s*없|또는|[\/]\s*(?:PP|PE|PS|PET)\b/i.test(clause)) {
      if (possibleCodes.has('무색페트')) possibleCodes.delete('PET');
      const laminate = !/붙어\s*있지\s*않|표시[^,.]{0,10}없/.test(clause)
        && /표시|마크|인쇄|적혀|써\s*있|^\s*도포|[:：]/.test(clause) && [...possibleCodes].find(laminatedMark);
      if (!laminate) for (const code of possibleCodes) if (laminatedMark(code)) possibleCodes.delete(code);
      if (!laminate && /^비닐(?:이에요|입니다|이고|이예요|$)/.test(markText)) possibleCodes.add('비닐류');
      for (const code of laminate ? [laminate] : possibleCodes) {
        const mark = confirmedPhotoMark(code, part);
        if (mark) entries.push({ part, targetLabel, field: 'material', value: mark.material, type: mark.type });
      }
    }
    const clean = /(?:오염(?:이|은)?\s*(?:없어요|없습니다|없지만|없고|없는데)|깨끗(?:해요|합니다|하네요|하지만|하고|한데|한\s*상태(?:예요|입니다)?))\s*$/.test(clause)
      && !/깨끗.{0,8}(?:않|못)|않(?:아|습)|못(?:했|해)/.test(clause);
    const dirty = /(?:음식물|내용물|기름기|오염|얼룩)(?:이|가|은)?\s*(?:조금\s*)?(?:남았어요|남았습니다|남아\s*있어요|남아\s*있습니다|묻었어요|묻어\s*있어요|있어요|있습니다)|오염된\s*상태/.test(clause)
      && !/남아\s*있지\s*않|남아\s*있진\s*않|남[은아].{0,9}없/.test(clause);
    const liquidOnly = /(?:기름|물)\s*자국만\s*(?:남았어요|남아\s*있어요|있어요|남음|$)/.test(clause);
    const solids = /(?:고형물|부스러기|음식\s*덩어리|음식물)(?:이|가|은|는)?\s*(?:남았어요|남아\s*있어요|있어요|남음)/.test(clause);
    if (clean) entries.push({ part, targetLabel, field: 'state', value: 'clean' });
    if (dirty || liquidOnly || solids) entries.push({ part, targetLabel, field: 'state', value: /씻(?:었는데|어도)|세척(?:했지만|해도)/.test(clause) ? 'washed-dirty' : 'dirty' });
    if (liquidOnly || solids) entries.push({ part, targetLabel, field: 'vinylResidue', value: solids ? 'solids' : 'liquid-only' });
  }
  const solidParts = new Set(entries.filter(entry => entry.field === 'vinylResidue' && entry.value === 'solids').map(partIdentity));
  const consistent = entries.filter(entry => entry.field !== 'vinylResidue' || entry.value !== 'liquid-only' || !solidParts.has(partIdentity(entry)));
  if (['yes', 'no'].every(value => consistent.some(entry => entry.field === 'separable' && entry.value === value))) {
    return cleanItemObservations([
      ...consistent.filter(entry => entry.field !== 'separable'),
      { part: 'body', field: 'separable', value: 'unknown' },
    ], { allowTargetLabels: true });
  }
  return cleanItemObservations(consistent, { allowTargetLabels: true });
}

export function mergeItemObservations(ai, description) {
  const explicit = observationsFromDescription(description);
  const namedParts = new Set(explicit.filter(entry => entry.targetLabel).map(entry => entry.part));
  const byKey = new Map(cleanItemObservations(ai).filter(entry => !namedParts.has(entry.part))
    .map(entry => [observationKey(entry), { ...entry, source: 'ai' }]));
  for (const entry of explicit) {
    const key = observationKey(entry);
    const previous = byKey.get(key);
    if (entry.field === 'handlingCondition' && entry.value === 'undamaged' && previous?.value === 'damaged') {
      byKey.set(key, { ...previous, conflicts: true });
    } else byKey.set(key, { ...entry, source: descriptionSource });
    if (entry.field === 'state' && entry.value === 'clean') byKey.delete(observationKey({ ...entry, field: 'vinylResidue' }));
  }
  return [...byKey.values()];
}

export function observationLabel(entry) {
  const label = entry.targetLabel || partNames[entry.part];
  if (entry.field === 'material') return `${label} · ${entry.value}${entry.type ? ` (${TYPES[entry.value].find(([id]) => id === entry.type)[1]})` : ''}`;
  if (entry.field === 'state') return `${label} · ${stateNames[entry.value]}`;
  if (entry.field === 'vinylResidue') return `${label} · ${residueNames[entry.value]}`;
  if (entry.field === 'combined') return entry.value === 'yes' ? '다른 재질이 붙어 있어요' : '다른 재질이 없어요';
  if (entry.field === 'handlingCondition') return handlingNames[entry.value];
  if (entry.value === 'unknown') return '붙은 재질의 분리 가능 여부를 다시 확인해요';
  return entry.value === 'yes' ? '붙은 재질을 분리할 수 있어요' : '붙은 재질을 분리할 수 없어요';
}

// Apply only checked suggestions. A mentioned part is never assumed separable.
export function applyItemObservations(input, observations) {
  const next = structuredClone(input);
  const parts = new Map();
  const entries = cleanItemObservations(observations, { allowTargetLabels: true });
  for (const entry of entries) {
    if (['combined', 'separable', 'handlingCondition'].includes(entry.field)) next[entry.field] = entry.value;
    else {
      const key = partIdentity(entry);
      if (!parts.has(key)) parts.set(key, { part: entry.part, targetLabel: entry.targetLabel });
      parts.get(key)[entry.field] = entry;
    }
  }
  function applyPart(part, evidence) {
    const { material, state, vinylResidue } = evidence;
    if (material) {
      const changed = part.material !== material.value || Boolean(material.type && part.type !== material.type);
      if (changed) {
        const current = selectedState(part, needsWashQuestion(part));
        Object.assign(part, { material: material.value, type: material.type || '' });
        for (const field of ['contaminated', 'washed', 'removable', 'vinylResidue', 'foodSeparated']) delete part[field];
        if (current && current !== 'unknown') part.observedState = current;
        else if (current === 'unknown' && supportsState(part)) part.contaminated = 'unknown';
      }
    }
    if (state && supportsState(part)) {
      delete part.observedState;
      const washable = needsWashQuestion(part);
      const answer = state.value === 'washed-dirty' && !washable ? 'dirty' : state.value;
      if (answer !== selectedState(part, washable)) {
        for (const field of ['contaminated', 'washed', 'removable', 'vinylResidue']) delete part[field];
        Object.assign(part, stateAnswers(answer, washable));
      }
    } else if (state) {
      // Form applies this only after a compatible subtype is chosen.
      part.observedState = state.value;
    }
    if (vinylResidue && part.material === '비닐' && part.type === 'packaging' && state?.value !== 'clean') {
      if (part.contaminated !== 'yes') Object.assign(part, stateAnswers('dirty'));
      part.vinylResidue = vinylResidue.value;
    }
  }
  if (parts.has('body')) applyPart(next, parts.get('body'));
  const attachments = [...parts].filter(([key]) => key !== 'body');
  const confirmedNoAttachments = entries.some(entry => entry.field === 'combined' && entry.value === 'no');
  const checkedSeparation = entries.some(entry => entry.field === 'separable');
  if (confirmedNoAttachments && (attachments.length || checkedSeparation)) {
    // Conflicting checked statements leave composition for the user to resolve.
    next.combined = 'unknown';
  } else if (attachments.length || checkedSeparation) {
    if (next.combined !== 'yes' && !checkedSeparation) delete next.separable;
    next.combined = 'yes';
  }
  if (attachments.length && next.combined === 'yes') {
    next.components ||= [];
    for (const [, evidence] of attachments) {
      const { part: key, targetLabel } = evidence;
      const label = targetLabel || partNames[key];
      const matches = next.components.filter(item => {
        const name = normalizeItemName(item.label);
        return targetLabel ? name === normalizeItemName(targetLabel) : partAliases[key].test(name);
      });
      if (matches.length > 1) continue;
      let part = matches[0];
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
