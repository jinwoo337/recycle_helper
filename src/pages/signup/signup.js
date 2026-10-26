import { field, authShell } from '../../components/auth.js';
import { signup } from '../../services/auth.js';
import { regionFields, regionFromForm } from '../../components/region-fields.js';

export async function submitSignup(form, status) {
  const region = regionFromForm(form);
  if (!region) throw new Error('시·도와 시·군·구를 확인해 주세요.');
  const result = await signup(form.elements.namedItem('nickname').value, form.elements.namedItem('email').value, form.elements.namedItem('password').value, region);
  form.reset();
  if (!result.requiresEmailConfirmation) { location.hash = '/'; return; }
  status.textContent = '가입 요청을 처리했어요. 인증 메일이 도착했다면 가입한 브라우저에서 열어 인증을 완료한 뒤 로그인해 주세요. 이미 가입한 이메일이면 로그인해 주세요.';
}

export function signupPage() {
  return authShell('작은 실천의 시작', '회원가입에 필요한 정보를 입력해 보세요.', `<form id="signup-form" novalidate>${field('nickname', '닉네임', 'text', 'nickname', 'minlength="2" maxlength="20" placeholder="2~20자"')}${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}${field('password', '비밀번호', 'password', 'new-password', 'minlength="8" placeholder="8자 이상"')}${field('password-confirm', '비밀번호 확인', 'password', 'new-password', 'placeholder="비밀번호를 한 번 더 입력해 주세요"')}${regionFields()}<button class="button primary full-width" type="submit">회원가입</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '이미 계정이 있으신가요? <a href="#/login">로그인</a>');
}

