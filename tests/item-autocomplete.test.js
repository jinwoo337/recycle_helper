import test from 'node:test';
import assert from 'node:assert/strict';
import { bindItemAutocomplete } from '../src/components/item-autocomplete.js';

class Element extends EventTarget {
  value = ''; hidden = true; textContent = ''; attributes = new Map(); children = [];
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  getAttribute(key) { return this.attributes.get(key); }
  set innerHTML(value) { this.children = [...value.matchAll(/data-candidate="(\d+)"/g)].map(() => new Element()); }
  focus() { this.dispatchEvent(new Event('focus')); }
  scrollIntoView() {}
}
function event(node, type, extra = {}) {
  const e = new Event(type, { cancelable: true }); Object.assign(e, extra); node.dispatchEvent(e); return e;
}
function setup() {
  const input = new Element(), options = new Element(), status = new Element(); input.form = new Element();
  let selected = 0;
  const binding = bindItemAutocomplete({ input, options, status, search: query => query ? ['약', '약봉지'] : [], onSelect: () => selected++, onCompositionEnd: () => {} });
  return { input, options, status, binding, selections: () => selected };
}
test('엔터는 활성 후보가 없어도 추천을 닫고 같은 이름의 뒤늦은 이벤트로 다시 열지 않는다', () => {
  const { input, options, binding } = setup(); input.value = '약'; event(input, 'input');
  assert.equal(options.hidden, false);
  event(input, 'keydown', { key: 'Enter' });
  assert.equal(options.hidden, true); assert.equal(input.getAttribute('aria-expanded'), 'false');
  event(input, 'compositionend'); event(input, 'input'); event(input, 'focus');
  assert.equal(options.hidden, true);
  input.value = '약봉'; event(input, 'input'); assert.equal(options.hidden, false);
  binding.dispose();
});
test('한글 조합을 엔터로 확정한 뒤 compositionend가 와도 추천을 닫아 둔다', () => {
  const { input, options, binding } = setup(); input.value = '야'; event(input, 'input');
  event(input, 'keydown', { key: 'Enter', isComposing: true });
  input.value = '약'; event(input, 'compositionend'); event(input, 'input');
  assert.equal(options.hidden, true); binding.dispose();
});
test('방향키·엔터 선택은 선택 콜백을 한 번 실행하고 Esc 후 방향키로 다시 탐색할 수 있다', () => {
  const { input, options, binding, selections } = setup(); input.value = '약'; event(input, 'input');
  event(input, 'keydown', { key: 'ArrowDown' });
  const enter = event(input, 'keydown', { key: 'Enter' });
  assert.equal(enter.defaultPrevented, true); assert.equal(selections(), 1); assert.equal(options.hidden, true);
  event(input, 'keydown', { key: 'ArrowDown' }); assert.equal(options.hidden, false);
  event(input, 'keydown', { key: 'Escape' }); assert.equal(options.hidden, true);
  event(input, 'keydown', { key: 'ArrowUp' }); assert.equal(options.hidden, false); binding.dispose();
});
test('입력 오류·외부 클릭·포커스 이탈로 추천을 닫으며 화면 정리 후 이벤트가 남지 않는다', () => {
  const { input, options, binding } = setup(); input.value = '약'; event(input, 'input');
  event(input.form, 'invalid'); assert.equal(options.hidden, true);
  input.value = '약봉'; event(input, 'input'); event(input, 'blur'); assert.equal(options.hidden, true);
  binding.dispose(); input.value = '새 이름'; event(input, 'input'); assert.equal(options.hidden, true);
});

test('폼 밖 클릭에서도 추천을 닫고 선택지 ID는 화면별로 구분한다', () => {
  const input=new Element(),options=new Element(),status=new Element(),doc=new Element(); input.form=new Element(); input.ownerDocument=doc;
  options.id='quick-items'; input.value='약';
  const binding=bindItemAutocomplete({input,options,status,search:()=>['약']});
  event(input,'input'); event(input,'keydown',{key:'ArrowDown'});
  assert.equal(input.getAttribute('aria-activedescendant'),'quick-items-option-0');
  event(doc,'pointerdown'); assert.equal(options.hidden,true);
  binding.dispose(); input.value='새 이름'; event(input,'input'); assert.equal(options.hidden,true);
});
