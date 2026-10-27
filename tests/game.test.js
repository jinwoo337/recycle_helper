import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_BINS, GAME_QUESTIONS, GAME_MAX_QUESTIONS, GAME_POOL_VERSION, gameItemKey, createGame, gameOptions, answerGame, gameExplanation, remainingSeconds, validateRankedGameState } from '../src/domain/disposal/game.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { gamePage } from '../src/pages/game/game.js';
import { layout } from '../src/layouts/layout.js';

test('60초 게임은 동일 물건·문제를 재출제하지 않으며 정답 포함 4개 선택지를 제공한다',()=>{
  assert.equal(new Set(GAME_QUESTIONS.map(q=>q.id)).size,GAME_QUESTIONS.length);
  for(let seed=1;seed<=20;seed++){
    let value=seed;
    const random=()=>((value=(value*16807)%2147483647)/2147483647);
    const game=createGame(random);
    assert.ok(GAME_QUESTIONS.length>=120);
    assert.equal(game.questions.length,Math.min(GAME_MAX_QUESTIONS,new Set(GAME_QUESTIONS.map(gameItemKey)).size));
    assert.equal(new Set(game.questions.map(q=>q.id)).size,game.questions.length);
    assert.equal(new Set(game.questions.map(gameItemKey)).size,game.questions.length);
    for(const q of game.questions){
      const options=gameOptions(q,random);
      assert.equal(new Set(options).size,4);
      assert.ok(options.includes(q.bin));
      assert.ok(options.every(bin=>Object.hasOwn(GAME_BINS,bin)));
    }
  }
});

test('같은 물건의 오염 상태도 한 판에는 하나만 출제하며 모든 문제를 풀면 재출제하지 않는다',()=>{
  const seenVariants=new Set();
  for(let seed=1;seed<40;seed++){
    let value=seed;
    const random=()=>((value=(value*16807)%2147483647)/2147483647);
    const game=createGame(random,0);
    const snack=game.questions.filter(q=>q.name==='과자봉지');
    assert.equal(snack.length,1);seenVariants.add(snack[0].id);
    for(const q of game.questions){assert.ok(answerGame(game,q.bin,1));game.index++;}
    assert.equal(game.questions[game.index],undefined);
    assert.equal(answerGame(game,'paper',1),null);
  }
  assert.deepEqual([...seenVariants].sort(),['dirty-film','snack']);
});

test('게임의 정답은 명시된 물건 상태에 대한 기존 판별 규칙과 일치한다',()=>{
  const methods={pet:'투명 페트병',plastic:'플라스틱류',paper:'종이류',carton:'종이팩',glass:'유리병',metal:'금속캔',vinyl:'비닐류',foam:'스티로폼',general:'종량제봉투'};
  for(const q of GAME_QUESTIONS){
    const result=judgeDisposal(q.input);
    assert.equal(result.status,q.bin==='general'?'general':'recycle',q.id);
    assert.ok(result.method.includes(methods[q.bin]),q.id);
    assert.ok(gameExplanation(q).reasons.length>0,q.id);
    assert.ok(gameExplanation(q).steps.length>0,q.id);
  }
});

test('점수는 한 문제에 한 번만 반영되고 재시작하면 초기화된다',()=>{
  const game=createGame();
  assert.equal(answerGame(game,'invalid'),null);
  for(let i=0;i<10;i++){
    assert.equal(answerGame(game,game.questions[i].bin).correct,true);
    assert.equal(answerGame(game,game.questions[i].bin),null);
    game.index++;
  }
  assert.equal(game.answers.filter(a=>a.correct).length*10,100);
  game.index=GAME_MAX_QUESTIONS;
  assert.equal(answerGame(game,'paper'),null);
  const fresh=createGame();
  assert.equal(fresh.index,0);
  assert.deepEqual(fresh.answers,[]);
  const wrong=Object.keys(GAME_BINS).find(bin=>bin!==fresh.questions[0].bin);
  assert.equal(answerGame(fresh,wrong).correct,false);
});

test('게임 제한 시간 경계와 백그라운드 경과 시간은 실제 경과 시간으로 처리한다',()=>{
  const game=createGame(Math.random,0);
  assert.equal(remainingSeconds(game.deadline,0),60);
  assert.equal(remainingSeconds(game.deadline,59_001),1);
  assert.equal(remainingSeconds(game.deadline,60_000),0);
  assert.equal(remainingSeconds(game.deadline,95_000),0);
  assert.equal(answerGame(game,game.questions[0].bin,60_000),null);
  assert.equal(game.answers.length,0);
  assert.ok(answerGame(game,game.questions[0].bin,59_999));
});

test('연습에서도 현재 표시한 선택지 밖의 답변은 채점하지 않는다',()=>{
  const game=createGame(Math.random,0);
  game.options=gameOptions(game.questions[0]);
  const outside=Object.keys(GAME_BINS).find(bin=>!game.options.includes(bin));
  assert.equal(answerGame(game,outside,1),null);
  assert.equal(game.answers.length,0);
});

test('랭킹 응답은 문제 버전·중복 물건·점수·4개 선택지를 검증한다',()=>{
  const q=GAME_QUESTIONS[0],next=GAME_QUESTIONS[1];
  const state={pool_version:GAME_POOL_VERSION,id:'session',remaining_ms:50_000,answered:1,correct:1,finished:false,
    answers:[{questionId:q.id,bin:q.bin,correct:true,correctBin:q.bin}],question:{id:next.id,options:gameOptions(next)}};
  assert.equal(validateRankedGameState(state),state);
  assert.throws(()=>validateRankedGameState({...state,pool_version:'old'}),/업데이트/);
  assert.throws(()=>validateRankedGameState({...state,correct:2}),/점수/);
  assert.throws(()=>validateRankedGameState({...state,question:{id:q.id,options:gameOptions(q)}}),/선택지/);
  assert.throws(()=>validateRankedGameState({...state,question:{id:next.id,options:[next.bin,next.bin,'paper','glass']}}),/선택지/);
  assert.throws(()=>validateRankedGameState({...state,remaining_ms:NaN}),/응답/);
  assert.throws(()=>validateRankedGameState({...state,answered:2,correct:2,answers:[state.answers[0],state.answers[0]]}),/순서/);
});

test('게임 탭은 회원·비회원 모두 접근하며 기존 기록과 분리됨을 안내한다',()=>{
  assert.ok(gamePage().includes('실제 분리배출 기록에 저장되지'));
  for(const member of [null,{nickname:'학생'}]){
    const html=layout(gamePage(),'game',member);
    assert.ok(html.includes('href="#/game" aria-current="page">게임</a>'));
  }
});
