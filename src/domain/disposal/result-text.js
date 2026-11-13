import { categoryLabel } from './item-categories.js';
import { conditionDetails, disposalReasons, inputForDisplay, resultForDisplay, resultStepsForDisplay } from './result-display.js';
import { resultRegionLabel } from './regions.js';
import { handlingConditionQuestion } from './special-guides.js';
import { lookupItem } from './item-suggestions.js';
import { largeWasteHelp } from './large-waste.js';
import { collectionAction } from './collection-action.js';
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
  const reasons = disposalReasons(result);
  const explanation = reasons.length ? `\n\n${result.status === 'check' ? '왜 확인이 필요한가요?' : '왜 이렇게 버리나요?'}\n${reasons.join('\n')}` : '';
  const regionNotes = (result.regional?.notes || []).filter(note => !result.steps.includes(note) && note !== result.notice);
  const handlingAnswer = handlingConditionQuestion(lookupItem(input.itemName)?.handling || input.category)?.options.find(([key]) => key === input.handlingCondition)?.[1];
  const details = part => conditionDetails(part).map(([title, value]) => `${title} · ${value}`).join('\n');
  const conditions = [
    details(input),
    ...(input.components || []).map((part, index) => `${part.label || `부속품 ${index + 1}`}\n${details(part)}`),
  ].filter(Boolean).join('\n\n');
  const action = collectionAction(input, result);
  const large = largeWasteHelp(result);
  const sources = [...new Set([...(result.sourceUrls || []), action?.url, action?.extraUrl, large?.reportUrl, large?.feeUrl].filter(Boolean))];
  const heading = [
    input.itemName,
    `판별 지역 · ${resultRegionLabel(result)}`,
    result.method,
    result.aiAssisted ? 'AI 추정 결과예요. 실제 제품의 분리배출 표시를 꼭 확인해 주세요.' : '',
    input.category ? `${result.keywordCategory ? '이름으로 알아본 종류' : '직접 선택한 종류'} · ${categoryLabel(input.category)}` : '',
    handlingAnswer ? `물건 상태 · ${handlingAnswer}` : '',
  ].filter(Boolean).join('\n');
  const evidence = [
    '판단 근거·지역 기준', ...result.reasons.filter(reason => !reasons.includes(reason)), ...regionNotes, '', result.notice,
    `규칙 ${result.ruleVersion} · 확인일 ${(result.regional?.coverage === 'verified' ? result.regional.checkedAt : result.checkedAt) || '미기록'}`,
    '공식 출처', ...sources,
  ].join('\n');
  const contact = action ? `\n\n수거처·문의\n${[
    action.scope, action.note, action.phone && `${action.office} ${action.phone}`,
    ...(action.housing || []).map(([label, note]) => `${label} · ${note}`),
  ].filter(Boolean).join('\n')}` : '';
  return `${prefix}${heading}${preparation}${partInstructions}${explanation}${contact}${conditions ? `\n\n입력한 조건\n${conditions}` : ''}\n\n${evidence}`;
}
