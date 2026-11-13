import { judgeDisposal, judgeDisposalByRegion } from './rules.js';
import { COMPARISON_REGIONS, normalizeRegion } from './regions.js';

const sameRegion = (left, right) => left?.province === right?.province && left?.district === right?.district;

// 같은 입력에서 지역만 변경합니다. 문구나 출처의 차이는 배출 방식의 차이로 세지 않습니다.
export function compareRegionalDisposal(input, current = judgeDisposal(input)) {
  const selected = normalizeRegion(input?.region);
  const regions = COMPARISON_REGIONS.filter(region => !sameRegion(selected, region));
  const results = judgeDisposalByRegion(input, regions);
  const groups = new Map();
  let unverifiedCount = 0;
  let sameCount = Number(current.regional.coverage === 'verified');
  const currentKey = current.regional.comparisonKey;
  for (const [index, region] of regions.entries()) {
    const result = results[index];
    if (result.regional.coverage !== 'verified') { unverifiedCount++; continue; }
    const key = result.regional.comparisonKey;
    if (key === currentKey) { sameCount++; continue; }
    if (!groups.has(key)) groups.set(key, { key, regions: [], result, sources: [] });
    const group = groups.get(key);
    group.regions.push(region);
    group.sources = [...new Set([...group.sources, ...result.regional.sources])];
  }
  return { current, groups: [...groups.values()], sameCount, unverifiedCount };
}
