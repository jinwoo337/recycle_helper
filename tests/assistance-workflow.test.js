import test from 'node:test';
import assert from 'node:assert/strict';
import { bindAssistance } from '../src/pages/assistance/assistance.js';

class Control extends EventTarget {
  value=''; disabled=false; hidden=false; isConnected=true; textContent=''; innerHTML=''; attributes=new Map();
  setAttribute(key,value){this.attributes.set(key,value);}
  removeAttribute(key){this.attributes.delete(key);}
  setCustomValidity(value){this.validation=value;}
  reportValidity(){return !this.validation;}
  focus(){this.focused=true;}
  scrollIntoView(){}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  closest(){return null;}
}
const delayed=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const answer={itemName:'용기',identification:'설명에 적힌 용기예요.',method:'오염과 표시를 확인해 주세요.',confidence:'medium',evidence:'object',steps:['상태를 확인해 주세요.'],markings:[],cautions:[],questions:[]};

function setup(mode, options={}) {
  const form=new Control(),description=new Control(),submit=new Control(),cancel=new Control(),result=new Control(),status=new Control(),camera=new Control(),gallery=new Control(),remove=new Control(),preview=new Control(),image=new Control(),photoMessage=new Control(),photoStatus=new Control(),count=new Control(),previouslyDisabled=new Control();
  previouslyDisabled.disabled=true;
  const nodes={'[data-assist-form]':form,'[data-assist-status]':status,'[data-assist-result]':result,'[data-assist-cancel]':cancel,'[data-assist-preview]':preview,'[data-assist-image]':image,'[data-assist-remove]':remove,'[data-assist-photo-message]':photoMessage,'[data-assist-photo-status]':photoStatus,'[data-assist-count]':count};
  const root={isConnected:true,querySelector:key=>nodes[key]};
  form.elements={namedItem:key=>({description,camera,gallery})[key]};
  form.querySelector=()=>submit;
  form.querySelectorAll=()=>[description,submit,cancel,camera,gallery,remove,previouslyDisabled];
  const dispose=bindAssistance(mode,{root,bindRegion:()=>({validate:()=>true,get:()=>null}),...options});
  const send=()=>form.dispatchEvent(new Event('submit',{cancelable:true}));
  function followup(values) {
    const fields=values.map(value=>Object.assign(new Control(),{value})),followupForm=new Control(),followupCancel=new Control(),followupStatus=new Control(),button=new Control();
    followupForm.elements={namedItem:key=>fields[Number(key.replace('answer',''))]};
    result.querySelector=key=>key==='[data-assist-followup-cancel]'?followupCancel:key==='[data-assist-followup-status]'?followupStatus:null;
    result.querySelectorAll=()=>[...fields,button,followupCancel];
    result.closest=key=>key==='[data-assist-followup-form]'?followupForm:null;
    return {fields,form:followupForm,cancel:followupCancel,status:followupStatus,send:()=>result.dispatchEvent(new Event('submit',{cancelable:true}))};
  }
  return {form,description,submit,cancel,result,status,camera,gallery,remove,preview,image,photoMessage,previouslyDisabled,send,dispose,root,followup};
}

test('설명 모드는 중복 전송을 막고 취소 뒤 늦은 응답이 새 답을 덮지 않는다', async()=>{
  const first=delayed(),second=delayed();let calls=0,firstSignal;
  const ui=setup('description',{request:async(_input,{signal})=>{calls++;if(calls===1){firstSignal=signal;return first.promise;}return second.promise;}});
  ui.description.value='재질 표시가 PP인 배달 용기예요.';
  try {
    ui.send();ui.send();assert.equal(calls,1);assert.equal(ui.description.disabled,true);assert.equal(ui.cancel.hidden,false);
    ui.cancel.dispatchEvent(new Event('click'));assert.equal(firstSignal.aborted,true);assert.equal(ui.description.disabled,false);assert.equal(ui.previouslyDisabled.disabled,true);assert.match(ui.status.textContent,/취소/);
    ui.send();assert.equal(calls,2);
    first.resolve({...answer,itemName:'이전 답'});await flush();assert.equal(ui.submit.disabled,true);assert.ok(!ui.result.innerHTML.includes('이전 답'));
    second.resolve(answer);await flush();assert.equal(ui.submit.disabled,false);assert.match(ui.result.innerHTML,/용기/);assert.equal(ui.result.hidden,false);
    ui.description.dispatchEvent(new Event('input'));assert.equal(ui.result.hidden,true,'설명을 고치면 이전 결과는 숨김');
  }finally{ui.dispose();}
});

