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
  const shortcut = root.querySelector('[data-photo-mode]');
  const changed = () => {
    const path = select.value;
    if (!MODES.some(([, route]) => route === path)) return;
    beforeChange(path);
    location.hash = path;
  };
  const openPhoto = event => {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) beforeChange('/photo');
  };
  select.addEventListener('change', changed);
  shortcut?.addEventListener('click', openPhoto);
  return () => { select.removeEventListener('change', changed); shortcut?.removeEventListener('click', openPhoto); };
}

// 친구들이 사진 기능을 못 찾아서, 이름 입력 바로 아래에 사진으로 찾기 버튼을 따로 보여 줍니다.
export function photoShortcutMarkup() {
  return '<a class="photo-shortcut" href="#/photo" data-photo-mode><span aria-hidden="true">📷</span> 사진으로 찾기</a>';
}
