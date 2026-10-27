import { field } from '../../components/auth.js';
import { regionFields, bindRegionFields, regionFromForm } from '../../components/region-fields.js';
import { escapeHtml } from '../../utils/html.js';
import { updateProfile } from '../../services/auth.js';
import { bindForm } from '../../utils/validation.js';
let savedFor;
export function profilePage(member) {
  if (!member) return `<section class="container profile-page"><header class="page-heading"><h1>마이페이지</h1><p>내 정보와 분리배출 지역을 관리해요.</p></header><div class="auth-card profile-guest"><h2>내 정보를 관리하려면 로그인해 주세요</h2><p>닉네임과 지역을 저장하면 다음에도 이어서 사용할 수 있어요.</p><a class="button primary" href="#/login">로그인</a><a class="guest-start" href="#/item-input">가입 없이 분리배출 판별하기 →</a></div></section>`;
  const saved = savedFor === member.id; savedFor = null;
  return `<section class="container profile-page"><header class="page-heading"><h1>마이페이지</h1><p>닉네임과 분리배출 지역을 변경할 수 있어요.</p></header><div class="auth-card profile-settings"><div class="profile-account"><span class="profile-avatar" aria-hidden="true">${escapeHtml(Array.from(member.nickname || '나')[0])}</span><div><span>로그인 계정</span><p>${escapeHtml(member.email)}</p></div></div><form id="profile-form" novalidate>${field('nickname', '닉네임', 'text', 'nickname', `minlength="2" maxlength="20" value="${escapeHtml(member.nickname)}"`)}${regionFields(member.region)}<div class="profile-save"><p class="input-hint">변경한 지역은 다음 판별부터 적용해요.<br>이전 기록의 지역과 결과는 유지돼요.</p><button class="button primary" type="submit">변경 사항 저장</button></div><p class="form-status" role="status" aria-live="polite">${saved ? '회원 정보를 저장했어요. 다음 판별부터 변경한 지역을 적용해요.' : ''}</p></form></div><div class="profile-links"><a href="#/history">나의 기록 보기 <span aria-hidden="true">→</span></a><a href="#/item-input">분리배출 판별하기 <span aria-hidden="true">→</span></a></div></section>`;
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
