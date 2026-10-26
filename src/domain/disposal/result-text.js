export function resultToText(input, result) {
  const steps = result.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const parts = result.parts.map(part => `${part.label} (${part.material}): ${part.method}`).join('\n');
  return `${input.itemName}\n${result.method}\n\n배출 전 처리\n${steps}\n\n판단 이유\n${result.reasons.join('\n')}\n\n재질별 안내\n${parts}\n\n${result.notice}\n규칙 ${result.ruleVersion} · 확인일 ${result.checkedAt || '미기록'}`;
}
