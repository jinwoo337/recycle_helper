import { field, authShell } from '../../components/auth.js';
import { signup } from '../../services/auth.js';

export async function submitSignup(form, status) {
  await signup(form.elements.namedItem('nickname').value, form.elements.namedItem('email').value, form.elements.namedItem('password').value);
  form.reset();
  location.hash = '/login';
  // 화면 전환 뒤에도 가입 완료 안내를 전달합니다.
  try { sessionStorage.setItem('recycle-helper.signup-complete', 'true'); } catch { /* 가입은 완료됨 */ }
}

export function signupPage() {
  return authShell('작은 실천의 시작', '회원가입에 필요한 정보를 입력해 보세요.', `<form id="signup-form" novalidate>${field('nickname', '닉네임', 'text', 'nickname', 'minlength="2" maxlength="20" placeholder="2~20자"')}${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'new-password', 'minlength="8" placeholder="8자 이상"')}${field('password-confirm', '비밀번호 확인', 'password', 'new-password', 'placeholder="비밀번호를 한 번 더 입력해 주세요"')}<button class="button primary full-width" type="submit">회원가입</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '이미 계정이 있으신가요? <a href="#/login">로그인</a>');
}

