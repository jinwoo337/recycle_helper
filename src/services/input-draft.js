import { getCurrentMember } from './auth.js';
let pending;
export function queueInput(input) { pending = { owner: getCurrentMember()?.id || 'guest', input: structuredClone(input) }; }
export function takeQueuedInput() {
  const value = pending; pending = undefined;
  return value?.owner === (getCurrentMember()?.id || 'guest') ? value.input : null;
}
