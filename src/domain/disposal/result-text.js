export function resultToText(input, result) {
  const steps = result.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const parts = result.parts.map(part => `${part.label} (${part.material}): ${part.method}`).join('\n');
  return `${input.itemName}\n${result.regional ? `판별 지역: ${result.regional.label} · ${result.regional.coverage === 'verified' ? '해당 품목 지역 기준 적용' : '기본 안내 · 지역 기준 확인 필요'}\n${result.regional.notes.join('\n')}\n` : ''}${result.method}\n\n배출 전 처리\n${steps}\n\n판단 이유\n${result.reasons.join('\n')}\n\n재질별 안내\n${parts}\n\n${result.notice}\n규칙 ${result.ruleVersion} · 확인일 ${result.checkedAt || '미기록'}\n공식 출처\n${(result.sourceUrls || []).join('\n')}`;
}
