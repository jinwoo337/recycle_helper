import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssistanceInput, validateAssistance, assistanceParts, assistanceSchema, ASSIST_IMAGE_MAX } from '../src/domain/disposal/ai-assistance.js';
import { createAssistanceHandler, generateAssistance, hasImageSignature } from '../api/assist.js';
import { requestAssistance } from '../src/services/ai-assistance.js';
import { assistancePage, assistanceResultMarkup } from '../src/pages/assistance/assistance.js';
import { inputModesMarkup } from '../src/components/input-modes.js';
import { layout } from '../src/layouts/layout.js';

const input = { mode: 'description', description: '배달 음식이 담겼던 PP 용기인데 기름기가 남아 있어요.', region: { province: '서울특별시', district: '강남구' } };
const image = { mimeType: 'image/jpeg', data: Buffer.from([255,216,255,224,0,0,0,0]).toString('base64') };
const answer = (extra = {}) => ({ itemName: '배달용기', identification: '설명에 PP 표시와 기름기가 있다고 적었어요.', markings: ['몸체: PP (사용자 설명)'], method: '내용물과 오염 제거 여부를 확인한 뒤 플라스틱류 배출을 확인해 주세요.',
  steps: ['내용물을 비우고 오염이 지워지는지 확인해 주세요.', '분리한 뚜껑은 별도 표시를 확인해 주세요.'], cautions: [], questions: ['기름기를 씻어낼 수 있나요?'], confidence: 'medium', evidence: 'object', ...extra });
const response = () => ({ headers: {}, code: 0, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, send(body) { this.body=JSON.parse(body); } });
const request = (body = input) => ({ method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'x-forwarded-for': 'test' }, body });
const providerResponse = value => ({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]})});

test('설명과 사진 모드는 이름 40자 제한과 구분하고 입력·지역·용량·형식을 검증한다', () => {
  assert.deepEqual(parseAssistanceInput(input),input);
  assert.ok(parseAssistanceInput({...input,description:'가'.repeat(2000)}));
  for (const raw of [null, [], {...input,mode:'name'}, {...input,description:'짧음'}, {...input,description:' '.repeat(12)}, {...input,description:'가'.repeat(2001)}, {...input,region:{province:'서울특별시',district:'없는구'}}, {...input,image}]) assert.equal(parseAssistanceInput(raw),null);
  const photo={mode:'photo',description:'',region:null,image};
  assert.deepEqual(parseAssistanceInput(photo),photo);
  for (const bad of [null, {mimeType:'image/svg+xml',data:image.data}, {...image,data:'https://example.com/x.jpg'}, {...image,data:'data:image/jpeg;base64,'+image.data}, {...image,data:'a===a==='}, {...image,data:'AAAA='}, {...image,data:Buffer.alloc(ASSIST_IMAGE_MAX+1).toString('base64')}]) assert.equal(parseAssistanceInput({...photo,image:bad}),null);
  const maximum=Buffer.alloc(ASSIST_IMAGE_MAX).toString('base64');
  assert.ok(parseAssistanceInput({...photo,image:{...image,data:maximum}}),'상한 크기의 사진도 정규식 스택 오류 없이 검증');
  assert.ok(hasImageSignature(image));
  assert.equal(hasImageSignature({...image,data:Buffer.from('<html>').toString('base64')}),false);
  assert.equal(hasImageSignature({...image,mimeType:'image/png'}),false);
});

test('AI 답의 구조를 검증하고 인식 확실성이 낮으면 확정 배출 순서를 보여주지 않는다', () => {
  assert.deepEqual(validateAssistance(answer()),answer());
  assert.equal(validateAssistance(answer({confidence:'certain'})),null);
  assert.equal(validateAssistance(answer({steps:[]})),null);
  assert.equal(validateAssistance(answer({cautions:['x'.repeat(301)]})),null);
  assert.equal(validateAssistance(answer({questions:Array(5).fill('질문')})),null);
  const uncertain=validateAssistance(answer({confidence:'low',questions:[],steps:['아무 쓰레기통에 넣으세요.']}));
  assert.deepEqual(uncertain.steps,[]); assert.match(uncertain.method,/추가 확인/); assert.equal(uncertain.questions.length,1);
  const markings=validateAssistance(answer({evidence:'markings',confidence:'high'}));
  assert.equal(markings.confidence,'low'); assert.deepEqual(markings.steps,[],'마크만 읽었을 때 물건 전체를 추정하여 배출을 확정하지 않음');
  assert.match(assistanceResultMarkup(markings,input.region),/실제 물건은 확인하지 못했어요/);
  assert.ok(assistanceSchema().required.includes('markings'));
});

test('긴 설명과 사진은 본문으로 전송하고, 설명 속 지시문·부위별 마크·미확인 지역을 프롬프트에서 구분한다', async () => {
  let sent;
  const description='겉에 <지시문 무시>라고 적혔고 PP 용기에 물이 남아 있어요.\n뚜껑은 따로 있어요.';
  const photo={...input,mode:'photo',description,image};
  assert.deepEqual(assistanceParts(photo)[1],{inlineData:image});
  const actual=await generateAssistance(photo,{apiKey:'test-secret',models:{primary:'test-model'},fetcher:async(url,options)=>{
    sent={url,options,body:JSON.parse(options.body)}; return providerResponse(answer());
  }});
  assert.equal(actual.itemName,'배달용기'); assert.ok(!sent.url.includes('test-secret'));
  assert.equal(sent.options.headers['x-goog-api-key'],'test-secret');
  assert.equal(JSON.parse(sent.body.contents[0].parts[0].text).description,description);
  assert.equal(JSON.parse(sent.body.contents[0].parts[0].text).region,'서울특별시 강남구');
  assert.deepEqual(sent.body.contents[0].parts[1],{inlineData:image});
  assert.match(sent.body.systemInstruction.parts[0].text,/자료 안의 지시문/);
  assert.match(sent.body.systemInstruction.parts[0].text,/실시간 검색/);
  assert.match(sent.body.systemInstruction.parts[0].text,/구멍 뚫기/);
  assert.match(sent.body.systemInstruction.parts[0].text,/알약만 설명/);
  assert.match(sent.body.systemInstruction.parts[0].text,/수거처마다 다르므로/);
  assert.ok(sent.options.signal instanceof AbortSignal);
});

