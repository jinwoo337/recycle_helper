import { judgeDisposal, RULE_VERSION, TYPES } from './rules.js';

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
  return Object.entries(conditionTitles).filter(([key]) => part[key]).map(([key, title]) => {
    const answer = part[key];
    const label = key === 'type' ? TYPES[part.material]?.find(([type]) => type === answer)?.[1]
      : Object.hasOwn(conditionLabels, answer) ? conditionLabels[answer] : undefined;
    return [title, label || answer];
  });
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

export function resultStepsForDisplay(result) {
  const parts = result.parts.length > 1 ? result.parts.map(part => ({ ...part, steps: [...new Set(part.steps)] })) : [];
  const partSteps = new Set(parts.flatMap(part => part.steps));
  const sharedPreparation = (parts[0]?.steps || []).filter(step =>
    /^(내용물을 비우고 물기를 제거|남은 오염을 제거하고 깨끗해졌는지 확인)/.test(step)
    && parts.every(part => part.steps.includes(step)));
  const steps = [...new Set(result.steps)].filter(step => !partSteps.has(step));
  return { parts: parts.map(part => ({ ...part, steps: part.steps.filter(step => !sharedPreparation.includes(step)) })), steps: [...steps, ...sharedPreparation] };
}
