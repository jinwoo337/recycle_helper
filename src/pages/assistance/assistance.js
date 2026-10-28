import { escapeHtml } from '../../utils/html.js';
import { inputModesMarkup } from '../../components/input-modes.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { getCurrentMember } from '../../services/auth.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { regionLabel } from '../../domain/disposal/regions.js';
import { requestAssistance } from '../../services/ai-assistance.js';
import { prepareAssistancePhoto } from '../../services/assistance-photo.js';
import { queueInput } from '../../services/input-draft.js';
import { createOperationGate } from '../../utils/operation-gate.js';
import { mergeAssistanceAnswers, ASSIST_ANSWERS_MAX } from '../../domain/disposal/ai-assistance.js';

const titles = { description: '물건 설명하기', photo: '사진으로 인식하기' };
const list = (values, ordered = false) => { const tag = ordered ? 'ol' : 'ul'; return `<${tag}>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</${tag}>`; };

function questionChoices(answer, index) {
  return [...new Set([...(answer.questionChoices?.[index] || []), '모르겠어요'])];
}

function followUpMarkup(answer, answers) {
  return `<section class="assist-questions"><h3>질문에 하나씩 답해 주세요</h3><p id="assist-followup-hint">처음 설명을 다시 쓸 필요 없어요. 선택지를 누르거나 짧게 입력해 주세요. 아는 것만 답해도 돼요.</p>
    <form data-assist-followup-form>${answer.questions.map((question, index) => {
      const value = answers.find(pair => pair.question === question)?.answer || '';
      return `<div class="assist-followup-field"><label for="assist-answer-${index}">${index + 1}. ${escapeHtml(question)}</label>
        <div class="assist-answer-options" role="group" aria-label="${escapeHtml(question)} 선택지">${questionChoices(answer, index).map((choice, choiceIndex) => `<button type="button" class="history-action" data-assist-option data-answer-index="${index}" data-choice-index="${choiceIndex}" aria-pressed="${value === choice}">${escapeHtml(choice)}</button>`).join('')}</div>
        <input id="assist-answer-${index}" name="answer${index}" type="text" maxlength="300" value="${escapeHtml(value)}" placeholder="짧게 답해 주세요. 직접 입력해도 돼요." autocomplete="off" aria-describedby="assist-followup-hint"></div>`;
    }).join('')}
      <p class="input-hint">이 답변과 처음 설명, 이전 답변을 함께 Google Gemini에 보내 안내를 갱신해요.</p>
      <div class="assist-followup-actions"><button type="submit" class="button primary">답변 반영해 다시 안내 받기</button><button type="button" class="button secondary" data-assist-followup-cancel hidden>분석 취소</button><button type="button" class="history-action" data-assist-refine>처음 설명 수정</button></div>
      <p class="form-status" data-assist-followup-status role="status" aria-live="polite"></p>
    </form></section>`;
}

export function assistanceResultMarkup(answer, region, { mode = 'photo', answers = [] } = {}) {
  return `<p class="eyebrow">AI 참고 안내 · ${escapeHtml(regionLabel(region))}</p>
    <h2 id="assistance-result-title">${escapeHtml(answer.itemName)}</h2>
    <p class="assist-identification">${escapeHtml(answer.identification)}</p>
    ${answer.evidence === 'markings' ? '<p class="assist-notice">표시는 읽었지만 실제 물건은 확인하지 못했어요. 물건 전체 사진이나 용도 설명을 더해 주세요.</p>' : ''}
    <p class="assist-confidence">인식 확실성: ${{ high: '높음', medium: '보통 · 실제 물건을 확인해 주세요', low: '낮음 · 추가 정보가 필요해요' }[answer.confidence]}</p>
    ${answer.markings.length ? `<h3>읽은 표시 · 실제 표시와 비교해 주세요</h3>${list(answer.markings)}` : ''}
    <div class="assist-method"><h3>${escapeHtml(answer.method)}</h3></div>
    ${answer.steps.length ? `<h3>이렇게 배출해 보세요</h3>${list(answer.steps, true)}` : ''}
    ${mode === 'description' && answers.length ? `<details class="assist-answer-history"><summary>지금까지 답한 내용 ${answers.length}개</summary><dl>${answers.map(pair => `<dt>${escapeHtml(pair.question)}</dt><dd>${escapeHtml(pair.answer)}</dd>`).join('')}</dl></details>` : ''}
    ${answer.questions.length ? mode === 'description' ? followUpMarkup(answer, answers) : `<section class="assist-questions"><h3>배출 전에 확인해 주세요</h3>${list(answer.questions)}<p>아래 버튼으로 설명에 답을 덧붙이거나 사진을 바꾼 뒤 다시 물어볼 수 있어요.</p><button type="button" class="button secondary" data-assist-refine>설명 보완하기</button></section>` : ''}
    ${answer.cautions.length ? `<h3>주의할 점</h3>${list(answer.cautions)}` : ''}
    <p class="assist-notice">AI가 설명·사진을 바탕으로 만든 안내예요. 사진에서 보이지 않는 재질·오염은 확인이 필요해요. 지자체 기준을 실시간으로 조회한 결과가 아니므로 수거처·봉투·요일은 관할 지자체나 관리사무소에서 확인해 주세요.</p>
    <div class="assist-result-actions"><button type="button" class="button secondary" data-assist-check>이 이름으로 기준 다시 확인</button><a class="button secondary" href="#/guide">분리배출 방법 보기</a></div>`;
}

