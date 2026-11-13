import { escapeHtml } from '../utils/html.js';
import { itemMatchLabel, lookupItem } from '../domain/disposal/item-suggestions.js';

export function bindItemAutocomplete({ input, options, status, search, onSelect = () => {}, onCompositionEnd = () => {}, noResultsMessage = '등록되지 않은 이름도 아래에서 물건 종류를 선택해 안내받을 수 있어요.' }) {
  let candidates = [], active = -1, dismissedQuery = null, compositionCommitted = false;
  let composingSubmit = false, compositionTimer;
  let suggestionMessage = '';
  let pointerOutside = false;
  const optionPrefix = options.id ? `${options.id}-option-` : 'item-option-';
  const listeners = [];
  const listen = (node, event, handler, capture = false) => { node.addEventListener(event, handler, capture); listeners.push(() => node.removeEventListener(event, handler, capture)); };
  function close() {
    options.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
    if (status.textContent === suggestionMessage) status.textContent = '';
  }
  function show() {
    if (dismissedQuery === input.value) { close(); return; }
    candidates = search(input.value); active = -1;
    input.removeAttribute('aria-activedescendant');
    options.innerHTML = candidates.map((name, index) =>
      `<button type="button" role="option" tabindex="-1" aria-selected="false" id="${optionPrefix}${index}" data-candidate="${index}"><span>${escapeHtml(name)}</span><small class="item-match-label">${itemMatchLabel(input.value, name)}</small></button>`
    ).join('');
    options.hidden = !candidates.length; input.setAttribute('aria-expanded', String(candidates.length > 0));
    suggestionMessage = candidates.length ? (lookupItem(input.value)?.material
      ? `${candidates.length}개 추천 · 방향키와 Enter로 선택할 수 있어요.`
      : '찾으시던 물건인가요? 같은 물건을 고르거나 입력한 이름으로 계속할 수 있어요.') : '';
    status.textContent = suggestionMessage || (input.value.trim() ? noResultsMessage : '');
  }
  function select(index) {
    if (!candidates[index]) return;
    input.value = candidates[index]; dismissedQuery = input.value;
    close(); onSelect();
    status.textContent = `${input.value} 선택됨. 실제 물건과 현재 상태를 확인해 주세요.`;
    if (input.isConnected !== false && !input.form?.hidden && (!input.ownerDocument || input.ownerDocument.activeElement === input.ownerDocument.body)) input.focus();
  }
  listen(options, 'pointerdown', event => event.preventDefault());
  listen(options, 'click', event => { const option = event.target.closest('[data-candidate]'); if (option) select(Number(option.dataset.candidate)); });
  listen(input, 'focus', show);
  listen(input, 'blur', () => { if (!pointerOutside) close(); });
  listen(input, 'input', event => { if (!event.isComposing) show(); });
  listen(input, 'keydown', event => {
    if (event.key === 'Enter') {
      dismissedQuery = input.value;
      if (event.isComposing || event.keyCode === 229) {
        compositionCommitted = true;
        composingSubmit = true;
        clearTimeout(compositionTimer);
        compositionTimer = setTimeout(() => { composingSubmit = false; }, 0);
        close();
        return;
      }
      composingSubmit = false;
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
    input.setAttribute('aria-activedescendant', `${optionPrefix}${active}`);
    options.children[active].scrollIntoView({ block: 'nearest' });
  });
  listen(input, 'compositionstart', () => { compositionCommitted = false; });
  listen(input, 'compositionend', () => {
    if (compositionCommitted) { dismissedQuery = input.value; compositionCommitted = false; }
    onCompositionEnd(); show();
  });
  const control = input.closest?.('.item-name-control');
  const owner = input.ownerDocument || input.form;
  const outside = target => !(control?.contains(target) || options.contains?.(target) || target.closest?.('.item-name-control'));
  // 클릭 전에 인라인 추천을 접으면 누르려던 버튼이 위로 이동합니다.
  listen(owner, 'pointerdown', event => { pointerOutside = outside(event.target); }, true);
  listen(owner, 'pointerup', () => { pointerOutside = false; }, true);
  listen(owner, 'pointercancel', () => { if (pointerOutside) close(); pointerOutside = false; }, true);
  listen(owner, 'click', event => { pointerOutside = false; if (outside(event.target)) close(); });
  listen(input.form, 'invalid', close, true);
  listen(input.form, 'submit', event => {
    if (!composingSubmit) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  return { close, dispose() { clearTimeout(compositionTimer); listeners.forEach(remove => remove()); } };
}
