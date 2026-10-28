import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/classify.js';
import { verifiedNameGuide } from '../src/domain/disposal/verified-name-guide.js';
import { aiOpinionNeedsReview } from '../src/domain/disposal/ai-classification.js';
import { requestAiGuess } from '../src/services/ai-classify.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

test('옷의 기준 안내는 상태별 의류 수거를 유지하고 AI 종량제 단정에 덮이지 않는다',()=>{
  const itemName='옷';
  const result=judgeDisposal({itemName,category:'clothing',aiGuess:{itemName,material:'기타',type:'',route:'general',confidence:'high',reason:'의류는 모두 종량제봉투에 버려요.'}});
  assert.match(result.method,/의류/);assert.ok(result.steps.some(step=>step.includes('의류 전용 수거함')));
  assert.ok(!result.steps.some(step=>step.includes('의류는 모두')));
  assert.equal(aiOpinionNeedsReview(result,{route:'general'}),true,'추가 확인 필요 판정도 확정 AI 의견을 검토한다');
  assert.equal(aiOpinionNeedsReview({status:'check'},{route:'recyclable'}),true);
  assert.equal(aiOpinionNeedsReview({status:'general'},{route:'large'}),true);
  assert.equal(aiOpinionNeedsReview({status:'recycle'},{route:'recyclable'}),false);
  assert.equal(aiOpinionNeedsReview({status:'check'},{route:'unknown'}),false);
});

test('검토된 전용 품목에는 AI·공용 AI 캐시를 읽지 않고 기존 안내를 사용한다',async()=>{
  let calls=0;
  for(const name of ['옷','겨울옷','약','남은약','건전지','부푼 AA 건전지','휴대폰']){
    assert.ok(verifiedNameGuide(name),name);
    const guess=await requestAiGuess(name,async()=>{calls++;throw Error('should not fetch');},{opinion:true});assert.equal(guess,null);
    const shared=await requestAiGuess(name,async()=>{calls++;throw Error('should not fetch');},{shared:true});assert.equal(shared,null);
  }
  assert.equal(calls,0);
  assert.equal(verifiedNameGuide('옷걸이'),null,'전용 품목과 비슷한 부속품을 오인하지 않는다');
  assert.equal(verifiedNameGuide('우유팩'),null,'일반 재활용 품목의 기존 상태 기반 의견은 유지한다');
});

test('서버도 검토된 의류·약·전지의 잘못된 캐시나 생성 의견을 반환하지 않는다',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('unexpected provider/cache read');};
  try{
    for(const [name,mode] of [['옷','opinion'],['건전지','opinion'],['만년묵은겨울옷','shared']]){
      const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},send(body){this.body=JSON.parse(body);}};
      await handler({method:'GET',headers:{},query:{name,mode}},res);
      assert.equal(res.code,200);assert.equal(res.body.guess,null);assert.equal(res.body.reason,'verified_guide');assert.equal(res.headers['Cache-Control'],'no-store');
    }
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});
