import { escapeHtml } from '../utils/html.js';
import { COLLECTION_KINDS, WEEKDAYS, normalizeCollectionDays, hasCollectionDays, collectionSummary, buildCollectionIcs } from '../domain/disposal/collection-days.js';
import { regionLabel, normalizeRegion } from '../domain/disposal/regions.js';
import { getCurrentMember } from '../services/auth.js';
import { YUSEONG_COLLECTION_GUIDE } from '../domain/disposal/collection-action.js';

const STORAGE_KEY = 'recycle-helper.collection-days.v1';
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const scheduleKey = (region, owner) => `${STORAGE_KEY}.area.${owner}.${JSON.stringify(normalizeRegion(region))}`;
function readSchedule(region, owner) {
  try { return normalizeCollectionDays(JSON.parse(localStorage.getItem(scheduleKey(region, owner)) || 'null')); }
  catch { return normalizeCollectionDays(null); }
}

export function readCollectionDays(storage = globalThis.localStorage) {
  try { return normalizeCollectionDays(JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')); } catch { return normalizeCollectionDays(null); }
}
export function collectionDaysMarkup(region) {
  const owner = getCurrentMember()?.id || 'guest';
  const settings = readSchedule(region, owner);
  const legacy = !hasCollectionDays(settings) && hasCollectionDays(readCollectionDays());
  const summary = collectionSummary(settings);
  const place = normalizeRegion(region) ? regionLabel(region) : '';
  const yuseong = region?.province === '대전광역시' && region.district === '유성구';
  const search = yuseong ? YUSEONG_COLLECTION_GUIDE : `https://search.naver.com/search.naver?query=${encodeURIComponent(`${place ? `${place} ` : ''}쓰레기 배출 요일`)}`;
  return `<details class="collection-days"><summary><span class="collection-days-title">🗓️ 우리 동네 수거 요일</span><span class="collection-days-summary" data-collection-summary>${escapeHtml(summary?.text || '요일을 정해 두면 버리는 날을 알려 드려요.')}</span></summary>
    <form class="collection-days-form" data-collection-form data-schedule-key="${escapeHtml(scheduleKey(region, owner))}">
      <p class="input-hint"><strong>${escapeHtml(place || '지역 미설정')} · 직접 입력한 일정</strong><br>동네나 건물에 따라 달라요. <a href="${escapeHtml(search)}" target="_blank" rel="noopener noreferrer">${yuseong ? '유성구 공식 배출 일정' : '배출 요일 찾아보기'} ↗</a>에서 확인하고 이 브라우저에 저장하세요.</p>
      ${legacy ? '<button type="button" class="history-action" data-import-collection>이전에 정한 요일 가져오기</button>' : ''}
      ${COLLECTION_KINDS.map(([kind, label]) => `<fieldset><legend>${escapeHtml(label)}</legend><div class="weekday-chips">${ORDER.map(day => `<label><input type="checkbox" name="${kind}" value="${day}"${settings.days[kind].includes(day) ? ' checked' : ''}><span>${WEEKDAYS[day]}</span></label>`).join('')}</div></fieldset>`).join('')}
      <label class="collection-hour">알림 시각 <select name="hour">${Array.from({ length: 24 }, (_, hour) => `<option value="${hour}"${hour === settings.hour ? ' selected' : ''}>${hour}시</option>`).join('')}</select></label>
      <div class="collection-actions"><button type="button" class="button primary" data-collection-ics>📅 휴대폰 캘린더 알림 받기</button></div>
      <p class="input-hint" data-collection-status role="status" aria-live="polite">요일이나 시각을 바꿨다면 캘린더에서 기존 반복 일정을 지운 뒤 새 파일을 추가해 주세요.</p>
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
    const settings = collect();
    try { localStorage.setItem(form.dataset.scheduleKey, JSON.stringify(settings)); } catch { /* Current form still works. */ }
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
  const importButton = form.querySelector('[data-import-collection]');
  function importSchedule() {
    const previous = readCollectionDays();
    for (const [kind] of COLLECTION_KINDS) form.querySelectorAll(`input[name="${kind}"]`).forEach(input => { input.checked = previous.days[kind].includes(Number(input.value)); });
    form.elements.hour.value = String(previous.hour);
    onChange();
    importButton.hidden = true;
    status.textContent = '이전에 정한 요일을 현재 지역 일정으로 가져왔어요.';
  }
  importButton?.addEventListener('click', importSchedule);
  form.addEventListener('change', onChange); button.addEventListener('click', onIcs);
  return () => { form.removeEventListener('change', onChange); button.removeEventListener('click', onIcs); importButton?.removeEventListener('click', importSchedule); };
}
