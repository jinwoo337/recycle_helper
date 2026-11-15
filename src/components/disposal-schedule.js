import { escapeHtml } from '../utils/html.js';
import { disposalScheduleRows, nextRegularDisposal, yuseongNeighborhoods, yuseongRecyclingDays } from '../domain/disposal/yuseong-recycling-days.js';
import { getCurrentMember } from '../services/auth.js';
import { readYuseongNeighborhood, rememberYuseongNeighborhood } from '../services/yuseong-neighborhood.js';

const options = (values, selected) => values.map(value => `<option${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');

export function disposalScheduleMarkup(result) {
  const schedule = result?.disposalSchedule;
  if (!schedule) return '';
  const choice = readYuseongNeighborhood(getCurrentMember());
  const { areas, days } = yuseongRecyclingDays(choice.neighborhood, choice.area);
  const rows = disposalScheduleRows(schedule, choice);
  return `<section class="disposal-schedule" aria-label="${escapeHtml(schedule.district)} 배출 시간과 장소">
    <h3>${escapeHtml(schedule.district)} 배출 시간과 장소</h3>
    ${rows.map(row => {
      const { label, appliesTo, recycling, when, where } = row;
      const next = nextRegularDisposal(row);
      return `<div class="disposal-schedule-route">
      <h4>${escapeHtml(label)}${appliesTo ? ` <small>· ${escapeHtml(appliesTo)}</small>` : ''}</h4>
      <p${recycling ? ' data-recycling-time role="status"' : ''}>${escapeHtml(when)}</p>
      <p class="schedule-next"${recycling ? ' data-recycling-next' : ''}${next ? '' : ' hidden'}>${escapeHtml(next)}</p>
      ${recycling ? `<div class="disposal-schedule-selects">
        <label>법정동 <select data-yuseong-neighborhood><option value="">동 선택</option>${options(yuseongNeighborhoods, choice.neighborhood)}</select></label>
        <label${areas.length ? '' : ' hidden'}>행정동 <select data-yuseong-area><option value="">행정동 선택</option>${options(areas, choice.area)}</select></label>
      </div><p class="input-hint" data-yuseong-days-help${areas.length && !days ? '' : ' hidden'}>같은 법정동 안에서도 요일이 달라요. 관할 행정동을 골라 주세요.</p>` : ''}
      <dl>${where.map(([housing, site]) => `<div><dt>${escapeHtml(housing)}</dt><dd>${escapeHtml(site)}</dd></div>`).join('')}</dl>
    </div>`;
    }).join('')}
    <p class="input-hint schedule-exceptions">공휴일은 구청 공지를, 자체 수거 공동주택은 단지 일정을 따라 주세요.</p>
    <a href="${escapeHtml(schedule.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(schedule.district)}청 배출 일정표</a>
  </section>`;
}

export function bindDisposalSchedule(root, result) {
  const member = getCurrentMember();
  const initial = readYuseongNeighborhood(member);
  const neighborhood = root.querySelector('[data-yuseong-neighborhood]');
  if (!neighborhood || !result?.disposalSchedule) return () => initial;
  const area = root.querySelector('[data-yuseong-area]');
  const status = root.querySelector('[data-recycling-time]');
  const next = root.querySelector('[data-recycling-next]');
  const help = root.querySelector('[data-yuseong-days-help]');
  const current = () => ({ neighborhood: neighborhood.value, area: area.value });
  function update(event) {
    if (event.target === neighborhood) {
      const { areas } = yuseongRecyclingDays(neighborhood.value);
      area.innerHTML = `<option value="">행정동 선택</option>${options(areas)}`;
      area.parentElement.hidden = !areas.length;
    }
    const choice = current();
    const row = disposalScheduleRows(result.disposalSchedule, choice).find(entry => entry.recycling);
    status.textContent = row.when;
    next.textContent = nextRegularDisposal(row);
    next.hidden = !next.textContent;
    help.hidden = area.parentElement.hidden || Boolean(area.value);
    rememberYuseongNeighborhood(member, choice);
  }
  neighborhood.addEventListener('change', update);
  area.addEventListener('change', update);
  return current;
}
