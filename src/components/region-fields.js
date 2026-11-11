import { PROVINCES, districtsFor, citySuggestionsFor, normalizeRegion } from '../domain/disposal/regions.js';
import { escapeHtml } from '../utils/html.js';

export function regionFields(value) {
  const region = normalizeRegion(value);
  return `<fieldset class="region-fields"><legend>분리배출 지역</legend><p class="input-hint" id="region-help">시·도와 시·군·구만 입력해 주세요. 상세 주소는 필요 없어요.</p><div class="field"><label for="province">시·도</label><select id="province" name="province" required aria-describedby="province-error region-help"><option value="">시·도 선택</option>${PROVINCES.map(name => `<option ${region?.province === name ? 'selected' : ''}>${name}</option>`).join('')}</select><span class="field-error" id="province-error"></span></div><div class="field" id="district-field"><label for="district">시·군·구</label><input id="district" name="district" value="${escapeHtml(region?.district || '')}" required maxlength="20" placeholder="예: 김포시, 수원시 영통구" aria-describedby="district-error region-help" autocomplete="address-level2" list="district-options"><datalist id="district-options">${citySuggestionsFor(region?.province).map(name => `<option value="${name}"></option>`).join('')}</datalist><span class="field-error" id="district-error"></span></div><details class="region-coverage"><summary>지역별 안내 범위</summary><p class="input-hint">서울 25개 구는 서울시 공통 안내와 확인된 구별 자료를, 대전 5개 구는 주요 재활용품·음식물 안내를 제공해요. 대구·광주·울산은 시 공통 안내를, 부산·인천은 구·군청 공식 안내 링크를 보여 줘요. 경기·강원·충북·충남·전북·전남·경북·경남·제주의 모든 시·군(153곳)은 시청·군청 공식 안내 링크를, 김포는 일부 품목 기준도 보여 줘요. 세종은 전국 공통 기준으로 안내해요.</p></details></fieldset>`;
}
export function bindRegionFields(form) {
  const province = form.elements.namedItem('province');
  const sync = () => {
    let district = form.elements.namedItem('district');
    const sejong = province.value === '세종특별자치시';
    const names = districtsFor(province.value);
    const value = district.value;
    const replacement = form.ownerDocument.createElement(names.length ? 'select' : 'input');
    replacement.id = 'district'; replacement.name = 'district';
    replacement.setAttribute('aria-describedby', 'district-error region-help');
    replacement.autocomplete = 'address-level2';
    if (names.length) replacement.innerHTML = '<option value="">시·군·구 선택</option>' + names.map(name => `<option>${name}</option>`).join('');
    else {
      replacement.type = 'text'; replacement.maxLength = 20; replacement.placeholder = '예: 김포시, 수원시 영통구';
      // 시청 안내가 있는 시·군은 추천 목록으로 보여 줍니다(직접 입력도 가능).
      replacement.setAttribute('list', 'district-options');
      form.querySelector('#district-options').innerHTML = citySuggestionsFor(province.value).map(name => `<option value="${name}"></option>`).join('');
    }
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
