export const copyResultButton = '<button type="button" class="history-action" data-copy-result>결과 복사</button>';
export const copyResultFallback = '<textarea class="copy-fallback" data-copy-fallback aria-label="복사할 판별 결과" readonly hidden></textarea>';

export function bindResultCopy(root, getText, { message = '판별 결과를 복사했어요.' } = {}) {
  const button = root.querySelector('[data-copy-result]');
  if (!button) return () => {};
  const status = root.querySelector('[data-result-tools-status]');
  const field = root.querySelector('[data-copy-fallback]');
  let active = true;
  const isCurrent = () => active && root.isConnected && root.contains(button);
  async function copy() {
    if (!isCurrent()) return;
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
      if (!isCurrent()) return;
      if (field) field.hidden = true;
      status.textContent = message;
    } catch {
      if (!isCurrent() || !field) return;
      field.hidden = false;
      field.value = text;
      field.focus();
      field.select();
      status.textContent = '자동 복사를 사용할 수 없어요. 선택된 내용을 직접 복사해 주세요.';
    }
  }
  button.addEventListener('click', copy);
  return () => { active = false; button.removeEventListener('click', copy); };
}
