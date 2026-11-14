import { escapeHtml } from '../../utils/html.js';
import { inputModesMarkup, bindInputModes } from '../../components/input-modes.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { getCurrentMember } from '../../services/auth.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { regionLabel, REGIONAL_SOURCES, regionalSourceLabel, resultRegionLabel } from '../../domain/disposal/regions.js';
import { requestAssistance } from '../../services/ai-assistance.js';
import { prepareAssistancePhoto, PHOTO_ACCEPT } from '../../services/assistance-photo.js';
import { stepListMarkup } from '../../components/step-list.js';
import { bindVerifiedCollection, collectionPointMarkup } from '../../components/collection-help.js';
import { collectionActionMarkup } from '../../components/collection-action.js';
import { disposalReasonMarkup } from '../../components/disposal-reason.js';
import { regionalComparisonMarkup } from '../../components/regional-comparison.js';
import { disposalScheduleMarkup } from '../../components/disposal-schedule.js';
import { inputSearchVersion, queueInput, startInputSearch, takeQueuedInput, UNNAMED_ITEM } from '../../services/input-draft.js';
import { confirmedPhotoMark, photoMarkMaterial, photoMarkNeedsShape, photoMarkPart, photoMarkPartLabel } from '../../domain/disposal/recycle-marks.js';
import { createOperationGate } from '../../utils/operation-gate.js';
import { mergeAssistanceAnswers, ASSIST_ANSWERS_MAX } from '../../domain/disposal/ai-assistance.js';
import { disposalItemList, explicitDescriptionItemName, itemTypeClarification, itemCandidateHint, itemCandidateTitle, lookupItem, normalizeItemName, relatedItemCandidates, searchItemNames, uniqueItemNames } from '../../domain/disposal/item-suggestions.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { judgeDisposal, RULE_SOURCE, supportsState } from '../../domain/disposal/rules.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';
import { handlingConditionQuestion } from '../../domain/disposal/special-guides.js';
import { isBatteryPackaging } from '../../domain/disposal/category-keywords.js';
import { categoryLabel } from '../../domain/disposal/item-categories.js';
import { mergeItemObservations, observationKey, observationLabel } from '../../domain/disposal/item-observations.js';
import { resolveInputCategory } from '../../domain/disposal/input-category.js';
import { bindDisposalChecklist, checklistMarkup } from '../../components/disposal-checklist.js';
import { relatedDisposalMarkup } from '../../components/related-disposal.js';
import { bindResultCopy, copyResultButton, copyResultFallback } from '../../components/result-copy.js';
import { resultToText } from '../../domain/disposal/result-text.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';
import { addDisposalBatchItem, addMealToBatch } from '../../services/disposal-batch.js';
import { saveDisposalRecord } from '../../services/disposal-history.js';

const titles = { description: '물건 설명하기', photo: '사진으로 인식하기' };
let assistanceDraft = {}, descriptionOwner;

function resultInput(view) {
  const { answer, region, guide } = view;
  return { ...itemPresetInput(answer.itemName), region, ...(guide?.condition ? { handlingCondition: guide.condition } : {}) };
}

function descriptionName(input) {
  const name = explicitDescriptionItemName(input);
  if (name) return name;
  if (input.length > 80) return '';
  const parts = disposalItemList(input);
  return parts.length && parts.every(part => lookupItem(part) || itemTypeClarification(part)) ? input : '';
}

function syncMarkShape(row) {
  const part = row.querySelector('[data-mark-part]').value;
  const shape = row.querySelector('[data-mark-shape]');
  const marking = row.dataset.marking;
  const showShape = Boolean(part && part !== 'film' && photoMarkNeedsShape(marking));
  shape.closest('[data-assist-mark-shape]').hidden = !showShape;
  if (!showShape) shape.value = '';
  const label = row.querySelector('[data-mark-label]');
  label.closest('.field').hidden = !part || part === 'body';
  if (part === 'body') label.value = '';
}

function selectedPhotoMarks(root) {
  const form = root.querySelector('[data-assist-mark-confirm]');
  return [...(form?.querySelectorAll('[data-marking]') || [])].map(row => ({
    marking: row.dataset.marking,
    use: row.querySelector('[data-use-mark]').checked,
    part: row.querySelector('[data-mark-part]').value,
    shape: row.querySelector('[data-mark-shape]').value,
    label: row.querySelector('[data-mark-label]').value,
  }));
}

