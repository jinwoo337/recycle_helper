const MODES = [
  ['name', '/item-input', '이름으로 찾기'],
  ['description', '/describe', '설명으로 찾기'],
  ['photo', '/photo', '사진으로 찾기'],
];
export function inputModesMarkup(active) {
  return `<nav class="input-modes" aria-label="분리배출 찾기 방식">${MODES.map(([id, path, title]) => active === id
    ? `<span aria-current="page">${title}</span>`
    : `<a href="#${path}" data-input-mode="${path}">${title}</a>`).join('')}</nav>`;
}

export function bindInputModes(root, beforeChange) {
  const nav = root.querySelector('.input-modes');
  if (!nav) return () => {};
  const click = event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const path = event.target.closest('[data-input-mode]')?.dataset.inputMode;
    if (path) beforeChange(path);
  };
  nav.addEventListener('click', click);
  return () => nav.removeEventListener('click', click);
}