test('질문마다 짧게 답하고 처음 설명·이전 답변을 유지하며 다음 질문으로 이어간다',async()=>{
  const calls=[];let fail=false;
  const questions=['책상의 주된 재질은 무엇인가요?','책상의 크기는 어느 정도인가요?'];
  const ui=setup('description',{request:async value=>{
    calls.push(structuredClone(value));if(fail)throw Error('연결 실패');
    return calls.length===1?{...answer,questions,questionChoices:[['철제','나무'],[]]}:{...answer,questions:['오염을 닦아낼 수 있나요?'],questionChoices:[['네','아니요']]};
  }});
  const original='음식이 묻은 책상이에요.';ui.description.value=original;
  try{
    ui.send();await flush();const first=ui.followup(['철제','']);first.send();await flush();
    assert.equal(ui.description.value,original);assert.equal(calls[1].description,original);
    assert.deepEqual(calls[1].answers,[{question:questions[0],answer:'철제'}],'빈 답변은 전송하지 않는다');
    const second=ui.followup(['네']);fail=true;second.send();await flush();
    assert.equal(second.fields[0].value,'네');assert.equal(second.fields[0].disabled,false);assert.match(second.status.textContent,/연결 실패/);assert.equal(ui.result.hidden,false);
    fail=false;second.send();await flush();assert.deepEqual(calls[3].answers,[{question:questions[0],answer:'철제'},{question:'오염을 닦아낼 수 있나요?',answer:'네'}]);
    ui.description.value='다른 책상으로 바꿨는데 나무로 만들어졌어요.';ui.description.dispatchEvent(new Event('input'));ui.send();await flush();assert.equal(calls.at(-1).answers,undefined,'새 설명에는 이전 물건의 답변을 섞지 않는다');
  }finally{ui.dispose();}
});

test('빈 추가 답변은 전송하지 않고 추가 분석 취소 후 입력을 보존한다',async()=>{
  const pending=delayed();let calls=0,signal;
  const ui=setup('description',{request:async(_value,options)=>{calls++;if(calls===1)return {...answer,questions:['재질은 무엇인가요?']};signal=options.signal;return pending.promise;}});
  ui.description.value='재질을 알 수 없는 책상을 버려요.';
  try{
    ui.send();await flush();const followup=ui.followup(['']);followup.send();assert.equal(calls,1);assert.match(followup.status.textContent,/하나 이상/);
    followup.fields[0].value='모르겠어요';followup.send();assert.equal(followup.fields[0].disabled,true);assert.equal(followup.cancel.hidden,false);
    ui.cancel.dispatchEvent(new Event('click'));assert.equal(signal.aborted,true);assert.equal(followup.fields[0].value,'모르겠어요');assert.equal(followup.fields[0].disabled,false);
    pending.resolve({...answer,itemName:'취소한 답'});await flush();assert.ok(!ui.result.innerHTML.includes('취소한 답'));
  }finally{ui.dispose();}
});

test('AI 실패·화면 이동에도 설명을 유지하고 늦은 결과를 표시하지 않는다',async()=>{
  const request=delayed();const ui=setup('description',{request:()=>request.promise});ui.description.value='용기 안에 음식이 조금 남아 있어요.';
  ui.send();request.reject(Error('다시 시도해 주세요.'));await flush();assert.match(ui.status.textContent,/다시 시도/);assert.equal(ui.description.value,'용기 안에 음식이 조금 남아 있어요.');assert.equal(ui.submit.disabled,false);
  ui.dispose();
  const late=delayed();let signal;const moved=setup('description',{request:(_input,options)=>{signal=options.signal;return late.promise;}});moved.description.value='뚜껑에 금속 부품이 붙은 용기예요.';moved.send();moved.dispose();moved.root.isConnected=false;late.resolve(answer);await flush();assert.equal(signal.aborted,true);assert.equal(moved.result.innerHTML,'');
});

test('사진은 선택만으로 전송하지 않고 교체·삭제 뒤 오래된 준비 결과를 무시한다',async()=>{
  const one=delayed(),two=delayed();let preparations=0,calls=0,captured;
  const ui=setup('photo',{preparePhoto:()=>++preparations===1?one.promise:two.promise,request:async(value)=>{calls++;captured=value;return answer;}});
  try {
    ui.send();assert.equal(calls,0);assert.match(ui.status.textContent,/사진을 먼저/);
    ui.gallery.files=[{type:'image/jpeg',size:100}];ui.gallery.dispatchEvent(new Event('change'));assert.equal(ui.submit.disabled,true);
    ui.camera.files=[{type:'image/jpeg',size:200}];ui.camera.dispatchEvent(new Event('change'));
    one.resolve({image:{mimeType:'image/jpeg',data:'old'},preview:'old'});await flush();assert.equal(ui.image.src,undefined);
    two.resolve({image:{mimeType:'image/jpeg',data:'new'},preview:'new'});await flush();assert.equal(ui.image.src,'new');assert.equal(ui.submit.disabled,false);assert.equal(calls,0);
    ui.send();await flush();assert.equal(calls,1);assert.equal(captured.image.data,'new');
    ui.remove.dispatchEvent(new Event('click'));ui.send();assert.equal(calls,1);assert.equal(ui.preview.hidden,true);
  }finally{ui.dispose();}
});
