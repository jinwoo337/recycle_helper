import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp, nearbyMapUrl } from '../domain/disposal/collection-points.js';
import { MEDICINE_SOURCES } from '../domain/disposal/medicine-guide.js';

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result) {
  const help = collectionPointHelp(result);
  if (!help) return '';
  ensureNearbyHandler();
  const link = (url, text, extra = '') => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${extra}>${text}</a>`;
  const officialMedicine = result.handling === 'medicine' && result.regional?.coverage === 'verified'
    && result.regional.sources.find(url => Object.values(MEDICINE_SOURCES).includes(url));
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">📍 가까운 ${escapeHtml(help.name)} 수거처 찾기</h3>
    <p class="input-hint">${escapeHtml(help.note)}</p>
    ${officialMedicine ? `<div class="collection-links">${link(officialMedicine, '공식 폐의약품 수거처·접수 안내 ↗')}</div>` : ''}
    <div class="collection-links">${help.targets.map(target => `<button type="button" class="button ${target === help.targets[0] ? 'primary' : 'secondary'}" data-nearby-map="${escapeHtml(target.search)}" data-fallback="${escapeHtml(target.mapUrl)}">📍 내 주변 ${escapeHtml(target.label)} 찾기</button>`).join('')}</div>
    ${help.pickup ? `<div class="collection-links">${link(help.pickup.url, `🚚 ${escapeHtml(help.pickup.label)} ↗`)}</div>` : ''}
    <p class="input-hint collection-status" data-nearby-status role="status" aria-live="polite"></p>
    <p class="input-hint">Google 지도로 열려요. 🕘 ${escapeHtml(help.hours)}${help.place ? '' : ' 위치를 허용하지 않을 때는 판별 지역 이름으로 찾아요.'}</p></section>`;
}

let installed = false;
function ensureNearbyHandler() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-nearby-map]');
    if (button) openNearbyMap(button);
  });
}

// 위치를 먼저 받은 뒤 지도를 엽니다. 브라우저가 새 탭을 막으면 누를 수 있는 링크를 대신 보여 줍니다.
// 위치는 지도 주소에만 쓰고 저장하지 않습니다.
function openNearbyMap(button) {
  const keyword = button.dataset.nearbyMap;
  const status = button.closest('.collection-help')?.querySelector('[data-nearby-status]');
  const fallback = button.dataset.fallback;
  const show = (message, url, label) => {
    if (!status) return;
    status.innerHTML = `${escapeHtml(message)}${url ? ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>` : ''}`;
  };
  const open = (url, message) => {
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    show(win ? message : '새 탭이 막혀서 열지 못했어요. 여기를 눌러 주세요:', url, '지도 열기');
  };
  if (!navigator.geolocation) { open(fallback, '이 브라우저는 위치를 지원하지 않아 지역 이름으로 찾았어요.'); return; }
  show('위치를 확인하고 있어요… 브라우저 위쪽의 위치 권한 창에서 "허용"을 눌러 주세요.');
  navigator.geolocation.getCurrentPosition(
    position => { const url = nearbyMapUrl(keyword, position.coords.latitude, position.coords.longitude); const win = window.open(url, '_blank'); if (win) win.opener = null; show(win ? '내 주변 지도를 열었어요. 안 열리면:' : '위치를 찾았어요. 여기를 눌러 지도를 열어 주세요:', url, '내 주변 지도 열기'); },
    () => open(fallback, '위치를 쓸 수 없어서 판별 지역 이름으로 찾았어요.'),
    { timeout: 10000, maximumAge: 300000 },
  );
}
