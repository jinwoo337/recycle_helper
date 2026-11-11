import { escapeHtml } from '../../utils/html.js';
import { inputModesMarkup } from '../../components/input-modes.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { getCurrentMember } from '../../services/auth.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { regionLabel, REGIONAL_SOURCES, regionalSourceLabel, resultRegionLabel } from '../../domain/disposal/regions.js';
import { requestAssistance } from '../../services/ai-assistance.js';
import { prepareAssistancePhoto, PHOTO_ACCEPT } from '../../services/assistance-photo.js';
import { stepListMarkup } from '../../components/step-list.js';
import { collectionPointMarkup } from '../../components/collection-help.js';
import { queueInput, takeQueuedInput } from '../../services/input-draft.js';
import { createOperationGate } from '../../utils/operation-gate.js';
import { mergeAssistanceAnswers, ASSIST_ANSWERS_MAX } from '../../domain/disposal/ai-assistance.js';
import { lookupItem } from '../../domain/disposal/item-suggestions.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { judgeDisposal, RULE_SOURCE } from '../../domain/disposal/rules.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';

const titles = { description: '물건 설명하기', photo: '사진으로 인식하기' };
const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
let descriptionDraft = '', descriptionOwner;

function registeredGuide(name, region) {
  const item = lookupItem(name);
  if (!item?.handling) return null;
  const guide = judgeDisposal({ ...itemPresetInput(name), region });
  return guide.handling === item.handling ? guide : null;
}

function questionChoices(answer, index) {
  return [...new Set([...(answer.questionChoices?.[index] || []), '모르겠어요'])];
}

function followUpMarkup(answer, answers, mode) {
  return `<section class="assist-questions"><h3>배출 전에 확인할 내용</h3><p id="assist-followup-hint">아는 것만 골라 주세요.</p>
    <form data-assist-followup-form>${answer.questions.map((question, index) => {
      const value = answers.find(pair => pair.question === question)?.answer || '';
      const choices = questionChoices(answer, index);
      const field = `<input id="assist-answer-${index}" name="answer${index}" type="text" maxlength="300" value="${escapeHtml(value)}" placeholder="짧게 입력해 주세요" autocomplete="off" aria-describedby="assist-followup-hint">`;
      const hasChoices = choices.length > 1;
      return `<div class="assist-followup-field"><label for="assist-answer-${index}">${escapeHtml(question)}</label>
        <div class="assist-answer-options" role="group" aria-label="${escapeHtml(question)} 선택지">${choices.map((choice, choiceIndex) => `<button type="button" class="history-action" data-assist-option data-answer-index="${index}" data-choice-index="${choiceIndex}" aria-pressed="${value === choice}">${escapeHtml(choice)}</button>`).join('')}</div>
        ${hasChoices ? `<details class="assist-custom-answer" ${value && !choices.includes(value) ? 'open' : ''}><summary>직접 입력</summary>${field}</details>` : field}</div>`;
    }).join('')}
      <p class="input-hint">${mode === 'photo' ? '사진·설명' : '설명'}과 답변을 Google Gemini에 보내 안내를 갱신해요.</p>
      <div class="assist-followup-actions"><button type="submit" class="button primary">답변 반영하기</button><button type="button" class="button secondary" data-assist-followup-cancel hidden>분석 취소</button></div>
      <p class="form-status" data-assist-followup-status role="status" aria-live="polite"></p>
    </form></section>`;
}

