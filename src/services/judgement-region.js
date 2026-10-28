import { normalizeRegion } from '../domain/disposal/regions.js';

const storageKey = member => `recycle-helper.judgement-region.v1.${member?.id || 'guest'}`;
const sameRegion = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 임시 선택은 현재 탭에만 보관하고 프로필 저장·계정 변경과 구분합니다.
export function readJudgementRegion(member, storage) {
  const profile = normalizeRegion(member?.region);
  try {
    const value = JSON.parse((storage || sessionStorage).getItem(storageKey(member)) || 'null');
    if (value?.version !== 1 || !sameRegion(value.profile, profile) || !Object.hasOwn(value, 'region')) return profile;
    return value.region === null ? null : normalizeRegion(value.region) || profile;
  } catch { return profile; }
}

export function rememberJudgementRegion(region, member, storage) {
  const normalized = region === null ? null : normalizeRegion(region);
  if (region !== null && !normalized) return;
  try { (storage || sessionStorage).setItem(storageKey(member), JSON.stringify({ version: 1, profile: normalizeRegion(member?.region), region: normalized })); }
  catch { /* 저장소가 차단돼도 현재 판별에는 선택한 지역을 사용합니다. */ }
}
