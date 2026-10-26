import { authShell, field } from '../../components/auth.js';
import { regionFields, bindRegionFields, regionFromForm } from '../../components/region-fields.js';
import { escapeHtml } from '../../utils/html.js';
import { updateProfile } from '../../services/auth.js';
import { bindForm } from '../../utils/validation.js';
let savedFor;
export function profilePage(member) {
  if (!member) return `<section class="container auth-card"><h1>마이페이지</h1><p>회원 정보를 확인하려면 로그인해 주세요.</p><a class="button primary" href="#/login">로그인</a></section>`;
  const saved = savedFor === member.id; savedFor = null;
  return authShell('마이페이지', '닉네임과 분리배출 지역을 변경할 수 있어요.', `<p>이메일: ${escapeHtml(member.email)}</p><form id="profile-form" novalidate>${field('nickname', '닉네임', 'text', 'nickname', `minlength="2" maxlength="20" value="${escapeHtml(member.nickname)}"`)}${regionFields(member.region)}<button class="button primary full-width" type="submit">변경 사항 저장</button><p class="form-status" role="status" aria-live="polite">${saved ? '회원 정보를 저장했어요. 다음 판별부터 변경한 지역을 적용해요.' : ''}</p></form>`, '<a href="#/item-input">분리배출 판별하기</a>', '변경한 지역은 다음 판별부터 적용해요. 이전 기록에는 판별 당시의 지역과 결과가 유지돼요.');
}
export function bindProfile() {
  const form = document.getElementById('profile-form'); if (!form) return;
  bindRegionFields(form);
  bindForm(form, async (form, status) => {
    const member = await updateProfile(form.elements.namedItem('nickname').value, regionFromForm(form));
    savedFor = member.id;
    status.textContent = '회원 정보를 저장했어요. 다음 판별부터 변경한 지역을 적용해요.';
  });
}
