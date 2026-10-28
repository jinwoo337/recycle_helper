export function inputModesMarkup(active) {
  return `<nav class="input-modes" aria-label="분리배출 찾기 방식">${[
    ['name', '/item-input', '이름으로 찾기', '이름과 상태로 기준 확인'],
    ['description', '/describe', '물건 설명하기', '줄글로 설명하고 AI에게 질문'],
    ['photo', '/photo', '사진으로 인식하기', '물건·분리배출 마크 촬영'],
  ].map(([id, path, title, detail]) => `<a href="#${path}"${active === id ? ' aria-current="page"' : ''}><strong>${title}</strong><span>${detail}</span></a>`).join('')}</nav>`;
}
