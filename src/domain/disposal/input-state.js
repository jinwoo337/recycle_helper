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
