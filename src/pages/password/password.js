import { authShell, field } from '../../components/auth.js';
import { getCurrentMember, isPasswordRecovery, requestPasswordReset, resetPassword } from '../../services/auth.js';

export function forgotPasswordPage() {
  return authShell('비밀번호를 잊으셨나요?', '가입할 때 사용한 이메일로 재설정 링크를 요청해 주세요.', `<form id="forgot-password-form" novalidate>${field('email', '이메일', 'email', 'email', 'placeholder="name@example.com" maxlength="254"')}<button class="button primary full-width" type="submit">재설정 링크 요청</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '<a href="#/login">로그인으로 돌아가기</a><br><a class="guest-start" href="#/item-input">가입 없이 분리배출 확인하기 →</a>', '메일을 요청한 브라우저에서 링크를 열어 주세요. 메일이 보이지 않으면 스팸함을 확인해 주세요. Google로만 이용한 계정은 Google 로그인을 이용할 수 있어요.');
}

export async function submitForgotPassword(form, status) {
  const email = form.elements.namedItem('email').value;
  await requestPasswordReset(email);
  if (!form.isConnected) return;
  status.textContent = '등록된 이메일이라면 재설정 메일을 확인해 주세요. 요청한 브라우저에서 링크를 열어 새 비밀번호를 설정할 수 있어요.';
}

export function resetPasswordPage() {
  if (!getCurrentMember() || !isPasswordRecovery()) {
    return authShell('새 비밀번호 설정', '재설정 링크의 인증을 먼저 완료해 주세요.', '<p class="demo-notice">링크가 만료되었거나 이 브라우저에서 인증을 확인하지 못했어요. 새 링크를 요청한 뒤 같은 브라우저에서 열어 주세요.</p><a class="button primary full-width" href="#/forgot-password">새 재설정 링크 요청</a>', '<a href="#/login">로그인으로 돌아가기</a>', '메일을 요청한 브라우저에서 유효한 재설정 링크를 열어 주세요. 인증 링크를 다른 사람에게 공유하지 마세요.');
  }
  return authShell('새 비밀번호 설정', '다른 서비스에서 사용하지 않는 새 비밀번호를 입력해 주세요.', `<form id="reset-password-form" novalidate>${field('password', '새 비밀번호', 'password', 'new-password', 'minlength="8" placeholder="8자 이상"')}${field('password-confirm', '새 비밀번호 확인', 'password', 'new-password', 'placeholder="새 비밀번호 다시 입력"')}<button class="button primary full-width" type="submit">비밀번호 변경</button><p class="form-status" role="status" aria-live="polite"></p></form>`, '<a href="#/">홈으로 돌아가기</a>', '인증된 현재 계정의 비밀번호를 변경해요. 인증 후 15분이 지나면 새 링크를 요청해 주세요.');
}

export async function submitResetPassword(form, status) {
  const password = form.elements.namedItem('password'), confirmation = form.elements.namedItem('password-confirm');
  if (password.value !== confirmation.value) throw new Error('비밀번호가 일치하지 않아요.');
  try { await resetPassword(password.value); }
  finally { password.value = ''; confirmation.value = ''; }
  if (!form.isConnected) return;
  form.innerHTML = '<div tabindex="-1" class="password-reset-complete"><p role="status">비밀번호를 변경했어요. 다음 로그인부터 새 비밀번호를 사용해 주세요.</p><a class="button primary full-width" href="#/">홈으로 돌아가기</a></div>';
  form.querySelector('.password-reset-complete').focus();
}
