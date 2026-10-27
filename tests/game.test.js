import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_BINS, GAME_QUESTIONS, GAME_MAX_QUESTIONS, createGame, gameOptions, answerGame, gameExplanation, remainingSeconds } from '../src/domain/disposal/game.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { gamePage } from '../src/pages/game/game.js';
import { layout } from '../src/layouts/layout.js';

test('60초 게임은 문제를 순환하며 각 문제에 정답을 포함한 4개 배출함을 제공한다',()=>{
  assert.equal(new Set(GAME_QUESTIONS.map(q=>q.id)).size,GAME_QUESTIONS.length);
  for(let seed=1;seed<=20;seed++){
    let value=seed;
    const random=()=>((value=(value*16807)%2147483647)/2147483647);
    const game=createGame(random);
    assert.equal(game.questions.length,GAME_MAX_QUESTIONS);
    assert.equal(new Set(game.questions.slice(0,16).map(q=>q.id)).size,16);
    assert.ok(game.questions.every((q,i)=>i===0 || q.id!==game.questions[i-1].id));
    for(const q of game.questions){
      const options=gameOptions(q,random);
      assert.equal(new Set(options).size,4);
      assert.ok(options.includes(q.bin));
      assert.ok(options.every(bin=>Object.hasOwn(GAME_BINS,bin)));
    }
  }
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

test('게임 탭은 회원·비회원 모두 접근하며 기존 기록과 분리됨을 안내한다',()=>{
  assert.ok(gamePage().includes('실제 분리배출 기록에 저장되지'));
  for(const member of [null,{nickname:'학생'}]){
    const html=layout(gamePage(),'game',member);
    assert.ok(html.includes('href="#/game" aria-current="page">게임</a>'));
  }
});
