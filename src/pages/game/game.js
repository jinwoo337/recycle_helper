import { escapeHtml as esc } from '../../utils/html.js';
import { RULE_SOURCE } from '../../domain/disposal/rules.js';
import { getCurrentMember } from '../../services/auth.js';
import { gameRanking } from '../../services/game-ranking.js';
import { GAME_BINS, GAME_QUESTIONS, createGame, gameOptions, answerGame, gameExplanation, remainingSeconds, validateRankedGameState } from '../../domain/disposal/game.js';

const byId = new Map(GAME_QUESTIONS.map(q=>[q.id,q]));
export function gamePage() {
  return `<section class="container game-page"><header class="game-heading"><p class="eyebrow">60초 분리배출 대결</p><h1>누가 더 많이 분리할까요?</h1><p>물건 정보를 읽고 4개 배출함 중 하나를 고르세요.</p></header>
    <div id="disposal-game" class="game-card"><div class="game-intro"><span class="game-intro-icon" aria-hidden="true">⏱️</span><h2>60초 동안 정확하고 빠르게!</h2><p>정답을 맞힐 때마다 분리 성공 1개.<br>선택하면 바로 다음 물건이 나타나요.</p><ul><li>한 게임에서는 같은 물건이 반복되지 않아요.</li><li>랭킹은 정답 수 → 오답이 적은 순 → 먼저 등록한 순이에요.</li><li>회원별 최고 기록 하나로 대결해요.</li><li>게임 점수는 실제 분리배출 기록에 저장되지 않아요.</li></ul><div class="game-actions"><button type="button" class="button primary" id="start-ranked">랭킹 도전${getCurrentMember()?'':' · 로그인 필요'}</button><button type="button" class="button secondary" id="start-practice">혼자 연습</button></div><p id="game-start-status" role="status" class="input-hint"></p></div></div>
    <section class="game-card game-ranking" aria-labelledby="ranking-title"><div class="game-progress"><h2 id="ranking-title">🏆 전체 랭킹</h2><button type="button" class="history-action" id="refresh-ranking">새로고침</button></div><p class="input-hint">60초 · 회원별 최고 기록 · 상위 20명 · 공개 이름은 중복될 수 있어요.</p><div id="game-ranking-content" aria-live="polite">랭킹을 불러오고 있어요…</div></section>
    <p class="game-note">일반적인 기준을 배우는 게임이에요. 실제 배출 시 제품 표시와 거주 지역·건물의 수거 기준을 확인해 주세요. <a href="${RULE_SOURCE}" target="_blank" rel="noopener noreferrer">기준 확인 ↗</a></p></section>`;
}

