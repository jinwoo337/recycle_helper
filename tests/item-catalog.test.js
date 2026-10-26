import test from 'node:test';
import assert from 'node:assert/strict';
import { loadItemCatalog } from '../src/services/item-catalog.js';
import { bundledItemEntries, lookupItem, searchItemNames, setItemCatalog } from '../src/domain/disposal/item-suggestions.js';

test('DB 품목을 추천·자동 입력·판별에 공통 사용하며 잘못된 데이터는 거절한다', async () => {
  const bundledRows = bundledItemEntries.map(([aliases, material, item_type, note = '기본 안내'], index) => ({
    id: `catalog-${index}`, aliases, material, item_type, note,
  }));
  const rows = [{ id: 'db-item', aliases: ['DB우유팩'], material: '종이', item_type: 'carton', note: 'DB 안내' }];
  const client = { from() { const query = { select() { return query; }, eq() { return query; }, order() { return query; },
    async range() { return { data: rows, error: null }; } }; return query; } };
  try {
    await loadItemCatalog(client);
    assert.deepEqual(searchItemNames('DB'), ['DB우유팩']);
    assert.equal(lookupItem('DB 우유팩').type, 'carton');
    const { judgeDisposal } = await import('../src/domain/disposal/rules.js');
    assert.equal(judgeDisposal({ itemName: 'DB우유팩', material: '종이', type: 'carton', contaminated: 'no', combined: 'no' }).status, 'recycle');
    rows[0].item_type = 'invalid';
    await assert.rejects(loadItemCatalog(client), /세부 종류/);
    assert.equal(lookupItem('DB우유팩').type, 'carton');
  } finally { setItemCatalog(bundledRows); }
});
