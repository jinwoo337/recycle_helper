import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {GAME_QUESTIONS,gameItemKey,validateRankedGameState} from '../src/domain/disposal/game.js';

test('랭킹 PostgreSQL: 서버 시간·채점·재시도·계정 격리·최고 기록·공개 범위',async()=>{
  const db=new PGlite();
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  async function asUser(id,sql,args=[],role='authenticated'){
    await db.exec(`begin;set local role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id || '']);
    try{const result=await db.query(sql,args);await db.exec('commit');return result.rows[0]?.data;}
    catch(error){await db.exec('rollback');throw error;}
  }
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    await db.query('insert into auth.users values($1),($2)',[a,b]);
    const sql=await readFile(new URL('../supabase/game-ranking.sql',import.meta.url),'utf8');
    await db.exec(sql);await db.exec(sql);
    const seeds=(await db.query('select * from public.disposal_game_questions')).rows;
    assert.equal(seeds.length,GAME_QUESTIONS.length);
    for(const q of GAME_QUESTIONS)assert.equal(seeds.find(row=>row.id===q.id).bin,q.bin);
    await assert.rejects(asUser(null,'select public.start_disposal_game_v2() as data',[],'anon'),{code:'42501'});
    await assert.rejects(asUser(a,'select * from public.disposal_game_sessions'),{code:'42501'});
    await assert.rejects(asUser(a,"insert into public.disposal_game_scores values(gen_random_uuid(),$1,'조작',240,240,now())",[a]),{code:'42501'});
    const initial=await asUser(a,'select public.start_disposal_game_v2() as data');
    validateRankedGameState(initial);
    assert.ok(initial.remaining_ms>58_000 && initial.remaining_ms<=60_000);
    assert.equal(initial.answered,0);assert.equal(initial.answers.length,0);
    assert.equal(initial.question.options.length,4);assert.equal(initial.question.correctBin,undefined);
    const session=(await db.query('select * from public.disposal_game_sessions where id=$1',[initial.id])).rows[0];
    assert.ok(new Set(session.questions.map(q=>q.id)).size>1);
    assert.equal(session.questions.length,new Set(GAME_QUESTIONS.map(gameItemKey)).size);
    assert.equal(new Set(session.questions.map(q=>q.id)).size,session.questions.length);
    assert.equal(new Set(session.questions.map(q=>gameItemKey(GAME_QUESTIONS.find(item=>item.id===q.id)))).size,session.questions.length);
    assert.ok(session.questions.every((q,i)=>i===0 || q.id!==session.questions[i-1].id));
    await assert.rejects(asUser(b,'select public.get_disposal_game($1) as data',[initial.id]),/현재 계정/);
    await assert.rejects(asUser(b,'select public.answer_disposal_game($1,0,$2) as data',[initial.id,initial.question.options[0]]),/현재 계정/);
    await assert.rejects(asUser(a,"select public.publish_disposal_game($1,'학생A') as data",[initial.id]),/게임이 끝난/);
    const correct=GAME_QUESTIONS.find(q=>q.id===initial.question.id).bin;
    const answered=await asUser(a,'select public.answer_disposal_game($1,0,$2) as data',[initial.id,correct]);
    validateRankedGameState(answered);
    assert.equal(answered.correct,1);assert.equal(answered.answered,1);
    const retry=await asUser(a,'select public.answer_disposal_game($1,0,$2) as data',[initial.id,correct]);
    assert.equal(retry.answered,1);assert.deepEqual(retry.question,answered.question);
    await assert.rejects(asUser(a,'select public.answer_disposal_game($1,9,$2) as data',[initial.id,correct]),/문제 순서/);
    await assert.rejects(asUser(a,"select public.answer_disposal_game($1,1,'invalid') as data",[initial.id]),/표시된 배출함/);
    const q2=GAME_QUESTIONS.find(q=>q.id===answered.question.id);
    const wrong=answered.question.options.find(bin=>bin!==q2.bin);
    const miss=await asUser(a,'select public.answer_disposal_game($1,1,$2) as data',[initial.id,wrong]);
    assert.equal(miss.correct,1);assert.equal(miss.answered,2);
    await db.query("update public.disposal_game_sessions set expires_at=clock_timestamp()-interval '1 second' where id=$1",[initial.id]);
    const ended=await asUser(a,'select public.answer_disposal_game($1,2,$2) as data',[initial.id,miss.question.options[0]]);
    assert.equal(ended.finished,true);assert.equal(ended.answered,2);
    await assert.rejects(asUser(a,"select public.publish_disposal_game($1,'a') as data",[initial.id]),/공개 이름/);
    await assert.rejects(asUser(b,"select public.publish_disposal_game($1,'학생B') as data",[initial.id]),/현재 계정/);
    const published=await asUser(a,"select public.publish_disposal_game($1,'학생A') as data",[initial.id]);
    assert.equal(published.correct,1);assert.equal(published.answered,2);
    await asUser(a,"select public.publish_disposal_game($1,'변경 시도') as data",[initial.id]);
    const rows=await asUser(null,'select coalesce(jsonb_agg(t),\'[]\') as data from public.disposal_game_leaderboard() t',[],'anon');
    assert.equal(rows.length,1);assert.equal(rows[0].display_name,'학생A');assert.equal(rows[0].is_me,false);
    assert.ok(!JSON.stringify(rows).includes(a));assert.equal(rows[0].rank,1);
    const own=await asUser(a,"select jsonb_agg(t) as data from public.disposal_game_leaderboard() t");
    assert.equal(own[0].is_me,true);
    // 같은 계정의 낮은 기록이 최고 기록을 덮어쓰지 않습니다.
    await db.query("insert into public.disposal_game_sessions(user_id,questions,expires_at,answers) values($1,'[]',clock_timestamp()-interval '1 second',$2::jsonb) returning id",[a,JSON.stringify([{questionId:'box',bin:'plastic',correct:false}])]).then(async result=>{
      await asUser(a,"select public.publish_disposal_game($1,'낮은 기록') as data",[result.rows[0].id]);
    });
    // 기존 세션과 랭킹을 보존한 채 업데이트 SQL을 재실행합니다.
    const before=await db.query('select * from public.disposal_game_scores order by session_id');
    const sessionsBefore=await db.query('select * from public.disposal_game_sessions order by id');
    const migration=await readFile(new URL('../supabase/game-question-update.sql',import.meta.url),'utf8');
    await db.exec(migration);await db.exec(migration);
    assert.deepEqual((await db.query('select * from public.disposal_game_scores order by session_id')).rows,before.rows);
    assert.deepEqual((await db.query('select * from public.disposal_game_sessions order by id')).rows,sessionsBefore.rows);
    await assert.rejects(asUser(a,'select public.start_disposal_game() as data'),/새로고침/);
    const best=await asUser(a,'select jsonb_agg(t) as data from public.disposal_game_leaderboard() t');
    assert.equal(best.length,1);assert.equal(best[0].display_name,'학생A');
    // 시간 안에 준비된 물건을 모두 풀면 재출제하지 않고 종료·등록할 수 있습니다.
    let full=await asUser(b,'select public.start_disposal_game_v2() as data');
    const seen=new Set();
    while(!full.finished){
      validateRankedGameState(full);
      const q=GAME_QUESTIONS.find(item=>item.id===full.question.id);
      assert.ok(!seen.has(gameItemKey(q)));seen.add(gameItemKey(q));
      full=await asUser(b,'select public.answer_disposal_game($1,$2,$3) as data',[full.id,full.answered,q.bin]);
    }
    validateRankedGameState(full);
    assert.equal(full.answered,new Set(GAME_QUESTIONS.map(gameItemKey)).size);
    assert.equal(full.correct,full.answered);assert.equal(full.question,null);
    assert.ok(full.remaining_ms>0);
    const complete=await asUser(b,"select public.publish_disposal_game($1,'모두 완료') as data",[full.id]);
    assert.equal(complete.correct,full.answered);
  }finally{await db.close();}
});
