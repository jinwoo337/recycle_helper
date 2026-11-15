import { field } from '../../components/auth.js';
import { regionFields, bindRegionFields, regionFromForm } from '../../components/region-fields.js';
import { escapeHtml } from '../../utils/html.js';
import { updateProfile } from '../../services/auth.js';
import { bindForm } from '../../utils/validation.js';
import { feedbackStatusMarkup, bindFeedbackStatus } from '../../components/feedback-status.js';
import { getCurrentMember } from '../../services/auth.js';
import { readJudgementRegion } from '../../services/judgement-region.js';
import { readYuseongNeighborhood, rememberYuseongNeighborhood } from '../../services/yuseong-neighborhood.js';
import { yuseongNeighborhoods, yuseongRecyclingDays } from '../../domain/disposal/yuseong-recycling-days.js';
import { isYuseong } from '../../domain/disposal/daejeon-guides.js';

function scheduleSettings(member) {
  if (!isYuseong(readJudgementRegion(member))) return '';
  const { neighborhood, area } = readYuseongNeighborhood(member);
  const { areas } = yuseongRecyclingDays(neighborhood, area);
  const options = (values, selected) => values.map(value => `<option${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
  return `<section class="auth-card profile-schedule" aria-labelledby="profile-schedule-title"><h2 id="profile-schedule-title">배출 요일 설정</h2><p class="input-hint">유성구 재활용품 배출 요일을 확인할 동을 선택해 주세요.</p>
    <form id="profile-schedule-form"><div class="field"><label for="profile-neighborhood">법정동</label><select id="profile-neighborhood" name="neighborhood" required><option value="">동 선택</option>${options(yuseongNeighborhoods, neighborhood)}</select></div>
    <div class="field" data-profile-area-field ${areas.length ? '' : 'hidden'}><label for="profile-area">행정동</label><select id="profile-area" name="area" ${areas.length ? 'required' : 'disabled'}><option value="">행정동 선택</option>${options(areas, area)}</select></div>
    <button class="button secondary" type="submit">배출 요일 설정 저장</button><p class="input-hint">선택한 동은 이 브라우저에 저장돼요.</p><p class="form-status" role="status"></p></form></section>`;
}
let savedFor;
export function profilePage(member) {
  if (!member) return `<section class="container profile-page"><header class="page-heading"><h1>마이페이지</h1><p>내 정보와 분리배출 지역을 관리해요.</p></header>${scheduleSettings(member)}<div class="auth-card profile-guest"><h2>내 정보를 관리하려면 로그인해 주세요</h2><p>닉네임과 지역을 저장하면 다음에도 이어서 사용할 수 있어요.</p><a class="button primary" href="#/login">로그인</a><a class="guest-start" href="#/item-input">가입 없이 분리배출 판별하기 →</a></div></section>`;
  const saved = savedFor === member.id; savedFor = null;
  return `<section class="container profile-page"><header class="page-heading"><h1>마이페이지</h1><p>닉네임과 분리배출 지역을 변경할 수 있어요.</p></header><div class="auth-card profile-settings"><div class="profile-account"><span class="profile-avatar" aria-hidden="true">${escapeHtml(Array.from(member.nickname || '나')[0])}</span><div><span>로그인 계정</span><p>${escapeHtml(member.email)}</p></div></div><form id="profile-form" novalidate>${field('nickname', '닉네임', 'text', 'nickname', `minlength="2" maxlength="20" value="${escapeHtml(member.nickname)}"`)}${regionFields(member.region)}<div class="profile-save"><p class="input-hint">변경한 지역은 다음 판별부터 적용해요.<br>이전 기록의 지역과 결과는 유지돼요.</p><button class="button primary" type="submit">변경 사항 저장</button></div><p class="form-status" role="status" aria-live="polite">${saved ? '회원 정보를 저장했어요. 다음 판별부터 변경할 지역을 적용해요.' : ''}</p></form></div>${scheduleSettings(member)}${feedbackStatusMarkup()}<div class="profile-links"><a href="#/history">나의 기록 보기 <span aria-hidden="true">→</span></a><a href="#/item-input">분리배출 판별하기 <span aria-hidden="true">→</span></a></div></section>`;
}
export function bindProfile() {
  const schedule = document.getElementById('profile-schedule-form');
  if (schedule) {
    const neighborhood = schedule.elements.namedItem('neighborhood');
    const area = schedule.elements.namedItem('area');
    const areaField = schedule.querySelector('[data-profile-area-field]');
    neighborhood.addEventListener('change', () => {
      const { areas } = yuseongRecyclingDays(neighborhood.value);
      area.innerHTML = `<option value="">행정동 선택</option>${areas.map(value => `<option>${escapeHtml(value)}</option>`).join('')}`;
      areaField.hidden = !areas.length;
      area.disabled = !areas.length;
      area.required = Boolean(areas.length);
      schedule.querySelector('[role="status"]').textContent = '';
    });
    schedule.addEventListener('submit', event => {
      event.preventDefault();
      if (!schedule.reportValidity()) return;
      const saved = rememberYuseongNeighborhood(getCurrentMember(), { neighborhood: neighborhood.value, area: area.disabled ? '' : area.value });
      schedule.querySelector('[role="status"]').textContent = saved ? '배출 요일 설정을 저장했어요.' : '저장하지 못했어요. 브라우저 저장소를 확인해 주세요.';
    });
  }
  const form = document.getElementById('profile-form'); if (!form) return;
  bindFeedbackStatus(document.getElementById('my-feedback'));
  bindRegionFields(form);
  bindForm(form, async (form, status) => {
    const member = await updateProfile(form.elements.namedItem('nickname').value, regionFromForm(form));
    savedFor = member.id;
    status.textContent = '회원 정보를 저장했어요. 다음 판별부터 변경한 지역을 적용해요.';
  });
}