export function bindGame() {
  const host=document.getElementById('disposal-game');
  const rankingHost=document.getElementById('game-ranking-content');
  const refresh=document.getElementById('refresh-ranking');
  let game=null, timer=null, disposed=false, busy=false, finished=false, pendingAnswer=null, rankVersion=0, mode='practice';
  const alive=()=>!disposed && host.isConnected;
  const focus=selector=>host.querySelector(selector)?.focus({preventScroll:true});
  function stopTimer(){ clearInterval(timer); timer=null; }
  function records(){return game?.answers || [];}
  function count(){return records().filter(a=>a.correct).length;}
  function current(){return mode==='ranked'?byId.get(game.question?.id):game.questions[game.index];}
  function choices(q){return mode==='ranked'?game.question.options:(game.options=gameOptions(q));}
  function canContinue(){return game && !finished && remainingSeconds(game.deadline)>0 && current();}
  async function loadRanking(){
    const version=++rankVersion;
    refresh.disabled=true; rankingHost.textContent='랭킹을 불러오고 있어요…';
    try{
      const rows=await gameRanking.list();
      if(!alive() || version!==rankVersion)return;
      if(!Array.isArray(rows)) throw new Error('랭킹 응답을 확인하지 못했어요.');
      rankingHost.innerHTML=rows.length?`<div class="ranking-scroll"><table><caption class="visually-hidden">60초 분리배출 공동 랭킹</caption><thead><tr><th scope="col">순위</th><th scope="col">공개 이름</th><th scope="col">정답</th><th scope="col">오답</th></tr></thead><tbody>${rows.map(row=>`<tr ${row.is_me?'class="is-me"':''}><td>${esc(row.rank)}</td><th scope="row">${esc(row.display_name)}${row.is_me?' <small>나</small>':''}</th><td>${esc(row.correct)}개</td><td>${esc(row.answered-row.correct)}개</td></tr>`).join('')}</tbody></table></div>`:'<p class="input-hint">아직 등록된 기록이 없어요. 첫 번째로 도전해 보세요!</p>';
    }catch(error){if(alive() && version===rankVersion)rankingHost.textContent=error.message;}
    finally{if(alive() && version===rankVersion)refresh.disabled=false;}
  }
  function applyServer(state){
    validateRankedGameState(state);
    const deadline=performance.now()+Math.max(0,state.remaining_ms);
    // 응답 지연 때문에 화면의 남은 시간이 늘어나지 않도록 유지합니다.
    game={...state,deadline:game?.id===state.id?Math.min(game.deadline,deadline):deadline};
  }
  function drawQuestion(last=null){
    const q=current();
    if(!q){finish();return;}
    host.innerHTML=`<div class="game-progress"><span>${mode==='ranked'?'랭킹 도전':'혼자 연습'} · ${records().length+1}번째 물건</span><strong>성공 ${count()}개</strong></div><div class="game-timer"><span>남은 시간 <strong id="game-seconds" role="timer" aria-label="남은 초">${remainingSeconds(game.deadline)}</strong>초</span><span>오답 ${records().length-count()}개</span></div><progress id="game-time" value="${remainingSeconds(game.deadline)}" max="60" aria-label="남은 시간"></progress>
      <div class="game-last-answer" role="status">${last?`${last.correct?'✓ 정답!':'✕ 오답'} ${esc(byId.get(last.questionId)?.name || '')} → ${esc(GAME_BINS[last.correctBin || byId.get(last.questionId)?.bin]?.label || '')}`:'정답 수가 많을수록 높은 순위! 물건 상태까지 확인하세요.'}</div>
      <div class="game-item"><span class="game-item-icon" aria-hidden="true">${q.icon}</span><h2 id="game-question" tabindex="-1">${esc(q.name)}</h2><p>${esc(q.condition)}</p></div><fieldset class="game-choices"><legend>어느 배출함에 넣을까요?</legend><div class="game-bins">${choices(q).map(id=>`<button type="button" data-game-bin="${id}" class="game-bin"><span aria-hidden="true">${GAME_BINS[id].icon}</span><strong>${esc(GAME_BINS[id].label)}</strong></button>`).join('')}</div></fieldset><p id="game-answer-status" role="status" class="input-hint"></p>`;
    focus('#game-question');
  }
  function publishMarkup(){
    return mode==='ranked' && records().length?`<form id="publish-game" class="game-publish"><h3>이 기록으로 랭킹에 참가하기</h3><label for="game-public-name">공개 이름 (2~20자)</label><input id="game-public-name" name="publicName" type="text" minlength="2" maxlength="20" required autocomplete="off" placeholder="예: 분리배출왕"><label class="game-consent"><input type="checkbox" name="consent" required> 이 이름과 정답·오답 수를 전체 랭킹에 공개합니다.</label><p class="input-hint">이메일·실명·연락처 대신 별명을 사용하세요.</p><button type="submit" class="button primary">랭킹 등록</button><p id="publish-status" role="status"></p></form>`:mode==='ranked'?'<p class="input-hint">한 문제 이상 푼 기록부터 랭킹에 등록할 수 있어요.</p>':'<p class="input-hint">연습 기록이에요. 공동 랭킹에 참가하려면 로그인한 뒤 ‘랭킹 도전’을 선택하세요.</p>';
  }
  function finish(){
    if(finished || !alive())return;
    finished=true;stopTimer();
    const right=count(),total=records().length;
    host.innerHTML=`<div class="game-finish"><span class="game-intro-icon" aria-hidden="true">${right>=10?'🏆':'🌱'}</span><h2 id="game-finished" tabindex="-1">${current()?'시간 종료!':'모든 물건을 분리했어요!'}</h2><p class="game-score">${right}<small>개 분리 성공</small></p><p>도전 ${total}개 · 정답 ${right}개 · 오답 ${total-right}개${total?` · 정답률 ${Math.round(right/total*100)}%`:''}</p></div>${publishMarkup()}<details class="game-review"><summary>푼 문제와 정답 다시 보기</summary><ol>${records().map(answer=>{const q=byId.get(answer.questionId);return `<li><strong>${answer.correct?'✓ 정답':'✕ 오답'} · ${esc(q.name)}</strong><p>${esc(q.condition)}</p><p>내 선택: ${esc(GAME_BINS[answer.bin].label)} · 정답: ${esc(GAME_BINS[q.bin].label)}</p><p>${esc(gameExplanation(q).reasons.join(' '))}</p></li>`;}).join('')}</ol></details><div class="game-actions"><button type="button" class="button primary" id="restart-game">다시 도전</button><a href="#/item-input" class="button secondary">내 물건 판별하기</a></div>`;
    focus('#game-finished');
  }
  function tick(){
    if(!alive() || !game || finished)return;
    const remaining=remainingSeconds(game.deadline);
    const seconds=host.querySelector('#game-seconds');if(seconds)seconds.textContent=remaining;
    const progress=host.querySelector('#game-time');if(progress)progress.value=remaining;
    if(remaining<=0){
      host.querySelectorAll('[data-game-bin]').forEach(button=>button.disabled=true);
      // 진행 중 요청은 서버가 채점한 결과를 받은 뒤 종료합니다.
      if(!busy && !pendingAnswer)finish();
      else if(!busy && pendingAnswer){
        const status=host.querySelector('#game-answer-status');
        if(status && !status.querySelector('#retry-game-answer'))status.innerHTML='시간이 끝났어요. 마지막 답변의 서버 처리 결과를 확인해 주세요. <button type="button" class="history-action" id="retry-game-answer">결과 다시 확인</button>';
      }
    }
  }
  async function start(ranked){
    if(busy)return;
    if(ranked && !getCurrentMember()){
      document.getElementById('game-start-status').innerHTML='랭킹 도전은 로그인이 필요해요. <a href="#/login">로그인하기 →</a>';return;
    }
    busy=true;stopTimer();
    host.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      mode=ranked?'ranked':'practice'; finished=false;pendingAnswer=null;
      if(ranked)applyServer(await gameRanking.start());else game=createGame();
      if(!alive())return;
      drawQuestion();timer=setInterval(tick,100);
    }catch(error){
      if(alive()){
        const status=host.querySelector('#game-start-status');if(status)status.textContent=error.message;
        host.querySelectorAll('button').forEach(b=>b.disabled=false);
      }
    }finally{busy=false;}
  }
  async function choose(bin,retry=false){
    if(busy || finished || !game)return;
    if(!retry && !canContinue()){tick();return;}
    busy=true;
    host.querySelectorAll('[data-game-bin]').forEach(button=>button.disabled=true);
    try{
      if(mode==='ranked'){
        pendingAnswer=pendingAnswer || {id:game.id,index:game.answered,bin};
        const request=pendingAnswer;
        const state=await gameRanking.answer(request.id,request.index,request.bin);
        if(!alive())return;
        applyServer(state);pendingAnswer=null;
        if(state.finished){finish();return;}
      }else{
        const answer=answerGame(game,bin);
        if(!answer){finish();return;}
        game.index++;
      }
      drawQuestion(records().at(-1));
    }catch(error){
      if(alive()){
        const status=host.querySelector('#game-answer-status');
        if(status){status.textContent=error.message+' ';const button=document.createElement('button');button.type='button';button.id='retry-game-answer';button.className='history-action';button.textContent='같은 답변 다시 전송';status.append(button);}
      }
    }finally{busy=false;tick();}
  }
  function clicks(event){
    if(busy)return;
    if(event.target.closest('#start-ranked'))start(true);
    else if(event.target.closest('#start-practice'))start(false);
    else if(event.target.closest('#retry-game-answer'))choose(pendingAnswer?.bin,true);
    else if(event.target.closest('#restart-game')){const template=document.createElement('template');template.innerHTML=gamePage();host.innerHTML=template.content.querySelector('#disposal-game').innerHTML;game=null;finished=false;focus('#start-ranked');}
    else {const button=event.target.closest('[data-game-bin]');if(button && host.contains(button))choose(button.dataset.gameBin);}
  }
  async function publish(event){
    if(event.target.id!=='publish-game')return;
    event.preventDefault();
    const form=event.target,status=form.querySelector('#publish-status');
    if(!form.reportValidity() || busy)return;
    const button=form.querySelector('[type="submit"]');button.disabled=true;busy=true;status.textContent='기록을 등록하고 있어요…';
    try{
      await gameRanking.submit(game.id,form.elements.publicName.value);
      if(!alive())return;
      status.textContent='랭킹에 등록했어요. 회원별 최고 기록이 반영됩니다.';
      form.querySelectorAll('input').forEach(input=>input.disabled=true);
      await loadRanking();
    }catch(error){if(alive()){status.textContent=error.message;button.disabled=false;}}
    finally{busy=false;}
  }
  host.addEventListener('click',clicks);host.addEventListener('submit',publish);refresh.addEventListener('click',loadRanking);document.addEventListener('visibilitychange',tick);
  loadRanking();
  return()=>{disposed=true;stopTimer();host.removeEventListener('click',clicks);host.removeEventListener('submit',publish);refresh.removeEventListener('click',loadRanking);document.removeEventListener('visibilitychange',tick);};
}