export function assistanceResultMarkup(answer, region, { answers = [], mode = 'description', guide } = {}) {
  const hasQuestions = answer.questions.length > 0;
  const { method, steps } = guide || answer;
  const sources = guide?.sourceUrls.filter(url => url === RULE_SOURCE || Object.hasOwn(CATALOG_DETAIL_SOURCES, url) || Object.values(REGIONAL_SOURCES).includes(url)) || [];
  const guidance = `<div class="assist-method"><h3>${escapeHtml(method)}</h3></div>${steps.length ? stepListMarkup(steps) : '<p class="input-hint">입력을 보완하거나 제품 표시와 지역 수거 기준을 확인해 주세요.</p>'}`;
  return `<p class="eyebrow">${guide ? '등록 품목 안내' : 'AI 참고 안내'} · ${escapeHtml(guide ? resultRegionLabel(guide) : regionLabel(region))}</p>
    <h2 id="assistance-result-title">${escapeHtml(answer.itemName)}</h2>
    ${answer.identification ? `<p class="assist-identification">${escapeHtml(answer.identification)}</p>` : ''}
    ${answer.evidence === 'markings' ? '<p class="input-hint">표시는 읽었지만 실제 물건은 확인하지 못했어요. 물건 전체 사진이나 용도 설명을 더해 주세요.</p>' : ''}
    ${answer.markings.length ? `<p class="assist-markings"><strong>AI가 읽은 표시</strong> ${answer.markings.map(escapeHtml).join(' · ')}</p>` : ''}
    ${hasQuestions ? followUpMarkup(answer, answers, mode) : guidance}
    ${hasQuestions && steps.length ? `<details class="assist-answer-history"><summary>${guide ? '이 물건이 맞다면 등록 안내 보기' : '현재 정보로 본 참고 안내'}</summary>${guidance}</details>` : ''}
    ${!hasQuestions && steps.length ? collectionPointMarkup({ ...guide, itemName: answer.itemName, region, method, steps }) : ''}
    ${sources.length ? `<details class="assist-answer-history"><summary>등록 안내의 출처</summary><ul>${sources.map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url === RULE_SOURCE ? '분리배출 지침' : CATALOG_DETAIL_SOURCES[url] || regionalSourceLabel(url))}</a></li>`).join('')}</ul></details>` : ''}
    ${!guide && answer.cautions.length ? `<h3>주의할 점</h3>${list(answer.cautions)}` : ''}
    ${answers.length ? `<details class="assist-answer-history"><summary>지금까지 답한 내용 ${answers.length}개</summary><dl>${answers.map(pair => `<dt>${escapeHtml(pair.question)}</dt><dd>${escapeHtml(pair.answer)}</dd>`).join('')}</dl></details>` : ''}
    ${!guide && steps.length ? '<p class="input-hint">실제 제품 표시와 거주지 수거 기준을 확인해 주세요.</p>' : ''}
    <div class="assist-result-actions">${!hasQuestions ? '<button type="button" class="button primary" data-assist-new>다른 물건 찾기</button>' : ''}<button type="button" class="button secondary" data-assist-refine>입력 수정</button>${answer.evidence === 'object' && answer.confidence !== 'low' ? '<button type="button" class="button secondary" data-assist-check>이 이름으로 기준 확인</button>' : '<a class="button secondary" href="#/item-input">이름으로 찾기</a>'}</div>`;
}

export function assistancePage(mode = 'description') {
  const photo = mode === 'photo';
  const descriptionField = `<div class="field"><label for="assist-description">${photo ? '추가 정보' : '어떤 물건인가요?'}</label><textarea id="assist-description" name="description" rows="${photo ? 3 : 4}" maxlength="2000" ${photo ? '' : 'required'} aria-describedby="assist-description-hint assist-description-error" placeholder="${photo ? '예: 뚜껑은 분리할 수 있어요.' : '예: PP 표시가 있는 배달 용기예요. 기름기가 남아 있어요.'}"></textarea><p id="assist-description-error" class="field-error" role="alert"></p><div class="assist-description-meta"><p id="assist-description-hint" class="input-hint">${photo ? '내용물이나 사진에 보이지 않는 상태를 적어 주세요.' : '재질 표시나 현재 상태를 알면 함께 적어 주세요.'}</p><span id="assist-count" data-assist-count>0 / 2,000자</span></div></div>`;
  return `<section class="container assist-page" id="assistance-root">
    <header class="item-heading"><h1>${titles[mode]}</h1></header>
    ${inputModesMarkup(mode)}
    <form class="item-card assist-form" data-assist-form novalidate>
      ${photo ? `<section class="assist-photo" aria-labelledby="assist-photo-title"><h2 id="assist-photo-title">물건 사진</h2><p class="input-hint">물건 전체나 분리배출 표시가 잘 보이는 사진을 선택해 주세요.</p>
        <div class="assist-photo-buttons"><label class="button secondary assist-file-label">사진 촬영<input type="file" name="camera" accept="${PHOTO_ACCEPT}" capture="environment" aria-label="물건 사진 촬영"></label><label class="button secondary assist-file-label">사진 선택<input type="file" name="gallery" accept="${PHOTO_ACCEPT}" aria-label="저장된 사진 선택"></label></div>
        <p class="input-hint">JPG·PNG·WebP·HEIC · 12MB 이하</p>
        <figure class="assist-preview" data-assist-preview hidden><img data-assist-image alt="분석할 물건 사진 미리보기"><figcaption><span data-assist-photo-status></span><button type="button" class="history-action" data-assist-remove>사진 지우기</button></figcaption></figure>
        <p class="assist-photo-message" data-assist-photo-message role="status" aria-live="polite"></p></section>` : ''}
      ${photo ? `<details class="assist-extra"><summary>사진에 보이지 않는 정보 추가 (선택)</summary>${descriptionField}</details>` : descriptionField}
      ${judgementRegionMarkup(readJudgementRegion(getCurrentMember()))}
      <div class="assist-submit-row"><button type="submit" class="button primary">${photo ? '사진 인식하고 안내 받기' : '설명으로 안내 받기'}</button><button type="button" class="button secondary" data-assist-cancel hidden>분석 취소</button></div>
      <p class="form-status" data-assist-status role="status" aria-live="polite"></p>
      <p class="input-hint">${photo ? '사진·설명' : '설명'}과 선택한 지역을 Google Gemini에 보내요.</p>
      <details class="assist-data-use"><summary>입력 정보 사용 안내</summary><p class="input-hint">개인정보가 담긴 내용은 제외해 주세요. ${photo ? '사진은 크기와 원본 촬영 정보를 줄여 전송하고, 화면을 떠나면 미리보기가 지워져요. ' : ''}입력과 안내는 이 사이트의 판별 기록에 자동 저장되지 않아요.</p></details>
    </form>
    <section class="item-card assist-result" data-assist-result tabindex="-1" aria-labelledby="assistance-result-title" hidden></section>
  </section>`;
}

export function bindAssistance(mode, { root = document.getElementById('assistance-root'), request = requestAssistance, preparePhoto = prepareAssistancePhoto, bindRegion = bindJudgementRegion } = {}) {
  const form = root.querySelector('[data-assist-form]'), description = form.elements.namedItem('description');
  const status = root.querySelector('[data-assist-status]'), result = root.querySelector('[data-assist-result]');
  const descriptionError = root.querySelector('#assist-description-error');
  const submit = form.querySelector('[type="submit"]'), cancel = root.querySelector('[data-assist-cancel]');
  const gate = createOperationGate();
  const path = mode === 'photo' ? '/photo' : '/describe';
  const queued = takeQueuedInput(path);
  const owner = getCurrentMember()?.id || 'guest';
  if (owner !== descriptionOwner) { descriptionDraft = ''; descriptionOwner = owner; }
  let image = null, photoRevision = 0, preparing = false, busy = false, disposed = false, controller, answer, answered = [];
  const region = bindRegion(form, readJudgementRegion(getCurrentMember()), {
    onChange(value) {
      rememberJudgementRegion(value, getCurrentMember());
      clearResult({ keepAnswers: true });
    },
  });
  const alive = () => !disposed && root.isConnected;
  function clearResult({ keepAnswers = false } = {}) {
    answer = null;
    if (!keepAnswers) answered = [];
    result.hidden = true;
    form.hidden = false;
    status.textContent = '';
  }
  function setStatus(message) {
    const followupStatus = !result.hidden && result.querySelector('[data-assist-followup-status]');
    (followupStatus || status).textContent = message;
  }
  function controls() {
    const followupCancel = result.querySelector('[data-assist-followup-cancel]');
    return [...form.querySelectorAll('input, textarea, select, button'), ...result.querySelectorAll('input, button')].filter(control => control !== cancel && control !== submit && control !== followupCancel);
  }
  let disabledBefore = [];
  function setBusy(value) {
    busy = value; submit.setAttribute('aria-busy', String(value)); cancel.hidden = !value;
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
    event.target.value = '';
    const revision = ++photoRevision;
    preparing = true; submit.disabled = true;
    const message = root.querySelector('[data-assist-photo-message]'); message.textContent = '사진 크기를 줄이고 준비하고 있어요…';
    try {
      const prepared = await preparePhoto(file);
      if (!alive() || revision !== photoRevision) return;
      image = prepared.image;
      clearResult();
      root.querySelector('[data-assist-image]').src = prepared.preview;
      root.querySelector('[data-assist-photo-status]').textContent = '선택한 사진';
      root.querySelector('[data-assist-preview]').hidden = false;
      message.textContent = '';
    } catch (error) {
      if (alive() && revision === photoRevision) message.textContent = image ? `${error.message} 기존 사진을 유지했어요.` : error.message;
    }
    finally { if (alive() && revision === photoRevision) { preparing = false; submit.disabled = busy; } }
  }
  if (mode === 'photo') {
    form.elements.namedItem('camera').addEventListener('change', selectedPhoto);
    form.elements.namedItem('gallery').addEventListener('change', selectedPhoto);
    root.querySelector('[data-assist-remove]').addEventListener('click', clearPhoto);
  }
  function updateCount() {
    root.querySelector('[data-assist-count]').textContent = `${description.value.length.toLocaleString('ko-KR')} / 2,000자`;
  }
  const initialDescription = queued?.description ?? (mode === 'description' ? descriptionDraft : '');
  if (initialDescription) {
    description.value = initialDescription;
    updateCount();
    const extra = description.closest('.assist-extra');
    if (extra) extra.open = true;
  }
  description.addEventListener('input', () => {
    descriptionError.textContent = ''; description.removeAttribute('aria-invalid'); updateCount(); clearResult();
  });
  root.querySelector('.input-modes')?.addEventListener('click', event => {
    const route = event.target.closest('a')?.getAttribute('href')?.slice(1);
    if (!route || route === path || route === '/item-input' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (description.value.trim()) queueInput({ description: description.value.trim() }, route);
  });
  function cancelAnalysis() {
    controller?.abort(); gate.cancel(); setBusy(false); setStatus('분석을 취소했어요.');
    (result.hidden ? submit : result.querySelector('[data-assist-followup-form] button[type="submit"]'))?.focus();
  }
  cancel.addEventListener('click', cancelAnalysis);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || preparing || form.hidden) return;
    if (mode === 'description' && !description.value.trim()) {
      descriptionError.textContent = '물건에 대해 짧게라도 적어 주세요.';
      description.setAttribute('aria-invalid', 'true'); description.focus(); return;
    }
    if (mode === 'photo' && !image) { status.textContent = '분석할 사진을 먼저 촬영하거나 선택해 주세요.'; form.elements.namedItem('camera').focus(); return; }
    if (!region.validate()) return;
    if (!form.reportValidity()) return;
    await generate(answered);
  });
  async function generate(nextAnswers, followup = false) {
    const operation = gate.begin(); if (!operation) return;
    controller = new AbortController(); const selectedRegion = region.get();
    if (!followup) { answer = null; result.hidden = true; }
    setBusy(true);
    setStatus(followup ? '질문에 답한 내용을 반영해 안내를 갱신하고 있어요…' : mode === 'photo' ? '사진 속 물건과 표시를 확인하고 배출 방법을 만들고 있어요…' : '설명을 읽고 배출 방법을 만들고 있어요…');
    try {
      const input = { mode, description: description.value.trim(), region: selectedRegion };
      if (mode === 'photo') input.image = image;
      if (nextAnswers.length) input.answers = nextAnswers;
      const typedGuide = mode === 'description' && !nextAnswers.length ? registeredGuide(input.description, selectedRegion) : null;
      const response = typedGuide
        ? { itemName: input.description, identification: '', evidence: 'object', confidence: 'high', questions: [], markings: [], cautions: [] }
        : await request(input, { signal: controller.signal });
      if (!alive() || !operation.active()) return;
      answered = nextAnswers;
      const seenQuestions = new Set(answered.map(pair => questionKey(pair.question)));
      const remaining = response.questions.map((question, index) => ({ question, choices: response.questionChoices?.[index] || [] }))
        .filter(({ question }) => {
          const key = questionKey(question);
          if (!key || seenQuestions.has(key)) return false;
          seenQuestions.add(key);
          return true;
        });
      const guide = typedGuide || (response.evidence === 'object' && response.confidence !== 'low' ? registeredGuide(response.itemName, selectedRegion) : null);
      answer = { ...response, questions: remaining.map(entry => entry.question), questionChoices: remaining.map(entry => entry.choices) };
      if (guide && !typedGuide) answer.identification = `${mode === 'photo' ? '사진' : '설명'}에서 이 물건으로 파악했어요. 실제 물건과 이름이 일치하는지 확인해 주세요.`;
      result.innerHTML = assistanceResultMarkup(answer, selectedRegion, { answers: answered, mode, guide });
      status.textContent = '';
      result.hidden = false;
      form.hidden = true;
      result.focus({ preventScroll: true }); result.scrollIntoView({ block: 'start', behavior: 'instant' });
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
    if (!followupForm) return;
    event.preventDefault(); if (busy || !answer || !followupForm.reportValidity()) return;
    const additions = answer.questions.map((question, index) => ({ question, answer: followupForm.elements.namedItem(`answer${index}`).value.trim() })).filter(pair => pair.answer);
    if (!additions.length) {
      setStatus('아는 질문에 하나 이상 답하거나 ‘모르겠어요’를 골라 주세요.');
      (followupForm.querySelector('[data-assist-option]') || followupForm.elements.namedItem('answer0'))?.focus();
      return;
    }
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
      const choice = questionChoices(answer, index)[Number(option.dataset.choiceIndex)];
      input.value = input.value === choice ? '' : choice;
      syncChoices(followupForm); setStatus(''); return;
    }
    if (event.target.closest('[data-assist-refine]')) {
      clearResult({ keepAnswers: true });
      const extra = description.closest('.assist-extra');
      if (extra) extra.open = true;
      description.focus();
      description.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    if (event.target.closest('[data-assist-new]')) {
      description.value = ''; updateCount();
      if (mode === 'photo') { clearPhoto(); description.closest('.assist-extra').open = false; form.elements.namedItem('camera').focus(); }
      else { clearResult(); description.focus(); }
    }
    if (event.target.closest('[data-assist-check]') && answer) { queueInput({ itemName: answer.itemName }); location.hash = '/item-input'; }
  });
  return () => {
    if (mode === 'description' && (getCurrentMember()?.id || 'guest') === owner) descriptionDraft = description.value;
    disposed = true; controller?.abort(); gate.dispose(); photoRevision++; image = null;
  };
}

const questionKey = question => question.normalize('NFKC').replace(/[\s\p{P}]/gu, '');
