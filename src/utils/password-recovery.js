const KEY = 'recycle-helper.password-recovery.v1';
const MAX_AGE = 15 * 60 * 1000;

export function rememberPasswordRecovery(memberId, storage, now = Date.now()) {
  if (!memberId) return;
  try { (storage || sessionStorage).setItem(KEY, JSON.stringify({ memberId, startedAt: now })); } catch { /* 현재 화면의 인증 상태는 계속 유지 */ }
}
export function hasPasswordRecovery(memberId, storage, now = Date.now()) {
  try {
    const saved = JSON.parse((storage || sessionStorage).getItem(KEY) || 'null');
    return Boolean(memberId && saved?.memberId === memberId && Number.isFinite(saved.startedAt) && now >= saved.startedAt && now - saved.startedAt < MAX_AGE);
  } catch { return false; }
}
export function clearPasswordRecovery(storage) {
  try { (storage || sessionStorage).removeItem(KEY); } catch { /* 저장소 차단 */ }
}