function registeredGuide(name, region, { infer = true, condition } = {}) {
  if (isBatteryPackaging(name)) return { needsConditions: true, hint: '전지가 없는 포장만 선택하고 실제 재질 표시를 확인해 주세요.' };
  const item = lookupItem(name);
  const registered = Boolean(item?.material);
  const detected = !registered && infer ? resolveInputCategory({ itemName: name }).category : '';
  if (!registered && (!detected || detected === 'packaging')) return null;
  const input = registered ? itemPresetInput(name) : { itemName: name };
  const prompt = handlingConditionQuestion(item?.handling || detected, region);
  if (prompt) {
    if (!prompt.options.some(([value]) => value === condition)) return { needsConditions: true, prompt, inferred: !registered };
    return { ...judgeDisposal({ ...input, region, handlingCondition: condition }), prompt, condition, inferred: !registered };
  }
  if (!registered) return { ...judgeDisposal({ ...input, region }), inferred: true };
  if (!input.type && !item.handling || supportsState(input) || input.material === '음식물류' && input.type === 'soft') {
    return { needsConditions: true, hint: '실제 재질 표시와 본체·부속품 상태를 확인해 주세요.' };
  }
  return judgeDisposal({ ...input, region });
}

function handlingPromptMarkup(guide, observations) {
  if (!guide?.prompt) return '';
  const { prompt, condition } = guide;
  const choices = `<div class="assist-answer-options" role="group" aria-label="${escapeHtml(prompt.title)}">${prompt.options.map(([value, label]) =>
    `<button type="button" class="history-action" data-assist-handling="${value}" aria-pressed="${condition === value}">${label}</button>`
  ).join('')}</div>`;
  const selected = prompt.options.find(([value]) => value === condition)?.[1];
  if (selected) return `<details class="assist-answer-history"><summary>물건 상태 · ${selected}</summary>${choices}</details>`;
  const observed = observations.find(entry => entry.field === 'handlingCondition' && prompt.options.some(([value]) => value === entry.value));
  const hint = observed ? `<p class="input-hint">${observed.conflicts ? '입력한 설명과 AI 제안이 달라요. 실제 상태를 확인해 주세요.' : `${observed.source === 'description' ? '설명에 적은 상태' : 'AI가 제안한 상태 · 확인 필요'}: ${escapeHtml(observationLabel(observed))}`}</p>` : '';
  return `<section class="assist-questions"><h3>${prompt.title}</h3>${hint}${choices}</section>`;
}

function questionChoices(answer, index) {
  return [...new Set([...(answer.questionChoices?.[index] || []).filter(choice => choice !== '모르겠어요').slice(0, 3), '모르겠어요'])];
}

