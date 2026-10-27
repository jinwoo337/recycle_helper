import test from 'node:test';
import assert from 'node:assert/strict';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';

test('결과의 부속품 이름은 HTML로 실행하지 않고 검토한 공식 출처만 링크한다', () => {
  const input = {...itemPresetInput('두부용기'),contaminated:'no'};
  input.components = input.components.map(part=>({...part,contaminated:'no',label:'<img src=x onerror=alert(1)>'}));
  const result = judgeDisposal(input);
  result.sourceUrls.push('javascript:alert(1)','https://example.invalid/not-reviewed');
  const markup = resultMarkup(input,result);
  assert.ok(markup.includes('&lt;img'));
  assert.ok(!markup.includes('<img src=x'));
  assert.ok(!markup.includes('href="javascript:'));
  assert.ok(!markup.includes('href="https://example.invalid'));
  const pencil = itemPresetInput('연필');
  const pencilMarkup = resultMarkup(pencil,judgeDisposal(pencil));
  assert.ok(pencilMarkup.includes('품목사전 · 연필·필기구'));
  assert.ok(pencilMarkup.includes('niIdx=316'));
});
