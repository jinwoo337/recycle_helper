import { disposalReasons } from '../domain/disposal/result-display.js';
import { escapeHtml } from '../utils/html.js';

export function disposalReasonMarkup(result, pendingReason = '') {
  const reasons = pendingReason ? [pendingReason] : disposalReasons(result);
  if (!reasons.length) return '';
  const heading = pendingReason || result.status === 'check' ? '왜 확인이 필요한가요?' : '왜 이렇게 버리나요?';
  return `<section class="disposal-reason"><h3>${heading}</h3>
    ${reasons.map(reason => `<p>${escapeHtml(reason)}</p>`).join('')}</section>`;
}
