import { PROVINCES, SEOUL_DISTRICTS, DAEJEON_DISTRICTS, normalizeRegion } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function regionFields(value) {
  const region = normalizeRegion(value);
  return `<fieldset class="region-fields"><legend>분리배출 지역</legend><p class="input-hint" id="region-help">시·도와 시·군·구만 저장해요. 상세 주소는 입력하지 마세요. 서울·대전은 목록에서 선택하고, 다른 지역은 관할 시·군·구 이름을 입력해 주세요.</p><div class="field"><label for="province">시·도</label><select id="province" name="province" required aria-describedby="province-error region-help"><option value="">시·도 선택</option>${PROVINCES.map(name => `<option ${region?.province === name ? 'selected' : ''}>${name}</option>`).join('')}</select><span class="field-error" id="province-error"></span></div><div class="field" id="district-field"><label for="district">시·군·구</label><input id="district" name="district" value="${escapeHtml(region?.district || '')}" required maxlength="20" placeholder="예: 김포시, 수원시 영통구" aria-describedby="district-error region-help" autocomplete="address-level2" list="district-options"><datalist id="district-options">${SEOUL_DISTRICTS.map(name => `<option value="${name}"></option>`).join('')}</datalist><span class="field-error" id="district-error"></span></div><p class="input-hint">대전 5개 구의 주요 재활용품·음식물 배출 방식을 우선 지원해요. 김포·금천 일부 품목도 지원하며, 다른 지역과 미확인 품목에는 기본 안내와 확인 필요 여부를 표시해요.</p></fieldset>`;
}
export function bindRegionFields(form) {
  const province = form.elements.namedItem('province'), district = form.elements.namedItem('district');
  const sync = () => {
    const sejong = province.value === '세종특별자치시';
    district.disabled = sejong; district.required = !sejong;
    form.querySelector('#district-field').hidden = sejong;
    const names = province.value === '서울특별시' ? SEOUL_DISTRICTS : province.value === '대전광역시' ? DAEJEON_DISTRICTS : [];
    form.querySelector('#district-options').innerHTML = names.map(name => `<option value="${name}"></option>`).join('');
    district.setAttribute('list', names.length ? 'district-options' : 'no-district-options');
    district.placeholder = names.length ? '추천 목록에서 관할 구를 선택해 주세요' : '예: 김포시, 수원시 영통구';
  };
  province.addEventListener('change', () => { district.value = ''; sync(); }); sync();
}
export const regionFromForm = form => normalizeRegion({ province: form.elements.namedItem('province').value, district: form.elements.namedItem('district').value });