export function assistancePage(mode = 'description') {
  const photo = mode === 'photo';
  return `<section class="container assist-page" id="assistance-root">
    <a class="back-link" href="#/">← 메인으로</a>
    <header class="item-heading"><p class="eyebrow">다른 방식으로 물어보기</p><h1>${titles[mode]}</h1><p>${photo ? '물건 전체나 분리배출 표시를 찍어 주세요. AI가 보이는 특징을 읽고 배출 방법을 제안해요.' : '이름을 몰라도 괜찮아요. 용도와 모양, 재질, 남은 내용물을 편하게 설명해 주세요.'}</p></header>
    ${inputModesMarkup(mode)}
    <form class="item-card assist-form" data-assist-form>
      ${judgementRegionMarkup(readJudgementRegion(getCurrentMember()))}
      ${photo ? `<section class="assist-photo" aria-labelledby="assist-photo-title"><h2 id="assist-photo-title">1. 사진 선택</h2><p class="input-hint">한 번에 물건 하나를 밝은 곳에서 찍어 주세요. 마크를 찍을 때는 몸체·뚜껑 등 부위 이름까지 보이면 좋아요.</p>
        <div class="assist-photo-buttons"><label class="button secondary assist-file-label">사진 촬영<input type="file" name="camera" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="물건 사진 촬영"></label><label class="button secondary assist-file-label">사진 선택<input type="file" name="gallery" accept="image/jpeg,image/png,image/webp" aria-label="저장된 사진 선택"></label></div>
        <p class="input-hint">JPG·PNG·WebP · 12MB 이하 · 사진은 이 화면을 떠나면 지워져요.</p>
        <figure class="assist-preview" data-assist-preview hidden><img data-assist-image alt="분석할 물건 사진 미리보기"><figcaption><span data-assist-photo-status></span><button type="button" class="history-action" data-assist-remove>사진 지우기</button></figcaption></figure>
        <p class="assist-photo-message" data-assist-photo-message role="status" aria-live="polite"></p></section>` : ''}
      <div class="field"><label for="assist-description">${photo ? '2. 사진 설명 또는 추가 정보 (선택)' : '어떤 물건인가요?'}</label><textarea id="assist-description" name="description" rows="6" maxlength="2000" ${photo ? '' : 'minlength="10" required'} aria-describedby="assist-description-hint assist-count" placeholder="예: 배달 음식이 담겼던 검은 용기예요. 바닥에 PP라고 적혀 있고, 기름기가 남아 있어요. 뚜껑은 투명하고 분리할 수 있어요."></textarea><div class="assist-description-meta"><p id="assist-description-hint" class="input-hint">${photo ? '사진에서 안 보이는 내용물·손상·오염 상태를 알려주면 도움이 돼요.' : '용도·재질 표시·크기·오염·붙어 있는 부속품을 알려주세요. 10자 이상 입력해 주세요.'}</p><span id="assist-count" data-assist-count>0 / 2,000자</span></div></div>
      <p class="assist-privacy">‘${photo ? '사진 인식하고 안내 받기' : '설명으로 안내 받기'}’를 누르면 ${photo ? '크기를 줄이고 촬영 위치 등 원본 메타데이터를 제거한 사진과 추가 설명' : '작성한 설명'}, 선택한 지역을 Google Gemini에 보내요. 개인정보가 담긴 내용은 제외해 주세요. 이 사이트의 공용 품목 DB·판별 기록에는 자동 저장하지 않아요.</p>
      <div class="assist-submit-row"><button type="submit" class="button primary">${photo ? '사진 인식하고 안내 받기' : '설명으로 안내 받기'}</button><button type="button" class="button secondary" data-assist-cancel hidden>분석 취소</button></div>
      <p class="form-status" data-assist-status role="status" aria-live="polite"></p>
    </form>
    <section class="item-card assist-result" data-assist-result tabindex="-1" aria-labelledby="assistance-result-title" hidden></section>
  </section>`;
}

