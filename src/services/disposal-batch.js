import { getCurrentMember } from './auth.js';
import { normalizeItemName } from '../domain/disposal/item-suggestions.js';
import { normalizeRegion } from '../domain/disposal/regions.js';
import { validRecord } from './disposal-history.js';
import { validFavoriteInput } from './member-tools.js';

const MAX_ITEMS = 12;
const mealParts = ['배달 용기', '배달 용기 뚜껑', '배달 용기 포장 필름'];
const batchRegionMatches = (left, right) => left?.province === right?.province && left?.district === right?.district;
let batch, owner, nextId = 0;
const keyFor = id => `recycle-helper.disposal-batch.v1.${id}`;

function loadBatch(id) {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(keyFor(id)) || 'null');
    if (!Array.isArray(saved?.items)) return null;
    const region = normalizeRegion(saved.region), ids = new Set();
    const items = saved.items.slice(0, MAX_ITEMS).filter(entry => {
      if (!Number.isSafeInteger(entry?.id) || entry.id < 1 || ids.has(entry.id) || !validFavoriteInput(entry.input)
          || !batchRegionMatches(region, normalizeRegion(entry.input.region))) return false;
      if (entry.result && !validRecord({ ...entry, id: String(entry.id), itemName: entry.input.itemName,
        schemaVersion: 2, createdAt: '2000-01-01T00:00:00Z' })) return false;
      ids.add(entry.id);
      return true;
    });
    return { items, region: items.length ? region : null };
  } catch { return null; }
}

function saveBatch() {
  try { globalThis.localStorage?.setItem(keyFor(owner), JSON.stringify(batch)); } catch { /* Continue in memory. */ }
}

function current() {
  const id = getCurrentMember()?.id || 'guest';
  if (!batch || owner !== id) {
    owner = id; batch = loadBatch(id) || { items: [], region: null };
    nextId = Math.max(0, ...batch.items.map(entry => entry.id));
  }
  return batch;
}

export function readDisposalBatch() { return structuredClone(current()); }

export function duplicateBatchPartIds(items) {
  const bundled = new Set(items.flatMap(({ input, result }) => result ? [...mealComponents(input)] : []));
  return new Set(items.filter(({ input }) => bundled.has(normalizeItemName(input.itemName))).map(entry => entry.id));
}

export function addDisposalBatchItem(input, result = null) {
  if (!validFavoriteInput(input)) return false;
  const target = current(), region = normalizeRegion(input.region);
  if (target.items.length && !batchRegionMatches(target.region, region)) return false;
  const key = normalizeItemName(input.itemName);
  const existing = target.items.find(entry => normalizeItemName(entry.input.itemName) === key);
  if (!existing && target.items.length >= MAX_ITEMS) return false;
  if (existing) {
    if (result) Object.assign(existing, structuredClone({ input, result }));
  } else target.items.push({ id: ++nextId, input: { ...structuredClone(input), region }, result: structuredClone(result) });
  target.region = region;
  saveBatch();
  return true;
}

function mealComponents(input) {
  if (normalizeItemName(input.itemName) !== '배달용기' || input.separable !== 'yes') return new Set();
  const parts = new Set();
  for (const part of input.components || []) {
    const label = normalizeItemName(part.label);
    if (/뚜껑|마개/.test(label)) parts.add('배달용기뚜껑');
    if (/필름/.test(label)) parts.add('배달용기포장필름');
  }
  return parts;
}

export function addMealToBatch(input, result) {
  const target = current(), region = normalizeRegion(input.region);
  if (!batchRegionMatches(target.region, region) && target.items.length) return false;
  const inputKey = normalizeItemName(input.itemName);
  const keys = mealComponents(input);
  const retained = target.items.filter(entry => entry.result || !keys.has(normalizeItemName(entry.input.itemName)));
  const existingNames = new Set(retained.map(entry => normalizeItemName(entry.input.itemName)));
  const separatelyNeeded = mealParts.filter(name => !keys.has(normalizeItemName(name)));
  const names = [...new Map([...separatelyNeeded, input.itemName].map(name => [normalizeItemName(name), name])).values()];
  if (retained.length + names.filter(name => !existingNames.has(normalizeItemName(name))).length > MAX_ITEMS) return false;
  target.region = region;
  target.items = retained;
  for (const itemName of names) {
    const existing = target.items.find(entry => normalizeItemName(entry.input.itemName) === normalizeItemName(itemName));
    const confirmed = normalizeItemName(itemName) === inputKey;
    if (existing) {
      if (confirmed) Object.assign(existing, structuredClone({ input, result }));
    } else {
      target.items.push({ id: ++nextId, input: confirmed ? structuredClone(input) : {
        itemName, region, category: 'packaging', categoryOrigin: 'manual', keywordCategory: false,
      }, result: confirmed ? structuredClone(result) : null });
    }
  }
  saveBatch();
  return true;
}

export function updateBatchItem(id, input, result) {
  const target = current();
  const entry = target.items.find(item => item.id === id);
  const region = normalizeRegion(input.region);
  if (!entry || normalizeItemName(entry.input.itemName) !== normalizeItemName(input.itemName) || !batchRegionMatches(region, target.region)) return false;
  Object.assign(entry, structuredClone({ input, result }));
  const keys = mealComponents(input);
  target.items = target.items.filter(item => item.result || !keys.has(normalizeItemName(item.input.itemName)));
  saveBatch();
  return true;
}

export function removeBatchItem(id) {
  const target = current();
  target.items = target.items.filter(entry => entry.id !== id);
  if (!target.items.length) target.region = null;
  saveBatch();
}
