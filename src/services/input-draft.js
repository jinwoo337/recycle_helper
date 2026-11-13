import { getCurrentMember } from './auth.js';
export const UNNAMED_ITEM = '이름 모르는 물건';
let pending;
let searchVersion = 0;
export const inputSearchVersion = () => searchVersion;
export function startInputSearch() { pending = undefined; return ++searchVersion; }
export function queueInput(input, route = '/item-input') {
  pending = { owner: getCurrentMember()?.id || 'guest', route, input: structuredClone(input) };
}
export function takeQueuedInput(route = '/item-input') {
  const value = pending; pending = undefined;
  return value?.route === route && value.owner === (getCurrentMember()?.id || 'guest') ? value.input : null;
}

// 이름으로 찾다가 상태를 고르기 어려울 때, 설명하기 화면에 물건 이름을 미리 적어 둡니다.
export function queueDescription(text) { queueInput({ description: String(text || '').slice(0, 200) }, '/describe'); }
export function takeQueuedDescription() { return takeQueuedInput('/describe')?.description || ''; }
