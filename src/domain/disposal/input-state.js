import { needsWashQuestion, supportsState } from './rules.js';

// 화면의 현재 상태 선택을 기존 기록·판별 형식으로 변환합니다.
export function stateAnswers(answer, washable = true) {
  if (answer === 'clean') return { contaminated: 'no' };
  if (answer === 'unknown') return { contaminated: 'unknown' };
  if (answer === 'dirty') return { contaminated: 'yes', ...(washable ? { washed: 'no' } : {}) };
  if (answer === 'washed-dirty' && washable) return { contaminated: 'yes', washed: 'yes' };
  return {};
}

export function selectedState(part, washable = true) {
  if (part.contaminated === 'no') return 'clean';
  if (part.contaminated === 'unknown') return 'unknown';
  if (part.contaminated !== 'yes') return '';
  if (!washable || part.washed === 'no') return 'dirty';
  return part.washed === 'yes' ? 'washed-dirty' : '';
}
export function linkedComponentState(body, component) {
  if (!supportsState(component)) return null;
  const bodyWashable = needsWashQuestion(body);
  const componentWashable = needsWashQuestion(component);
  const current = selectedState(body, bodyWashable);
  if (!['clean', 'dirty', 'washed-dirty'].includes(current)) return null;
  const answer = current === 'washed-dirty' && !componentWashable ? 'dirty' : current;
  const state = stateAnswers(answer, componentWashable);
  // 오염을 실제로 없앨 수 있는지는 부속품마다 따로 답합니다.
  return { washed: '', vinylResidue: '', removable: '', ...state };
}
