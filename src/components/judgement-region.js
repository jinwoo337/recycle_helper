import { PROVINCES, SEOUL_DISTRICTS, DAEJEON_DISTRICTS, normalizeRegion, regionLabel } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function judgementRegionMarkup(region) {
  return `<details class="judgement-region"><summary>판별 지역: <strong data-judgement-region-label>${escapeHtml(regionLabel(region))}</strong><span>지역 선택·변경</span></summary><p class="input-hint">서울 25개 구 · 대전 5개 구 안내를 제공해요. 로그인 없이 선택할 수 있고 계정의 기본 지역은 바뀌지 않아요.</p><div class="judgement-region-fields"><div class="field"><label for="judgement-province">시·도</label><select id="judgement-province" name="judgementProvince"><option value="">지역 미설정 · 기본 안내</option>${PROVINCES.map(province => `<option>${province}</option>`).join('')}</select></div><div class="field" data-judgement-district-field><label for="judgement-district">시·군·구</label><span data-judgement-district></span></div></div></details>`;
}
export function bindJudgementRegion(form, initial) {
  const province = form.elements.namedItem('judgementProvince');
  const slot = form.querySelector('[data-judgement-district]');
  const field = form.querySelector('[data-judgement-district-field]');
  const label = form.querySelector('[data-judgement-region-label]');
  function get() { return normalizeRegion({ province: province.value, district: form.elements.namedItem('judgementDistrict')?.value || '' }); }
  function updateLabel() { label.textContent = regionLabel(get()); }
  function sync(district = '') {
    const names = province.value === '서울특별시' ? SEOUL_DISTRICTS : province.value === '대전광역시' ? DAEJEON_DISTRICTS : [];
    const visible = Boolean(province.value) && province.value !== '세종특별자치시';
    field.hidden = !visible;
    slot.innerHTML = names.length ? `<select id="judgement-district" name="judgementDistrict" required><option value="">구 선택</option>${names.map(name => `<option>${name}</option>`).join('')}</select>` : '<input id="judgement-district" name="judgementDistrict" maxlength="20" placeholder="예: 김포시">';
    const control = form.elements.namedItem('judgementDistrict');
    control.disabled = !visible; control.required = visible; control.value = district;
    control.addEventListener('change', () => {
      control.setCustomValidity(get() || !visible ? '' : '올바른 시·군·구 이름을 입력해 주세요.'); updateLabel();
    });
    control.addEventListener('input', () => control.setCustomValidity(''));
    updateLabel();
  }
  function set(value) { const region = normalizeRegion(value); province.value = region?.province || ''; sync(region?.district || ''); }
  province.addEventListener('change', () => sync());
  form.addEventListener('invalid', event => {
    if (event.target.name?.startsWith('judgement')) form.querySelector('.judgement-region').open = true;
  }, true);
  set(initial);
  return { get, set, validate() {
    if (!province.value || get()) return true;
    form.querySelector('.judgement-region').open = true;
    const control = form.elements.namedItem('judgementDistrict');
    control.setCustomValidity('시·군·구를 확인해 주세요.'); control.reportValidity(); return false;
  } };
}
