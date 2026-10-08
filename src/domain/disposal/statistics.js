const categories = [
  ['plastic', '플라스틱', '#538463'], ['pet', '투명 페트병', '#7aa68a'],
  ['paper', '종이', '#9baf75'], ['carton', '종이팩', '#c1ae74'],
  ['glass', '유리병', '#81a9aa'], ['can', '캔', '#8794ad'],
  ['vinyl', '비닐', '#ad9abb'], ['foam', '스티로폼', '#a7b5a9'],
  ['general', '일반 배출', '#b99077'], ['mixed', '재질별 배출', '#9a9562'],
  ['check', '추가 확인', '#d0ac5e'],
];

function categoryOf(record) {
  const { input, result } = record;
  if (result.status === 'check') return 'check';
  if (result.status === 'general') return 'general';
  if (result.status === 'mixed') return 'mixed';
  if (input.material === '페트병') return input.type === 'clear-drink' ? 'pet' : 'plastic';
  if (input.material === '종이') return input.type === 'carton' ? 'carton' : 'paper';
  return ({ '플라스틱': 'plastic', '유리': 'glass', '금속·캔': 'can', '비닐': 'vinyl', '스티로폼': 'foam' })[input.material] || 'check';
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
  const normalized = query.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
  return records.filter(record => record.itemName.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').includes(normalized));
}
