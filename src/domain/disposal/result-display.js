import { judgeDisposal, RULE_VERSION } from './rules.js';

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
