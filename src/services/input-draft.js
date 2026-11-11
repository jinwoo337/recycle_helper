import { getCurrentMember } from './auth.js';
let pending;
export function queueInput(input, route = '/item-input') {
  pending = { owner: getCurrentMember()?.id || 'guest', route, input: structuredClone(input) };
}
export function takeQueuedInput(route = '/item-input') {
  const value = pending; pending = undefined;
  return value?.route === route && value.owner === (getCurrentMember()?.id || 'guest') ? value.input : null;
}
