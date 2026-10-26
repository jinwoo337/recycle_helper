const key = 'recycle-helper.google-login-started';
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
