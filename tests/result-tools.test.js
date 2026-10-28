import test from 'node:test';
import assert from 'node:assert/strict';
import { bindResultTools } from '../src/components/result-tools.js';

class Node extends EventTarget {
  attributes = new Map(); disabled = false; textContent = '';
  setAttribute(key,value){this.attributes.set(key,value);}
  getAttribute(key){return this.attributes.get(key);}
}
const pending = () => { let resolve, reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
function setup(tools, feedback = null) {
  const favorite=new Node(),status=new Node(),copy=new Node(),newItem=new Node();
  const nodes=new Map([['[data-favorite]',favorite],['[data-result-tools-status]',status],['[data-copy-result]',copy],['[data-new-item]',newItem]]);
  if (feedback) nodes.set('[data-feedback-form]',feedback);
  const root={isConnected:true,querySelector:selector=>nodes.get(selector) || null,contains:node=>[...nodes.values()].includes(node)};
  const dispose=bindResultTools(root,{itemName:'우유팩'},{ruleVersion:'old'}, {tools});
  return {root,favorite,status,dispose,click:()=>favorite.dispatchEvent(new Event('click'))};
}

test('즐겨찾기 저장 중 갱신이 와도 버튼을 유지하고 중복 저장을 차단한다', async () => {
  globalThis.window=new EventTarget();
  const initial=pending(),saving=pending(); let reads=0,writes=0,stored=false;
  const tools={listFavorites:()=>++reads===1?initial.promise:Promise.resolve(stored?[{key:'우유팩'}]:[]),setFavorite:async(_input,selected)=>{writes++;await saving.promise;stored=selected;}};
  const ui=setup(tools);
  try {
    ui.click(); await flush();
    assert.equal(writes,1); assert.equal(ui.favorite.disabled,true);
    window.dispatchEvent(new Event('favorites-changed')); await flush();
    assert.equal(ui.favorite.disabled,true);
    ui.click(); await flush(); assert.equal(writes,1);
    saving.resolve(); await flush();
    assert.equal(ui.favorite.getAttribute('aria-pressed'),'true');
    assert.equal(ui.favorite.disabled,false); assert.match(ui.status.textContent,/저장했어요/);
    initial.resolve([]); await flush();
    assert.equal(ui.favorite.getAttribute('aria-pressed'),'true','늦은 이전 읽기 결과는 무시');
  } finally {ui.dispose();delete globalThis.window;}
});

test('즐겨찾기 조회 실패 후 재시도와 화면 정리 후 응답은 현재 화면을 덮지 않는다', async () => {
  globalThis.window=new EventTarget(); const delayed=pending(); let fail=true,writes=0;
  const ui=setup({listFavorites:async()=>{if(fail)throw Error('조회 실패');return delayed.promise;},setFavorite:async()=>{writes++;}});
  try {
    await flush();ui.click();await flush();assert.match(ui.status.textContent,/조회 실패/);
    assert.equal(ui.favorite.disabled,false); assert.equal(writes,0);
    fail=false;ui.click();await flush();assert.equal(ui.favorite.disabled,true);
    ui.dispose();ui.root.isConnected=false;delayed.resolve([{key:'우유팩'}]);await flush();
    assert.equal(writes,0);assert.equal(ui.favorite.getAttribute('aria-pressed'),undefined);
  } finally {ui.dispose();delete globalThis.window;}
});

test('제보는 공백을 제외한 길이를 확인하고 전송 중 중복·초안 변경을 막는다', async () => {
  globalThis.window=new EventTarget();
  const form=new Node(),message=new Node(),kind=new Node(),button=new Node(),status=new Node(),sending=pending();
  message.value='          ';message.setCustomValidity=value=>{message.error=value;};message.reportValidity=()=>true;
  kind.value='correction';form.elements={message,kind};form.reportValidity=()=>true;
  form.querySelector=selector=>selector==='button'?button:status;
  form.reset=()=>{message.value='';};
  let payload,calls=0;
  const ui=setup({listFavorites:async()=>[],submitFeedback:async value=>{payload=value;calls++;return sending.promise;}},form);
  try {
    form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();
    assert.equal(calls,0);assert.match(message.error,/공백을 제외/);
    message.value='  정확한 품목과 지역의 안내를 확인해 주세요.  ';message.dispatchEvent(new Event('input'));
    assert.equal(message.error,'');
    form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();
    assert.equal(message.disabled,true);assert.equal(kind.disabled,true);assert.equal(button.disabled,true);
    assert.equal(payload.message,'정확한 품목과 지역의 안내를 확인해 주세요.');
    form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(calls,1);
    sending.resolve({id:'test-only'});await flush();
    assert.equal(message.disabled,false);assert.equal(button.disabled,false);assert.equal(message.value,'');
    assert.match(status.textContent,/검토 요청을 보냈어요/);
  } finally {ui.dispose();delete globalThis.window;}
});