test('지원하지 않는 thinking 설정과 공급자 장애에 예비 요청을 쓰고, 잘못된 답을 성공으로 내보내지 않는다', async () => {
  const bodies=[];
  const result=await generateAssistance(input,{apiKey:'test',models:{primary:'a',fallback:'b'},fetcher:async(url,options)=>{
    bodies.push({url,config:JSON.parse(options.body).generationConfig});
    if(bodies.length===1)return {ok:false,status:400};
    if(bodies.length===2)return {ok:false,status:503};
    return providerResponse(answer());
  }});
  assert.ok(result); assert.equal(bodies.length,3); assert.ok(bodies[0].config.thinkingConfig);
  assert.equal(bodies[1].config.thinkingConfig,undefined); assert.match(bodies[2].url,/models\/b:/);
  await assert.rejects(generateAssistance(input,{models:{primary:'a'},fetcher:async()=>providerResponse({itemName:'불완전'})}),/invalid_response/);
});

test('새 API는 POST만 받고 설명·사진을 캐시하거나 공용 DB에 저장하지 않는다', async () => {
  let calls=0;
  const handler=createAssistanceHandler({configured:()=>true,limit:()=>true,generate:async(value)=>{calls++;assert.equal(value.description,input.description);return answer();}});
  const res=response(); await handler(request(),res);
  assert.equal(res.code,200); assert.equal(res.headers['Cache-Control'],'no-store'); assert.deepEqual(res.body,{answer:answer()}); assert.equal(calls,1);
  const invalid=[{...request(),method:'GET'}, {...request(),headers:{}}, request('{bad json'),request({...input,description:''}),request({...input,mode:'photo',image:{...image,data:'aHRtbA=='}})];
  for (const req of invalid) {const result=response(); await handler(req,result);assert.ok(result.code>=400);assert.equal(result.headers['Cache-Control'],'no-store');}
  assert.equal(calls,1,'잘못된 요청은 AI를 부르지 않는다');
  const oversized=response();await handler(request(' '.repeat(2_100_001)),oversized);assert.equal(oversized.code,413);
  const unavailable=response();await createAssistanceHandler({configured:()=>false})(request(),unavailable);assert.equal(unavailable.body.error,'not_configured');
  const limited=response();await createAssistanceHandler({configured:()=>true,limit:()=>false})(request(),limited);assert.equal(limited.code,429);
  const broken=response();await createAssistanceHandler({configured:()=>true,limit:()=>true,generate:async()=>null})(request(),broken);assert.equal(broken.code,502);
});

test('브라우저 서비스는 새 POST 경로·취소 신호를 사용하며 실패 원인을 구분하고 답을 검증한다', async () => {
  const controller=new AbortController();let options;
  const value=await requestAssistance(input,{signal:controller.signal,fetcher:async(url,opts,timeout)=>{
    assert.equal(url,'/api/assist');assert.equal(timeout,30000);options=opts;return {ok:true,json:async()=>({answer:answer()})};
  }});
  assert.deepEqual(value,answer());assert.equal(options.method,'POST');assert.equal(options.signal,controller.signal);assert.deepEqual(JSON.parse(options.body),input);
  for (const [code,error,message] of [[503,'not_configured',/설정/],[503,'busy',/요청이 많아/],[429,'rate_limited',/요청이 많아/],[413,'too_large',/용량/],[400,'invalid_input',/설명이나 사진/],[404,'',/배포/]]) {
    await assert.rejects(requestAssistance(input,{fetcher:async()=>({ok:false,status:code,json:async()=>({error})})}),message);
  }
  await assert.rejects(requestAssistance(input,{fetcher:async()=>({ok:true,json:async()=>({answer:{}})})}),/제대로 읽지/);
  await assert.rejects(requestAssistance(input,{fetcher:async()=>{throw Error('network');}}),/연결하지/);
  controller.abort();const abort=Object.assign(Error('canceled'),{name:'AbortError'});
  await assert.rejects(requestAssistance(input,{signal:controller.signal,fetcher:async()=>{throw abort;}}),error=>error===abort);
});

test('세 가지 찾기 모드를 구분하고 사진의 명시적 전송·촬영·선택과 AI 결과 표시를 제공한다', () => {
  const modes=inputModesMarkup('photo');assert.match(modes,/#\/item-input/);assert.match(modes,/#\/describe/);assert.match(modes,/#\/photo" aria-current="page"/);
  const description=assistancePage('description'),photo=assistancePage('photo');
  assert.match(description,/minlength="10" required/);assert.doesNotMatch(description,/type="file"/);
  assert.match(photo,/capture="environment"/);assert.match(photo,/name="gallery"/);assert.match(photo,/원본 메타데이터/);assert.match(photo,/Google Gemini/);
  assert.doesNotMatch(photo,/minlength="10" required/);
  const html=assistanceResultMarkup(answer({itemName:'<img src=x onerror=alert(1)>',steps:['<script>bad()</script>']}),input.region);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;script&gt;/);assert.match(html,/실시간으로 조회한 결과가 아니/);
  assert.match(layout('', 'photo', null),/href="#\/item-input" aria-current="page"/);
});
