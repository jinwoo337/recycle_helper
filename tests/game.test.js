import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_BINS, GAME_QUESTIONS, GAME_MAX_QUESTIONS, GAME_POOL_VERSION, gameItemKey, createGame, gameOptions, answerGame, gameExplanation, remainingSeconds, validateRankedGameState, gamePrompt, gameStreak } from '../src/domain/disposal/game.js';
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

test('어려운 표시 방식도 판별 입력·정답·서버 문제 ID를 변경하지 않는다',()=>{
  const displayed=new Map();
  for(const q of GAME_QUESTIONS){
    const before=structuredClone(q),prompt=gamePrompt(q);
    assert.ok(prompt.name.trim());assert.ok(prompt.condition.trim());
    assert.deepEqual(q,before);
    assert.ok(!displayed.has(prompt.name) || displayed.get(prompt.name)===gameItemKey(q),'축약한 물건 이름도 서로 구분되어야 합니다.');
    displayed.set(prompt.name,gameItemKey(q));
  }
  const carton=GAME_QUESTIONS.find(q=>q.id==='milk');
  assert.ok(!gamePrompt(carton).condition.includes('종이팩 전용'));
  assert.ok(gamePrompt(carton).condition.includes('코팅'));
  assert.equal(gamePrompt(GAME_QUESTIONS.find(q=>q.id==='glass')).name,'잼병');
  assert.ok(!gamePrompt(GAME_QUESTIONS.find(q=>q.id==='plastic')).condition.includes('플라스틱'));
  assert.ok(gamePrompt(GAME_QUESTIONS.find(q=>q.id==='bag')).condition.includes('필름형'));
  assert.equal(gamePrompt(GAME_QUESTIONS.find(q=>q.id==='dirty-film')).condition,GAME_QUESTIONS.find(q=>q.id==='dirty-film').condition);
});

test('연습 오답 선택지에는 관련 분류를 포함하고 연속 정답은 점수와 별도로 집계한다',()=>{
  const pet=GAME_QUESTIONS.find(q=>q.id==='water');
  assert.deepEqual(new Set(gameOptions(pet)),new Set(['pet','plastic','glass','general']));
  const carton=GAME_QUESTIONS.find(q=>q.id==='milk');
  assert.ok(gameOptions(carton).includes('paper'));
  assert.equal(gameStreak([]),0);
  assert.equal(gameStreak([{correct:true},{correct:true}]),2);
  assert.equal(gameStreak([{correct:true},{correct:false}]),0);
  assert.equal(gameStreak([{correct:true},{correct:false},{correct:true}]),1);
});
