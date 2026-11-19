import { reuseAdvice } from '../domain/disposal/reuse.js';
import { escapeHtml } from '../utils/html.js';

export function reuseAdviceMarkup(input, result) {
  const advice = reuseAdvice(input, result);
  if (!advice) return '';
  const content = `<p class="input-hint">깨끗하고 파손 없이 사용할 수 있는 물건이라면 아래 방법을 시도해 보세요.</p><ul>${advice.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`;
  return `<section class="related-disposal reuse-advice"><h3>버리기 전에 재사용해 보세요</h3>${advice.confirmed ? content : `<details><summary>깨끗하고 파손 없이 쓸 수 있나요? 재사용 방법 보기</summary>${content}</details>`}</section>`;
}
