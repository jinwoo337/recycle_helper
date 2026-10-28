import { compareRegionalDisposal } from '../domain/disposal/regional-comparison.js';
import { REGIONAL_SOURCES, regionalSourceLabel, SEOUL_DISTRICTS } from '../domain/disposal/regions.js';
import { RULE_VERSION } from '../domain/disposal/rules.js';
import { escapeHtml } from '../utils/html.js';
import { SEOUL_SCOPE_NOTE } from '../domain/disposal/seoul-guides.js';

const list = values => `<ol>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol>`;
function groupLabel(regions) {
  if (regions.length > 1 && regions.every(region => region.province === '서울특별시')) return `서울특별시 ${regions.length === SEOUL_DISTRICTS.length ? '전체 ' : ''}${regions.length}개 구`;
  return regions.map(region => `${region.province} ${region.district}`).join(' · ');
}
export function regionalComparisonMarkup(input, result) {
  if (result.ruleVersion !== RULE_VERSION) return '';
  const comparison = compareRegionalDisposal(input);
  if (!comparison.groups.length) return '';
  return `<section class="regional-comparison" aria-label="다른 지역 배출 방법 비교">
    <div class="comparison-prompt"><div><strong>지역에 따라 배출 안내가 달라요</strong><p class="input-hint">같은 물건, 같은 상태로 확인했어요.</p></div><button type="button" class="button secondary" data-region-compare aria-expanded="false" aria-controls="regional-comparison-panel">다른 지역은 어떨까?</button></div>
    <div id="regional-comparison-panel" data-region-comparison-panel hidden></div></section>`;
}
export function comparisonHighlights(result, current) {
  const shared = new Set(current.steps);
  return [...new Set([...result.steps, ...result.regional.notes])]
    .filter(step => step !== SEOUL_SCOPE_NOTE && !shared.has(step)).slice(0, 2);
}
export function comparisonPanelMarkup(comparison) {
  const { current, groups, unverifiedCount } = comparison;
  return `<p class="comparison-explanation">${current.regional.coverage === 'verified' ? '현재 지역과 배출 방식·준비 조건이 다른 안내를 모았어요.' : '현재 지역의 해당 품목은 미확인이에요. 공식 자료가 확인된 지역끼리 비교한 안내예요.'} 서울은 시 공통 안내이며, 구별 수거 여부는 추가 확인해 주세요.</p>
    <article class="comparison-current"><span class="comparison-label">현재 선택</span><h3>${escapeHtml(current.regional.label)}</h3><strong>${escapeHtml(current.method)}</strong></article>
    <div class="comparison-groups">${groups.map(group => `<article class="comparison-card"><span class="comparison-label">다른 지역 안내${group.result.regional.scope === 'city' ? ' · 서울시 공통' : ''}</span><h3>${escapeHtml(groupLabel(group.regions))}</h3><p class="comparison-method">${escapeHtml(group.result.method)}</p>${list(comparisonHighlights(group.result, current))}
      <details><summary>전체 배출 방법·근거 보기</summary>${list(group.result.steps.filter(step => step !== SEOUL_SCOPE_NOTE))}
      ${group.regions.length > 1 ? `<details><summary>해당 지역 ${group.regions.length}곳 보기</summary><p class="input-hint">${group.regions.map(region => escapeHtml(`${region.province} ${region.district}`)).join(' · ')}</p></details>` : ''}
      <p class="input-hint comparison-sources">확인일 ${escapeHtml(group.result.regional.checkedAt)} · ${group.sources.filter(url => Object.values(REGIONAL_SOURCES).includes(url)).map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(regionalSourceLabel(url))} ↗</a>`).join(' · ')}</p></details></article>`).join('')}</div>
    <p class="input-hint">${unverifiedCount ? `비교 대상 중 ${unverifiedCount}곳은 해당 품목의 기준을 확인하지 못해 제외했어요. ` : ''}다른 지역의 봉투·수거 방식을 내 지역에 그대로 적용하지 마세요. 배출 요일·장소는 거주지 안내를 확인해 주세요.</p>`;
}
export function bindRegionalComparison(root, input) {
  const button = root.querySelector('[data-region-compare]');
  if (!button) return () => {};
  const panel = root.querySelector('[data-region-comparison-panel]');
  const toggle = () => {
    if (!panel.innerHTML) panel.innerHTML = comparisonPanelMarkup(compareRegionalDisposal(input));
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    button.textContent = open ? '다른 지역 안내 접기' : '다른 지역은 어떨까?';
  };
  button.addEventListener('click', toggle);
  return () => button.removeEventListener('click', toggle);
}
