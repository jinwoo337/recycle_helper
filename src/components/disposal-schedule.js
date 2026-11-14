import { escapeHtml } from '../utils/html.js';

export function disposalScheduleMarkup(result) {
  const schedule = result?.disposalSchedule;
  if (!schedule) return '';
  return `<section class="disposal-schedule" aria-label="${escapeHtml(schedule.district)} 배출 시간과 장소">
    <h3>${escapeHtml(schedule.district)} 배출 시간과 장소</h3>
    ${schedule.rows.map(({ label, appliesTo, when, where }) => `<div class="disposal-schedule-route">
      <h4>${escapeHtml(label)}${appliesTo ? ` <small>· ${escapeHtml(appliesTo)}</small>` : ''}</h4>
      <p>${escapeHtml(when)}</p>
      <dl>${where.map(([housing, site]) => `<div><dt>${escapeHtml(housing)}</dt><dd>${escapeHtml(site)}</dd></div>`).join('')}</dl>
    </div>`).join('')}
    <a href="${escapeHtml(schedule.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(schedule.district)}청 배출 일정표</a>
  </section>`;
}
