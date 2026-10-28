import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_TIPS, tipOfTheDay } from '../src/domain/disposal/daily-tips.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

test('오늘의 팁: 날짜(한국 시간)마다 바뀌고 모든 팁의 물건은 등록 품목이다', () => {
  for (const tip of DAILY_TIPS) assert.ok(lookupItem(tip.item), tip.item);
  const day = new Date('2026-10-28T00:00:00+09:00');
  assert.equal(tipOfTheDay(day), tipOfTheDay(new Date('2026-10-28T23:59:00+09:00')), '같은 날은 같은 팁');
  assert.notEqual(tipOfTheDay(day), tipOfTheDay(new Date('2026-10-29T00:00:00+09:00')), '다음 날은 다른 팁');
});
