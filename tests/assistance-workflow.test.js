import test from 'node:test';
import assert from 'node:assert/strict';
import { bindAssistance } from '../src/pages/assistance/assistance.js';
import { queueInput } from '../src/services/input-draft.js';

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
const answer={itemName:'조립용 받침',identification:'설명에 적힌 물건이에요.',method:'오염과 표시를 확인해 주세요.',confidence:'medium',evidence:'object',steps:['상태를 확인해 주세요.'],markings:[],cautions:[],questions:[]};

function setup(mode, { resume = false, ...options } = {}) {
  const form=new Control(),description=new Control(),submit=new Control(),cancel=new Control(),result=new Control(),status=new Control(),camera=new Control(),gallery=new Control(),remove=new Control(),preview=new Control(),image=new Control(),photoMessage=new Control(),photoStatus=new Control(),count=new Control(),previouslyDisabled=new Control();
  previouslyDisabled.disabled=true;
  const nodes={'[data-assist-form]':form,'[data-assist-status]':status,'[data-assist-result]':result,'[data-assist-cancel]':cancel,'[data-assist-preview]':preview,'[data-assist-image]':image,'[data-assist-remove]':remove,'[data-assist-photo-message]':photoMessage,'[data-assist-photo-status]':photoStatus,'[data-assist-count]':count,'#assist-description-error':new Control()};
  const root={isConnected:true,querySelector:key=>nodes[key]};
  form.elements={namedItem:key=>({description,camera,gallery})[key]};
  form.querySelector=()=>submit;
  form.querySelectorAll=()=>[description,submit,cancel,camera,gallery,remove,previouslyDisabled];
  if (!resume) queueInput({ newSearch: true }, mode === 'photo' ? '/photo' : '/describe');
  result.hidden = true;
  const dispose=bindAssistance(mode,{root,bindRegion:(_form, initial)=>({validate:()=>true,get:()=>initial}),...options});
  const send=()=>form.dispatchEvent(new Event('submit',{cancelable:true}));
  function followup(values) {
    const fields=values.map(value=>Object.assign(new Control(),{value})),followupForm=new Control(),followupCancel=new Control(),followupStatus=new Control(),button=new Control();
    followupForm.elements={namedItem:key=>fields[Number(key.replace('answer',''))]};
    result.querySelector = key => ({
      '[data-assist-followup-form]': followupForm,
      '[data-assist-followup-cancel]': followupCancel,
      '[data-assist-followup-status]': followupStatus,
    })[key] || null;
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
    second.resolve(answer);await flush();assert.equal(ui.submit.disabled,false);assert.match(ui.result.innerHTML,/조립용 받침/);assert.equal(ui.result.hidden,false);
    ui.description.dispatchEvent(new Event('input'));assert.equal(ui.result.hidden,true,'설명을 고치면 이전 결과는 숨김');
  }finally{ui.dispose();}
});

test('등록된 전용 품목명은 AI 없이 안내하고, AI가 확인한 품목도 등록된 배출 기준을 우선한다', async () => {
  let calls = 0;
  const ui = setup('description', { request: async () => {
    calls++;
    return { ...answer, itemName: '옷', method: '종량제봉투에 넣으세요', cautions: ['옷은 항상 종량제로 배출해요.'] };
  } });
  try {
    ui.description.value = '약';
    ui.send(); await flush();
    assert.equal(calls, 0);
    assert.match(ui.result.innerHTML, /등록 품목 안내.*폐의약품 전용 수거처로 배출/s);
    ui.description.value = '깨끗하고 더 입을 수 있는 천으로 된 바지예요.';
    ui.description.dispatchEvent(new Event('input'));
    ui.send(); await flush();
    assert.equal(calls, 1);
    assert.match(ui.result.innerHTML, /의류·잡화 상태는 어떤가요/);
    assert.match(ui.result.innerHTML, /data-assist-handling="reusable"/);
    assert.doesNotMatch(ui.result.innerHTML, /종량제봉투에 넣으세요|옷은 항상/);
    ui.result.closest = selector => selector === '[data-assist-handling]' ? { dataset: { assistHandling: 'reusable' } } : null;
    ui.result.dispatchEvent(new Event('click'));
    assert.equal(calls, 1, '선택한 상태는 AI 재요청 없이 등록 기준으로 판별');
    assert.match(ui.result.innerHTML, /재사용 가능한 의류·잡화 · 전용 수거함 확인/);
    assert.match(ui.result.innerHTML, /물건 상태 · 깨끗하고 다시 쓸 수 있어요/);
    assert.match(ui.result.innerHTML, /data-copy-result/);
  } finally { ui.dispose(); }
});

