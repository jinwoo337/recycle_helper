// AI에게 이름과 함께 보낼 '현재 상태'. 브라우저는 정해진 짧은 코드만 보내고, 서버가 정해진 한국어 문구로 바꿉니다.
// 자유 문장을 받지 않으므로 상태 칸을 통해 AI 지시를 바꿀 수 없습니다.
const FIELDS = [
  ['c', 'contaminated', { yes: '오염 있음', no: '오염 없이 깨끗함', unknown: '오염 여부 모름' }],
  ['w', 'washed', { yes: '세척함', no: '아직 세척 안 함' }],
  ['r', 'removable', { yes: '남은 오염을 헹구거나 떼어 낼 수 있음', no: '남은 오염을 지울 수 없음' }],
  ['v', 'vinylResidue', { 'liquid-only': '기름·물 자국만 남음', solids: '음식물·소스 등 고형물이 남음', unknown: '남은 것이 무엇인지 모름' }],
  ['f', 'foodSeparated', { yes: '음식물이 아닌 것을 모두 제거함', no: '음식물이 아닌 것이 섞여 있음' }],
  ['b', 'combined', { yes: '다른 재질이 붙어 있음', no: '다른 재질 없음', unknown: '다른 재질 결합 여부 모름' }],
  ['s', 'separable', { yes: '붙은 재질을 분리할 수 있음', no: '붙은 재질을 분리하기 어려움', unknown: '분리 가능 여부 모름' }],
];

// 입력값에서 답한 상태만 골라 'c:yes,r:no' 같은 코드로 만듭니다. 답한 것이 없으면 빈 문자열입니다.
export function encodeAiState(input = {}) {
  return FIELDS.filter(([, field, labels]) => Object.hasOwn(labels, input?.[field])).map(([code, field]) => `${code}:${input[field]}`).join(',');
}

// 코드를 한국어 설명으로 바꿉니다. 형식이 맞지 않는 조각은 버립니다.
export function describeAiState(code) {
  if (typeof code !== 'string' || code.length > 120) return '';
  const parts = new Map(code.split(',').map(part => part.split(':')).filter(pair => pair.length === 2));
  return FIELDS.map(([short, , labels]) => (Object.hasOwn(labels, parts.get(short)) ? labels[parts.get(short)] : '')).filter(Boolean).join(', ');
}
