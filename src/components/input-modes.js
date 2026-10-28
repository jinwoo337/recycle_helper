const MODES = [
    ['name', '/item-input', '이름으로 찾기', '이름과 상태로 기준 확인'],
    ['description', '/describe', '물건 설명하기', '줄글로 설명하고 AI에게 질문'],
    ['photo', '/photo', '사진으로 인식하기', '물건·분리배출 마크 촬영'],
];
export function inputModesMarkup(active) {
  return `<nav class="input-modes" aria-label="분리배출 찾기 방식">${MODES.map(([id, path, title, detail]) => `<a href="#${path}"${active === id ? ' aria-current="page"' : ''}><strong>${title}</strong><span>${detail}</span></a>`).join('')}</nav>`;
}

export function inputModeSelectMarkup(active) {
  return `<select class="input-mode-select" data-input-mode aria-label="분리배출 찾기 방식">${MODES.map(([id, path, title]) => `<option value="${path}"${id === active ? ' selected' : ''}>${title}</option>`).join('')}</select>`;
}

export function bindInputModeSelect(root) {
  const select = root.querySelector('[data-input-mode]');
  const changed = () => { if (MODES.some(([, path]) => path === select.value)) location.hash = select.value; };
  select.addEventListener('change', changed);
  return () => select.removeEventListener('change', changed);
}
