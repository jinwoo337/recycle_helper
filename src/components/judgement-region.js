import { PROVINCES, districtsFor, citySuggestionsFor, normalizeRegion, regionLabel } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function judgementRegionMarkup(region) {
  return `<details class="judgement-region"><summary>판별 지역: <strong data-judgement-region-label>${escapeHtml(regionLabel(region))}</strong><span>지역 선택·변경</span></summary><p class="input-hint">전국 어디든 고를 수 있어요. 서울·대전·대구·광주·울산은 지역 기준을, 부산·인천과 경기도 31개 시·군·큰 도시는 시청·구청 공식 안내 링크를, 다른 지역은 전국 공통 기준과 공식 안내 찾기 링크를 보여 드려요. 로그인 없이 선택할 수 있어요. 한 번 고른 지역은 이 기기에 기억돼 다음에 와도 그대로 적용되고, 계정의 기본 지역은 바뀌지 않아요.</p><div class="judgement-region-fields"><div class="field"><label for="judgement-province">시·도</label><select id="judgement-province" name="judgementProvince"><option value="">지역 미설정 · 기본 안내</option>${PROVINCES.map(province => `<option>${province}</option>`).join('')}</select></div><div class="field" data-judgement-district-field><label for="judgement-district">시·군·구</label><span data-judgement-district></span></div></div></details>`;
}
// 직접 입력 칸: 시청 안내가 있는 시·군을 추천 목록으로 보여 주고, 구까지 적어도 됩니다(예: 수원시 영통구).
function cityInput(cities) {
  const example = cities.length ? `예: ${cities[0]}${cities[0] === '수원시' ? ' 영통구' : ''}` : '예: 김포시';
  return `<input id="judgement-district" name="judgementDistrict" maxlength="20" placeholder="${escapeHtml(example)}"${cities.length ? ' list="judgement-district-options" autocomplete="off"' : ''}>${cities.length ? `<datalist id="judgement-district-options">${cities.map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>` : ''}`;
}
export function bindJudgementRegion(form, initial, { onChange = () => {} } = {}) {
  const province = form.elements.namedItem('judgementProvince');
  const slot = form.querySelector('[data-judgement-district]');
  const field = form.querySelector('[data-judgement-district-field]');
  const label = form.querySelector('[data-judgement-region-label]');
  function get() { return normalizeRegion({ province: province.value, district: form.elements.namedItem('judgementDistrict')?.value || '' }); }
  function updateLabel() { const region = get(); label.textContent = region ? regionLabel(region) : province.value ? `${province.value} · 시·군·구 선택 필요` : '지역 미설정'; }
  function changed() { updateLabel(); const region = get(); if (region || !province.value) onChange(region); }
  function sync(district = '') {
    const names = districtsFor(province.value);
    const visible = Boolean(province.value) && province.value !== '세종특별자치시';
    field.hidden = !visible;
    slot.innerHTML = names.length ? `<select id="judgement-district" name="judgementDistrict" required><option value="">구·군 선택</option>${names.map(name => `<option>${name}</option>`).join('')}</select>` : cityInput(citySuggestionsFor(province.value));
    const control = form.elements.namedItem('judgementDistrict');
    control.disabled = !visible; control.required = visible; control.value = district;
    control.addEventListener('change', () => {
      control.setCustomValidity(get() || !visible ? '' : '올바른 시·군·구 이름을 입력해 주세요.'); changed();
    });
    control.addEventListener('input', () => { control.setCustomValidity(''); updateLabel(); });
    updateLabel();
  }
  function set(value) { const region = normalizeRegion(value); province.value = region?.province || ''; sync(region?.district || ''); }
  province.addEventListener('change', () => { sync(); changed(); });
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