export function bindAssistance(mode, { root = document.getElementById('assistance-root'), request = requestAssistance, preparePhoto = prepareAssistancePhoto, bindRegion = bindJudgementRegion } = {}) {
  const form = root.querySelector('[data-assist-form]'), description = form.elements.namedItem('description');
  const status = root.querySelector('[data-assist-status]'), result = root.querySelector('[data-assist-result]');
  const submit = form.querySelector('[type="submit"]'), cancel = root.querySelector('[data-assist-cancel]');
  const gate = createOperationGate();
  let image = null, photoRevision = 0, preparing = false, busy = false, disposed = false, controller, answer, answered = [];
  const region = bindRegion(form, readJudgementRegion(getCurrentMember()), { onChange(value) { rememberJudgementRegion(value, getCurrentMember()); clearResult(); } });
  const alive = () => !disposed && root.isConnected;
  function clearResult() { answer = null; answered = []; result.hidden = true; status.textContent = ''; }
  function setStatus(message) {
    status.textContent = message;
    const followupStatus = result.querySelector('[data-assist-followup-status]');
    if (followupStatus) followupStatus.textContent = message;
  }
  function controls() {
    const followupCancel = result.querySelector('[data-assist-followup-cancel]');
    return [...form.querySelectorAll('input, textarea, select, button'), ...result.querySelectorAll('input, button')].filter(control => control !== cancel && control !== submit && control !== followupCancel);
  }
  let disabledBefore = [];
  function setBusy(value) {
    busy = value; form.setAttribute('aria-busy', String(value)); cancel.hidden = !value;
    const followupCancel = result.querySelector('[data-assist-followup-cancel]');
    if (followupCancel) followupCancel.hidden = !value;
    if (value) { disabledBefore = controls().map(control => [control, control.disabled]); disabledBefore.forEach(([control]) => { control.disabled = true; }); }
    else { disabledBefore.forEach(([control, disabled]) => { control.disabled = disabled; }); disabledBefore = []; }
    submit.disabled = value || preparing;
  }
  function clearPhoto() {
    photoRevision++; image = null; preparing = false;
    root.querySelector('[data-assist-preview]').hidden = true;
    root.querySelector('[data-assist-image]').removeAttribute('src');
    form.elements.namedItem('camera').value = ''; form.elements.namedItem('gallery').value = '';
    root.querySelector('[data-assist-photo-message]').textContent = '';
    submit.disabled = busy; clearResult();
  }
  async function selectedPhoto(event) {
    const file = event.target.files?.[0]; if (!file || busy) return;
    clearPhoto(); const revision = photoRevision;
    preparing = true; submit.disabled = true;
    const message = root.querySelector('[data-assist-photo-message]'); message.textContent = '사진 크기를 줄이고 준비하고 있어요…';
    try {
      const prepared = await preparePhoto(file);
      if (!alive() || revision !== photoRevision) return;
      image = prepared.image;
      root.querySelector('[data-assist-image]').src = prepared.preview;
      root.querySelector('[data-assist-photo-status]').textContent = '선택한 사진 · 아직 전송하지 않았어요';
      root.querySelector('[data-assist-preview]').hidden = false;
      message.textContent = '사진을 준비했어요. 추가 정보가 있으면 적고 아래 안내 버튼을 눌러 주세요.';
    } catch (error) { if (alive() && revision === photoRevision) message.textContent = error.message; }
    finally { if (alive() && revision === photoRevision) { preparing = false; submit.disabled = busy; } }
  }
  if (mode === 'photo') {
    form.elements.namedItem('camera').addEventListener('change', selectedPhoto);
    form.elements.namedItem('gallery').addEventListener('change', selectedPhoto);
    root.querySelector('[data-assist-remove]').addEventListener('click', clearPhoto);
  }
  description.addEventListener('input', () => {
    description.setCustomValidity(''); root.querySelector('[data-assist-count]').textContent = `${description.value.length.toLocaleString('ko-KR')} / 2,000자`; clearResult();
  });
  function cancelAnalysis() {
    controller?.abort(); gate.cancel(); setBusy(false); setStatus('분석을 취소했어요. 입력과 답변은 그대로 유지했어요.');
  }
  cancel.addEventListener('click', cancelAnalysis);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || preparing) return;
    if (!region.validate()) return;
    if (mode === 'description' && description.value.trim().length < 10) { description.setCustomValidity('물건에 대해 10자 이상 설명해 주세요.'); description.reportValidity(); return; }
    if (!form.reportValidity()) return;
    if (mode === 'photo' && !image) { status.textContent = '분석할 사진을 먼저 촬영하거나 선택해 주세요.'; form.elements.namedItem('camera').focus(); return; }
    await generate(answered);
  });
  async function generate(nextAnswers, followup = false) {
    const operation = gate.begin(); if (!operation) return;
    controller = new AbortController(); const selectedRegion = region.get();
    if (!followup) { answer = null; result.hidden = true; }
    setBusy(true);
    setStatus(followup ? '질문에 답한 내용을 반영해 안내를 갱신하고 있어요…' : mode === 'photo' ? '사진 속 물건과 표시를 확인하고 배출 방법을 만들고 있어요…' : '설명을 읽고 배출 방법을 만들고 있어요…');
    try {
      const response = await request({ mode, description: description.value.trim(), region: selectedRegion, ...(mode === 'photo' ? { image } : nextAnswers.length ? { answers: nextAnswers } : {}) }, { signal: controller.signal });
      if (!alive() || !operation.active()) return;
      answered = nextAnswers; answer = response; result.innerHTML = assistanceResultMarkup(answer, selectedRegion, { mode, answers: answered }); result.hidden = false;
      setStatus(followup ? '답변을 반영했어요. 갱신된 안내를 확인해 주세요.' : 'AI 참고 안내를 만들었어요. 알아본 물건과 확인할 사항을 살펴봐 주세요.');
      result.focus(); result.scrollIntoView({ block: 'start', behavior: 'instant' });
    } catch (error) { if (alive() && operation.active()) setStatus(error.message); }
    finally { if (alive() && operation.active()) setBusy(false); operation.finish(); }
  }
  function syncChoices(followupForm) {
    followupForm.querySelectorAll('[data-assist-option]').forEach(button => {
      const index = Number(button.dataset.answerIndex);
      button.setAttribute('aria-pressed', String(followupForm.elements.namedItem(`answer${index}`).value.trim() === questionChoices(answer, index)[Number(button.dataset.choiceIndex)]));
    });
  }
  result.addEventListener('input', event => {
    const followupForm = event.target.closest('[data-assist-followup-form]');
    if (!followupForm || busy) return;
    syncChoices(followupForm); setStatus('');
  });
  result.addEventListener('submit', async event => {
    const followupForm = event.target.closest('[data-assist-followup-form]');
    if (!followupForm || mode !== 'description') return;
    event.preventDefault(); if (busy || !answer || !followupForm.reportValidity()) return;
    const additions = answer.questions.map((question, index) => ({ question, answer: followupForm.elements.namedItem(`answer${index}`).value.trim() })).filter(pair => pair.answer);
    if (!additions.length) { setStatus('아는 질문에 하나 이상 답하거나 ‘모르겠어요’를 골라 주세요.'); followupForm.elements.namedItem('answer0')?.focus(); return; }
    const next = mergeAssistanceAnswers(answered, additions);
    if (next.length > ASSIST_ANSWERS_MAX) { setStatus('답변이 많아졌어요. 처음 설명에 지금까지 확인한 내용을 정리한 뒤 다시 물어봐 주세요.'); return; }
    await generate(next, true);
  });
  result.addEventListener('click', event => {
    if (event.target.closest('[data-assist-followup-cancel]')) { cancelAnalysis(); return; }
    if (busy) return;
    const option = event.target.closest('[data-assist-option]');
    if (option && answer) {
      const index = Number(option.dataset.answerIndex), followupForm = option.closest('form');
      const input = followupForm.elements.namedItem(`answer${index}`);
      input.value = questionChoices(answer, index)[Number(option.dataset.choiceIndex)];
      syncChoices(followupForm); setStatus(''); return;
    }
    if (event.target.closest('[data-assist-refine]')) { description.focus(); description.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    if (event.target.closest('[data-assist-check]') && answer) { queueInput({ itemName: answer.itemName }); location.hash = '/item-input'; }
  });
  return () => { disposed = true; controller?.abort(); gate.dispose(); photoRevision++; image = null; };
}
