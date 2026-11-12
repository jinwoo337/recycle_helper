import { escapeHtml } from '../../utils/html.js';
import { inputModesMarkup, bindInputModes } from '../../components/input-modes.js';
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
import { lookupItem, normalizeItemName, searchItemNames } from '../../domain/disposal/item-suggestions.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { judgeDisposal, RULE_SOURCE, supportsState } from '../../domain/disposal/rules.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';
import { handlingConditionQuestion } from '../../domain/disposal/special-guides.js';
import { detectItemCategory, isBatteryPackaging } from '../../domain/disposal/category-keywords.js';
import { largeWasteHelp } from '../../domain/disposal/large-waste.js';
import { bindDisposalChecklist, checklistMarkup } from '../../components/disposal-checklist.js';
import { relatedDisposalMarkup } from '../../components/related-disposal.js';
import { bindResultCopy, copyResultButton, copyResultFallback } from '../../components/result-copy.js';
import { resultToText } from '../../domain/disposal/result-text.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';

const titles = { description: '물건 설명하기', photo: '사진으로 인식하기' };
const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
let assistanceDraft = {}, descriptionOwner;

function registeredGuide(name, region, { infer = true, condition } = {}) {
  if (isBatteryPackaging(name)) return { needsConditions: true, hint: '전지가 없는 포장만 선택하고 실제 재질 표시를 확인해 주세요.' };
  const item = lookupItem(name);
  if (!item?.material) {
    if (!infer) return null;
    const detected = detectItemCategory(name);
    if (!['large', 'damaged-battery'].includes(detected?.category)) return null;
    return { ...judgeDisposal({ itemName: name, region }), inferred: true };
  }
  const input = itemPresetInput(name);
  const prompt = handlingConditionQuestion(item.handling);
  if (prompt) {
    if (!prompt.options.some(([value]) => value === condition)) return { needsConditions: true, prompt };
    return { ...judgeDisposal({ ...input, region, handlingCondition: condition }), prompt, condition };
  }
  if (!input.type && !item.handling || supportsState(input) || input.material === '음식물류' && input.type === 'soft') {
    return { needsConditions: true, hint: '실제 재질 표시와 본체·부속품 상태를 확인해 주세요.' };
  }
  return judgeDisposal({ ...input, region });
}

function handlingPromptMarkup(guide) {
  if (!guide?.prompt) return '';
  const { prompt, condition } = guide;
  const choices = `<div class="assist-answer-options" role="group" aria-label="${escapeHtml(prompt.title)}">${prompt.options.map(([value, label]) =>
    `<button type="button" class="history-action" data-assist-handling="${value}" aria-pressed="${condition === value}">${label}</button>`
  ).join('')}</div>`;
  const selected = prompt.options.find(([value]) => value === condition)?.[1];
  if (selected) return `<details class="assist-answer-history"><summary>물건 상태 · ${selected}</summary>${choices}</details>`;
  return `<section class="assist-questions"><h3>${prompt.title}</h3>${choices}</section>`;
}

function questionChoices(answer, index) {
  return [...new Set([...(answer.questionChoices?.[index] || []), '모르겠어요'])];
}

