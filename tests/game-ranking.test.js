import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameRanking} from '../src/services/game-ranking.js';

test('게임 랭킹 서비스는 서버 RPC로만 답변을 보내며 클라이언트 점수는 전달하지 않는다',async()=>{
  const calls=[];
  const service=createGameRanking({getMember:()=>({id:'a'}),getClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true},error:null};}})});
  await service.start();await service.answer('session',3,'paper');await service.submit('session',' 학생 ');await service.list();
  assert.deepEqual(calls[1],{name:'answer_disposal_game',args:{p_session_id:'session',p_index:3,p_bin:'paper'}});
  assert.deepEqual(calls[2].args,{p_session_id:'session',p_display_name:'학생'});
  assert.ok(calls.every(call=>!Object.hasOwn(call.args,'score')));
});

test('로그아웃·계정 변경·DB 미설정 오류는 구분해 안내한다',async()=>{
  const guest=createGameRanking({getMember:()=>null,getClient:async()=>({rpc:async()=>({data:[]})})});
  await assert.rejects(guest.start(),/로그인/);assert.deepEqual(await guest.list(),[]);
  let member={id:'a'};
  const switched=createGameRanking({getMember:()=>member,getClient:async()=>{member={id:'b'};return {};}});
  await assert.rejects(switched.start(),/계정이 변경/);
  const missing=createGameRanking({getMember:()=>({id:'a'}),getClient:async()=>({rpc:async()=>({error:{code:'PGRST202'}})})});
  await assert.rejects(missing.list(),/SQL/);
  const offline=createGameRanking({getMember:()=>({id:'a'}),getClient:async()=>({rpc:async()=>({error:{code:'network'}})})});
  await assert.rejects(offline.start(),/연결/);
});
