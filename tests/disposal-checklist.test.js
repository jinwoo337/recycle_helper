import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDisposalChecklist } from '../src/components/disposal-checklist.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { resultStepsForDisplay } from '../src/domain/disposal/result-display.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';

test('결과의 본체와 부속품 준비 단계만 체크하고 다른 물건에 체크가 남지 않는다', () => {
  const input = {
    itemName: '투명생수병', material: '페트병', type: 'clear-drink',
    contaminated: 'no', combined: 'yes', separable: 'yes',
    components: [{ label: '라벨', material: '비닐', type: 'packaging', contaminated: 'no' }],
  };
  const result = judgeDisposal(input);
  const markup = resultMarkup(input, result);
  const { parts, steps } = resultStepsForDisplay(result);
  const boxes = [...markup.matchAll(/data-disposal-step hidden disabled/g)]
    .map(() => ({ hidden: true, disabled: true, checked: false }));
  assert.equal(boxes.length, steps.length + parts.flatMap(part => part.steps).length);
  assert.match(markup, /라벨 · 비닐[\s\S]*?<input type="checkbox" data-disposal-step hidden disabled>/);
  const toggle = new EventTarget();
  let pressed, focused = false;
  toggle.setAttribute = (_, value) => { pressed = value; };
  toggle.focus = () => { focused = true; };
  const reset = Object.assign(new EventTarget(), { hidden: true });
  const progress = { textContent: '' };
  const root = new EventTarget();
  const elements = {
    '[data-checklist-toggle]': toggle, '[data-checklist-reset]': reset, '[data-checklist-progress]': progress,
  };
  root.querySelector = selector => elements[selector];
  root.querySelectorAll = () => boxes;
  const click = button => button.dispatchEvent(new Event('click'));
  const change = box => root.dispatchEvent(Object.defineProperty(new Event('change'), 'target', { value: box }));
  const dispose = bindDisposalChecklist(root);

  click(toggle);
  assert.equal(pressed, 'true');
  assert.ok(boxes.every(box => !box.hidden && !box.disabled));
  boxes[0].checked = true;
  change(boxes[0]);
  assert.equal(progress.textContent, `확인한 단계 1 / ${boxes.length}`);
  assert.equal(reset.hidden, false);
  click(reset);
  assert.ok(focused);
  assert.ok(boxes.every(box => !box.checked));
  assert.equal(reset.hidden, true);
  boxes[0].checked = true;
  click(toggle);
  assert.equal(pressed, 'false');
  assert.equal(progress.textContent, '');
  assert.ok(boxes.every(box => box.hidden && box.disabled && !box.checked));
  dispose();
  click(toggle);
  assert.equal(pressed, 'false');
});
