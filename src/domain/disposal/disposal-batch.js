import { resultForDisplay } from './result-display.js';
import { resultToText } from './result-text.js';

const groups = [
  ['general', '종량제봉투'],
  ['recycle', '재활용'],
  ['other', '전용 수거·재질별 배출'],
  ['check', '추가 확인'],
];

function groupFor(input, result) {
  if (!result || result.status === 'check') return 'check';
  if (result.status === 'mixed' || (result.status === 'recycle' && (result.handling || input.material === '음식물류'))) return 'other';
  if (result.status === 'general' && !/종량제|일반규격봉투/.test(result.method)) return 'other';
  return result.status;
}

export function batchGroups(items) {
  const displayed = items.map(item => ({ ...item, displayed: item.result ? resultForDisplay(item.input, item.result) : null }));
  return groups.map(([id, label]) => ({ id, label, entries: displayed.filter(item => groupFor(item.input, item.displayed) === id) }));
}

export function batchToText(items) {
  return batchGroups(items).filter(group => group.entries.length).map(group => [
    `[${group.label}]`,
    ...group.entries.map(({ input, result }) => result ? resultToText(input, result) : `${input.itemName} · 확인 필요 (아직 판별하지 않았어요)`),
  ].join('\n\n')).join('\n\n');
}
