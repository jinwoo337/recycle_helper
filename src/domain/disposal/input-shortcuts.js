import { itemTypeClarification, lookupItem } from './item-suggestions.js';
import { supportsState } from './rules.js';
import { categoryAllowsMaterial } from './item-categories.js';
import { itemPresetInput } from './input-presets.js';

export function cleanSingleMaterialInput(input) {
  const known = lookupItem(input?.itemName);
  if (!input?.itemName?.trim() || itemTypeClarification(input.itemName) || !supportsState(input)) return null;
  const matches = (known?.material === input.material && (!known.type || known.type === input.type))
    || known?.variants?.[input.material]?.includes(input.type);
  const packaging = !known?.material && input.category === 'packaging' && input.categoryOrigin === 'manual'
    && categoryAllowsMaterial('packaging', input.material) && input.type !== 'utensil';
  if (!matches && !packaging) return null;
  const next = { ...structuredClone(input), contaminated: 'no', combined: 'no' };
  for (const key of ['washed', 'removable', 'vinylResidue', 'separable', 'components']) delete next[key];
  return next;
}

// Confirm the actual label configuration before using the catalog example.
export function cleanLabelledBottleInput(input) {
  if (input?.material !== '페트병' || input.type !== 'clear-drink' || input.contaminated || input.observedState
      || input.combined !== 'yes' || input.separable !== 'yes' || input.components?.length !== 1) return null;
  const preset = itemPresetInput(input.itemName);
  const [label] = input.components;
  if (preset.components?.length !== 1 || preset.components[0].label !== label.label || label.label !== '비닐 라벨'
      || label.material !== '비닐' || label.type !== 'packaging' || label.contaminated || label.observedState) return null;
  return { ...input, contaminated: 'no', components: [{ ...label, contaminated: 'no' }] };
}
