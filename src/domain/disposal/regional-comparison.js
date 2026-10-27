import { judgeDisposal } from './rules.js';
import { COMPARISON_REGIONS, normalizeRegion } from './regions.js';

// 같은 입력에서 지역만 변경합니다. 문구나 출처의 차이는 배출 방식의 차이로 세지 않습니다.
export function compareRegionalDisposal(input) {
  const current = judgeDisposal(input);
  const selected = normalizeRegion(input?.region);
  const groups = new Map();
  let unverifiedCount = 0;
  for (const region of COMPARISON_REGIONS) {
    if (selected?.province === region.province && selected.district === region.district) continue;
    const result = judgeDisposal({ ...input, region });
    if (result.regional.coverage !== 'verified') { unverifiedCount++; continue; }
    const key = result.regional.comparisonKey;
    if (!groups.has(key)) groups.set(key, { key, regions: [], result, sources: [] });
    const group = groups.get(key);
    group.regions.push(region);
    group.sources = [...new Set([...group.sources, ...result.regional.sources])];
  }
  const verified = current.regional.coverage === 'verified';
  const alternatives = [...groups.values()].filter(group => !verified || group.key !== current.regional.comparisonKey);
  // 현재 지역이 미확인이면, 확인된 지역끼리 둘 이상의 방식이 있을 때만 비교를 제안합니다.
  return { current, groups: verified || groups.size > 1 ? alternatives : [], unverifiedCount };
}
