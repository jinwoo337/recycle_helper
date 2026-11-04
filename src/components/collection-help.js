import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp, nearbyMapUrl } from '../domain/disposal/collection-points.js';

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result) {
  const help = collectionPointHelp(result);
  if (!help) return '';
  ensureNearbyHandler();
  const link = (url, text, extra = '') => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${extra}>${text}</a>`;
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">📍 가까운 ${escapeHtml(help.name)} 수거처 찾기</h3>
    <p class="input-hint">${escapeHtml(help.note)}</p>
    ${help.targets.map(target => `<div class="collection-target"><strong>${escapeHtml(target.label)}</strong><div class="collection-links">
      <button type="button" class="button primary" data-nearby-map="${escapeHtml(target.search)}">📍 내 주변</button>${link(target.kakaoUrl, '카카오맵 ↗')}${link(target.naverUrl, '네이버 지도 ↗')}</div></div>`).join('')}
    ${help.pickup ? `<div class="collection-links">${link(help.pickup.url, `🚚 ${escapeHtml(help.pickup.label)} ↗`)}</div>` : ''}
    <p class="input-hint collection-status" data-nearby-status role="status" aria-live="polite"></p>
    <p class="input-hint">🕘 ${escapeHtml(help.hours)}${help.place ? '' : ' 판별 지역을 고르면 우리 구 기준으로 찾아 드려요.'}</p></section>`;
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
  const row = button.closest('.collection-target');
  const status = button.closest('.collection-help')?.querySelector('[data-nearby-status]');
  const fallback = row?.querySelector('a[href*="map.kakao.com"]')?.href;
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
    () => open(fallback, '위치를 쓸 수 없어서 지역 이름으로 찾았어요. 안 열리면 위 카카오맵 버튼을 눌러 주세요.'),
    { timeout: 10000, maximumAge: 300000 },
  );
}
