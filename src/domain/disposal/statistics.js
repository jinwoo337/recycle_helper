import { normalizeItemName } from './item-suggestions.js';

export const categories = [
  ['food', '음식물류', '#b18b47'],
  ['plastic', '플라스틱', '#538463'], ['pet', '투명 페트병', '#7aa68a'],
  ['paper', '종이', '#9baf75'], ['carton', '종이팩', '#c1ae74'],
  ['glass', '유리병', '#81a9aa'], ['can', '캔', '#8794ad'],
  ['vinyl', '비닐', '#ad9abb'], ['foam', '스티로폼', '#a7b5a9'],
  ['general', '일반 배출', '#b99077'], ['mixed', '재질별 배출', '#9a9562'],
  ['check', '추가 확인', '#d0ac5e'],
];

export function categoryOf(record) {
  const { input, result } = record;
  if (result.status === 'check') return 'check';
  if (result.status === 'general') return 'general';
  if (result.status === 'mixed') return 'mixed';
  if (input.material === '음식물류') return 'food';
  if (input.material === '페트병') return input.type === 'clear-drink' ? 'pet' : 'plastic';
  if (input.material === '종이') return input.type === 'carton' ? 'carton' : 'paper';
  return ({ '플라스틱': 'plastic', '유리': 'glass', '금속·캔': 'can', '비닐': 'vinyl', '스티로폼': 'foam' })[input.material] || 'check';
}

export function statisticsFromCounts(counts, legacyCount = 0) {
  const total = Object.values(counts).reduce((sum, count) => sum + Number(count), 0);
  return { total, legacyCount, categories: categories.map(([id, label, color]) => ({
    id, label, color, count: Number(counts[id] || 0), ratio: total ? Number(counts[id] || 0) / total * 100 : 0,
  })) };
}

export function getDisposalStatistics(records) {
  const judged = records.filter(record => !record.legacy && record.input && record.result);
  const counts = new Map();
  judged.forEach(record => { const category = categoryOf(record); counts.set(category, (counts.get(category) || 0) + 1); });
  const total = judged.length;
  return { total, legacyCount: records.length - total,
    categories: categories.map(([id, label, color]) => ({ id, label, color, count: counts.get(id) || 0,
      ratio: total ? (counts.get(id) || 0) / total * 100 : 0 })) };
}

export function searchDisposalHistory(records, query) {
  const normalized = normalizeItemName(query);
  return records.filter(record => normalizeItemName(record.itemName).includes(normalized));
}

export function filterDisposalHistory(records, { query = '', category = '', from = '', to = '', sort = 'newest' } = {}) {
  return searchDisposalHistory(records, query).filter(record => {
    if (category && (record.legacy || categoryOf(record) !== category)) return false;
    if (from || to) {
      if (!record.createdAt) return false;
      const date = new Date(record.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
      if ((from && date < from) || (to && date > to)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.legacy !== b.legacy) return a.legacy ? 1 : -1;
    if (sort === 'name') return a.itemName.localeCompare(b.itemName, 'ko');
    const delta = Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0);
    return (sort === 'oldest' ? delta : -delta) || a.id.localeCompare(b.id);
  });
}
