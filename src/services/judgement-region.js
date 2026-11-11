import { normalizeRegion } from '../domain/disposal/regions.js';

const storageKey = member => `recycle-helper.judgement-region.v1.${member?.id || 'guest'}`;
const sameRegion = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 한 번 고른 판별 지역은 이 브라우저에 기억해 다음 접속에도 그대로 씁니다(계정 프로필은 바꾸지 않음).
const defaultStorage = () => globalThis.localStorage;
const legacyValue = member => { try { return globalThis.sessionStorage?.getItem(storageKey(member)) || null; } catch { return null; } };

export function readJudgementRegion(member, storage) {
  const profile = normalizeRegion(member?.region);
  try {
    const store = storage || defaultStorage();
    const value = JSON.parse(store.getItem(storageKey(member)) || (storage ? null : legacyValue(member)) || 'null');
    if (value?.version !== 1 || !sameRegion(value.profile, profile) || !Object.hasOwn(value, 'region')) return profile;
    return value.region === null ? null : normalizeRegion(value.region) || profile;
  } catch { return profile; }
}

export function rememberJudgementRegion(region, member, storage) {
  const normalized = region === null ? null : normalizeRegion(region);
  if (region !== null && !normalized) return;
  try { (storage || defaultStorage()).setItem(storageKey(member), JSON.stringify({ version: 1, profile: normalizeRegion(member?.region), region: normalized })); }
  catch { /* 저장소가 차단돼도 현재 판별에는 선택한 지역을 사용합니다. */ }
}
