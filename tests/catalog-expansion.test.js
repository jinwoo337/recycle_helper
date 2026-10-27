import test from 'node:test';
import assert from 'node:assert/strict';
import { expandedItemEntries } from '../src/domain/disposal/expanded-catalog.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { lookupItem, suggestItemInfo, searchItemNames, setItemCatalog } from '../src/domain/disposal/item-suggestions.js';
import { TYPES, MATERIALS, judgeDisposal, supportsState } from '../src/domain/disposal/rules.js';

test('100개 검토 품목의 모든 명칭이 유효한 기본 정보·출처를 갖고 검색된다', () => {
  assert.ok(expandedItemEntries.length >= 100);
  const seen = new Set();
  for (const [names,material,type,,metadata] of expandedItemEntries) {
    assert.ok(MATERIALS.includes(material));
    if (type) assert.ok(TYPES[material]?.some(([id])=>id===type));
    assert.equal(metadata.checkedAt,'2026-10-27');
    assert.ok(metadata.source.startsWith('https://wasteguide.or.kr/'));
    for (const name of names) {
      const key = name.toLowerCase(); assert.ok(!seen.has(key),name); seen.add(key);
      const suggestion = suggestItemInfo(name);
      assert.equal(suggestion.material,material,name);
      assert.equal(suggestion.type,type || metadata.defaults?.type || '',name);
      assert.ok(searchItemNames(name,10).some(candidate=>candidate===name),name);
      const preset = itemPresetInput(name);
      for (const part of [preset,...(preset.components||[])]) {
        for (const field of ['contaminated','washed','removable','foodSeparated']) assert.equal(part[field],undefined,`${name}: ${field}`);
        if (part.type) assert.ok(TYPES[part.material]?.some(([id])=>id===part.type));
      }
      if (supportsState(preset)) assert.equal(judgeDisposal(preset).status,'check',name);
    }
  }
});
test('생수병 대표 구성과 무라벨 예외, 부속품 현재 상태 및 직접 수정', () => {
  const preset = itemPresetInput('생수병');
  assert.equal(preset.type,'clear-drink'); assert.equal(preset.combined,'yes');
  assert.equal(preset.separable,'yes'); assert.deepEqual(preset.components,[{material:'비닐',type:'packaging'}]);
  const clean = {...preset,contaminated:'no',components:preset.components.map(p=>({...p,contaminated:'no'}))};
  assert.equal(judgeDisposal(clean).parts.length,2);
  assert.equal(judgeDisposal(clean).status,'recycle');
  assert.equal(judgeDisposal({...clean,type:'other-pet',combined:'no'}).status,'recycle');
  assert.equal(judgeDisposal({...clean,separable:'no'}).status,'check');
  assert.equal(itemPresetInput('무라벨생수병').combined,'no');
  preset.components[0].material='기타';
  assert.equal(itemPresetInput('생수병').components[0].material,'비닐');
  assert.equal(itemPresetInput('우유팩모양장난감').material,'');
  assert.equal(lookupItem('생수병 뚜껑'),null);
});
test('건전지·전자제품은 재질을 몰라도 구체적인 별도 수거 안내를 받되 미확인 상태를 유지한다', () => {
  for (const name of ['건전지','AA건전지','버튼전지','충전지','보조배터리','부푼배터리','형광등','깨진형광등','LED전구','백열전구','휴대폰','멀티탭']) {
    const preset = itemPresetInput(name);
    assert.equal(preset.material,'기타');
    const result = judgeDisposal(preset);
    assert.equal(result.status,'check',name); assert.ok(result.steps.length>=2,name);
    assert.ok(!result.method.includes('금속캔'),name);
    assert.equal(judgeDisposal({...preset,material:'플라스틱',type:'container',contaminated:'no',combined:'no'}).status,'check');
  }
  assert.match(judgeDisposal(itemPresetInput('건전지')).method,/전지/);
  assert.match(judgeDisposal(itemPresetInput('부푼배터리')).method,/먼저 문의/);
});
test('운영 DB의 기존 품목과 신규 품목 병합, DB 충돌 및 기본값 변경 방지', () => {
  setItemCatalog([{id:'old',aliases:['생수병'],material:'페트병',item_type:'',note:'이전 안내'}, {id:'old-battery',aliases:['건전지'],material:'',item_type:'',note:'이전 미분류'}]);
  assert.equal(itemPresetInput('생수병').combined,'yes');
  assert.equal(itemPresetInput('건전지').material,'기타');
  assert.equal(itemPresetInput('플라스틱두부용기').type,'container');
  setItemCatalog([{id:'different',aliases:['생수병'],material:'유리',item_type:'bottle',note:'DB 수정'}]);
  assert.equal(itemPresetInput('생수병').material,'유리');
  assert.equal(itemPresetInput('생수병').components,undefined);
});
