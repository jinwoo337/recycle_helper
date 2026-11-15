const key = 'recycle-helper.google-login-started';
const callbackKeys = ['code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'token_hash', 'token_type', 'expires_in', 'expires_at', 'state'];

export function parseAuthCallback(rawUrl) {
  const url = new URL(rawUrl), hash = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.has('error') || hash.has('error');
  const hasCallback = callbackKeys.some(name => url.searchParams.has(name) || hash.has(name));
  return { url, error, hasCallback };
}

export function cleanAuthCallbackUrl(rawUrl, { member, google = false, recovery = false, error = false } = {}) {
  const url = new URL(rawUrl);
  for (const name of [...callbackKeys, 'type']) url.searchParams.delete(name);
  if (recovery && member && !error) url.hash = '#/reset-password';
  else if (google && member && !member.region && !error) url.hash = '#/profile';
  else if (!url.hash.startsWith('#/')) url.hash = member ? '#/' : '#/login';
  return url;
}
export function rememberGoogleLogin() {
  try { sessionStorage.setItem(key, String(Date.now())); } catch { /* 기본 인증 복귀는 계속 처리 */ }
}
export function clearGoogleLogin() {
  try { sessionStorage.removeItem(key); } catch { /* 저장소 차단 */ }
}
export function consumeGoogleLogin() {
  try {
    const started = Number(sessionStorage.getItem(key));
    clearGoogleLogin();
    return started > 0 && Date.now() >= started && Date.now() - started < 15 * 60 * 1000;
  } catch { return false; }
}
export function callbackMessage({ error, google, member }) {
  if (error) return google ? 'Google 로그인이 취소되었거나 완료되지 않았어요. 다시 로그인해 주세요.' : '로그인·이메일 인증을 완료하지 못했어요. 링크가 만료됐거나 인증이 취소되었을 수 있어요. 다시 시도해 주세요.';
  if (google) return member ? (member.region ? 'Google 로그인이 완료됐어요.' : 'Google 로그인이 완료됐어요. 마이페이지에서 닉네임과 분리배출 지역을 설정해 주세요.') : 'Google 로그인을 완료하지 못했어요. 같은 브라우저에서 다시 시도해 주세요.';
  return member ? '로그인 또는 이메일 인증이 완료됐어요.' : '이메일 인증 상태를 확인한 뒤 로그인해 주세요.';
}
