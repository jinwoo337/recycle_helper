function errorFor(input, form) {
  if (!input.value.trim()) return '이 항목을 입력해 주세요.';
  if (input.type === 'email' && input.validity.typeMismatch) return '올바른 이메일 주소를 입력해 주세요.';
  if (input.id === 'nickname' && (input.value.trim().length < 2 || input.value.trim().length > 20)) return '닉네임은 2~20자로 입력해 주세요.';
  if (input.id === 'password' && form.id === 'signup-form' && input.value.length < 8) return '비밀번호는 8자 이상으로 입력해 주세요.';
  if (input.id === 'password-confirm' && input.value !== form.elements.namedItem('password').value) return '비밀번호가 일치하지 않아요.';
  return '';
}

export function bindForm(form) {
  if (!form) return;
  const inputs = [...form.querySelectorAll('input')];
  const status = form.querySelector('.form-status');
  function validate(input) {
    const error = errorFor(input, form);
    input.setAttribute('aria-invalid', String(Boolean(error)));
    document.getElementById(`${input.id}-error`).textContent = error;
    return !error;
  }
  inputs.forEach(input => input.addEventListener('input', () => {
    status.textContent = '';
    if (input.hasAttribute('aria-invalid')) validate(input);
    const confirmation = form.elements.namedItem('password-confirm');
    if (input.id === 'password' && confirmation?.hasAttribute('aria-invalid')) validate(confirmation);
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const valid = inputs.map(validate).every(Boolean);
    if (!valid) {
      status.textContent = '입력 내용을 다시 확인해 주세요.';
      inputs.find(input => input.getAttribute('aria-invalid') === 'true').focus();
      return;
    }
    status.textContent = '입력 형식 확인이 완료됐어요. 실제 인증 기능은 준비 중이며, 입력 내용은 저장되지 않았어요.';
    inputs.filter(input => input.type === 'password').forEach(input => { input.value = ''; input.removeAttribute('aria-invalid'); });
  });
}
