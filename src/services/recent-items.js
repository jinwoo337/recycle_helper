import { getCurrentMember } from './auth.js';

const MAX_ITEMS = 8;

export function storageKey() {
  return `recycle-helper.recent-items.v1.${getCurrentMember()?.id || 'guest'}`;
}

export function getRecentItems() {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey()) || '[]');
    return Array.isArray(items) ? items.filter(name => typeof name === 'string').slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function saveRecentItem(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('물건 이름을 입력해 주세요.');
  const items = [trimmed, ...getRecentItems().filter(item => item !== trimmed)].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  } catch {
    throw new Error('물건 이름을 저장하지 못했어요. 브라우저 저장소를 확인해 주세요.');
  }
  return items;
}
