// Checklist state belongs only to the currently displayed result.
// Checking a step never changes its disposal judgement or saved record.
export function checklistMarkup({ target } = {}) {
  return `<div class="disposal-checklist"><button type="button" class="history-action" data-checklist-toggle aria-pressed="false"${target ? ` aria-controls="${target}"` : ''}>배출 순서 체크하기</button><span data-checklist-progress role="status" aria-live="polite"></span><button type="button" class="history-action" data-checklist-reset hidden>체크 지우기</button></div>`;
}

export function bindDisposalChecklist(root) {
  const toggle = root.querySelector('[data-checklist-toggle]');
  if (!toggle) return () => {};
  const reset = root.querySelector('[data-checklist-reset]');
  const progress = root.querySelector('[data-checklist-progress]');
  const boxes = [...root.querySelectorAll('[data-disposal-step]')];
  let active = false;
  function update() {
    const done = boxes.filter(box => box.checked).length;
    progress.textContent = active ? `확인한 단계 ${done} / ${boxes.length}` : '';
    reset.hidden = done === 0;
  }
  function change(event) { if (active && boxes.includes(event.target)) update(); }
  function clear() {
    boxes.forEach(box => { box.checked = false; });
    update();
    toggle.focus();
  }
  function activate() {
    active = !active;
    boxes.forEach(box => {
      box.hidden = !active;
      box.disabled = !active;
      if (!active) box.checked = false;
    });
    toggle.setAttribute('aria-pressed', String(active));
    update();
    if (active && toggle.hasAttribute?.('aria-controls')) boxes[0]?.focus();
  }
  toggle.addEventListener('click', activate);
  reset.addEventListener('click', clear);
  root.addEventListener('change', change);
  return () => {
    toggle.removeEventListener('click', activate);
    reset.removeEventListener('click', clear);
    root.removeEventListener('change', change);
  };
}
