import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp } from '../domain/disposal/collection-points.js';
import { MEDICINE_SOURCES } from '../domain/disposal/medicine-guide.js';
import { rankCollectionPoints, verifiedCollectionPoints } from '../domain/disposal/verified-collection-points.js';

function collectionMapUrl({ latitude, longitude }) {
  const bbox = [longitude - 0.005, latitude - 0.003, longitude + 0.005, latitude + 0.003].map(value => value.toFixed(6));
  const query = new URLSearchParams({ bbox: bbox.join(','), layer: 'mapnik', marker: `${latitude},${longitude}` });
  return `https://www.openstreetmap.org/export/embed.html?${query}`;
}

function pointList(points) {
  return points.map(point => `<li><strong>${escapeHtml(point.name)}</strong>
    <p>${escapeHtml(point.address)}${Number.isFinite(point.distanceKm) ? ` · 직선거리 ${point.distanceKm.toFixed(1)} km` : ''}</p>
    ${point.phone ? `<p><a href="tel:${escapeHtml(point.phone)}">운영시간·접수 문의 ${escapeHtml(point.phone)}</a></p>` : ''}
    <button type="button" class="history-action" data-collection-map-url="${escapeHtml(collectionMapUrl(point))}" data-collection-map-name="${escapeHtml(point.name)}">지도에서 보기</button></li>`).join('');
}

function verifiedCollectionMarkup(dataset) {
  return `<section class="collection-help verified-collection" data-verified-collection aria-labelledby="verified-collection-title">
    <h3 id="verified-collection-title">${escapeHtml(dataset.title)}</h3>
    <p class="input-hint">접수 품목 · ${escapeHtml(dataset.accepts)}. ${escapeHtml(dataset.hours)}</p>
    <details><summary>확인된 수거함 ${dataset.points.length}곳 보기</summary>
      <button type="button" class="button secondary" data-collection-nearby>내 위치에서 가까운 순으로 보기</button>
      <p class="input-hint" data-collection-status role="status">판별 지역의 수거함 목록이에요.</p>
      <iframe class="collection-map" data-collection-map title="수거함이 있는 시설 지도" loading="lazy" hidden></iframe>
      <ul class="verified-collection-list" data-collection-list>${pointList(dataset.points)}</ul>
    </details>
    <p class="input-hint">시설 위치 확인 ${dataset.checkedAt}${dataset.dataDate ? ` · 자료 기준일 ${dataset.dataDate}` : ''} · <a href="${escapeHtml(dataset.source)}" target="_blank" rel="noopener noreferrer">지자체 수거함·접수 안내 ↗</a> · <a href="${escapeHtml(dataset.directory)}" target="_blank" rel="noopener noreferrer">${escapeHtml(dataset.directoryLabel)} ↗</a></p>
    </section>`;
}

export function bindVerifiedCollection(root, result) {
  const dataset = verifiedCollectionPoints(result);
  const section = root.querySelector('[data-verified-collection]');
  if (!dataset || !section) return;
  const status = section.querySelector('[data-collection-status]');
  const map = section.querySelector('[data-collection-map]');
  section.addEventListener('click', event => {
    const point = event.target.closest('[data-collection-map-url]');
    if (!point) return;
    map.title = `${point.dataset.collectionMapName} 지도`;
    map.src = point.dataset.collectionMapUrl;
    map.hidden = false;
    status.textContent = `${point.dataset.collectionMapName} 위치를 지도에 표시했어요.`;
    map.scrollIntoView({ block: 'nearest' });
  });
  section.querySelector('[data-collection-nearby]').addEventListener('click', event => {
    const button = event.currentTarget;
    const unavailable = () => {
      if (!section.isConnected) return;
      button.disabled = false;
      status.textContent = '현재 위치를 사용할 수 없어요. 판별 지역의 목록에서 찾아 주세요.';
    };
    if (!navigator.geolocation) { unavailable(); return; }
    button.disabled = true;
    status.textContent = '현재 위치를 확인하고 있어요.';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!section.isConnected) return;
      section.querySelector('[data-collection-list]').innerHTML = pointList(rankCollectionPoints(dataset.points, coords));
      button.disabled = false;
      status.textContent = '현재 위치에서 직선거리가 가까운 순서예요.';
    }, unavailable, { timeout: 8000, maximumAge: 60000 });
  });
}

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result, { official = true } = {}) {
  const verified = verifiedCollectionPoints(result);
  if (verified) return verifiedCollectionMarkup(verified);
  const help = collectionPointHelp(result);
  if (!help) return '';
  const link = (url, text, extra = '') => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${extra}>${text}</a>`;
  const officialMedicine = result.handling === 'medicine' && result.regional?.coverage === 'verified'
    && result.regional.sources.find(url => Object.values(MEDICINE_SOURCES).includes(url));
  const heading = help.inquiryOnly ? '배출 방법 문의할 곳' : `${escapeHtml(help.name)} 수거처 확인`;
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">${heading}</h3>
    <p class="input-hint">${escapeHtml(help.note)}</p>
    ${!help.inquiryOnly ? '<p><a class="history-action" href="https://www.wasteguide.or.kr/front/region/location.do" target="_blank" rel="noopener noreferrer">공식 분리배출 장소 지도 ↗</a></p>' : ''}
    ${official && officialMedicine ? `<div class="collection-links">${link(officialMedicine, '공식 폐의약품 수거처·접수 안내 ↗')}</div>` : ''}
    ${help.pickup ? `<div class="collection-links">${link(help.pickup.url, `${escapeHtml(help.pickup.label)} ↗`)}</div>` : ''}
    <h4>${help.inquiryOnly ? '문의할 시설' : '수거 여부를 문의할 후보 시설'}</h4>
    <div class="collection-links" role="group" aria-label="내 위치 주변 검색">${help.targets.map(target => link(target.mapUrl, `내 주변 ${escapeHtml(target.label)} ↗`, ` data-collection-target="${escapeHtml(target.search)}"`)).join('')}</div>
    <p class="input-hint">Google 지도에 위치 사용을 허용하면 현재 위치 주변을 찾아요. ${help.place ? '위치를 사용할 수 없으면 아래에서 판별 지역으로 찾을 수 있어요.' : '위치를 사용할 수 없으면 지도 검색에 동네 이름을 함께 입력해 주세요.'} ${escapeHtml(help.hours)}</p>
    ${help.place ? `<details class="collection-region-search"><summary>판별 지역(${escapeHtml(help.place)})에서 찾기</summary><div class="collection-links">${help.targets.map(target => link(target.regionMapUrl, `${escapeHtml(target.label)} ↗`)).join('')}</div></details>` : ''}
    </section>`;
}
