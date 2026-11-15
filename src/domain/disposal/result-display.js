import { judgeDisposal, RULE_VERSION, TYPES } from './rules.js';
import { handlingConditionQuestion } from './special-guides.js';
import { yuseongDeskQuestion, yuseongFoamQuestion } from './daejeon-guides.js';

const conditionTitles = {
  material: '주요 재질',
  type: '세부 종류',
  contaminated: '현재 오염 여부',
  washed: '세척 여부',
  removable: '남은 오염 제거 가능 여부',
  vinylResidue: '비닐에 남은 오염',
  combined: '다른 재질과 결합',
  separable: '재질 분리 가능 여부',
  foodSeparated: '포장재·뼈 등 이물질 제거 완료',
};
const conditionLabels = {
  yes: '네',
  no: '아니요',
  unknown: '모르겠어요',
  'liquid-only': '내용물·고형물 없이 기름·물 자국만 남음',
  solids: '고형물이 남음',
};

export function conditionDetails(part) {
  const types = Object.hasOwn(TYPES, part.material) ? TYPES[part.material] : [];
  return Object.entries(conditionTitles).filter(([key]) => part[key]).map(([key, title]) => {
    const answer = part[key];
    const label = key === 'type' ? types.find(([type]) => type === answer)?.[1]
      : Object.hasOwn(conditionLabels, answer) ? conditionLabels[answer] : undefined;
    return [title, label || answer];
  });
}

export function resultHandlingQuestion(input, region, handling) {
  return handlingConditionQuestion(handling, region) || (handling === 'large' ? yuseongDeskQuestion(region, input.itemName) : yuseongFoamQuestion(region, input.material, input.type));
}

export function resultNeedsCheck(result) {
  return result.status === 'check' && !result.confirmedCollection && !result.confirmedReport;
}

// 저장된 스냅샷은 유지하고, 오래된 처리 지침은 화면·복사에서 재사용하지 않습니다.
export function resultForDisplay(input, savedResult) {
  if (savedResult.ruleVersion === RULE_VERSION) return savedResult;
  return judgeDisposal(inputForDisplay(input, savedResult));
}

export function inputForDisplay(input, savedResult) {
  if (savedResult.ruleVersion === RULE_VERSION) return input;
  const { aiGuess, ...confirmedInput } = input;
  return confirmedInput;
}

const pendingQuestionLabels = {
  material: '재질 확인하기',
  label: '부속품 이름 확인하기',
  type: '세부 종류 확인하기',
  state: '오염 상태 확인하기',
  removable: '오염 제거 여부 확인하기',
  'vinyl-residue': '비닐에 남은 오염 확인하기',
  food: '음식물이 아닌 것 분리하기',
  combined: '붙어 있는 재질 확인하기',
  separable: '재질 분리 여부 확인하기',
  handling: '물건 상태 확인하기',
  category: '물건 종류 확인하기',
  components: '분리한 부속품 확인하기',
};

export function resultPendingQuestions(input, result) {
  if (!resultNeedsCheck(result)) return [];
  const questions = new Map();
  const parts = result.parts || [];
  function add(condition, partIndex = 0) {
    if (!Object.hasOwn(pendingQuestionLabels, condition)) return;
    const part = partIndex > 0 ? parts[partIndex] : null;
    const prefix = part ? `part${partIndex - 1}-` : '';
    const label = condition === 'handling' && result.regional?.comparisonKey === 'desk:yuseong-types'
      ? '책상 종류 선택하기' : pendingQuestionLabels[condition];
    questions.set(`${prefix}${condition}`, {
      condition, prefix,
      label: part ? `${part.label} · ${label}` : label,
    });
  }
  add(result.pendingCondition);
  parts.forEach((part, index) => add(part.pendingCondition, index));
  if (questions.size) return [...questions.values()];
  const unconfirmedHandling = !input.handlingCondition || input.handlingCondition === 'unknown';
  if (unconfirmedHandling && handlingConditionQuestion(result.handling, result.region)) add('handling');
  else if (['unknown', 'material-only'].includes(input.category)) add('category');
  return [...questions.values()];
}

export function resultPendingQuestion(input, result) {
  return resultPendingQuestions(input, result)[0] || null;
}

export function disposalReasons(result) {
  if (!result) return [];
  const reasons = result.reasons || [];
  const parts = result.parts || [];
  if (parts.length < 2) {
    const needsComposition = result.status === 'check' && (parts[0]?.label === '본체와 결합 재질' && !result.pendingCondition
      || ['combined', 'separable', 'components'].includes(result.pendingCondition));
    if (needsComposition) return [reasons.at(-1) || reasons[0]].filter(Boolean);
    const hasRemovableContamination = result.status === 'recycle' && result.method.startsWith('오염 제거 후');
    return (hasRemovableContamination ? reasons.slice(0, 2) : reasons.slice(0, 1)).filter(Boolean);
  }
  const body = parts[0];
  const attachments = parts.slice(1);
  const affected = attachments.find(part => part.status === 'check')
    || attachments.find(part => part.status !== body.status) || attachments[0];
  return [body, affected].filter(part => part.reasons?.[0]).map(part => `${part.label} · ${part.reasons[0]}`);
}

export function resultStepsForDisplay(result) {
  const parts = result.parts.length > 1 ? result.parts.map(part => ({ ...part, steps: [...new Set(part.steps)] })) : [];
  const partSteps = new Set(parts.flatMap(part => part.steps));
  const sharedPreparation = (parts[0]?.steps || []).filter(step =>
    /^(내용물을 비우고 물기를 제거|남은 오염을 제거하고 깨끗해졌는지 확인)/.test(step)
    && parts.every(part => part.steps.includes(step)));
  const steps = [...new Set(result.steps)].filter(step => !partSteps.has(step));
  return { parts: parts.map(part => ({ ...part, steps: part.steps.filter(step => !sharedPreparation.includes(step)) })), steps: [...steps, ...sharedPreparation] };
}
