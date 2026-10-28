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
    rows[0].item_type = 'carton';
    rows.push({id:'db-battery',aliases:['건전지'],material:'기타',item_type:'',note:'별도 수거'});
    await loadItemCatalog(client);
    assert.equal(lookupItem('건전지').handling,'battery');
    assert.equal(lookupItem('플라스틱두부용기').type,'container');
    rows.push({id:'invalid-material',aliases:['잘못된재질'],material:'없는재질',item_type:'',note:'잘못된 값'});
    await assert.rejects(loadItemCatalog(client), /재질/);
    rows.splice(2); rows.push(null);
    await assert.rejects(loadItemCatalog(client), /품목 데이터 형식/);
    assert.equal(lookupItem('DB우유팩').type,'carton');
  } finally { setItemCatalog(bundledRows); }
});

test('조회 색인은 DB 갱신·이름 충돌·호출자의 값 변경에도 원본을 보존한다', () => {
  const restore = bundledItemEntries.map(([aliases, material, item_type, note='기본 안내'], index)=>({id:`restore-${index}`,aliases,material,item_type,note}));
  const rows = [{id:'new',aliases:['새 품목'],material:'종이',item_type:'carton',note:'검토한 안내'}];
  try {
    setItemCatalog(rows);
    rows[0].aliases[0] = '바뀐 이름';
    assert.equal(lookupItem('새품목').type,'carton');
    assert.equal(lookupItem('바뀐이름'),null);
    const bottle = lookupItem('생수병');
    bottle.defaults.components[0].material = '기타';
    assert.notEqual(lookupItem('생수병').defaults.components[0].material,'기타');
    const container = lookupItem('반찬통');
    const originalTypes = [...container.variants['종이']];
    container.variants['종이'].push('paper');
    assert.deepEqual(lookupItem('반찬통').variants['종이'],originalTypes);
    assert.throws(()=>setItemCatalog([...rows,{id:'conflict',aliases:['바뀐이름'],material:'유리',item_type:'bottle',note:'충돌'}]),/서로 다른/);
    assert.equal(lookupItem('새품목').type,'carton');
    assert.deepEqual(searchItemNames('새품목'),['새 품목']);
    setItemCatalog([{id:'replacement',aliases:['다음품목'],material:'종이',item_type:'paper',note:'다음'}]);
    assert.equal(lookupItem('새품목'),null);
    assert.equal(lookupItem('다음품목').type,'paper');
  } finally { setItemCatalog(restore); }
});
