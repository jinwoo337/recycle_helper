import { normalizeItemName, lookupItem } from '../domain/disposal/item-suggestions.js';
import { escapeHtml } from '../utils/html.js';

const ambiguousSpoons = ['일회용스푼', '일회용숟가락', '일회용수저'];
export const isAmbiguousSpoonName = name => ambiguousSpoons.includes(normalizeItemName(name));

const mealItems = [
  { name: '나무젓가락', hint: '종량제봉투', matches: name => lookupItem(name)?.handling === 'wood-chopsticks' },
  { name: '플라스틱 숟가락', hint: '헹구기 · 단일 플라스틱 수거 확인', matches: name =>
    isAmbiguousSpoonName(name) || lookupItem(name)?.type === 'utensil' || lookupItem(name)?.handling === 'wood-spoon' },
  { name: '배달 용기', hint: '비우기 · 재질과 오염 확인', matches: name => name === '배달용기' },
];

export function relatedDisposalMarkup(itemName) {
  const name = normalizeItemName(itemName);
  const current = mealItems.find(item => item.matches(name));
  if (!current) return '';
  return `<section class="related-disposal"><h3>함께 버리기 쉬운 물건</h3><ul>${mealItems.filter(item => item !== current).map(item =>
    `<li><button type="button" class="history-action" data-related-item="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.hint)} <span aria-hidden="true">→</span></span></button></li>`
  ).join('')}</ul></section>`;
}
