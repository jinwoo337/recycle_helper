import { PROVINCES, SEOUL_DISTRICTS, DAEJEON_DISTRICTS, normalizeRegion } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function regionFields(value) {
  const region = normalizeRegion(value);
  return `<fieldset class="region-fields"><legend>분리배출 지역</legend><p class="input-hint" id="region-help">시·도와 시·군·구만 입력해 주세요. 상세 주소는 필요 없어요.</p><div class="field"><label for="province">시·도</label><select id="province" name="province" required aria-describedby="province-error region-help"><option value="">시·도 선택</option>${PROVINCES.map(name => `<option ${region?.province === name ? 'selected' : ''}>${name}</option>`).join('')}</select><span class="field-error" id="province-error"></span></div><div class="field" id="district-field"><label for="district">시·군·구</label><input id="district" name="district" value="${escapeHtml(region?.district || '')}" required maxlength="20" placeholder="예: 김포시, 수원시 영통구" aria-describedby="district-error region-help" autocomplete="address-level2" list="district-options"><datalist id="district-options">${SEOUL_DISTRICTS.map(name => `<option value="${name}"></option>`).join('')}</datalist><span class="field-error" id="district-error"></span></div><details class="region-coverage"><summary>지역별 안내 범위</summary><p class="input-hint">서울 25개 구는 서울시 공통 안내와 확인된 구별 자료를, 대전 5개 구는 주요 재활용품·음식물 안내를 제공해요. 김포 일부 품목도 지원해요. 구별 수거 여건과 미확인 품목은 추가 확인이 필요해요.</p></details></fieldset>`;
}
export function bindRegionFields(form) {
  const province = form.elements.namedItem('province');
  const sync = () => {
    let district = form.elements.namedItem('district');
    const sejong = province.value === '세종특별자치시';
    const names = province.value === '서울특별시' ? SEOUL_DISTRICTS : province.value === '대전광역시' ? DAEJEON_DISTRICTS : [];
    const value = district.value;
    const replacement = form.ownerDocument.createElement(names.length ? 'select' : 'input');
    replacement.id = 'district'; replacement.name = 'district';
    replacement.setAttribute('aria-describedby', 'district-error region-help');
    replacement.autocomplete = 'address-level2';
    if (names.length) replacement.innerHTML = '<option value="">시·군·구 선택</option>' + names.map(name => `<option>${name}</option>`).join('');
    else { replacement.type = 'text'; replacement.maxLength = 20; replacement.placeholder = '예: 김포시, 수원시 영통구'; }
    replacement.value = value;
    district.replaceWith(replacement); district = replacement;
    district.disabled = sejong; district.required = !sejong;
    form.querySelector('#district-field').hidden = sejong;
    form.querySelector('#district-error').textContent = '';
  };
  province.addEventListener('change', () => { form.elements.namedItem('district').value = ''; sync(); });
  form.addEventListener('reset', () => queueMicrotask(sync)); sync();
}
export const regionFromForm = form => normalizeRegion({ province: form.elements.namedItem('province').value, district: form.elements.namedItem('district').value });
