import { collectionAction } from '../domain/disposal/collection-action.js';
import { escapeHtml } from '../utils/html.js';

export function collectionActionMarkup(input, result, action = collectionAction(input, result)) {
  if (!action) return '';
  return `<div class="result-collection-action">
    ${action.url ? `<a class="button secondary" href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)} ↗</a>` : ''}
    ${action.extraUrl ? `<a class="button secondary" href="${escapeHtml(action.extraUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.extraLabel)} ↗</a>` : ''}
    ${action.phone ? `<a class="button secondary" href="tel:${escapeHtml(action.phone)}">${escapeHtml(action.office)} ${escapeHtml(action.phone)}</a>` : ''}
    <p class="input-hint">${action.scope ? `<strong>${escapeHtml(action.scope)}</strong> · ` : ''}${escapeHtml(action.note)}</p>
    ${action.housing ? `<div class="collection-housing"><p>어떤 주택에 거주하나요?</p>${action.housing.map(([label, note]) => `<details name="collection-housing"><summary>${escapeHtml(label)}</summary><p>${escapeHtml(note)}</p></details>`).join('')}</div>` : ''}
  </div>`;
}
