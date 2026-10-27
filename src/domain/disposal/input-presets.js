import { suggestItemInfo } from './item-suggestions.js';

// 현재 오염·세척 상태는 복사하지 않습니다. 이름 변경 시 이전 답변도 이어받지 않습니다.
export function itemPresetInput(itemName) {
  const item = suggestItemInfo(itemName);
  if (!item) return { itemName, material:'', type:'' };
  const input = { itemName, material:item.material, type:item.type };
  const defaults = item.defaults;
  if (defaults?.combined === 'no') input.combined = 'no';
  if (defaults?.combined === 'yes') {
    input.combined = 'yes';
    input.separable = defaults.separable || '';
    if (input.separable === 'yes') input.components = (defaults.components || []).slice(0,5)
      .map(part => ({material:part.material, type:part.type || '', ...(part.label ? {label:part.label} : {})}));
  }
  return input;
}
