import { field, authShell } from '../../components/auth.js';
import { login } from '../../services/auth.js';

export async function submitLogin(form, status) {
  const password = form.elements.namedItem('password');
  const member = await login(form.elements.namedItem('email').value, password.value);
  password.value = '';
  if (!member) {
    status.textContent = '이메일 또는 비밀번호가 일치하지 않아요. 다시 확인해 주세요.';
    password.focus();
    return;
  }
  location.hash = '/';
}

export function loginPage() {
  return authShell('다시 만나 반가워요', '가입한 정보 또는 아래 테스트 계정으로 로그인해 보세요.', `<aside class="test-account" aria-label="테스트 계정"><strong>테스트 계정</strong><span>이메일: <code>demo@example.com</code></span><span>비밀번호: <code>recycle1234</code></span></aside><form id="login-form" novalidate>${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'current-password')}<button class="button primary full-width" type="submit">로그인</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '아직 계정이 없으신가요? <a href="#/signup">회원가입</a>', '테스트용 로그인이에요. 이 브라우저에 가입한 회원 정보와 비교하며, 이 탭에 로그인 상태를 유지해요. 입력한 비밀번호 원문은 저장하거나 전송하지 않아요.');
}