function assistanceUncertain(answer, answers) {
  return answer.evidence !== 'object' || answer.confidence === 'low' || answers.some(pair => pair.answer === '모르겠어요');
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
      <button type="button" class="history-action" data-assist-continue-manually>물건 종류 직접 선택</button>
    </form></section>`;
}

export function assistanceResultMarkup(answer, region, { answers = [], pendingAnswers = [], mode = 'description', guide = answer.evidence === 'object' && answer.confidence !== 'low' ? registeredGuide(answer.itemName, region) : null, fromInput = false, observations = [], selectedObservations, sourceName = '', componentLabels = [], confirmIdentity = false } = {}) {
  if (guide) answer = { ...answer, questions: [] };
  const hasQuestions = answer.questions.length > 0;
  const uncertain = assistanceUncertain(answer, answers);
  const { method, steps } = confirmIdentity ? { method: '물건 이름을 확인하면 배출 방법을 볼 수 있어요', steps: [] }
    : guide?.needsConditions ? { method: '물건 상태 확인 후 배출 방법 보기', steps: [] }
    : guide || { method: '배출 전 추가 확인이 필요해요', steps: [] };
  const sources = !confirmIdentity && guide?.sourceUrls?.filter(url => url === RULE_SOURCE || Object.hasOwn(CATALOG_DETAIL_SOURCES, url) || Object.values(REGIONAL_SOURCES).includes(url)) || [];
  const canConfirm = guide || !uncertain;
  const resumeName = sourceName && normalizeItemName(sourceName) !== normalizeItemName(answer.itemName) ? sourceName : '';
  const category = !guide && canConfirm ? categoryLabel(answer.category) : '';
  const correction = `<form class="assist-correction" data-assist-correction><div class="field"><label for="assist-correct-name">다른 물건이면 이름을 고쳐 주세요</label>
    <div class="item-name-control"><input id="assist-correct-name" name="itemName" maxlength="80" required autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="assist-correct-options" aria-expanded="false" aria-describedby="assist-correct-status"><div class="item-name-options" id="assist-correct-options" role="listbox" aria-label="추천 물품" hidden></div></div>
    <p id="assist-correct-status" class="input-hint" role="status"></p></div><button type="submit" class="button secondary">이 이름으로 기준 확인</button></form>`;
  const alternatives = guide ? [] : uniqueItemNames([...relatedItemCandidates(answer.itemName), ...(answer.candidates || [])], 4);
  const candidates = alternatives.length ? `<div class="assist-result-actions" aria-label="인식 후보">${alternatives.map(name => `<button type="button" class="button secondary" data-assist-candidate="${escapeHtml(name)}">${escapeHtml(itemCandidateTitle(name))}${itemCandidateHint(name) ? ` · ${escapeHtml(itemCandidateHint(name))}` : ''}</button>`).join('')}</div>` : '';
  const hint = guide?.hint || '제품에 적힌 재질 표시와 용도를 확인해 주세요. 알 수 없다면 사진이나 제품명을 준비해 거주지 폐기물 담당 부서에 수거 여부를 문의해 주세요.';
  const checklist = Boolean(guide && steps.length);
  const tools = guide?.ruleVersion && steps.length && !confirmIdentity ? `<div class="result-actions"><button type="button" class="history-action" data-assist-batch>함께 버릴 목록에 담기</button>${copyResultButton}<button type="button" class="history-action" data-assist-save>판별 결과 저장</button></div><p class="input-hint" data-result-tools-status role="status"></p>${copyResultFallback}` : '';
  const canContinue = !confirmIdentity && canConfirm && (!guide?.prompt || guide.condition);
  const nextAction = confirmIdentity ? '<button type="button" class="button primary" data-assist-confirm-identity>이 물건이 맞아요</button>'
    : canContinue ? `<button type="button" class="button ${guide?.ruleVersion ? 'secondary' : 'primary'}" data-assist-check>${guide?.needsConditions ? '물건 상태 확인하기' : category ? '이 종류로 확인하기' : '이 이름으로 기준 확인'}</button>`
    : !guide ? '<button type="button" class="button secondary" data-assist-continue-manually>종류·재질 직접 확인</button>' : '';
  const observationFields = canContinue && observations.length && !guide?.ruleVersion ? `<fieldset class="assist-observations"><legend>확인한 조건만 선택해 주세요</legend>${observations.map((entry, index) =>
    `<label><input type="checkbox" data-assist-observation="${index}" ${(selectedObservations ? selectedObservations.includes(index) : entry.source === 'description') ? 'checked' : ''}><span>${escapeHtml(observationLabel(entry))}<small>${entry.source === 'description' ? '입력한 설명 · 필요하면 선택 해제' : mode === 'photo' ? '사진·설명에서 AI가 추정 · 확인 필요' : '설명에서 AI가 추정 · 확인 필요'}</small></span></label>`).join('')}</fieldset>` : '';
  const guidance = steps.length ? stepListMarkup(steps, 'action-steps', { checklist, emphasizeFirst: true })
    : !guide?.prompt && !confirmIdentity ? `<p class="input-hint">${escapeHtml(hint)}</p>` : '';
  const readableMarks = mode === 'photo' && (answer.evidence === 'markings' || canContinue && !guide?.ruleVersion)
    ? [...new Set(answer.markings)].filter(photoMarkMaterial) : [];
  const markForm = readableMarks.length ? `<form class="assist-questions assist-mark-confirm" data-assist-mark-confirm>
    <h3>포장에 실제로 적힌 표시인가요?</h3><p class="input-hint">직접 확인한 표시를 체크하고, 표시가 적힌 부위를 골라 주세요.</p>
    ${readableMarks.map(mark => `<fieldset class="assist-observations" data-marking="${escapeHtml(mark)}">
      <legend>${escapeHtml(mark)}</legend><label><input type="checkbox" data-use-mark> 이 표시 적용</label>
      <div class="field"><label>표시가 있는 곳 <select data-mark-part><option value="">부위를 골라 주세요</option>${[['body', '본체'], ['lid', '뚜껑·마개'], ['label', '라벨'], ['film', '포장 필름']].map(([value, label]) => `<option value="${value}"${photoMarkPart(mark) === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label></div>
      <div class="field" hidden><label>부속품 이름 (선택) <input type="text" data-mark-label maxlength="40" placeholder="예: 바깥 뚜껑, 안쪽 마개" value="${escapeHtml(photoMarkPartLabel(mark))}"${componentLabels.length ? ' list="assist-existing-parts"' : ''}></label></div>
      <div class="field" data-assist-mark-shape hidden><label>표시가 있는 부분의 형태 <select data-mark-shape><option value="">다음 화면에서 고르기</option><option value="film">비닐 봉지·얇은 포장 필름</option>${photoMarkMaterial(mark) === '페트병'
        ? '<option value="other-pet">유색 페트병 또는 음료병 외 PET 용기</option>'
        : '<option value="container">단단한 용기·트레이</option>'}</select></label></div>
    </fieldset>`).join('')}
    ${componentLabels.length ? `<datalist id="assist-existing-parts">${componentLabels.map(label => `<option value="${escapeHtml(label)}"></option>`).join('')}</datalist>` : ''}
    <p class="field-error" data-mark-error role="alert"></p>
    <button type="submit" class="button primary">선택한 표시로 이어서 확인</button>
  </form>` : '';
  return `<p class="eyebrow">${guide?.inferred ? '이름으로 알아본 종류의 안내' : guide ? '등록 품목 안내' : 'AI 참고 안내'} · ${escapeHtml(guide?.regional ? resultRegionLabel(guide) : regionLabel(region))}</p>
    <h2 id="assistance-result-title">${escapeHtml(answer.itemName)}</h2>
    <div class="assist-method"><p class="eyebrow">어디에 버리나요?</p><h3>${escapeHtml(method)}</h3></div>
    ${guide && !fromInput ? '<p class="assist-identification">사진이나 설명에서 추정한 이름이에요. 실제 물건과 같은지 확인해 주세요.</p>' : !guide && answer.identification ? `<p class="assist-identification">${escapeHtml(answer.identification)}</p>` : ''}
    ${answer.evidence === 'markings' ? '<p class="input-hint">표시는 읽었지만 실제 물건은 확인하지 못했어요. 물건 전체 사진이나 용도 설명을 더해 주세요.</p>' : ''}
    ${answer.markings.length ? `<p class="assist-markings"><strong>AI가 읽은 표시</strong> ${answer.markings.map(escapeHtml).join(' · ')}</p>` : ''}
    <h3 class="result-action-title">지금 할 일</h3>
    ${markForm}
    ${candidates}
    ${handlingPromptMarkup(guide, observations)}
    ${category ? `<p class="assist-identification"><strong>AI가 제안한 종류:</strong> ${escapeHtml(category)}</p>` : ''}
    ${observationFields}
    ${nextAction ? `<div class="assist-result-actions">${nextAction}</div>` : ''}
    ${resumeName ? `<p><button type="button" class="history-action" data-assist-resume-name>입력한 ‘${escapeHtml(resumeName)}’의 조건으로 돌아가기</button></p>` : ''}
    ${guide?.ruleVersion && !confirmIdentity ? collectionActionMarkup(resultInput({ answer, region, guide }), guide) : ''}
    ${hasQuestions && !category ? followUpMarkup(answer, answers, mode, pendingAnswers) : guidance}
    ${!confirmIdentity && !guide?.needsConditions ? disposalScheduleMarkup(guide) : ''}
    ${confirmIdentity ? disposalReasonMarkup(null, '물건이 맞는지 확인하면 해당 품목의 배출 기준을 적용할 수 있어요.')
      : guide?.ruleVersion ? disposalReasonMarkup(guide)
        : disposalReasonMarkup(null, '물건의 용도나 상태에 따라 배출 방법이 달라요. 위에서 확인할 수 있는 정보를 골라 주세요.')}
    ${checklist ? checklistMarkup() : ''}
    ${guide?.handling && steps.length ? collectionPointMarkup({ ...guide, itemName: answer.itemName }, { official: false }) : ''}
    ${guide?.ruleVersion && !confirmIdentity ? regionalComparisonMarkup(resultInput({ answer, region, guide }), guide) : ''}
    ${sources.length ? `<details class="assist-answer-history"><summary>등록 안내의 출처</summary><ul>${sources.map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url === RULE_SOURCE ? '분리배출 지침' : CATALOG_DETAIL_SOURCES[url] || regionalSourceLabel(url))}</a></li>`).join('')}</ul></details>` : ''}
    ${answers.length ? `<details class="assist-answer-history"><summary>지금까지 답한 내용 ${answers.length}개</summary><dl>${answers.map(pair => `<dt>${escapeHtml(pair.question)}</dt><dd>${escapeHtml(pair.answer)}</dd>`).join('')}</dl></details>` : ''}
    ${guide?.ruleVersion && !confirmIdentity ? relatedDisposalMarkup(answer.itemName) : ''}
    ${!guide && !uncertain ? '<p><button type="button" class="history-action" data-assist-request-registration>이 이름으로 품목 등록 요청</button></p>' : ''}
    <div class="assist-result-actions"><button type="button" class="button secondary" data-assist-refine>입력 수정</button><button type="button" class="button secondary" data-assist-new>다른 물건 찾기</button></div>${tools}${correction}`;
}

export function assistancePage(mode = 'description') {
  const photo = mode === 'photo';
  const descriptionField = `<div class="field"><label for="assist-description">${photo ? '추가 정보' : '어떤 물건인가요?'}</label><textarea id="assist-description" name="description" rows="${photo ? 3 : 4}" maxlength="2000" ${photo ? '' : 'required'} aria-describedby="assist-description-hint assist-description-error" placeholder="${photo ? '예: 뚜껑은 분리할 수 있어요.' : '예: PP 표시가 있는 배달 용기예요. 기름기가 남아 있어요.'}"></textarea><p id="assist-description-error" class="field-error" role="alert"></p><div class="assist-description-meta"><p id="assist-description-hint" class="input-hint">${photo ? '내용물이나 사진에 보이지 않는 상태를 적어 주세요.' : '재질 표시나 현재 상태를 알면 함께 적어 주세요.'}</p><span id="assist-count" data-assist-count>0 / 2,000자</span></div></div>`;
  return `<section class="container assist-page" id="assistance-root">
    <header class="item-heading"><h1>${titles[mode]}</h1></header>
    ${inputModesMarkup(mode)}
    <form class="item-card assist-form" data-assist-form novalidate>
      ${photo ? `<section class="assist-photo" aria-labelledby="assist-photo-title"><h2 id="assist-photo-title">물건 사진</h2><p class="input-hint">물건 전체나 분리배출 표시가 잘 보이는 사진을 선택해 주세요.</p>
        <div class="assist-photo-buttons"><label class="button secondary assist-file-label">사진 촬영<input type="file" name="camera" accept="${PHOTO_ACCEPT}" capture="environment" aria-label="물건 사진 촬영" aria-describedby="assist-photo-message"></label><label class="button secondary assist-file-label">사진 선택<input type="file" name="gallery" accept="${PHOTO_ACCEPT}" aria-label="저장된 사진 선택" aria-describedby="assist-photo-message"></label><button type="button" class="history-action" data-assist-describe>설명으로 찾기</button></div>
        <p class="input-hint">JPG·PNG·WebP·HEIC · 12MB 이하</p>
        <figure class="assist-preview" data-assist-preview hidden><img data-assist-image alt="분석할 물건 사진 미리보기"><figcaption><span data-assist-photo-status></span><button type="button" class="history-action" data-assist-remove>사진 지우기</button></figcaption></figure>
        <p class="assist-photo-message" id="assist-photo-message" data-assist-photo-message role="status" aria-live="polite"></p></section>` : ''}
      ${photo ? `<details class="assist-extra"><summary>사진에 보이지 않는 정보 추가 (선택)</summary>${descriptionField}</details>` : descriptionField}
      ${judgementRegionMarkup(readJudgementRegion(getCurrentMember()))}
      <div class="assist-submit-row"><button type="submit" class="button primary">${photo ? '사진 인식하고 안내 받기' : '설명으로 안내 받기'}</button><button type="button" class="button secondary" data-assist-cancel hidden>분석 취소</button><button type="button" class="history-action" data-assist-continue-manually>물건 종류 직접 선택</button></div>
      <p class="form-status" data-assist-status role="status" aria-live="polite"></p>
      <p class="input-hint">${photo ? '사진·설명' : '설명'}과 선택한 지역을 Google Gemini에 보내요.</p>
      <details class="assist-data-use"><summary>입력 정보 사용 안내</summary><p class="input-hint">개인정보가 담긴 내용은 제외해 주세요. ${photo ? '사진은 크기와 원본 촬영 정보를 줄여 전송해요. 새 물건을 찾거나 페이지를 새로고침하면 사진 초안이 지워져요. ' : ''}사진과 자유 설명은 판별 기록에 저장되지 않아요. ‘판별 결과 저장’을 선택하면 물건 이름, 확인한 조건과 배출 안내를 저장해요.</p></details>
    </form>
    <section class="item-card assist-result" data-assist-result tabindex="-1" aria-labelledby="assistance-result-title" hidden></section>
  </section>`;
}

export function bindAssistance(mode, { root = document.getElementById('assistance-root'), request = requestAssistance, preparePhoto = prepareAssistancePhoto, bindRegion = bindJudgementRegion } = {}) {
  const form = root.querySelector('[data-assist-form]'), description = form.elements.namedItem('description');
  const status = root.querySelector('[data-assist-status]'), result = root.querySelector('[data-assist-result]');
  const descriptionError = root.querySelector('#assist-description-error');
  const submit = form.querySelector('[type="submit"]'), cancel = root.querySelector('[data-assist-cancel]');
  const submitLabel = submit.textContent;
  const gate = createOperationGate();
  const path = mode === 'photo' ? '/photo' : '/describe';
  const queued = takeQueuedInput(path);
  const owner = getCurrentMember()?.id || 'guest';
  if (owner !== descriptionOwner || assistanceDraft.version !== inputSearchVersion() || queued?.newSearch || (queued?.sourceName && normalizeItemName(queued.sourceName) !== normalizeItemName(assistanceDraft.sourceName))) {
    assistanceDraft = { version: inputSearchVersion() }; descriptionOwner = owner;
  }
  if (queued?.sourceName) assistanceDraft.sourceName = queued.sourceName;
  if (queued?.componentLabels) assistanceDraft.componentLabels = queued.componentLabels;
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
    submit.textContent = submitLabel;
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
    setPhotoMessage('');
    submit.disabled = busy; clearResult();
  }
  function setPhotoMessage(message, error = false) {
    const node = root.querySelector('[data-assist-photo-message]');
    node.textContent = message;
    node.setAttribute('data-error', String(error));
  }
  async function selectedPhoto(event) {
    const file = event.target.files?.[0]; if (!file || busy) return;
    event.target.value = '';
    const revision = ++photoRevision;
    preparing = true; submit.disabled = true;
    setPhotoMessage('사진 크기를 줄이고 준비하고 있어요…');
    try {
      const prepared = await preparePhoto(file);
      if (!alive() || revision !== photoRevision) return;
      image = prepared.image; previewUrl = prepared.preview;
      clearResult();
      root.querySelector('[data-assist-image]').src = prepared.preview;
      root.querySelector('[data-assist-photo-status]').textContent = '선택한 사진';
      root.querySelector('[data-assist-preview]').hidden = false;
      setPhotoMessage('');
    } catch (error) {
      if (alive() && revision === photoRevision) setPhotoMessage(image ? `${error.message} 기존 사진을 유지했어요.` : error.message, true);
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
  function prepareNameSearch(itemName, confirm = false, options = {}) {
    const { observations: typedObservations = [], ...lookupOptions } = options;
    assistanceDraft.sourceName = itemName;
    const sameItem = normalizeItemName(itemName) === normalizeItemName(answer?.itemName);
    const handlingCondition = sameItem && currentResult?.guide?.condition;
    const category = confirm && sameItem && !currentResult?.guide && !assistanceUncertain(answer, answered) ? answer.category : '';
    const observations = confirm && sameItem && currentResult?.observations?.length ? [...result.querySelectorAll('[data-assist-observation]:checked')]
      .map(input => currentResult.observations[Number(input.dataset.assistObservation)]).filter(Boolean) : [];
    const namedParts = new Set(typedObservations.filter(entry => entry.targetLabel).map(entry => entry.part));
    const confirmed = new Map([...observations.filter(entry => !namedParts.has(entry.part)), ...typedObservations]
      .map(entry => [observationKey(entry), entry]));
    queueInput({
      ...lookupOptions, itemName, region: region.get(), fromAssistance: true,
      ...(handlingCondition ? { handlingCondition } : {}),
      ...(!lookupOptions.category && category && !lookupItem(itemName)?.material ? { category, categoryOrigin: 'manual', keywordCategory: false } : {}),
      ...(confirmed.size ? { observations: [...confirmed.values()] } : {}),
    });
  }
  function openNameSearch(itemName, confirm = false, options) {
    prepareNameSearch(itemName, confirm, options);
    location.hash = '/item-input';
  }
  function continueManually() {
    if (busy || !region.validate()) return;
    const typed = description.value.trim();
    const source = assistanceDraft.sourceName;
    const sourceStillApplies = source && (!typed || normalizeItemName(typed).includes(normalizeItemName(source)));
    const name = (mode === 'description' ? descriptionName(typed) : '')
      || (sourceStillApplies ? source : '') || (answer?.evidence === 'object' && answer.confidence !== 'low' ? answer.itemName : '');
    // Preserve only explicit information from the user's own description.
    openNameSearch(name, false, { manualLookup: true, observations: mergeItemObservations([], typed) });
  }
  form.querySelector('[data-assist-continue-manually]')?.addEventListener('click', continueManually);
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
    if (mode === 'photo' && !image) { setPhotoMessage('분석할 사진을 먼저 촬영하거나 선택해 주세요.', true); form.elements.namedItem('camera').focus(); return; }
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
      observations: view.observations, selectedObservations: view.selectedObservations, sourceName: assistanceDraft.sourceName,
      componentLabels: normalizeItemName(assistanceDraft.sourceName) === normalizeItemName(answer.itemName) || answer.evidence === 'markings'
        ? assistanceDraft.componentLabels : [],
      confirmIdentity: Boolean(view.guide?.ruleVersion && !view.fromInput && !view.guide?.condition && !view.identityConfirmed),
    });
    const marks = new Map((view.selectedMarks || []).map(mark => [mark.marking, mark]));
    result.querySelector('[data-assist-mark-confirm]')?.querySelectorAll('[data-marking]').forEach(row => {
      const saved = marks.get(row.dataset.marking);
      if (saved) {
        row.querySelector('[data-use-mark]').checked = saved.use;
        row.querySelector('[data-mark-part]').value = saved.part;
        row.querySelector('[data-mark-shape]').value = saved.shape;
        row.querySelector('[data-mark-label]').value = saved.label || '';
      }
      syncMarkShape(row);
    });
    bindVerifiedCollection(result, view.guide);
    const disposeChecklist = bindDisposalChecklist(result);
    const disposeCopy = bindResultCopy(result, () => resultToText(resultInput(view), view.guide));
    const save = result.querySelector('[data-assist-save]');
    if (save && view.saveState?.saved) { save.disabled = true; save.textContent = '기록에 저장했어요'; }
    else if (save && view.saveState?.pending) { save.disabled = true; save.textContent = '기록에 저장 중'; }
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
    setStatus(followup ? '답변을 반영해 물건을 다시 확인하고 있어요…' : mode === 'photo' ? '사진 속 물건과 재질 표시를 확인하고 있어요…' : '설명에서 물건의 종류와 재질을 확인하고 있어요…');
    try {
      const input = { mode, description: description.value.trim(), region: selectedRegion };
      if (mode === 'photo') input.image = image;
      if (nextAnswers.length) input.answers = nextAnswers;
      const typedName = mode === 'description' && !nextAnswers.length ? descriptionName(input.description) : '';
      if (typedName && (itemTypeClarification(typedName) || disposalItemList(typedName).length)) {
        openNameSearch(typedName, false, { quickLookup: true });
        return;
      }
      const typedGuide = typedName ? registeredGuide(typedName, selectedRegion, { infer: false }) : null;
      // A typed catalog name is already confirmed; go straight to its condition questions.
      if (typedGuide?.needsConditions && !typedGuide.prompt && lookupItem(typedName)?.material) {
        openNameSearch(typedName, false, { quickLookup: true, observations: mergeItemObservations([], input.description) });
        return;
      }
      const response = typedGuide
        ? { itemName: typedName, identification: '', evidence: 'object', confidence: 'high', questions: [], markings: [], cautions: [] }
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
      const observations = mergeItemObservations(response.observations, input.description);
      const guide = typedGuide || (response.evidence === 'object' && response.confidence !== 'low' ? registeredGuide(response.itemName, selectedRegion) : null);
      const nextAnswer = {
        ...response,
        questions: guide ? [] : remaining.map(entry => entry.question),
        questionChoices: guide ? [] : remaining.map(entry => entry.choices),
      };
      const sameItem = followup && normalizeItemName(currentResult?.answer.itemName) === normalizeItemName(nextAnswer.itemName);
      const selectedMarks = sameItem ? selectedPhotoMarks(result) : [];
      renderResult({ answer: nextAnswer, region: selectedRegion, guide, observations, selectedMarks, fromInput: Boolean(typedGuide) });
    } catch (error) {
      if (alive() && operation.active()) {
        setStatus(error.message);
        if (!followup) submit.textContent = '다시 시도';
      }
    }
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
  result.addEventListener('change', event => {
    const row = event.target.closest('[data-marking]');
    if (!row) return;
    if (event.target.matches('[data-mark-part]')) row.querySelector('[data-mark-shape]').value = '';
    syncMarkShape(row);
    row.closest('form').querySelector('[data-mark-error]').textContent = '';
  });
  result.addEventListener('submit', async event => {
    const markForm = event.target.closest('[data-assist-mark-confirm]');
    if (markForm) {
      event.preventDefault();
      if (busy) return;
      const rows = [...markForm.querySelectorAll('[data-use-mark]:checked')].map(control => control.closest('[data-marking]'));
      const error = markForm.querySelector('[data-mark-error]');
      if (!rows.length) { error.textContent = '확인한 표시를 하나 이상 선택해 주세요.'; return; }
      const observations = new Map();
      for (const row of rows) {
        const partControl = row.querySelector('[data-mark-part]');
        const part = partControl.value;
        if (!part) { error.textContent = '선택한 표시가 적힌 부위를 골라 주세요.'; partControl.focus(); return; }
        const labelControl = row.querySelector('[data-mark-label]');
        const targetLabel = part !== 'body' ? labelControl.value.trim() : '';
        const mark = confirmedPhotoMark(row.dataset.marking, part, row.querySelector('[data-mark-shape]').value);
        if (!mark) continue;
        const observation = { part, field: 'material', value: mark.material, type: mark.type, ...(targetLabel ? { targetLabel } : {}) };
        const key = observationKey(observation);
        if (observations.has(key) || [...observations.values()].some(previous => previous.part === part && (!targetLabel || !previous.targetLabel))) {
          error.textContent = '같은 부위로 선택한 표시가 있어요. 여러 부속품이라면 각각 다른 이름을 적어 주세요.';
          (part === 'body' ? partControl : labelControl).focus();
          return;
        }
        observations.set(key, observation);
      }
      const hasObject = answer?.evidence === 'object';
      const name = hasObject ? answer.itemName : assistanceDraft.sourceName || UNNAMED_ITEM;
      openNameSearch(name, hasObject, { category: 'packaging', categoryOrigin: 'manual', keywordCategory: false,
        observations: [...observations.values()], fromConfirmedMark: true });
      return;
    }
    const correction = event.target.closest('[data-assist-correction]');
    if (correction) {
      event.preventDefault();
      const name = correction.elements.namedItem('itemName').value.trim();
      if (!busy && name) openNameSearch(name, false, { quickLookup: true });
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
  result.addEventListener('click', async event => {
    if (event.target.closest('[data-assist-followup-cancel]')) { cancelAnalysis(); return; }
    if (busy) return;
    if (event.target.closest('[data-assist-confirm-identity]') && currentResult?.guide?.ruleVersion) {
      renderResult({ ...currentResult, identityConfirmed: true });
      return;
    }
    const save = event.target.closest('[data-assist-save]');
    if (save && currentResult?.guide?.ruleVersion && !save.disabled) {
      const view = currentResult;
      const saveState = (view.saveState ||= {});
      if (saveState.pending || saveState.saved) return;
      saveState.pending = true;
      const saveStatus = result.querySelector('[data-result-tools-status]');
      save.disabled = true; saveStatus.textContent = '기록에 저장하고 있어요…';
      const activeButton = () => alive() && currentResult?.saveState === saveState ? result.querySelector('[data-assist-save]') : null;
      try {
        await saveDisposalRecord(resultInput(view), view.guide);
        saveState.saved = true;
        const button = activeButton();
        if (button) {
          button.textContent = '기록에 저장했어요';
          result.querySelector('[data-result-tools-status]').textContent = '판별 기록에서 다시 볼 수 있어요.';
        }
      } catch (error) {
        const button = activeButton();
        if (button) {
          button.disabled = false; button.textContent = '판별 결과 저장';
          result.querySelector('[data-result-tools-status]').textContent = error.message;
        }
      } finally { saveState.pending = false; }
      return;
    }
    if (event.target.closest('[data-add-meal-batch]') && currentResult?.guide?.ruleVersion) {
      if (addMealToBatch(resultInput(currentResult), currentResult.guide)) location.hash = '/batch';
      else result.querySelector('[data-meal-batch-status]').textContent = '목록이 가득 찼거나 다른 지역의 물건이 있어요. 목록을 먼저 확인해 주세요.';
      return;
    }
    if (event.target.closest('[data-assist-batch]') && currentResult?.guide?.ruleVersion) {
      if (addDisposalBatchItem(resultInput(currentResult), currentResult.guide)) location.hash = '/batch';
      else result.querySelector('[data-result-tools-status]').textContent = '목록이 가득 찼거나 다른 지역의 물건이 있어요.';
      return;
    }
    const condition = event.target.closest('[data-assist-handling]')?.dataset.assistHandling;
    if (condition && currentResult?.guide?.prompt?.options.some(([value]) => value === condition)) {
      const guide = registeredGuide(answer.itemName, currentResult.region, { condition });
      renderResult({ ...currentResult, guide, saveState: currentResult.guide.condition === condition ? currentResult.saveState : undefined });
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
      assistanceDraft = { version: startInputSearch() };
      description.value = ''; updateCount();
      if (mode === 'photo') { clearPhoto(); description.closest('.assist-extra').open = false; form.elements.namedItem('camera').focus(); }
      else { clearResult(); description.focus(); }
    }
    const candidate = event.target.closest('[data-assist-candidate]')?.dataset.assistCandidate;
    const related = event.target.closest('[data-related-item]')?.dataset.relatedItem;
    if (related) {
      startInputSearch();
      queueInput({ itemName: related, region: region.get(), quickLookup: true });
      location.hash = '/item-input';
    } else if (event.target.closest('[data-assist-continue-manually]')) continueManually();
    else if (candidate) openNameSearch(candidate, false, { quickLookup: true });
    else if (event.target.closest('[data-assist-check]') && answer) openNameSearch(answer.itemName, true);
    else if (event.target.closest('[data-assist-resume-name]') && assistanceDraft.sourceName) openNameSearch(assistanceDraft.sourceName);
    else if (event.target.closest('[data-assist-request-registration]') && answer) openNameSearch(answer.itemName, false, { showMissingItem: true });
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
      const selectedObservations = currentResult?.observations?.length
        ? [...result.querySelectorAll('[data-assist-observation]:checked')].map(input => Number(input.dataset.assistObservation)) : [];
      (assistanceDraft.sessions ||= {})[mode] = {
        description: description.value,
        answers: answered,
        result: currentResult && !result.hidden ? { ...currentResult, pendingAnswers, selectedObservations, selectedMarks: selectedPhotoMarks(result) } : null,
      };
      if (mode === 'photo') assistanceDraft.photo = image ? { image, previewUrl } : null;
    }
    disposeResult();
    disposeModes();
    disposed = true; controller?.abort(); gate.dispose(); photoRevision++; image = null;
  };
}

const questionKey = question => question.normalize('NFKC').replace(/[\s\p{P}]/gu, '');
