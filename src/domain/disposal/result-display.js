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
