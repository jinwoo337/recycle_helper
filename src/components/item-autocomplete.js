import { escapeHtml } from '../utils/html.js';

export function bindItemAutocomplete({ input, options, status, search, onSelect, onCompositionEnd }) {
  let candidates = [], active = -1, dismissedQuery = null, compositionCommitted = false;
  const listeners = [];
  const listen = (node, event, handler, capture = false) => { node.addEventListener(event, handler, capture); listeners.push(() => node.removeEventListener(event, handler, capture)); };
  function close() {
    options.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function show() {
    if (dismissedQuery === input.value) { close(); return; }
    candidates = search(input.value); active = -1;
    input.removeAttribute('aria-activedescendant');
    options.innerHTML = candidates.map((name, index) => `<button type="button" role="option" tabindex="-1" aria-selected="false" id="item-option-${index}" data-candidate="${index}">${escapeHtml(name)}</button>`).join('');
    options.hidden = !candidates.length; input.setAttribute('aria-expanded', String(candidates.length > 0));
    status.textContent = candidates.length ? `${candidates.length}개 추천 · 방향키와 Enter로 선택할 수 있어요.` : input.value.trim() ? '등록되지 않은 이름도 아래에서 물건 종류를 선택해 안내받을 수 있어요.' : '';
  }
  function select(index) {
    if (!candidates[index]) return;
    input.value = candidates[index]; dismissedQuery = input.value;
    onSelect(); close();
    status.textContent = `${input.value} 선택됨. 실제 물건과 현재 상태를 확인해 주세요.`;
    input.focus(); close();
  }
  listen(options, 'pointerdown', event => event.preventDefault());
  listen(options, 'click', event => { const option = event.target.closest('[data-candidate]'); if (option) select(Number(option.dataset.candidate)); });
  listen(input, 'focus', show);
  listen(input, 'blur', close);
  listen(input, 'input', event => { if (!event.isComposing) show(); });
  listen(input, 'keydown', event => {
    if (event.key === 'Enter') {
      dismissedQuery = input.value;
      if (event.isComposing || event.keyCode === 229) { compositionCommitted = true; close(); return; }
      if (active >= 0 && !options.hidden) { event.preventDefault(); select(active); return; }
      close(); return;
    }
    if (event.isComposing) return;
    if (event.key === 'Escape') { dismissedQuery = input.value; close(); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    if (options.hidden) { dismissedQuery = null; show(); }
    if (!candidates.length) return;
    event.preventDefault();
    active = (active + (event.key === 'ArrowDown' ? 1 : active < 0 ? 0 : -1) + candidates.length) % candidates.length;
    [...options.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
    input.setAttribute('aria-activedescendant', `item-option-${active}`);
    options.children[active].scrollIntoView({ block: 'nearest' });
  });
  listen(input, 'compositionend', () => {
    if (compositionCommitted) { dismissedQuery = input.value; compositionCommitted = false; }
    onCompositionEnd(); show();
  });
  listen(input.form, 'pointerdown', event => { if (!event.target.closest('.item-name-control')) close(); });
  listen(input.form, 'invalid', close, true);
  return { close, dispose() { listeners.forEach(remove => remove()); } };
}
