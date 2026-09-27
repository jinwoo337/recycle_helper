export function field(id, label, type, autocomplete, extra = '') {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" required ${extra} aria-describedby="${id}-error"><span class="field-error" id="${id}-error"></span></div>`;
}

export function authShell(title, description, content, bottom) {
  return `<section class="auth-section container"><div class="auth-intro"><p class="eyebrow">더 나은 일상을 위한 작은 시작</p><h1>잘 나누는 습관,<br>함께 만들어가요.</h1><p>헷갈렸던 분리배출을 더 쉽게.<br>나에게 맞는 안내를 한곳에서 만나보세요.</p><div class="auth-decoration" aria-hidden="true">↻</div></div><div class="auth-card"><h2>${title}</h2><p class="auth-description">${description}</p><p class="demo-notice">현재는 화면 체험 단계예요. 실제 계정 생성 및 로그인은 지원하지 않으며, 입력 내용은 저장하거나 전송하지 않아요.</p>${content}<p class="auth-bottom">${bottom}</p></div></section>`;
}
