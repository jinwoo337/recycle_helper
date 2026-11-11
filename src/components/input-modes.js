const MODES = [
  ['name', '/item-input', '이름으로 찾기'],
  ['description', '/describe', '물건 설명하기'],
  ['photo', '/photo', '사진으로 인식하기'],
];
export function inputModesMarkup(active) {
  return `<nav class="input-modes" aria-label="분리배출 찾기 방식">${MODES.map(([id, path, title]) => `<a href="#${path}"${active === id ? ' aria-current="page"' : ''}>${title}</a>`).join('')}</nav>`;
}

export function inputModeSelectMarkup(active) {
  return `<select class="input-mode-select" data-input-mode aria-label="분리배출 찾기 방식">${MODES.map(([id, path, title]) => `<option value="${path}"${id === active ? ' selected' : ''}>${title}</option>`).join('')}</select>`;
}

export function bindInputModeSelect(root, beforeChange = () => {}) {
  const select = root.querySelector('[data-input-mode]');
  const changed = () => {
    const path = select.value;
    if (!MODES.some(([, route]) => route === path)) return;
    beforeChange(path);
    location.hash = path;
  };
  select.addEventListener('change', changed);
  return () => select.removeEventListener('change', changed);
}
