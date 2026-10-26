import { lookupItem } from './item-suggestions.js';
import { supportsState } from './rules.js';

export function cleanSingleMaterialInput(input) {
  const known = lookupItem(input?.itemName);
  if (!known || known.material !== input.material || (known.type && known.type !== input.type) || !supportsState(input)) return null;
  const next = { ...structuredClone(input), contaminated: 'no', combined: 'no' };
  for (const key of ['washed', 'removable', 'separable', 'components']) delete next[key];
  return next;
}
