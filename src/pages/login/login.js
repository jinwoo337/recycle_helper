import { field, authShell } from '../../components/auth.js';
import { login } from '../../services/auth.js';
import { googleLoginMarkup } from '../../components/google-login.js';

export async function submitLogin(form, status) {
  const password = form.elements.namedItem('password');
  let member;
  try { member = await login(form.elements.namedItem('email').value, password.value); }
  finally { password.value = ''; }
  if (!member) {
    status.textContent = '이메일 또는 비밀번호가 일치하지 않아요. 다시 확인해 주세요.';
    password.focus();
    return;
  }
  location.hash = '/';
}

export function loginPage() {
  return authShell('로그인', '이메일·비밀번호 또는 Google 계정으로 로그인해 주세요.', `${googleLoginMarkup()}<form id="login-form" novalidate>${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'current-password')}<button class="button primary full-width" type="submit">로그인</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '아직 계정이 없으신가요? <a href="#/signup">회원가입</a><br><a class="guest-start" href="#/item-input">가입 없이 먼저 사용하기 →</a>', '이메일 로그인은 기존 가입 정보를 사용해요. Google로 처음 이용하면 계정이 생성되며, 마이페이지에서 지역을 설정할 수 있어요.');
}

