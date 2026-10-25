import { field, authShell } from '../../components/auth.js';
import { login } from '../../services/auth.js';

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
  return authShell('다시 만나 반가워요', '가입한 이메일과 비밀번호로 로그인해 주세요.', `<form id="login-form" novalidate>${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'current-password')}<button class="button primary full-width" type="submit">로그인</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '아직 계정이 없으신가요? <a href="#/signup">회원가입</a>', '이메일 인증을 완료한 계정으로 로그인할 수 있어요. 공용 기기에서는 이용 후 로그아웃해 주세요.');
}

