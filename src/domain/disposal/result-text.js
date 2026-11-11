import { categoryLabel } from './item-categories.js';
import { inputForDisplay, resultForDisplay, resultStepsForDisplay } from './result-display.js';
import { resultRegionLabel } from './regions.js';
const numbered = steps => steps.map((step, index) => `${index + 1}. ${step}`).join('\n');

export function resultToText(input, result) {
  input = inputForDisplay(input, result);
  const displayed = resultForDisplay(input, result);
  const updated = displayed !== result;
  result = displayed;
  const prefix = updated ? '현재 기준으로 다시 확인한 안내\n' : '';
  const { parts, steps } = resultStepsForDisplay(result);
  const preparation = steps.length ? `\n\n${parts.length ? '먼저 할 일' : result.status === 'check' ? '배출 전에 확인하세요' : '이렇게 배출하세요'}\n${numbered(steps)}` : '';
  const partInstructions = parts.length ? `\n\n본체와 부속품 배출 방법\n${parts.map(part => `${part.label} (${part.material}) · ${part.method}\n${numbered(part.steps)}`).join('\n\n')}` : '';
  const regionNotes = (result.regional?.notes || []).filter(note => !result.steps.includes(note) && note !== result.notice);
  return `${prefix}${input.itemName}\n${input.category ? `${result.keywordCategory ? '이름으로 알아본 종류' : '직접 선택한 종류'} · ${categoryLabel(input.category)}\n` : ''}판별 지역 · ${resultRegionLabel(result)}\n${result.method}${preparation}${partInstructions}\n\n판단 이유\n${[...result.reasons, ...regionNotes].join('\n')}\n\n${result.notice}\n규칙 ${result.ruleVersion} · 확인일 ${result.regional?.checkedAt || result.checkedAt || '미기록'}\n공식 출처\n${(result.sourceUrls || []).join('\n')}`;
}
