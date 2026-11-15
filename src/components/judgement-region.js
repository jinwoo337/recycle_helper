import { PROVINCES, districtsFor, citySuggestionsFor, normalizeRegion, regionLabel } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function judgementRegionMarkup(region, { onResult = false, batch = false } = {}) {
  const id = onResult ? 'result-judgement' : 'judgement';
  const fields = `<div class="judgement-region-fields"><div class="field"><label for="${id}-province">시·도</label><select id="${id}-province" name="judgementProvince"><option value="">지역 없이 기본 안내</option>${PROVINCES.map(province => `<option>${province}</option>`).join('')}</select></div>
    <div class="field" data-judgement-district-field><label for="${id}-district">시·군·구</label><div data-judgement-district></div><p class="field-error" id="${id}-region-error" data-judgement-error role="alert" hidden></p></div></div>`;
  if (onResult) return `<div class="judgement-region">${fields}</div>`;
  return `<details class="judgement-region"><summary>${batch ? '목록 배출 지역' : '판별 지역'} <strong data-judgement-region-label>${escapeHtml(regionLabel(region))}</strong></summary>${fields}
    <p class="input-hint">${batch ? '목록 전체에 적용하면 입력한 조건으로 다시 판별해요.' : '선택한 지역은 이 브라우저에 저장돼요. 확인된 품목별 기준이나 시·군·구 공식 안내를 보여 드려요.'}</p></details>`;
}
function cityInput(cities, id) {
  const example = cities[0] || '김포시';
  return `<input id="${id}" name="judgementDistrict" maxlength="20" placeholder="예: ${escapeHtml(example)}"${cities.length ? ` list="${id}-options" autocomplete="off"` : ''}>${cities.length ? `<datalist id="${id}-options">${cities.map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>` : ''}`;
}
export function bindJudgementRegion(form, initial, { onChange = () => {} } = {}) {
  const regionEditor = form.querySelector('.judgement-region');
  const province = form.elements.namedItem('judgementProvince');
  const slot = form.querySelector('[data-judgement-district]');
  const field = form.querySelector('[data-judgement-district-field]');
  const label = form.querySelector('[data-judgement-region-label]');
  const error = form.querySelector('[data-judgement-error]');
  const districtId = field.querySelector('label').htmlFor;
  function get() { return normalizeRegion({ province: province.value, district: form.elements.namedItem('judgementDistrict')?.value || '' }); }
  function updateLabel() { if (!label) return; const region = get(); label.textContent = region ? regionLabel(region) : province.value ? `${province.value} · 시·군·구 확인 필요` : '기본 안내'; }
  function changed() { updateLabel(); const region = get(); if (region || !province.value) onChange(region); }
  function showError(control, message = '') {
    error.textContent = message;
    error.hidden = !message;
    if (message) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', error.id);
    } else {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  }
  function sync(district = '') {
    const names = districtsFor(province.value);
    const visible = Boolean(province.value) && province.value !== '세종특별자치시';
    field.hidden = !visible;
    slot.innerHTML = names.length ? `<select id="${districtId}" name="judgementDistrict"><option value="">구·군 선택</option>${names.map(name => `<option>${escapeHtml(name)}</option>`).join('')}</select>` : cityInput(citySuggestionsFor(province.value), districtId);
    const control = form.elements.namedItem('judgementDistrict');
    control.disabled = !visible; control.value = district;
    showError(control);
    control.addEventListener('change', changed);
    control.addEventListener('input', () => { showError(control); updateLabel(); });
    updateLabel();
  }
  function set(value) {
    const region = normalizeRegion(value);
    if (label) regionEditor.open = false;
    province.value = region?.province || '';
    sync(region?.district || '');
  }
  province.addEventListener('change', () => { sync(); changed(); });
  set(initial);
  return { get, set, focus() {
    if (label) regionEditor.open = true;
    province.focus();
  }, validate() {
    if (!province.value || get()) return true;
    if (label) regionEditor.open = true;
    const control = form.elements.namedItem('judgementDistrict');
    showError(control, control.tagName === 'SELECT' ? '구·군을 선택해 주세요.' : '시·군·구 이름을 입력해 주세요.');
    control.focus();
    return false;
  } };
}
