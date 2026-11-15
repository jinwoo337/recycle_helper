import test from 'node:test';
import assert from 'node:assert/strict';
import { disposalStepIcons, stepListMarkup } from '../src/components/step-list.js';

test('준비 동작을 순서대로 표시하고 금지와 확인을 실제 행동으로 표현하지 않는다', () => {
  assert.deepEqual(disposalStepIcons('내용물을 비우고 깨끗하게 헹궈 주세요.'), ['empty', 'wash']);
  assert.deepEqual(disposalStepIcons('라벨을 제거하고 가능한 압착한 뒤 뚜껑을 닫아 주세요.'), ['separate', 'press']);
  assert.deepEqual(disposalStepIcons('종이팩은 내용물을 비우고 헹궈 말린 뒤 전용 수거함에 넣어 주세요.'), ['empty', 'wash']);
  assert.deepEqual(disposalStepIcons('물에 씻지 말고 물기에 젖지 않게 펴거나 접어 모아 주세요.'), ['warning']);
  assert.deepEqual(disposalStepIcons('남은 내용물이나 이물질을 제거할 수 있는지 확인해 주세요.'), ['check']);
  assert.deepEqual(disposalStepIcons('깨진 부분은 다치지 않도록 싸서 표시해 주세요.'), ['wrap']);
  const markup = stepListMarkup(['내용물을 비우고 헹궈 주세요.'], 'action-steps', { checklist: true });
  assert.match(markup, /data-step-icon="empty"[\s\S]*data-step-icon="wash"/);
  assert.match(markup, /data-disposal-step hidden disabled/);
});
