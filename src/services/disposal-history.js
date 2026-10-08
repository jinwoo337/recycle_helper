import { getCurrentMember } from './auth.js';
import { getRecentItems, storageKey as recentItemsKey } from './recent-items.js';

const MAX_RECORDS = 8;
function notifyHistoryChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('disposal-history-changed'));
}
const key = () => `recycle-helper.disposal-history.v2.${getCurrentMember()?.id || 'guest'}`;
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const validOutcome = value => value && ['recycle', 'general', 'check', 'mixed'].includes(value.status)
  && typeof value.method === 'string' && strings(value.steps) && strings(value.reasons);
const partKeys = ['material', 'type', 'contaminated', 'washed', 'removable', 'combined', 'separable'];
const validPart = part => part && typeof part === 'object' && !Array.isArray(part)
  && partKeys.every(key => part[key] === undefined || typeof part[key] === 'string');
function validRecord(record) {
  return record?.schemaVersion === 2 && typeof record.id === 'string' && typeof record.itemName === 'string'
    && validPart(record.input) && record.input.itemName === record.itemName
    && (record.input.components === undefined || (Array.isArray(record.input.components)
      && record.input.components.length <= 5 && record.input.components.every(validPart)))
    && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt))
    && validOutcome(record.result) && Array.isArray(record.result.parts) && record.result.parts.every(part =>
      validOutcome(part) && typeof part.label === 'string' && typeof part.material === 'string')
    && typeof record.result.ruleVersion === 'string' && typeof record.result.notice === 'string';
}

// v1 이름이 다시 나타나지 않도록 두 저장소를 함께 갱신합니다.
// 일부 쓰기만 실패하면 이전 값으로 되돌리고 삭제 실패를 안내합니다.
function writeDeletion(records, names) {
  const entries = [[key(), JSON.stringify(records)], [recentItemsKey(), JSON.stringify(names)]];
  const previous = entries.map(([storageKey]) => localStorage.getItem(storageKey) ?? '[]');
  try {
    entries.forEach(([storageKey, value]) => localStorage.setItem(storageKey, value));
  } catch {
    entries.forEach(([storageKey], index) => {
      try { localStorage.setItem(storageKey, previous[index]); } catch { /* 저장소 차단 */ }
    });
    throw new Error('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.');
  }
}

// 다음 회차에는 이 비동기 저장소 경계를 Supabase 구현으로 교체합니다.
export const localHistoryRepository = {
  async list() {
    try {
      const data = JSON.parse(localStorage.getItem(key()) || '[]');
      return Array.isArray(data) ? data.filter(validRecord) : [];
    } catch { return []; }
  },
  async save(record) {
    if (!validRecord(record)) throw new Error('판별 기록의 형식을 확인해 주세요.');
    const ownerKey = key();
    const records = [record, ...await this.list()];
    try { localStorage.setItem(ownerKey, JSON.stringify(records)); }
    catch { throw new Error('결과는 확인할 수 있지만 기록을 저장하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
    return records;
  },
  async remove(record) {
    try {
      const records = (await this.list()).filter(item => item.id !== record.id);
      writeDeletion(records, getRecentItems().filter(name => name !== record.itemName));
    } catch { throw new Error('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
  },
  async clear() {
    try { writeDeletion([], []); }
    catch { throw new Error('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
  },
};

export async function getAllDisposalHistory(repository = localHistoryRepository) {
  const records = await repository.list();
  const names = new Set(records.map(record => record.itemName));
  const legacy = getRecentItems().filter(name => !names.has(name)).map(itemName =>
    ({ id: `legacy-${encodeURIComponent(itemName)}`, itemName, legacy: true }));
  return [...records, ...legacy];
}

export async function getDisposalHistory(repository = localHistoryRepository) {
  return (await getAllDisposalHistory(repository)).slice(0, MAX_RECORDS);
}

export async function saveDisposalRecord(input, result, repository = localHistoryRepository) {
  const record = { schemaVersion: 2, id: crypto.randomUUID(), itemName: input.itemName,
    createdAt: new Date().toISOString(), input: structuredClone(input), result: structuredClone(result) };
  await repository.save(record);
  notifyHistoryChanged();
  return record;
}

export async function deleteDisposalRecord(record, repository = localHistoryRepository) {
  await repository.remove(record);
  notifyHistoryChanged();
}

export async function clearDisposalHistory(repository = localHistoryRepository) {
  await repository.clear();
  notifyHistoryChanged();
}