function followUpMarkup(answer, answers, mode, pendingAnswers) {
  return `<section class="assist-questions"><h3>배출 전에 확인할 내용</h3><p id="assist-followup-hint">아는 것만 골라 주세요.</p>
    <form data-assist-followup-form>${answer.questions.map((question, index) => {
      const value = pendingAnswers[index] ?? answers.find(pair => pair.question === question)?.answer ?? '';
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

export function assistanceResultMarkup(answer, region, { answers = [], pendingAnswers = [], mode = 'description', guide = answer.evidence === 'object' && answer.confidence !== 'low' ? registeredGuide(answer.itemName, region) : null, fromInput = false } = {}) {
  if (guide) answer = { ...answer, questions: [] };
  const hasQuestions = answer.questions.length > 0;
  const uncertain = answer.evidence !== 'object' || answer.confidence === 'low' || answers.some(pair => pair.answer === '모르겠어요');
  const { method, steps } = guide?.needsConditions ? { method: '물건 상태 확인 후 배출 방법 보기', steps: [] }
    : guide || (uncertain || hasQuestions ? { method: '배출 전 추가 확인이 필요해요', steps: [] } : answer);
  const sources = guide?.sourceUrls?.filter(url => url === RULE_SOURCE || Object.hasOwn(CATALOG_DETAIL_SOURCES, url) || Object.values(REGIONAL_SOURCES).includes(url)) || [];
  const large = guide?.handling === 'large' ? largeWasteHelp(guide) : null;
  const canConfirm = guide || !uncertain;
  const correction = `<form class="assist-correction" data-assist-correction><div class="field"><label for="assist-correct-name">다른 물건이면 이름을 고쳐 주세요</label>
    <div class="item-name-control"><input id="assist-correct-name" name="itemName" maxlength="80" required autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="assist-correct-options" aria-expanded="false" aria-describedby="assist-correct-status"><div class="item-name-options" id="assist-correct-options" role="listbox" aria-label="추천 물품" hidden></div></div>
    <p id="assist-correct-status" class="input-hint" role="status"></p></div><button type="submit" class="button secondary">이 이름으로 기준 확인</button></form>`;
  const candidates = uncertain && answer.candidates?.length ? `<div class="assist-result-actions" aria-label="인식 후보">${answer.candidates.map(name => `<button type="button" class="button secondary" data-assist-candidate="${escapeHtml(name)}">${escapeHtml(name)} 기준 확인</button>`).join('')}</div>` : '';
  const hint = guide?.hint || '제품에 적힌 재질 표시와 용도를 확인해 주세요. 알 수 없다면 사진이나 제품명을 준비해 거주지 폐기물 담당 부서에 수거 여부를 문의해 주세요.';
  const checklist = Boolean(guide && steps.length);
  const copy = guide?.ruleVersion && steps.length ? `<div class="result-actions">${copyResultButton}</div><p class="input-hint" data-result-tools-status role="status"></p>${copyResultFallback}` : '';
  const guidance = guide?.prompt && !guide.condition ? '' : `<div class="assist-method"><h3>${escapeHtml(method)}</h3></div>${checklist ? checklistMarkup() : ''}${steps.length ? stepListMarkup(steps, 'action-steps', { checklist }) : `<p class="input-hint">${escapeHtml(hint)}</p>`}`;
  return `<p class="eyebrow">${guide?.inferred ? '이름으로 알아본 종류의 안내' : guide ? '등록 품목 안내' : 'AI 참고 안내'} · ${escapeHtml(guide?.regional ? resultRegionLabel(guide) : regionLabel(region))}</p>
    <h2 id="assistance-result-title">${escapeHtml(answer.itemName)}</h2>
    ${guide && !fromInput ? '<p class="assist-identification">사진이나 설명에서 추정한 이름이에요. 실제 물건과 같은지 확인해 주세요.</p>' : !guide && answer.identification ? `<p class="assist-identification">${escapeHtml(answer.identification)}</p>` : ''}
    ${answer.evidence === 'markings' ? '<p class="input-hint">표시는 읽었지만 실제 물건은 확인하지 못했어요. 물건 전체 사진이나 용도 설명을 더해 주세요.</p>' : ''}
    ${answer.markings.length ? `<p class="assist-markings"><strong>AI가 읽은 표시</strong> ${answer.markings.map(escapeHtml).join(' · ')}</p>` : ''}
    ${candidates}
    ${!guide && !uncertain && answer.cautions.length ? `<h3>주의할 점</h3>${list(answer.cautions)}` : ''}
    ${handlingPromptMarkup(guide)}
    ${hasQuestions ? followUpMarkup(answer, answers, mode, pendingAnswers) : guidance}
    ${guide?.handling && steps.length ? collectionPointMarkup({ ...guide, itemName: answer.itemName }) : ''}
    ${large?.reportUrl ? `<div class="assist-result-actions"><a class="button primary" href="${escapeHtml(large.reportUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(large.office)} 대형폐기물 ${large.directReport ? '배출 신청' : '안내'} ↗</a></div>` : ''}
    ${sources.length ? `<details class="assist-answer-history"><summary>등록 안내의 출처</summary><ul>${sources.map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url === RULE_SOURCE ? '분리배출 지침' : CATALOG_DETAIL_SOURCES[url] || regionalSourceLabel(url))}</a></li>`).join('')}</ul></details>` : ''}
    ${answers.length ? `<details class="assist-answer-history"><summary>지금까지 답한 내용 ${answers.length}개</summary><dl>${answers.map(pair => `<dt>${escapeHtml(pair.question)}</dt><dd>${escapeHtml(pair.answer)}</dd>`).join('')}</dl></details>` : ''}
    ${!guide && steps.length ? '<p class="input-hint">실제 제품 표시와 거주지 수거 기준을 확인해 주세요.</p>' : ''}
    ${guide ? relatedDisposalMarkup(answer.itemName) : ''}
    <div class="assist-result-actions">${canConfirm && (!guide?.prompt || guide.condition) ? `<button type="button" class="button ${guide?.needsConditions ? 'primary' : 'secondary'}" data-assist-check>${guide?.needsConditions ? '물건 상태 확인하기' : '이 이름으로 기준 확인'}</button>` : ''}<button type="button" class="button secondary" data-assist-refine>입력 수정</button><button type="button" class="button secondary" data-assist-new>다른 물건 찾기</button></div>${copy}${correction}`;
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
        <p class="assist-photo-message" data-assist-photo-message role="status" aria-live="polite"></p><button type="button" class="history-action" data-assist-describe>사진 대신 설명으로 찾기</button></section>` : ''}
      ${photo ? `<details class="assist-extra"><summary>사진에 보이지 않는 정보 추가 (선택)</summary>${descriptionField}</details>` : descriptionField}
      ${judgementRegionMarkup(readJudgementRegion(getCurrentMember()))}
      <div class="assist-submit-row"><button type="submit" class="button primary">${photo ? '사진 인식하고 안내 받기' : '설명으로 안내 받기'}</button><button type="button" class="button secondary" data-assist-cancel hidden>분석 취소</button></div>
      <p class="form-status" data-assist-status role="status" aria-live="polite"></p>
      <p class="input-hint">${photo ? '사진·설명' : '설명'}과 선택한 지역을 Google Gemini에 보내요.</p>
      <details class="assist-data-use"><summary>입력 정보 사용 안내</summary><p class="input-hint">개인정보가 담긴 내용은 제외해 주세요. ${photo ? '사진은 크기와 원본 촬영 정보를 줄여 전송해요. 새 물건을 찾거나 페이지를 새로고침하면 사진 초안이 지워져요. ' : ''}입력과 안내는 이 사이트의 판별 기록에 자동 저장되지 않아요.</p></details>
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
  if (owner !== descriptionOwner || queued?.newSearch || (queued?.sourceName && normalizeItemName(queued.sourceName) !== normalizeItemName(assistanceDraft.sourceName))) {
    assistanceDraft = {}; descriptionOwner = owner;
  }
  if (queued?.sourceName) assistanceDraft.sourceName = queued.sourceName;
  let image = null, previewUrl = '', photoRevision = 0, preparing = false, busy = false, disposed = false, controller, answer, answered = [];
  let currentResult = null;
  let disposeResult = () => {};
  const initialRegion = queued && Object.hasOwn(queued, 'region') ? queued.region
    : Object.hasOwn(assistanceDraft, 'region') ? assistanceDraft.region : readJudgementRegion(getCurrentMember());
  const region = bindRegion(form, initialRegion, {
    onChange(value) {
      rememberJudgementRegion(value, getCurrentMember());
      clearResult({ keepAnswers: true });
    },
  });
  const alive = () => !disposed && root.isConnected;
  function clearResult({ keepAnswers = false } = {}) {
    disposeResult();
    disposeResult = () => {};
    answer = null;
    currentResult = null;
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
    photoRevision++; image = null; previewUrl = ''; preparing = false;
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
      image = prepared.image; previewUrl = prepared.preview;
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
    root.querySelector('[data-assist-describe]')?.addEventListener('click', () => { location.hash = '/describe'; });
    if (assistanceDraft.photo) {
      ({ image, previewUrl } = assistanceDraft.photo);
      root.querySelector('[data-assist-image]').src = previewUrl;
      root.querySelector('[data-assist-photo-status]').textContent = '선택한 사진';
      root.querySelector('[data-assist-preview]').hidden = false;
    }
  }
  function updateCount() {
    root.querySelector('[data-assist-count]').textContent = `${description.value.length.toLocaleString('ko-KR')} / 2,000자`;
  }
  const initialDescription = queued?.sourceName && assistanceDraft.description?.trim()
    ? assistanceDraft.description : queued?.description ?? assistanceDraft.description ?? '';
  if (initialDescription) {
    description.value = initialDescription;
    updateCount();
    const extra = description.closest('.assist-extra');
    if (extra) extra.open = true;
  }
  const previous = assistanceDraft.sessions?.[mode];
  if (previous?.description === description.value) answered = previous.answers;
  description.addEventListener('input', () => {
    descriptionError.textContent = ''; description.removeAttribute('aria-invalid'); updateCount(); clearResult();
  });
  function prepareNameSearch(itemName) {
    assistanceDraft.sourceName = itemName;
    const sameItem = normalizeItemName(itemName) === normalizeItemName(answer?.itemName);
    const handlingCondition = sameItem && currentResult?.guide?.condition;
    queueInput({
      itemName, region: region.get(), fromAssistance: true,
      ...(handlingCondition ? { handlingCondition } : {}),
    });
  }
  function openNameSearch(itemName) {
    prepareNameSearch(itemName);
    location.hash = '/item-input';
  }
  const disposeModes = bindInputModes(root, route => {
    if (route !== '/item-input') return;
    const name = assistanceDraft.sourceName || (answer?.evidence === 'object' && answer.confidence !== 'low' ? answer.itemName : '');
    if (name) prepareNameSearch(name);
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
    if (mode === 'photo' && !image) { root.querySelector('[data-assist-photo-message]').textContent = '분석할 사진을 먼저 촬영하거나 선택해 주세요.'; form.elements.namedItem('camera').focus(); return; }
    if (!region.validate()) return;
    if (!form.reportValidity()) return;
    await generate(answered);
  });
  function renderResult(view, moveFocus = true) {
    answer = view.answer;
    currentResult = view;
    disposeResult();
    result.innerHTML = assistanceResultMarkup(answer, view.region, {
      answers: answered, pendingAnswers: view.pendingAnswers, mode, guide: view.guide, fromInput: view.fromInput,
    });
    const disposeChecklist = bindDisposalChecklist(result);
    const disposeCopy = bindResultCopy(result, () => resultToText({
      ...itemPresetInput(view.answer.itemName), region: view.region, handlingCondition: view.guide?.condition,
    }, view.guide));
    const correction = result.querySelector('[data-assist-correction]');
    const autocomplete = correction && bindItemAutocomplete({
      input: correction.elements.namedItem('itemName'),
      options: correction.querySelector('#assist-correct-options'),
      status: correction.querySelector('#assist-correct-status'),
      search: searchItemNames,
      onSelect: () => correction.requestSubmit(),
      noResultsMessage: '이 이름으로 이어서 AI 제안이나 실제 재질을 확인할 수 있어요.',
    });
    disposeResult = () => { disposeChecklist(); disposeCopy(); autocomplete?.dispose(); };
    status.textContent = '';
    result.hidden = false;
    form.hidden = true;
    if (moveFocus) {
      result.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  async function generate(nextAnswers, followup = false) {
    const operation = gate.begin(); if (!operation) return;
    controller = new AbortController(); const selectedRegion = region.get();
    if (!followup) { answer = null; currentResult = null; result.hidden = true; }
    setBusy(true);
    setStatus(followup ? '질문에 답한 내용을 반영해 안내를 갱신하고 있어요…' : mode === 'photo' ? '사진 속 물건과 표시를 확인하고 배출 방법을 만들고 있어요…' : '설명을 읽고 배출 방법을 만들고 있어요…');
    try {
      const input = { mode, description: description.value.trim(), region: selectedRegion };
      if (mode === 'photo') input.image = image;
      if (nextAnswers.length) input.answers = nextAnswers;
      const typedGuide = mode === 'description' && !nextAnswers.length ? registeredGuide(input.description, selectedRegion, { infer: false }) : null;
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
      const nextAnswer = {
        ...response,
        questions: guide ? [] : remaining.map(entry => entry.question),
        questionChoices: guide ? [] : remaining.map(entry => entry.choices),
      };
      renderResult({ answer: nextAnswer, region: selectedRegion, guide, fromInput: Boolean(typedGuide) });
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
    const correction = event.target.closest('[data-assist-correction]');
    if (correction) {
      event.preventDefault();
      const name = correction.elements.namedItem('itemName').value.trim();
      if (!busy && name) openNameSearch(name);
      return;
    }
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
    const condition = event.target.closest('[data-assist-handling]')?.dataset.assistHandling;
    if (condition && currentResult?.guide?.prompt?.options.some(([value]) => value === condition)) {
      const guide = registeredGuide(answer.itemName, currentResult.region, { condition });
      renderResult({ ...currentResult, guide });
      return;
    }
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
      assistanceDraft = {};
      description.value = ''; updateCount();
      if (mode === 'photo') { clearPhoto(); description.closest('.assist-extra').open = false; form.elements.namedItem('camera').focus(); }
      else { clearResult(); description.focus(); }
    }
    const candidate = event.target.closest('[data-assist-candidate]')?.dataset.assistCandidate;
    const related = event.target.closest('[data-related-item]')?.dataset.relatedItem;
    if (related) {
      queueInput({ itemName: related, region: region.get() });
      location.hash = '/item-input';
    } else if (candidate) openNameSearch(candidate);
    else if (event.target.closest('[data-assist-check]') && answer) openNameSearch(answer.itemName);
  });
  const savedResult = previous?.result;
  const selectedRegion = region.get();
  if (savedResult && previous.description === description.value && (mode !== 'photo' || image)
      && savedResult.region?.province === selectedRegion?.province && savedResult.region?.district === selectedRegion?.district) {
    renderResult(savedResult, false);
  }
  return () => {
    if ((getCurrentMember()?.id || 'guest') === owner) {
      assistanceDraft.description = description.value;
      assistanceDraft.region = region.get();
      const followup = currentResult && !result.hidden ? result.querySelector('[data-assist-followup-form]') : null;
      const pendingAnswers = followup ? answer.questions.map((_, index) => followup.elements.namedItem(`answer${index}`)?.value || '') : [];
      (assistanceDraft.sessions ||= {})[mode] = {
        description: description.value,
        answers: answered,
        result: currentResult && !result.hidden ? { ...currentResult, pendingAnswers } : null,
      };
      if (mode === 'photo') assistanceDraft.photo = image ? { image, previewUrl } : null;
    }
    disposeResult();
    disposeModes();
    disposed = true; controller?.abort(); gate.dispose(); photoRevision++; image = null;
  };
}

const questionKey = question => question.normalize('NFKC').replace(/[\s\p{P}]/gu, '');
