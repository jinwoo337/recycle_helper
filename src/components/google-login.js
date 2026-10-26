import { loginWithGoogle } from '../services/auth.js';

export function googleLoginMarkup() {
  return `<div class="social-login"><button class="button google-login full-width" type="button" data-google-login><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.38Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.39l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.93v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.53l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.6C7.2 7.71 9.4 5.95 12 5.95Z"/></svg><span>Google로 계속하기</span></button><p class="form-status" data-google-status role="status" aria-live="polite"></p><div class="auth-divider"><span>또는 이메일로</span></div></div>`;
}

export function bindGoogleLogin() {
  const button = document.querySelector('[data-google-login]'); if (!button) return;
  const status = document.querySelector('[data-google-status]');
  button.addEventListener('click', async () => {
    if (button.disabled || button.closest('.auth-card')?.querySelector('form[aria-busy="true"]')) return;
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    status.textContent = 'Google 로그인 화면으로 이동하고 있어요…';
    try { await loginWithGoogle(); }
    catch (error) { status.textContent = error.message || 'Google 로그인에 연결하지 못했어요. 다시 시도해 주세요.'; }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  });
}
