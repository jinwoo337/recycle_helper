import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp, nearbyMapUrl } from '../domain/disposal/collection-points.js';
import { MEDICINE_SOURCES } from '../domain/disposal/medicine-guide.js';

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result, { official = true } = {}) {
  const help = collectionPointHelp(result);
  if (!help) return '';
  ensureNearbyHandler();
  const link = (url, text, extra = '') => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${extra}>${text}</a>`;
  const officialMedicine = result.handling === 'medicine' && result.regional?.coverage === 'verified'
    && result.regional.sources.find(url => Object.values(MEDICINE_SOURCES).includes(url));
  const heading = help.inquiryOnly ? '배출 방법 문의할 곳' : `${escapeHtml(help.name)} 수거처 확인`;
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">${heading}</h3>
    <p class="input-hint">${escapeHtml(help.note)}</p>
    ${official && officialMedicine ? `<div class="collection-links">${link(officialMedicine, '공식 폐의약품 수거처·접수 안내 ↗')}</div>` : ''}
    ${help.pickup ? `<div class="collection-links">${link(help.pickup.url, `${escapeHtml(help.pickup.label)} ↗`)}</div>` : ''}
    <div class="collection-links">${help.targets.map(target => link(target.mapUrl, `${escapeHtml(target.label)} 지도 검색 ↗`, ` data-collection-target="${escapeHtml(target.search)}"`)).join('')}</div>
    <p class="input-hint"><span data-collection-scope>${help.place ? `판별 지역 ‘${escapeHtml(help.place)}’의 시설을 Google 지도로 검색해요.` : 'Google 지도로 시설을 검색해요.'}</span> ${escapeHtml(help.hours)}</p>
    ${typeof navigator !== 'undefined' && navigator.geolocation ? '<button type="button" class="history-action" data-nearby-map>지도 검색에 내 위치 사용</button>' : ''}
    <p class="input-hint collection-status" data-nearby-status role="status" aria-live="polite"></p>
    </section>`;
}

let installed = false;
function ensureNearbyHandler() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-nearby-map]');
    if (button) useNearbyLocation(button);
  });
}

// 위치는 사용자가 직접 여는 지도 검색 링크에만 반영합니다.
function useNearbyLocation(button) {
  const section = button.closest('.collection-help');
  const status = section.querySelector('[data-nearby-status]');
  if (button.disabled || !navigator.geolocation) return;
  button.disabled = true;
  status.textContent = '현재 위치를 확인하고 있어요…';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!section.isConnected) return;
      section.querySelectorAll('[data-collection-target]').forEach(link => {
        link.href = nearbyMapUrl(link.dataset.collectionTarget, coords.latitude, coords.longitude);
      });
      section.querySelector('[data-collection-scope]').textContent = '내 위치 주변의 시설을 Google 지도로 검색해요.';
      status.textContent = '내 위치 주변으로 검색 범위를 바꿨어요.';
      button.disabled = false;
    },
    () => {
      if (!section.isConnected) return;
      status.textContent = '위치를 확인하지 못했어요. 위의 지도 검색을 사용할 수 있어요.';
      button.disabled = false;
    },
    { timeout: 10000, maximumAge: 300000 },
  );
}
