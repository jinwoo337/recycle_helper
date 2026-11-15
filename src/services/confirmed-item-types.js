import { normalizeItemName, lookupItem } from '../domain/disposal/item-suggestions.js';
import { validItemCategory } from '../domain/disposal/item-categories.js';

const limit = 40;
const keyFor = owner => `recycle-helper.confirmed-item-types.v1.${owner}`;

function read(owner) {
  try {
    const rows = JSON.parse(localStorage.getItem(keyFor(owner)) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

const eligible = category => validItemCategory(category) && !['unknown', 'material-only'].includes(category);

export function confirmedItemType(itemName, owner) {
  if (lookupItem(itemName)?.material) return '';
  const key = normalizeItemName(itemName);
  const row = read(owner).find(entry => entry?.key === key);
  return eligible(row?.category) ? row.category : '';
}

export function rememberConfirmedItemType(input, owner) {
  const key = normalizeItemName(input.itemName);
  if (!key || lookupItem(input.itemName)?.material || input.categoryOrigin !== 'manual' || !eligible(input.category)) return;
  try {
    localStorage.setItem(keyFor(owner), JSON.stringify([{ key, category: input.category }, ...read(owner).filter(entry => entry?.key !== key)].slice(0, limit)));
  } catch { /* A blocked browser store does not prevent disposal guidance. */ }
}

export function forgetConfirmedItemType(itemName, owner) {
  const key = normalizeItemName(itemName);
  if (!key) return;
  try { localStorage.setItem(keyFor(owner), JSON.stringify(read(owner).filter(entry => entry?.key !== key))); }
  catch { /* A blocked browser store does not prevent disposal guidance. */ }
}
