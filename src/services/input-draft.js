import { getCurrentMember } from './auth.js';
let pending;
export function queueInput(input) { pending = { owner: getCurrentMember()?.id || 'guest', input: structuredClone(input) }; }
export function takeQueuedInput() {
  const value = pending; pending = undefined;
  return value?.owner === (getCurrentMember()?.id || 'guest') ? value.input : null;
}

// 이름으로 찾다가 상태를 고르기 어려울 때, 설명하기 화면에 물건 이름을 미리 적어 둡니다.
let pendingDescription;
export function queueDescription(text) { pendingDescription = String(text || '').slice(0, 200); }
export function takeQueuedDescription() { const value = pendingDescription; pendingDescription = undefined; return value || ''; }
