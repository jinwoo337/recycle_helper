import { PROVINCES, districtsFor, citySuggestionsFor, normalizeRegion, regionLabel } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function judgementRegionMarkup(region) {
  return `<details class="judgement-region"><summary>판별 지역 <strong data-judgement-region-label>${escapeHtml(regionLabel(region))}</strong></summary>
    <div class="judgement-region-fields"><div class="field"><label for="judgement-province">시·도</label><select id="judgement-province" name="judgementProvince"><option value="">지역 없이 기본 안내</option>${PROVINCES.map(province => `<option>${province}</option>`).join('')}</select></div>
    <div class="field" data-judgement-district-field><label for="judgement-district">시·군·구</label><div data-judgement-district></div><p class="field-error" id="judgement-region-error" role="alert" hidden></p></div></div>
    <p class="input-hint">선택한 지역은 이 브라우저에 저장돼요. 확인된 품목별 기준이나 시·군·구 공식 안내를 보여 드려요.</p></details>`;
}
function cityInput(cities) {
  const example = cities[0] || '김포시';
  return `<input id="judgement-district" name="judgementDistrict" maxlength="20" placeholder="예: ${escapeHtml(example)}"${cities.length ? ' list="judgement-district-options" autocomplete="off"' : ''}>${cities.length ? `<datalist id="judgement-district-options">${cities.map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>` : ''}`;
}
export function bindJudgementRegion(form, initial, { onChange = () => {} } = {}) {
  const regionEditor = form.querySelector('.judgement-region');
  const province = form.elements.namedItem('judgementProvince');
  const slot = form.querySelector('[data-judgement-district]');
  const field = form.querySelector('[data-judgement-district-field]');
  const label = form.querySelector('[data-judgement-region-label]');
  const error = form.querySelector('#judgement-region-error');
  function get() { return normalizeRegion({ province: province.value, district: form.elements.namedItem('judgementDistrict')?.value || '' }); }
  function updateLabel() { const region = get(); label.textContent = region ? regionLabel(region) : province.value ? `${province.value} · 시·군·구 확인 필요` : '기본 안내'; }
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
    slot.innerHTML = names.length ? `<select id="judgement-district" name="judgementDistrict"><option value="">구·군 선택</option>${names.map(name => `<option>${escapeHtml(name)}</option>`).join('')}</select>` : cityInput(citySuggestionsFor(province.value));
    const control = form.elements.namedItem('judgementDistrict');
    control.disabled = !visible; control.value = district;
    showError(control);
    control.addEventListener('change', changed);
    control.addEventListener('input', () => { showError(control); updateLabel(); });
    updateLabel();
  }
  function set(value) {
    const region = normalizeRegion(value);
    regionEditor.open = false;
    province.value = region?.province || '';
    sync(region?.district || '');
  }
  province.addEventListener('change', () => { sync(); changed(); });
  set(initial);
  return { get, set, focus() {
    regionEditor.open = true;
    province.focus();
  }, validate() {
    if (!province.value || get()) return true;
    regionEditor.open = true;
    const control = form.elements.namedItem('judgementDistrict');
    showError(control, control.tagName === 'SELECT' ? '구·군을 선택해 주세요.' : '시·군·구 이름을 입력해 주세요.');
    control.focus();
    return false;
  } };
}
