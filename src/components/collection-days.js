import { escapeHtml } from '../utils/html.js';
import { COLLECTION_KINDS, WEEKDAYS, normalizeCollectionDays, hasCollectionDays, collectionSummary, buildCollectionIcs } from '../domain/disposal/collection-days.js';
import { regionLabel, normalizeRegion } from '../domain/disposal/regions.js';

const STORAGE_KEY = 'recycle-helper.collection-days.v1';
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function readCollectionDays(storage = globalThis.localStorage) {
  try { return normalizeCollectionDays(JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')); } catch { return normalizeCollectionDays(null); }
}
function saveCollectionDays(settings, storage = globalThis.localStorage) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* 저장이 막혀도 이번 화면에서는 사용 */ }
}

export function collectionDaysMarkup(region) {
  const settings = readCollectionDays();
  const summary = collectionSummary(settings);
  const place = normalizeRegion(region) ? regionLabel(region) : '';
  const search = `https://search.naver.com/search.naver?query=${encodeURIComponent(`${place ? `${place} ` : ''}쓰레기 배출 요일`)}`;
  return `<details class="collection-days"><summary><span class="collection-days-title">🗓️ 우리 동네 수거 요일</span><span class="collection-days-summary" data-collection-summary>${escapeHtml(summary?.text || '요일을 정해 두면 버리는 날을 알려 드려요.')}</span></summary>
    <form class="collection-days-form" data-collection-form>
      <p class="input-hint">동마다 수거 요일이 달라요. <a href="${escapeHtml(search)}" target="_blank" rel="noopener noreferrer">${escapeHtml(place || '우리 동네')} 배출 요일 찾아보기 ↗</a>에서 확인하고 한 번만 골라 두세요. 이 기기에만 저장돼요.</p>
      ${COLLECTION_KINDS.map(([kind, label]) => `<fieldset><legend>${escapeHtml(label)}</legend><div class="weekday-chips">${ORDER.map(day => `<label><input type="checkbox" name="${kind}" value="${day}"${settings.days[kind].includes(day) ? ' checked' : ''}><span>${WEEKDAYS[day]}</span></label>`).join('')}</div></fieldset>`).join('')}
      <label class="collection-hour">알림 시각 <select name="hour">${Array.from({ length: 24 }, (_, hour) => `<option value="${hour}"${hour === settings.hour ? ' selected' : ''}>${hour}시</option>`).join('')}</select></label>
      <div class="collection-actions"><button type="button" class="button primary" data-collection-ics>📅 휴대폰 캘린더 알림 받기</button></div>
      <p class="input-hint" data-collection-status role="status" aria-live="polite">캘린더 파일을 열어 추가하면 매주 그 요일·시각에 휴대폰 알림이 울려요.</p>
    </form></details>`;
}

export function bindCollectionDays(root = document) {
  const form = root.querySelector('[data-collection-form]');
  if (!form) return () => {};
  const summaryText = root.querySelector('[data-collection-summary]');
  const status = form.querySelector('[data-collection-status]');
  const collect = () => normalizeCollectionDays({
    days: Object.fromEntries(COLLECTION_KINDS.map(([kind]) => [kind, [...form.querySelectorAll(`input[name="${kind}"]:checked`)].map(input => Number(input.value))])),
    hour: Number(form.elements.hour.value),
  });
  const onChange = () => {
    const settings = collect(); saveCollectionDays(settings);
    summaryText.textContent = collectionSummary(settings)?.text || '요일을 정해 두면 버리는 날을 알려 드려요.';
  };
  const onIcs = () => {
    const settings = collect();
    if (!hasCollectionDays(settings)) { status.textContent = '먼저 수거 요일을 하나 이상 골라 주세요.'; return; }
    const url = URL.createObjectURL(new Blob([buildCollectionIcs(settings)], { type: 'text/calendar;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: '분리배출-수거요일.ics' });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    status.textContent = '캘린더 파일을 받았어요. 파일을 열어 캘린더에 추가하면 매주 알림이 울려요.';
  };
  const button = form.querySelector('[data-collection-ics]');
  form.addEventListener('change', onChange); button.addEventListener('click', onIcs);
  return () => { form.removeEventListener('change', onChange); button.removeEventListener('click', onIcs); };
}
