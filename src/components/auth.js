export function field(id, label, type, autocomplete, extra = '') {
  const input = `<input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" required ${extra} aria-describedby="${id}-error">`;
  return `<div class="field"><label for="${id}">${label}</label>${type === 'password' ? `<div class="password-control">${input}<button type="button" data-toggle-password="${id}" aria-controls="${id}" aria-pressed="false" aria-label="${label} 표시">보기</button></div>` : input}<span class="field-error" id="${id}-error"></span></div>`;
}

export function authShell(title, description, content, bottom, notice = '이메일과 비밀번호로 가입해 주세요. 가입 후 받은 인증 메일에서 이메일 인증을 완료해 주세요.') {
  return `<section class="auth-section container auth-simple"><div class="auth-card"><h1>${title}</h1><p class="auth-description">${description}</p>${content}<details class="auth-help"><summary>이용 안내</summary><p class="input-hint">${notice}</p></details><p class="auth-bottom">${bottom}</p></div></section>`;
}

