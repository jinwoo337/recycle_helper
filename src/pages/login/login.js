import { field, authShell } from '../../components/auth.js';

export function loginPage() {
  return authShell('다시 만나 반가워요', '로그인 화면을 미리 확인해 보세요.', `<form id="login-form" novalidate>${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'current-password')}<button class="button primary full-width" type="submit">로그인 입력 확인</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '아직 계정이 없으신가요? <a href="#/signup">회원가입</a>');
}
