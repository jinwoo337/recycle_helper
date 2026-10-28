import test from 'node:test';
import assert from 'node:assert/strict';
import { guidePage } from '../src/pages/guide/guide.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

test('분리배출 방법 Q&A의 물건은 모두 등록 품목으로 이어진다', () => {
  const html = guidePage();
  const items = [...html.matchAll(/data-guide-item="([^"]+)"/g)].map(match => match[1]);
  for (const item of ['감열영수증', '깨진유리', '칫솔', '닭뼈', '달걀껍데기', '마른양파껍질']) assert.ok(items.includes(item), item);
  for (const item of items) assert.ok(lookupItem(item), item);
});
