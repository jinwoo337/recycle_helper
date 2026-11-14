import { compareRegionalDisposal } from '../domain/disposal/regional-comparison.js';
import { districtsFor, REGIONAL_SOURCES, regionalSourceDetail, regionalSourceLabel, regionLabel } from '../domain/disposal/regions.js';
import { RULE_VERSION } from '../domain/disposal/rules.js';
import { escapeHtml } from '../utils/html.js';
import { SEOUL_SCOPE_NOTE } from '../domain/disposal/seoul-guides.js';

const list = values => `<ol>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol>`;
const comparisonSteps = result => [...new Set([...result.steps, ...(result.parts?.length > 1 ? result.parts.flatMap(part => part.steps) : [])])];
function commonProvince(group) {
  const province = group.regions[0]?.province;
  const sameProvince = group.regions.length > 1 && group.regions.every(region => region.province === province);
  return sameProvince && (group.result.regional.scope === 'city' || group.regions.length === districtsFor(province).length) ? province : '';
}
function groupLabel(group) {
  const province = commonProvince(group);
  if (province) {
    return group.regions.length === districtsFor(province).length
      ? `${province} 공통 기준` : `${province} 공통 기준 적용 지역 ${group.regions.length}곳`;
  }
  return group.regions.map(regionLabel).join(' · ');
}
export function regionalComparisonMarkup(result) {
  if (result.ruleVersion !== RULE_VERSION) return '';
  return '<details class="regional-comparison" data-regional-comparison><summary>다른 지역은 어떨까?</summary><div data-comparison-body></div></details>';
}

export function bindRegionalComparison(root, input, result) {
  const disclosure = root.querySelector('[data-regional-comparison]');
  if (!disclosure || !result) return;
  function render() {
    if (!disclosure.open) return;
    disclosure.querySelector('[data-comparison-body]').innerHTML = comparisonPanelMarkup(compareRegionalDisposal(input, result));
    disclosure.removeEventListener('toggle', render);
  }
  disclosure.addEventListener('toggle', render);
  render();
}
export function comparisonHighlights(result, current) {
  const shared = new Set(comparisonSteps(current));
  return [...new Set([...result.regional.notes, ...comparisonSteps(result)])]
    .filter(step => step !== SEOUL_SCOPE_NOTE && step !== result.regional.scopeNote && !shared.has(step)).slice(0, 2);
}
export function comparisonPanelMarkup(comparison) {
  const { current, groups, sameCount, unverifiedCount } = comparison;
  const note = unverifiedCount ? '<p class="input-hint">비교 가능한 지역의 품목별 자료를 사용했어요.</p>' : '';
  if (!groups.length) {
    const message = sameCount > 1 ? '확인된 모든 지역의 배출 방법이 같아요.' : '이 품목의 지역별 차이는 아직 확인되지 않았어요.';
    return `<p class="comparison-explanation">${message}</p>${note}`;
  }
  const groupSteps = groups.map(group => new Set(comparisonSteps(group.result)));
  const shared = new Set(comparisonSteps(current).filter(step =>
    step !== SEOUL_SCOPE_NOTE && step !== current.regional.scopeNote && groupSteps.every(steps => steps.has(step))
  ));
  return `<p class="comparison-explanation">${current.regional.coverage === 'verified' ? '아래 지역은 현재 선택한 지역과 배출 방법이 달라요.' : '현재 화면의 기본 안내와 다른 지역별 배출 방법이에요.'}</p>
    <div class="comparison-groups">${groups.map((group, index) => {
      const highlights = comparisonHighlights(group.result, current);
      const steps = [...groupSteps[index]].filter(step => step !== SEOUL_SCOPE_NOTE && step !== group.result.regional.scopeNote && !shared.has(step) && !highlights.includes(step));
      return `<article class="comparison-card"><h3>${escapeHtml(groupLabel(group))}</h3><p class="comparison-method">${escapeHtml(group.result.method)}</p>${highlights.length ? list(highlights) : ''}
      ${commonProvince(group) ? `<details><summary>해당 지역 ${group.regions.length}곳 보기</summary><p class="input-hint">${group.regions.map(region => escapeHtml(regionLabel(region))).join(' · ')}</p></details>` : ''}
      <details><summary>${steps.length ? '나머지 단계·공식 자료' : '공식 자료 보기'}</summary>${steps.length ? list(steps) : ''}
      <p class="input-hint">대표 안내 확인일 ${escapeHtml(group.result.regional.checkedAt)}</p>
      <ul class="input-hint comparison-sources">${group.sources.filter(url => Object.values(REGIONAL_SOURCES).includes(url)).map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(regionalSourceLabel(url))} ↗</a>${regionalSourceDetail(url) ? `<br>${escapeHtml(regionalSourceDetail(url))}` : ''}</li>`).join('')}</ul></details></article>`; }).join('')}</div>
    ${shared.size ? `<section class="comparison-common"><h3>공통 준비</h3>${list([...shared])}</section>` : ''}
    ${note}`;
}
