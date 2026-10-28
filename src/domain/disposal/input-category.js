import { lookupItem } from './item-suggestions.js';
import { detectItemCategory } from './category-keywords.js';
import { validItemCategory } from './item-categories.js';

// 홈 검색, 기록 복원, 직접 입력에 같은 종류 선택 규칙을 적용합니다.
export function resolveInputCategory(input = {}) {
  if (lookupItem(input.itemName)?.material) return { category: '', origin: '', detected: null };
  const detected = input.keywordCategory === false ? null : detectItemCategory(input.itemName);
  const selected = validItemCategory(input.category) ? input.category : '';
  const category = input.categoryOrigin === 'keyword' && input.keywordCategory !== false ? detected?.category || '' : selected || detected?.category || '';
  const automatic = Boolean(detected && detected.category === category && input.categoryOrigin !== 'manual');
  return { category, origin: automatic ? 'keyword' : category ? 'manual' : '', detected: automatic ? detected : null };
}

export function prepareCategoryInput(input = {}) {
  const { category, origin } = resolveInputCategory(input);
  const prepared = { ...input };
  delete prepared.editCategory;
  delete prepared.category;
  delete prepared.categoryOrigin;
  if (category) { prepared.category = category; prepared.categoryOrigin = origin; }
  return prepared;
}
