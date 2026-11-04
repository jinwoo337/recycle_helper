import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp, nearbyMapUrl } from '../domain/disposal/collection-points.js';

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result) {
  const help = collectionPointHelp(result);
  if (!help) return '';
  ensureNearbyHandler();
  const link = (url, text) => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">📍 가까운 ${escapeHtml(help.keyword.replace(/ 수거함$/, ''))} 수거처 찾기</h3>
    <p class="input-hint">주로 있는 곳: ${escapeHtml(help.places)}</p>
    <div class="collection-links"><button type="button" class="button primary" data-nearby-map="${escapeHtml(help.keyword)}">📍 내 위치 주변 지도</button>${link(help.kakaoUrl, `카카오맵에서 ${help.place ? escapeHtml(help.place) + ' ' : ''}찾기 ↗`)}${link(help.naverUrl, '네이버 지도 ↗')}${help.pickup ? link(help.pickup.url, `${escapeHtml(help.pickup.label)} ↗`) : ''}</div>
    <p class="input-hint" data-nearby-status role="status" aria-live="polite"></p>
    <p class="input-hint">🕘 ${escapeHtml(help.hours)}</p></section>`;
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

// 위치 권한을 허락하면 내 주변 지도를, 아니면 지역 이름으로 검색한 지도를 엽니다. 위치는 저장하지 않습니다.
function openNearbyMap(button) {
  const keyword = button.dataset.nearbyMap;
  const section = button.closest('.collection-help');
  const status = section?.querySelector('[data-nearby-status]');
  const fallback = section?.querySelector('a[href*="map.kakao.com"]')?.href;
  const win = window.open('about:blank', '_blank');
  const go = url => { if (win) { win.opener = null; win.location.href = url; } else window.location.href = url; };
  if (!navigator.geolocation) { if (status) status.textContent = '이 브라우저는 위치를 지원하지 않아 지역 이름으로 찾았어요.'; go(fallback); return; }
  if (status) status.textContent = '위치를 확인하고 있어요…';
  navigator.geolocation.getCurrentPosition(
    position => { if (status) status.textContent = ''; go(nearbyMapUrl(keyword, position.coords.latitude, position.coords.longitude)); },
    () => { if (status) status.textContent = '위치를 쓸 수 없어서 지역 이름으로 찾았어요.'; go(fallback); },
    { timeout: 8000, maximumAge: 300000 },
  );
}
