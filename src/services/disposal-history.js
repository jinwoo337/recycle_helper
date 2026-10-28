import { getCurrentMember, isAuthReady } from './auth.js';
import { getRecentItems, storageKey as recentItemsKey } from './recent-items.js';
import { getSupabase } from './supabase.js';
import { createCloudHistoryRepository } from './cloud-history.js';
import { getDisposalStatistics } from '../domain/disposal/statistics.js';
import { validItemCategory } from '../domain/disposal/item-categories.js';

const MAX_RECORDS = 8;
function notifyHistoryChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('disposal-history-changed'));
  try { localStorage.setItem('recycle-helper.history-updated', crypto.randomUUID()); } catch { /* 다른 탭 알림만 생략 */ }
}
const key = () => `recycle-helper.disposal-history.v2.${getCurrentMember()?.id || 'guest'}`;
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const validOutcome = value => value && ['recycle', 'general', 'check', 'mixed'].includes(value.status)
  && typeof value.method === 'string' && strings(value.steps) && strings(value.reasons);
const partKeys = ['material', 'type', 'contaminated', 'washed', 'removable', 'vinylResidue', 'combined', 'separable', 'foodSeparated'];
const validPart = part => part && typeof part === 'object' && !Array.isArray(part)
  && (part.category === undefined || validItemCategory(part.category))
  && (part.categoryOrigin === undefined || ['manual', 'keyword'].includes(part.categoryOrigin))
  && (part.keywordCategory === undefined || typeof part.keywordCategory === 'boolean')
  && (part.label === undefined || (typeof part.label === 'string' && part.label.length <= 40))
  && partKeys.every(key => part[key] === undefined || typeof part[key] === 'string');
const validRegional = regional => regional === undefined || (regional && typeof regional === 'object'
  && ['verified', 'unverified'].includes(regional.coverage) && typeof regional.label === 'string'
  && typeof regional.checkedAt === 'string' && strings(regional.notes) && strings(regional.sources));
export function validRecord(record) {
  return record?.schemaVersion === 2 && typeof record.id === 'string' && typeof record.itemName === 'string'
    && validPart(record.input) && record.input.itemName === record.itemName
    && (record.input.components === undefined || (Array.isArray(record.input.components)
      && record.input.components.length <= 5 && record.input.components.every(validPart)))
    && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt))
    && validOutcome(record.result) && Array.isArray(record.result.parts) && record.result.parts.every(part =>
      validOutcome(part) && typeof part.label === 'string' && typeof part.material === 'string')
    && typeof record.result.ruleVersion === 'string' && typeof record.result.notice === 'string'
    && validRegional(record.result.regional);
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

// 비회원과 이전 브라우저 기록용 저장소입니다. 회원은 아래 Supabase 저장소를 사용합니다.
let localWrite = Promise.resolve();
function mutateLocal(action) {
  const ownerKey = key();
  const task = localWrite.then(() => {
    if (key() !== ownerKey) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 시도해 주세요.');
    return action();
  });
  localWrite = task.catch(() => {});
  return task;
}
export const localHistoryRepository = {
  async list() {
    try {
      const data = JSON.parse(localStorage.getItem(key()) || '[]');
      return Array.isArray(data) ? data.filter(validRecord) : [];
    } catch { return []; }
  },
  async save(record) {
    if (!validRecord(record)) throw new Error('판별 기록의 형식을 확인해 주세요.');
    return mutateLocal(async () => {
      const ownerKey = key();
      const records = [record, ...await this.list()];
      if (key() !== ownerKey) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 시도해 주세요.');
      try { localStorage.setItem(ownerKey, JSON.stringify(records)); }
      catch { throw new Error('결과는 확인할 수 있지만 기록을 저장하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
      return records;
    });
  },
  async remove(record) {
    return mutateLocal(async () => { try {
      const ownerKey = key();
      const records = (await this.list()).filter(item => item.id !== record.id);
      if (key() !== ownerKey) throw new Error('로그인 계정이 변경됐어요.');
      writeDeletion(records, getRecentItems().filter(name => name !== record.itemName));
    } catch { throw new Error('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.'); } });
  },
  async clear() {
    return mutateLocal(() => {
      try { writeDeletion([], []); }
      catch { throw new Error('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
    });
  },
};

const cloudRepositories = new Map();
async function resolveRepository(repository) {
  if (repository) return repository;
  if (!isAuthReady()) throw new Error('로그인 상태를 확인하지 못했어요. 연결을 확인하고 새로고침해 주세요.');
  const owner = getCurrentMember()?.id;
  if (!owner) return localHistoryRepository;
  const client = await getSupabase();
  if (!cloudRepositories.has(owner)) cloudRepositories.set(owner, createCloudHistoryRepository(client, owner, getCurrentMember, validRecord));
  return cloudRepositories.get(owner);
}

export async function getAllDisposalHistory(repository) {
  repository = await resolveRepository(repository);
  const records = await repository.list();
  if (repository.cloud) return records;
  const names = new Set(records.map(record => record.itemName));
  const legacy = getRecentItems().filter(name => !names.has(name)).map(itemName =>
    ({ id: `legacy-${encodeURIComponent(itemName)}`, itemName, legacy: true }));
  return [...records, ...legacy];
}

export async function getDisposalHistory(repository) {
  return (await getAllDisposalHistory(repository)).slice(0, MAX_RECORDS);
}

export async function saveDisposalRecord(input, result, repository) {
  repository = await resolveRepository(repository);
  const record = { schemaVersion: 2, id: crypto.randomUUID(), itemName: input.itemName,
    createdAt: new Date().toISOString(), input: structuredClone(input), result: structuredClone(result) };
  const saved = await repository.save(record);
  notifyHistoryChanged();
  return repository.cloud ? saved : record;
}

export async function deleteDisposalRecord(record, repository) {
  repository = await resolveRepository(repository);
  await repository.remove(record);
  notifyHistoryChanged();
}

export async function clearDisposalHistory(repository) {
  repository = await resolveRepository(repository);
  await repository.clear();
  notifyHistoryChanged();
}

export async function loadDisposalStatistics(repository) {
  repository = await resolveRepository(repository);
  return repository.cloud ? repository.statistics() : getDisposalStatistics(await getAllDisposalHistory(repository));
}
