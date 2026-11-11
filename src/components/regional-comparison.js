import { compareRegionalDisposal } from '../domain/disposal/regional-comparison.js';
import { cityGuidanceLabel, DAEJEON_DISTRICTS, REGIONAL_SOURCES, regionalSourceLabel, SEOUL_DISTRICTS } from '../domain/disposal/regions.js';
import { RULE_VERSION } from '../domain/disposal/rules.js';
import { escapeHtml } from '../utils/html.js';
import { SEOUL_SCOPE_NOTE } from '../domain/disposal/seoul-guides.js';

const list = values => `<ol>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol>`;
function groupLabel(regions) {
  const province = regions[0]?.province;
  const districts = province === '서울특별시' ? SEOUL_DISTRICTS : province === '대전광역시' ? DAEJEON_DISTRICTS : null;
  if (districts && regions.length > 1 && regions.every(region => region.province === province)) return `${province} ${regions.length === districts.length ? '전체 ' : ''}${regions.length}개 구`;
  return regions.map(region => `${region.province} ${region.district}`).join(' · ');
}
export function regionalComparisonMarkup(input, result) {
  if (result.ruleVersion !== RULE_VERSION) return '';
  const comparison = compareRegionalDisposal(input, result);
  if (!comparison.groups.length) return '';
  return `<details class="regional-comparison"><summary>다른 지역은 어떨까?</summary>${comparisonPanelMarkup(comparison)}</details>`;
}
export function comparisonHighlights(result, current) {
  const shared = new Set(current.steps);
  return [...new Set([...result.steps, ...result.regional.notes])]
    .filter(step => step !== SEOUL_SCOPE_NOTE && !shared.has(step)).slice(0, 2);
}
export function comparisonPanelMarkup(comparison) {
  const { current, groups, unverifiedCount } = comparison;
  const verified = current.regional.coverage === 'verified';
  const currentLabel = verified ? (current.regional.scope === 'city' ? cityGuidanceLabel(current.region) : '현재 지역 기준') : '현재 기본 안내';
  const hasCityGuidance = current.regional.scope === 'city' || groups.some(group => group.result.regional.scope === 'city');
  return `<p class="comparison-explanation">${verified ? '같은 조건에서 배출 방식이 다른 지역이에요.' : '공식 자료가 확인된 지역끼리 비교한 안내예요.'}</p>
    <article class="comparison-current"><span class="comparison-label">${currentLabel}</span><h3>${escapeHtml(current.regional.label)}</h3><strong>${escapeHtml(current.method)}</strong>${!verified && current.region ? '<p class="input-hint">현재 지역의 이 품목 기준은 추가 확인이 필요해요.</p>' : ''}</article>
    <div class="comparison-groups">${groups.map(group => {
      const highlights = comparisonHighlights(group.result, current);
      const label = group.result.regional.scope === 'city' ? cityGuidanceLabel(group.result.region) : '이 지역에서 버릴 때';
      return `<article class="comparison-card"><span class="comparison-label">${label}</span><h3>${escapeHtml(groupLabel(group.regions))}</h3><p class="comparison-method">${escapeHtml(group.result.method)}</p>${highlights.length ? list(highlights) : ''}
      <details><summary>전체 배출 방법·근거 보기</summary>${list(group.result.steps.filter(step => step !== SEOUL_SCOPE_NOTE))}
      ${group.regions.length > 1 ? `<details><summary>해당 지역 ${group.regions.length}곳 보기</summary><p class="input-hint">${group.regions.map(region => escapeHtml(`${region.province} ${region.district}`)).join(' · ')}</p></details>` : ''}
      <p class="input-hint comparison-sources">확인일 ${escapeHtml(group.result.regional.checkedAt)} · ${group.sources.filter(url => Object.values(REGIONAL_SOURCES).includes(url)).map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(regionalSourceLabel(url))} ↗</a>`).join(' · ')}</p></details></article>`; }).join('')}</div>
    ${hasCityGuidance ? '<p class="input-hint">시 공통 안내가 표시된 곳은 해당 구의 수거 기준도 확인해 주세요.</p>' : ''}
    ${unverifiedCount ? `<p class="input-hint">품목별 기준을 확인하지 못한 ${unverifiedCount}곳은 비교에서 제외했어요.</p>` : ''}`;
}