test('설명에서 추정한 깨진 유리의 이름을 확인한 뒤 지역 기준을 보여 준다', async () => {
  queueInput({ region: { province: '경기도', district: '김포시' }, newSearch: true }, '/describe');
  const ui = setup('description', { resume: true, request: async () => ({
    ...answer, itemName: '깨진 유리병', method: '일반 종량제봉투에 버려요', steps: ['일반 종량제봉투에 버려요'],
  }) });
  try {
    ui.description.value = '유리로 된 병이 바닥에 떨어졌어요.';
    ui.send(); await flush();
    assert.match(ui.result.innerHTML, /data-assist-confirm-identity/);
    assert.doesNotMatch(ui.result.innerHTML, /백색마대|data-copy-result/);
    ui.result.closest = selector => selector === '[data-assist-confirm-identity]' ? {} : null;
    ui.result.dispatchEvent(new Event('click'));
    assert.match(ui.result.innerHTML, /김포시 백색마대봉투/);
    assert.doesNotMatch(ui.result.innerHTML, /일반 종량제봉투에 버려요/);
  } finally { ui.dispose(); }
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
    ui.send();assert.equal(calls,0);assert.match(ui.photoMessage.textContent,/사진을 먼저/);
    ui.gallery.files=[{type:'image/jpeg',size:100}];ui.gallery.dispatchEvent(new Event('change'));assert.equal(ui.submit.disabled,true);
    ui.camera.files=[{type:'image/jpeg',size:200}];ui.camera.dispatchEvent(new Event('change'));
    one.resolve({image:{mimeType:'image/jpeg',data:'old'},preview:'old'});await flush();assert.equal(ui.image.src,undefined);
    two.resolve({image:{mimeType:'image/jpeg',data:'new'},preview:'new'});await flush();assert.equal(ui.image.src,'new');assert.equal(ui.submit.disabled,false);assert.equal(calls,0);
    ui.send();await flush();assert.equal(calls,1);assert.equal(captured.image.data,'new');
    ui.remove.dispatchEvent(new Event('click'));ui.send();assert.equal(calls,1);assert.equal(ui.preview.hidden,true);
  }finally{ui.dispose();}
});

test('잘못된 새 사진은 기존 사진을 지우지 않고 사진 후속 질문에도 답할 수 있다', async () => {
  const question = '내용물이 남아 있나요?';
  const calls = [];
  const image = { mimeType: 'image/jpeg', data: 'sample' };
  let attempts = 0;
  const ui = setup('photo', {
    preparePhoto: async () => {
      if (++attempts > 1) throw new Error('사진을 열 수 없어요.');
      return { image, preview: 'original' };
    },
    request: async input => {
      calls.push(input);
      return { ...answer, questions: calls.length > 1 ? ['내용물이 남아 있나요？'] : [question] };
    },
  });
  try {
    ui.gallery.files = [{ type: 'image/jpeg', size: 123 }];
    ui.gallery.dispatchEvent(new Event('change'));
    await flush();
    ui.gallery.dispatchEvent(new Event('change'));
    await flush();
    assert.equal(ui.image.src, 'original');
    assert.match(ui.photoMessage.textContent, /기존 사진을 유지/);
    ui.send();
    await flush();
    assert.equal(ui.form.hidden, true);
    ui.followup(['비웠어요']).send();
    await flush();
    assert.deepEqual(calls[1].image, image);
    assert.deepEqual(calls[1].answers, [{ question, answer: '비웠어요' }]);
    assert.doesNotMatch(ui.result.innerHTML, /data-assist-followup-form/);
  } finally { ui.dispose(); }
});

test('설명으로 이동했다 돌아와도 사진과 설명을 유지하고 새 검색에서는 비운다', async () => {
  const photo = setup('photo', { preparePhoto: async () => ({ image: { mimeType: 'image/jpeg', data: 'sample' }, preview: 'sample-preview' }) });
  photo.description.value = '라벨 표시가 희미해요.';
  photo.gallery.files = [{ type: 'image/jpeg', size: 123 }];
  photo.gallery.dispatchEvent(new Event('change'));
  await flush();
  photo.dispose();
  const describe = setup('description', { resume: true });
  assert.equal(describe.description.value, '라벨 표시가 희미해요.');
  describe.description.value += ' 본체는 가벼워요.';
  describe.dispose();
  const back = setup('photo', { resume: true });
  assert.equal(back.description.value, '라벨 표시가 희미해요. 본체는 가벼워요.');
  assert.equal(back.image.src, 'sample-preview');
  back.dispose();
  const fresh = setup('photo');
  assert.equal(fresh.description.value, '');
  assert.equal(fresh.image.src, undefined);
  fresh.dispose();
});

test('사진으로 돌아오면 이전 결과와 작성 중인 답을 복원하고 지역이 바뀌면 결과만 갱신한다', async () => {
  const question = '내용물이 남아 있나요?';
  let calls = 0;
  const request = async () => { calls++; return { ...answer, questions: [question] }; };
  const photo = setup('photo', {
    preparePhoto: async () => ({ image: { mimeType: 'image/jpeg', data: 'sample' }, preview: 'sample-preview' }),
    request,
  });
  photo.description.value = '플라스틱 부속품이 있어요.';
  photo.gallery.files = [{ type: 'image/jpeg', size: 123 }];
  photo.gallery.dispatchEvent(new Event('change'));
  await flush();
  photo.send();
  await flush();
  photo.followup(['조금 남았어요']);
  photo.dispose();

  setup('description', { resume: true }).dispose();
  const back = setup('photo', { resume: true, request });
  assert.equal(back.result.hidden, false);
  assert.match(back.result.innerHTML, /value="조금 남았어요"/);
  assert.equal(back.image.src, 'sample-preview');
  assert.equal(calls, 1);
  back.dispose();

  queueInput({ region: { province: '서울특별시', district: '노원구' } }, '/photo');
  const changedRegion = setup('photo', { resume: true, request });
  assert.equal(changedRegion.result.hidden, true);
  assert.equal(changedRegion.image.src, 'sample-preview');
  changedRegion.dispose();
});
