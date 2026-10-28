// '글자 크게' 설정. 화면 전체를 조금 키워 읽기 쉽게 하고, 이 브라우저에 기억합니다.
const KEY = 'recycle-helper.text-size';

export function readLargeText() {
  try { return localStorage.getItem(KEY) === 'large'; } catch { return false; }
}

export function applyTextSize(large = readLargeText()) {
  document.documentElement.classList.toggle('large-text', large);
  document.querySelectorAll('[data-text-size-toggle]').forEach(button => {
    button.setAttribute('aria-pressed', String(large));
    button.textContent = large ? '가 글자 보통' : '가 글자 크게';
  });
}

// 머리말의 버튼(화면을 다시 그려도 유지)을 누르면 크기를 바꿉니다.
export function initTextSize() {
  applyTextSize();
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-text-size-toggle]')) return;
    const large = !document.documentElement.classList.contains('large-text');
    try { localStorage.setItem(KEY, large ? 'large' : 'normal'); } catch { /* 저장소 차단 */ }
    applyTextSize(large);
  });
}
