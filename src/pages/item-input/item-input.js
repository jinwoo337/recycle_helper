import { escapeHtml } from '../../utils/html.js';
import { getDisposalHistory, saveDisposalRecord, deleteDisposalRecord, clearDisposalHistory } from '../../services/disposal-history.js';
import { MATERIALS, TYPES, supportsState, needsWashQuestion, normalizePart, judgeDisposal, RULE_SOURCE, RULE_VERSION } from '../../domain/disposal/rules.js';
import { suggestItemInfo, searchItemNames, lookupItem, normalizeItemName } from '../../domain/disposal/item-suggestions.js';
import { validateAiGuess } from '../../domain/disposal/ai-classification.js';
import { requestAiGuess } from '../../services/ai-classify.js';
import { getCurrentMember } from '../../services/auth.js';
import { getCatalogMessage, initializeItemCatalog } from '../../services/item-catalog.js';
import { resultToolsMarkup, bindResultTools } from '../../components/result-tools.js';
import { memberTools } from '../../services/member-tools.js';
import { regionLabel, REGIONAL_SOURCES, regionalSourceLabel } from '../../domain/disposal/regions.js';
import { takeQueuedInput } from '../../services/input-draft.js';
import { cleanSingleMaterialInput } from '../../domain/disposal/input-shortcuts.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';
import { stateAnswers, selectedState } from '../../domain/disposal/input-state.js';
import { regionalComparisonMarkup } from '../../components/regional-comparison.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { ITEM_CATEGORIES, categoryLabel } from '../../domain/disposal/item-categories.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';

let draft = {};
let componentCount = 1;
let autoFillEnabled = true;
let draftOwner;
const yesNo = [['yes', '네'], ['no', '아니요'], ['unknown', '모르겠어요']];
const titles = { material: '주요 재질', type: '세부 종류', contaminated: '현재 오염 여부', washed: '세척 여부', removable: '남은 오염 제거 가능 여부', combined: '다른 재질과 결합', separable: '재질 분리 가능 여부', foodSeparated: '포장재·뼈 등 이물질 제거 완료' };
function question(name, title, options = yesNo) {
  return `<fieldset class="item-question"><legend>${title}</legend><div class="choice-row">${options.map(([value, label]) => `<label class="choice"><input type="radio" name="${name}" value="${value}" required><span>${label}</span></label>`).join('')}</div></fieldset>`;
}
function partFields(prefix, label) {
  return `<div class="part-fields" data-prefix="${prefix}">
    ${!prefix ? '<details id="material-editor" class="material-editor" open><summary><span id="material-detected">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">' : '<details class="material-editor component-material-editor" open><summary><span class="component-material-summary">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">'}
    ${prefix ? `<div class="field component-label-field"><label for="${prefix}label">부속품 이름 (선택)</label><input id="${prefix}label" name="${prefix}label" type="text" maxlength="40" data-optional placeholder="예: 라벨, 뚜껑, 포장 필름"></div>` : ''}
    <div class="field"><label for="${prefix}material">${label}</label><select id="${prefix}material" name="${prefix}material" required><option value="">재질을 선택해 주세요</option>${MATERIALS.map(material => `<option>${material}</option>`).join('')}</select></div>
    <div class="field" data-condition="type" hidden><label for="${prefix}type">세부 종류</label><select id="${prefix}type" name="${prefix}type" required></select></div>
    ${!prefix ? '<label class="auto-fill-choice"><input type="checkbox" id="auto-fill-item"><span>이름에 맞춰 재질 자동 입력</span></label><p id="auto-fill-status" class="input-hint" role="status"></p><details id="preset-info" class="preset-info" hidden><summary id="preset-title">자동 입력 기준 · 수정 가능</summary><p id="preset-note" class="input-hint"></p></details>' : ''}</div></details>
    ${!prefix ? '<div class="quick-condition" id="quick-condition" hidden><button class="button secondary" type="button" id="clean-shortcut">깨끗하고 다른 재질도 없어요 → 결과 보기</button><p class="input-hint">내용물·오염·라벨·빨대 등 다른 재질이 모두 없을 때만 선택해 주세요.</p></div>' : ''}
    <div data-condition="state" hidden>
      <div class="current-state">${question(`${prefix}currentState`, '지금 물건 상태는 어떤가요?', [['clean', '깨끗해요'], ['dirty', '아직 안 씻었어요'], ['washed-dirty', '씻어도 오염이 남아요'], ['unknown', '모르겠어요']])}</div>
      <div class="state-storage" hidden>${question(`${prefix}contaminated`, '현재 오염 여부')}
      <div data-condition="washed" hidden>${question(`${prefix}washed`, '세척 여부', [['yes', '세척했어요'], ['no', '아직 안 했어요']])}</div></div>
      <div data-condition="removable" hidden>${question(`${prefix}removable`, '남은 오염을 제거할 수 있나요?')}</div>
    </div><div data-condition="food" hidden>${question(`${prefix}foodSeparated`, '포장재·이쑤시개·단단한 뼈 등 음식물이 아닌 것을 모두 제거했나요?')}</div></div>`;
}

// AI 의견은 선택 기능이며 기본은 꺼짐입니다. 종류 선택과 규칙만으로 안내할 수 있습니다.
const AI_ENABLED_KEY = 'recycle-helper.ai-enabled';
function readAiEnabled() {
  try { return localStorage.getItem(AI_ENABLED_KEY) === 'on'; } catch { return false; }
}
function writeAiEnabled(enabled) {
  try { localStorage.setItem(AI_ENABLED_KEY, enabled ? 'on' : 'off'); } catch { /* 저장소 차단 */ }
}

export function itemInputPage() {
  return `<section class="container item-page">
    <a class="back-link" href="#/">← 메인으로</a>
    <header class="item-heading"><p class="eyebrow">나의 물건 살펴보기</p><h1>어떤 물건을 버리려고 하나요?</h1><p>이름을 고르고 현재 상태만 확인해 주세요.</p></header>
    <p id="catalog-status" class="input-hint" role="status" aria-live="polite"></p>
    <div class="item-grid"><form id="item-form" class="item-card">
      ${judgementRegionMarkup(getCurrentMember()?.region)}
      <section aria-labelledby="item-basic"><h2 id="item-basic">1. 물건 이름</h2>
        <div class="item-basic-fields"><div class="field"><label for="item-name">물건 이름</label><div class="item-name-control"><input id="item-name" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자 봉지" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="item-name-options" aria-expanded="false" aria-describedby="item-name-hint item-name-status"><div id="item-name-options" class="item-name-options" role="listbox" aria-label="추천 물품" hidden></div></div><p class="input-hint" id="item-name-hint">추천에서 실제 물건과 맞는 이름을 골라 주세요.</p><p class="input-hint" id="item-name-status" role="status" aria-live="polite"></p>
        <label class="ai-toggle"><input type="checkbox" id="ai-enabled" role="switch"><span class="ai-toggle-track" aria-hidden="true"></span><span class="ai-toggle-text"><strong>🤖 AI 안내 켜기</strong><small>선택 기능이에요. 직접 고른 종류와 확인된 기준을 우선해요.</small></span></label>
        <div id="ai-guess-box" class="ai-panel" hidden role="status" aria-live="polite"><p class="ai-panel-title" id="ai-guess-text"></p><p class="ai-panel-reason" id="ai-guess-status"></p><button type="button" class="button secondary" id="ai-guess-button" hidden>다시 묻기</button></div></div>
        <div class="example-items input-examples" aria-label="자주 찾는 물건">${['우유팩', '투명생수병', '과자봉지', '종이상자'].map(name => `<button class="history-action" type="button" data-item-example="${name}">${name}</button>`).join('')}</div></div>
        </section><section id="item-category-section" class="item-category-section" hidden><h2>어떤 종류의 물건인가요?</h2><p class="input-hint">사전에 없는 물건도 종류를 직접 고르면 AI 없이 안내받을 수 있어요. 약·전지 등은 재질을 고르지 않아도 돼요.</p><div class="field"><label for="item-category">물건 종류</label><select id="item-category" name="category"><option value="">실제 물건에 맞는 종류 선택</option>${ITEM_CATEGORIES.map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select></div><p id="category-guidance" class="input-hint" role="status"></p></section>
        <section id="item-conditions" aria-labelledby="conditions-title" hidden><h2 id="conditions-title">2. 상태 확인</h2>${partFields('', '주요 재질')}
      </section>
      <section id="combination-section" aria-labelledby="item-state" hidden><h3 id="item-state">다른 재질 확인</h3>
        <details id="composition-editor" class="material-editor" open><summary><span id="composition-detected">결합 상태 선택</span><span class="material-edit-label">수정</span></summary><div class="composition-controls">
        ${question('combined', '라벨·뚜껑·테이프 등 다른 재질과 결합되어 있나요?')}
        <p class="input-hint" id="combination-hint">종이팩 코팅층은 그대로, 빨대·뚜껑만 확인해 주세요.</p>
        <div id="separable-question" hidden>${question('separable', '결합된 재질을 분리할 수 있나요?')}</div>
        </div></details>
        <div id="components-section" hidden><details class="component-help"><summary>부속품 입력 도움말</summary><p class="input-hint">분리한 부속품도 상태를 확인해 주세요. 같은 재질·상태는 묶어 최대 5개까지 입력할 수 있어요. 복합재질 부속품은 ‘기타’를 선택하고, 페트병 뚜껑은 본체 처리 안내를 따라 주세요.</p></details><div id="component-fields"></div><button class="button secondary" type="button" id="add-component">부속품 추가</button></div>
      </section>
      <details class="selected-conditions"><summary>선택한 조건 보기</summary><p id="selection-summary" class="selection-summary" aria-live="polite"></p></details>
      <div class="form-actions"><button type="submit" class="button primary">분리배출 방법 알아보기 <span aria-hidden="true">→</span></button><button type="button" class="button secondary" id="reset-item">새로 입력</button></div>
      <p class="input-hint">물건 종류와 필요한 재질·상태 답변으로 안내해요. 확실하지 않으면 ‘모르겠어요’를 선택해 주세요.</p>
      <p id="item-save-status" class="item-save-status" role="status" aria-live="polite"></p>
    </form>
    <section id="item-summary" class="item-card item-summary" hidden tabindex="-1" aria-labelledby="summary-title"></section>
    <details class="saved-tools" id="saved-tools"><summary>내 기록·즐겨찾기</summary><div class="item-sidebar"><aside class="recent-items" aria-labelledby="recent-items-title"><p class="eyebrow">MY RECENT ITEMS</p><h2 id="recent-items-title">최근 분리배출 목록</h2><p class="recent-explanation">최근 8개 판별 기록이에요. 물품을 누르면 당시 입력과 결과를 다시 볼 수 있어요.</p><div id="recent-items-content"></div><div id="history-delete-confirm" class="history-delete-confirm" hidden><p id="history-delete-message"></p><div class="choice-row"><button type="button" id="confirm-history-delete" class="history-action">삭제하기</button><button type="button" id="cancel-history-delete" class="history-action">취소</button></div></div><p id="history-status" class="input-hint" role="status" aria-live="polite"></p></aside>
    <aside class="recent-items"><h2>자주 찾는 물품</h2><p class="input-hint">저장한 조건을 불러온 뒤 현재 상태를 다시 확인해 주세요.</p><div id="favorite-items"></div><p id="favorite-status" class="input-hint" role="status"></p><button class="history-action" type="button" id="retry-favorites">즐겨찾기 새로고침</button></aside>
    <aside class="item-help"><details><summary>입력 가이드와 저장 안내</summary><p>포장의 재질 표시와 용도를 확인해 보세요. 답변에 따라 필요한 질문만 표시돼요.</p><h3>세척보다 현재 상태가 중요해요</h3><p>씻었어도 오염이 남으면 추가 처리가 필요해요. 깨끗한 물건은 세척 여부를 묻지 않아요. 일반 종이는 물로 씻지 마세요.</p><p class="help-note">로그인하면 입력 조건과 판별 결과를 계정에 저장해 다른 기기에서도 확인할 수 있어요. 비회원 기록은 이 브라우저에만 저장돼요.</p></details></aside></div></details>

    </div></section>`;
}

const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
export function resultMarkup(input, result, createdAt) {
  const source = result.sourceUrl === 'https://geumcheon.go.kr/portal/contents.do?key=818' ? result.sourceUrl : RULE_SOURCE;
  const sources = [...new Set(Array.isArray(result.sourceUrls) ? result.sourceUrls : [source])]
    .filter(url => [RULE_SOURCE, ...Object.values(REGIONAL_SOURCES), ...Object.keys(CATALOG_DETAIL_SOURCES)].includes(url));
  const labels = { yes: '네', no: '아니요', unknown: '모르겠어요' };
  const details = part => Object.entries(titles).filter(([key]) => part[key]).map(([key, title]) => {
    const value = key === 'type' ? TYPES[part.material]?.find(([value]) => value === part.type)?.[1] || part.type : labels[part[key]] || part[key];
    return `<div><dt>${title}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }).join('');
  return `<p class="eyebrow">${createdAt ? '저장된 결과' : '분리배출 결과'}</p><h2 id="summary-title">${escapeHtml(input.itemName)}</h2>
    ${createdAt ? `<p class="input-hint">${escapeHtml(new Date(createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 당시 기준으로 저장된 결과</p>` : ''}
    ${result.ruleVersion !== RULE_VERSION ? '<p class="demo-notice">이전 기준의 결과예요. 조건 수정 후 현재 기준으로 다시 확인해 주세요.</p>' : ''}
    ${result.aiAssisted ? '<p class="ai-badge">🤖 AI 추정 결과예요. 실제 제품의 분리배출 표시를 꼭 확인해 주세요.</p>' : ''}
    <div class="result-verdict ${result.status === 'check' ? 'needs-check' : ''}"><span class="result-badge">${input.material === '음식물류' && result.status === 'recycle' ? '음식물류' : { recycle: '재활용', general: '일반 배출', check: '추가 확인 필요', mixed: '재질별 배출' }[result.status]}</span><h3>${escapeHtml(result.method)}</h3></div>
    <p class="result-region input-hint">${result.regional ? `${escapeHtml(result.regional.label)} · ${result.regional.coverage === 'verified' ? result.regional.scope === 'city' ? '서울시 공통 안내 · 구별 수거 확인 필요' : '해당 품목 지역 기준 적용' : '기본 안내 · 지역 기준 확인 필요'}` : '지역 미기록 · 지역을 설정하고 다시 판별해 주세요.'}</p>
    <h3>이렇게 배출하세요</h3><ol class="action-steps">${result.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    ${result.parts.length > 1 ? `<h3>재질별 처리</h3><div class="result-parts">${result.parts.map(part => `<article><h4>${escapeHtml(part.label)} · ${escapeHtml(part.material)}</h4><p class="part-method">${escapeHtml(part.method)}</p>${list(part.steps)}</article>`).join('')}</div>` : ''}
    ${regionalComparisonMarkup(input, result)}
    <details class="result-evidence"><summary>판단 근거·지역 기준</summary>${list(result.reasons)}${result.regional ? list(result.regional.notes) : ''}<p class="input-hint">${escapeHtml(result.notice)}</p><p class="input-hint">확인일 ${escapeHtml(result.checkedAt || '미기록')} · ${escapeHtml(result.ruleVersion)} · ${sources.map(url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url === RULE_SOURCE ? '분리배출 지침' : escapeHtml(CATALOG_DETAIL_SOURCES[url] || regionalSourceLabel(url))}</a>`).join(' · ')}</p></details>
    <details class="input-details"><summary>입력한 조건</summary><dl><div><dt>물건</dt><dd>${escapeHtml(input.itemName)}</dd></div>${input.category ? `<div><dt>직접 선택한 종류</dt><dd>${escapeHtml(categoryLabel(input.category))}</dd></div>` : ''}${details(input)}</dl>${(input.components || []).map((part, index) => `<h4>부속품 ${index + 1}</h4><dl>${details(part)}</dl>`).join('')}</details>
    <button class="button secondary" type="button" id="edit-item">조건 수정</button>${resultToolsMarkup(input)}`;
}

export function bindItemInput() {
  const owner = getCurrentMember()?.id || 'guest';
  if (draftOwner !== owner) { draft = {}; componentCount = 1; draftOwner = owner; }
  const queued = takeQueuedInput(); if (queued) draft = queued;
  const form = document.getElementById('item-form');
  const judgementRegion = bindJudgementRegion(form, getCurrentMember()?.region);
  const summary = document.getElementById('item-summary');
  const nameInput = form.elements.namedItem('itemName');
  const saveStatus = document.getElementById('item-save-status');
  const autoFill = document.getElementById('auto-fill-item');
  const autoFillStatus = document.getElementById('auto-fill-status');
  const nameOptions = document.getElementById('item-name-options');
  const nameStatus = document.getElementById('item-name-status');
  const materialEditor = document.getElementById('material-editor');
  const savedTools = document.getElementById('saved-tools');
  let disposeResultTools = () => {};
  let aiGuess = null;
  const aiBox = document.getElementById('ai-guess-box');
  const aiText = document.getElementById('ai-guess-text');
  const aiButton = document.getElementById('ai-guess-button');
  const aiStatus = document.getElementById('ai-guess-status');
  const aiMatches = name => Boolean(aiGuess && name && normalizeItemName(aiGuess.itemName) === normalizeItemName(name));
  const aiToggle = document.getElementById('ai-enabled');
  let aiEnabled = readAiEnabled();
  aiToggle.checked = aiEnabled;
  // 이름별 AI 의견 상태: { status: 'loading' | 'done' | 'error', guess, error, promise }
  const opinions = new Map();
  const catalogStatus = document.getElementById('catalog-status');
  catalogStatus.textContent = '품목 정보를 확인하고 있어요…';
  const catalogReady = initializeItemCatalog().then(() => {
    if (!form.isConnected) return;
    catalogStatus.textContent = getCatalogMessage();
    if (draft.itemName && !draft.material && autoFillEnabled) { applySuggestion(); draft = collect(); }
  });
  const autocomplete = bindItemAutocomplete({ input: nameInput, options: nameOptions, status: nameStatus, search: searchItemNames,
    onSelect: () => changed({ target: nameInput }), onCompositionEnd: () => changed({ target: nameInput }) });
  const closeSuggestions = autocomplete.close;
  let history = [];
  let shownInput, shownResult;
  let shownRecordId = null;
  let pendingDeletion = null;
  let deleting = false;
  const deleteConfirm = document.getElementById('history-delete-confirm');
  const historyStatus = document.getElementById('history-status');
  let saving = false;
  let recentVersion = 0, favoriteVersion = 0;
  const value = name => form.elements.namedItem(name)?.value || '';
  function partValue(prefix) {
    return Object.fromEntries(['material', 'type', 'contaminated', 'washed', 'removable', 'foodSeparated', ...(prefix ? ['label'] : [])].map(key => [key, value(`${prefix}${key}`)]));
  }
  function toggle(node, show) {
    node.hidden = !show;
    node.querySelectorAll('input, select').forEach(control => {
      control.disabled = !show;
      control.required = show && !control.hasAttribute('data-optional');
      if (!show) { if (control.type === 'radio') control.checked = false; else control.value = ''; }
    });
  }
  function syncPart(node, active = true) {
    const prefix = node.dataset.prefix;
    const materialSelect = form.elements.namedItem(`${prefix}material`);
    materialSelect.disabled = !active; materialSelect.required = active;
    const material = materialSelect.value;
    const partLabel = node.querySelector('[data-optional]');
    if (partLabel) {
      partLabel.disabled = !active;
      const index = Number(prefix.match(/^part(\d+)-/)?.[1] || 0);
      node.closest('.component-card').querySelector('h3').textContent = partLabel.value.trim() ? `부속품 ${index+1} · ${partLabel.value.trim().slice(0,40)}` : `부속품 ${index+1}`;
    }
    const options = TYPES[material] || [];
    const select = form.elements.namedItem(`${prefix}type`);
    if (select.dataset.material !== material) {
      select.innerHTML = '<option value="">세부 종류를 선택해 주세요</option>' + options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
      select.dataset.material = material;
    }
    toggle(node.querySelector('[data-condition="type"]'), active && options.length > 0);
    const componentSummary = node.querySelector('.component-material-summary');
    if (componentSummary) componentSummary.textContent = [material, options.find(([type])=>type===select.value)?.[1]].filter(Boolean).join(' · ') || '재질·종류 선택';
    toggle(node.querySelector('[data-condition="food"]'), active && material === '음식물류' && select.value === 'soft');
    const supported = active && supportsState(partValue(prefix));
    toggle(node.querySelector('[data-condition="state"]'), supported);
    const washable = needsWashQuestion(partValue(prefix));
    const stateRadios = [...node.querySelectorAll(`[name="${prefix}currentState"]`)];
    const current = selectedState(partValue(prefix), washable);
    stateRadios.forEach(control => {
      const available = supported && (control.value !== 'washed-dirty' || washable);
      control.disabled = !available; control.required = available;
      control.closest('label').hidden = !available;
      control.checked = available && control.value === current;
      if (control.value === 'dirty') control.nextElementSibling.textContent = washable ? '오염 있음 · 세척 전' : '오염이 있어요';
    });
    const dirty = supported && value(`${prefix}contaminated`) === 'yes';
    toggle(node.querySelector('[data-condition="washed"]'), dirty && needsWashQuestion(partValue(prefix)));
    toggle(node.querySelector('[data-condition="removable"]'), dirty);
    node.querySelectorAll('.state-storage input').forEach(control => { control.required = false; });
    node.querySelector('[data-condition="removable"] legend').textContent = material === '종이' && value(`${prefix}type`) === 'paper'
      ? '오염된 부분을 떼어내고 깨끗한 종이만 남길 수 있나요?' : '남은 오염을 헹구거나 닦아 제거할 수 있나요?';
    if (!active) materialSelect.value = '';
  }
  function updateConditional() {
    const hasName = Boolean(nameInput.value.trim());
    const known = lookupItem(nameInput.value);
    const unregistered = hasName && !known?.material;
    const dedicated = Boolean(known?.handling && known.material === '기타');
    const category = form.elements.namedItem('category');
    document.getElementById('item-category-section').hidden = !unregistered;
    category.required = unregistered; category.disabled = !unregistered;
    const needsMaterial = !dedicated && (!unregistered || ['packaging', 'food'].includes(category.value));
    document.getElementById('category-guidance').textContent = category.value && !needsMaterial ? '재질 선택 없이 종류별 수거 안내를 확인할 수 있어요.' : category.value ? '재질·세부 종류와 현재 상태를 확인해 주세요.' : '';
    document.getElementById('item-conditions').hidden = !hasName || !needsMaterial;
    updateAiBox(hasName);
    syncPart(form.querySelector('.part-fields'), hasName && needsMaterial);
    const supported = supportsState(partValue(''));
    // 부모에서 자식 순서로 갱신해 숨겨진 필수 질문을 비활성화합니다.
    toggle(document.getElementById('combination-section'), supported);
    const combined = supported && value('combined') === 'yes';
    toggle(document.getElementById('separable-question'), combined);
    const components = combined && value('separable') === 'yes';
    document.getElementById('composition-detected').textContent = value('combined') === 'no' ? '다른 재질 없음' : combined
      ? `다른 재질 있음 · ${value('separable') === 'yes' ? '분리 가능' : value('separable') === 'no' ? '분리 어려움' : '분리 가능 여부 확인'}` : '다른 재질이 붙어 있나요?';
    document.getElementById('components-section').hidden = !components;
    document.querySelectorAll('#component-fields .part-fields').forEach(node => syncPart(node, components));
    const typeLabel = TYPES[value('material')]?.find(([type]) => type === value('type'))?.[1];
    document.getElementById('material-detected').textContent = [value('material'), typeLabel].filter(Boolean).join(' · ') || '재질·종류를 선택해 주세요';
    document.getElementById('quick-condition').hidden = !hasName || !cleanSingleMaterialInput(collect())
      || ['yes', 'unknown'].includes(value('contaminated')) || ['yes', 'unknown'].includes(value('combined'));
    document.getElementById('combination-hint').hidden = !(value('material') === '종이' && value('type') === 'carton');
    form.querySelector('.selected-conditions').hidden = !hasName;
    document.getElementById('reset-item').hidden = !hasName;
    form.querySelector('[type="submit"]').disabled = saving || !hasName;
    document.getElementById('selection-summary').textContent = [nameInput.value.trim(), categoryLabel(value('category')), dedicated ? '품목별 전용 수거 안내' : materialLabel(), value('type') ? TYPES[value('material')]?.find(([type]) => type === value('type'))?.[1] : '',
      value('contaminated') === 'yes' ? '오염 있음' : value('contaminated') === 'no' ? '오염 없음' : '',
      value('washed') === 'yes' ? '세척했음' : value('washed') === 'no' ? '세척 전' : '',
      value('removable') === 'yes' ? '오염 제거 가능' : value('removable') === 'no' ? '오염 제거 어려움' : '',
      value('combined') === 'yes' ? '다른 재질 결합' : value('combined') === 'no' ? '단일 재질' : '',
      value('separable') === 'yes' ? '재질 분리 가능' : value('separable') === 'no' ? '재질 분리 어려움' : '',
      value('foodSeparated') === 'yes' ? '음식물 외 이물질 제거함' : value('foodSeparated') === 'no' ? '이물질 분리 필요' : ''].filter(Boolean).join(' · ') || '이름과 재질을 선택하면 필요한 질문만 나타나요.';
  }
  function materialLabel() { return value('material'); }
  const routeLabels = { recyclable: '재활용 대상', general: '종량제봉투 배출', large: '대형폐기물', hazardous: '별도 수거·안전 처리', unknown: '판단 어려움' };
  const confidenceLabels = { high: '확신 높음', medium: '확신 보통', low: '확신 낮음' };
  const aiLine = guess => {
    const typeLabel = TYPES[guess.material]?.find(([type]) => type === guess.type)?.[1];
    return `${[guess.material, typeLabel].filter(Boolean).join(' · ')} · ${routeLabels[guess.route]}`;
  };
  // AI 의견은 이름별 참고 정보입니다. 사용자가 선택한 종류와 검토된 품목 경로를 우선합니다.
  function askAi(name) {
    const key = normalizeItemName(name);
    if (!aiEnabled || !key) return Promise.resolve();
    const existing = opinions.get(key);
    if (existing && existing.status !== 'error') return existing.promise;
    const known = Boolean(lookupItem(name));
    const entry = { status: 'loading' };
    entry.promise = requestAiGuess(name, undefined, { opinion: known })
      .then(guess => { entry.status = 'done'; entry.guess = guess; if (!known && guess && form.isConnected && nameInput.value.trim() === name) applyAiGuess(guess); })
      .catch(error => { entry.status = 'error'; entry.error = error.message; })
      .finally(() => { if (form.isConnected) refreshAi(); });
    opinions.set(key, entry);
    refreshAi();
    return entry.promise;
  }
  // AI 의견이 사용자의 종류·재질 답변을 대신 선택하지 않습니다.
  function applyAiGuess(guess) {
    aiGuess = guess;
    draft = collect();
  }
  function refreshAi() { updateAiBox(Boolean(nameInput.value.trim())); renderOpinion(); }
  function updateAiBox(hasName) {
    const name = nameInput.value.trim();
    aiBox.hidden = !aiEnabled || !hasName;
    if (aiBox.hidden) return;
    const entry = opinions.get(normalizeItemName(name));
    aiButton.hidden = entry?.status !== 'error';
    aiBox.classList.toggle('is-loading', !entry || entry.status === 'loading');
    if (!entry || entry.status === 'loading') { aiText.textContent = '🤖 AI에게 물어보고 있어요…'; aiStatus.textContent = ''; }
    else if (entry.status === 'error') { aiText.textContent = '🤖 AI 의견을 받지 못했어요'; aiStatus.textContent = entry.error; }
    else if (!entry.guess) { aiText.textContent = '🤖 AI가 분류하지 못했어요'; aiStatus.textContent = '물건 종류를 직접 골라 안내받을 수 있어요.'; }
    else {
      aiText.textContent = `🤖 AI 의견: ${aiLine(entry.guess)} (${confidenceLabels[entry.guess.confidence]})`;
      aiStatus.textContent = [entry.guess.reason, lookupItem(name) ? '등록된 기준 결과가 우선이에요.' : entry.guess.route === 'recyclable' ? '현재 상태를 골라 주세요.' : ''].filter(Boolean).join(' ');
    }
  }
  // 결과 카드 안 판정 바로 아래에 AI 의견을 크게 보여 줍니다.
  function renderOpinion() {
    const panel = summary.querySelector('#ai-opinion');
    if (!panel || !shownInput) return;
    const name = shownInput.itemName;
    const known = Boolean(lookupItem(name));
    const entry = shownResult?.aiGuess ? { status: 'done', guess: shownResult.aiGuess } : opinions.get(normalizeItemName(name));
    let body;
    if (!entry || entry.status === 'loading') body = '<p class="ai-panel-title">AI에게 물어보고 있어요…</p>';
    else if (entry.status === 'error') body = `<p class="ai-panel-title">AI 의견을 받지 못했어요</p><p class="ai-panel-reason">${escapeHtml(entry.error)}</p><button type="button" class="button secondary" data-ai-retry>다시 묻기</button>`;
    else if (!entry.guess) body = '<p class="ai-panel-title">AI가 이 물건을 분류하지 못했어요</p>';
    else {
      const guess = entry.guess;
      const status = shownResult?.status;
      const differs = status !== 'mixed' && (guess.route === 'hazardous' ? status !== 'check' : status === 'recycle' ? guess.route !== 'recyclable' : status === 'general' && guess.route === 'recyclable');
      body = `<p class="ai-panel-title">${escapeHtml(aiLine(guess))} <span class="ai-confidence">${confidenceLabels[guess.confidence]}</span></p>
        ${guess.reason ? `<p class="ai-panel-reason">${escapeHtml(guess.reason)}</p>` : ''}
        ${known ? '<p class="ai-note">등록된 기준 결과가 우선이에요.</p>' : ''}
        ${differs ? '<p class="ai-warn">AI 의견이 기준 결과와 달라요. 제품 표시를 확인해 주세요.</p>' : ''}`;
    }
    panel.classList.toggle('is-loading', !entry || entry.status === 'loading');
    panel.innerHTML = `<h3>🤖 AI 의견</h3>${body}`;
  }
  aiButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) askAi(name);
  });
  summary.addEventListener('click', event => {
    if (event.target.closest('[data-ai-retry]') && shownInput) askAi(shownInput.itemName);
  });
  aiToggle.addEventListener('change', () => {
    aiEnabled = aiToggle.checked;
    writeAiEnabled(aiEnabled);
    if (aiEnabled) { const name = nameInput.value.trim(); if (name) askAi(name); if (!summary.hidden && shownInput) { attachOpinionPanel(); askAi(shownInput.itemName); } }
    else if (!shownResult?.aiGuess) summary.querySelector('#ai-opinion')?.remove();
    refreshAi();
  });
  function attachOpinionPanel() {
    if (summary.querySelector('#ai-opinion')) return;
    summary.querySelector('.result-verdict')?.insertAdjacentHTML('afterend', '<section id="ai-opinion" class="ai-panel ai-opinion" aria-live="polite"></section>');
  }
  function collect() {
    const input = { itemName: nameInput.value.trim(), ...normalizePart(partValue('')), region: judgementRegion.get() };
    if (!lookupItem(input.itemName)?.material && value('category')) input.category = value('category');
    if (supportsState(input)) {
      input.combined = value('combined');
      if (input.combined === 'yes') {
        input.separable = value('separable');
        if (input.separable === 'yes') input.components = Array.from({ length: componentCount }, (_, index) => normalizePart(partValue(`part${index}-`)));
      }
    }
    if (aiMatches(input.itemName)) input.aiGuess = structuredClone(aiGuess);
    return input;
  }
  function writeValues(part, prefix = '') {
    Object.entries(part).forEach(([key, answer]) => {
      const controls = [...form.querySelectorAll(`[name="${prefix}${key}"]`)];
      controls.forEach(control => { if (control.type === 'radio') control.checked = control.value === answer; else control.value = answer; });
    });
  }
  function drawComponents() {
    document.getElementById('component-fields').innerHTML = Array.from({ length: componentCount }, (_, index) => `<article class="component-card"><h3>부속품 ${index + 1}</h3>${partFields(`part${index}-`, '부속품 재질')}${index ? `<button class="remove-component" type="button" data-remove="${index}">이 부속품 삭제</button>` : ''}</article>`).join('');
    document.getElementById('add-component').disabled = componentCount >= 5;
  }
  function restore(input) {
    const region = Object.hasOwn(input, 'region') ? input.region : judgementRegion.get();
    closeSuggestions(); nameStatus.textContent = '';
    document.getElementById('preset-info').hidden = true;
    form.reset(); componentCount = Math.max(1, input.components?.length || 0); drawComponents();
    judgementRegion.set(region);
    aiGuess = validateAiGuess(input.aiGuess, input.itemName);
    autoFill.checked = autoFillEnabled; aiToggle.checked = aiEnabled;
    autoFillStatus.textContent = autoFillEnabled ? '자동 입력이 켜져 있어요. 물건 이름을 바꾸면 재질 정보를 다시 채워요.' : '체크하면 우유팩·생수병 등 알려진 물품의 재질 정보를 채워요.';
    // 재질→세부 종류→상태 순서로 선택지를 생성한 후 저장된 답변을 복원합니다.
    for (let pass = 0; pass < 3; pass++) {
      writeValues(input);
      (input.components || []).forEach((part, index) => writeValues(part, `part${index}-`));
      updateConditional();
    }
    form.querySelectorAll('.component-material-editor').forEach(editor => { const node=editor.closest('.part-fields'); editor.open=!value(`${node.dataset.prefix}material`) || Boolean(TYPES[value(`${node.dataset.prefix}material`)]?.length && !value(`${node.dataset.prefix}type`)); });
    if (autoFillEnabled && input.itemName && !input.material) applySuggestion();
    else materialEditor.open = !value('material') || Boolean(TYPES[value('material')]?.length && !value('type'));
    draft = collect();
    document.getElementById('composition-editor').open = !['no'].includes(value('combined')) && !(value('combined') === 'yes' && ['yes','no','unknown'].includes(value('separable')));
  }
  function showResult(input, result, createdAt, recordId = null) {
    closeSuggestions();
    disposeResultTools();
    shownInput = input; shownResult = result;
    shownRecordId = recordId;
    summary.innerHTML = resultMarkup(input, result, createdAt);
    if (aiEnabled || result.aiGuess) { attachOpinionPanel(); renderOpinion(); if (!result.aiGuess) askAi(input.itemName); }
    summary.hidden = false; summary.focus(); summary.scrollIntoView({ behavior: 'auto', block: 'start' });
    document.getElementById('edit-item').addEventListener('click', () => {
      restore(shownInput); summary.hidden = true; saveStatus.textContent = ''; nameInput.focus();
    });
    disposeResultTools = bindResultTools(summary, input, result, { onNewItem: resetInput });
  }
  function resetInput() { if (saving || deleting) return; restore({}); summary.hidden = true; saveStatus.textContent = '새 물품을 입력해 주세요.'; nameInput.focus(); }
  document.getElementById('reset-item').addEventListener('click', resetInput);
  let favorites = [];
  async function renderFavorites() {
    if (!savedTools.open) return;
    const version = ++favoriteVersion;
    const favoriteStatus = document.getElementById('favorite-status');
    favoriteStatus.textContent = '즐겨찾기를 불러오고 있어요…';
    try {
      const loaded = await memberTools.listFavorites();
      if (!form.isConnected || version !== favoriteVersion) return;
      favorites = loaded;
      document.getElementById('favorite-items').innerHTML = favorites.length ? `<ul class="favorite-list">${favorites.map((entry, index) => `<li><button class="history-action" type="button" data-favorite-index="${index}">${escapeHtml(entry.input.itemName)}</button></li>`).join('')}</ul>` : '<p class="input-hint">판별 결과에서 즐겨찾기를 저장해 보세요.</p>';
      favoriteStatus.textContent = getCurrentMember() ? '현재 계정의 즐겨찾기예요.' : '비회원 즐겨찾기는 이 브라우저에 저장돼요.';
    } catch (error) { if (form.isConnected && version === favoriteVersion) favoriteStatus.textContent = error.message; }
  }
  document.getElementById('favorite-items').addEventListener('click', event => {
    const button = event.target.closest('[data-favorite-index]'); if (!button || saving || deleting) return;
    const entry = favorites[Number(button.dataset.favoriteIndex)]; if (!entry) return;
    restore(entry.input); summary.hidden = true; saveStatus.textContent = '즐겨찾기 조건을 불러왔어요. 현재 상태를 확인한 뒤 판별해 주세요.'; nameInput.focus();
  });
  document.getElementById('retry-favorites').addEventListener('click', renderFavorites);
  async function renderRecent() {
    if (!savedTools.open) return false;
    const version = ++recentVersion;
    const wasOpen = document.querySelector('.recent-disclosure')?.open || false;
    historyStatus.textContent = '최근 기록을 불러오고 있어요…';
    let records;
    try { records = await getDisposalHistory(); }
    catch (error) {
      if (form.isConnected && version === recentVersion) {
        historyStatus.textContent = error.message;
        document.getElementById('recent-items-content').innerHTML = '<button type="button" class="history-action" id="retry-history">최근 기록 다시 불러오기</button>';
      }
      return false;
    }
    if (!form.isConnected || version !== recentVersion) return false;
    history = records;
    historyStatus.textContent = getCurrentMember() ? '현재 계정의 기록은 다른 기기에서도 확인할 수 있어요.' : '비회원 기록은 이 브라우저에 저장돼요.';
    if (!document.getElementById('all-history-link')) {
      document.getElementById('recent-items-content').insertAdjacentHTML('afterend', '<a id="all-history-link" class="all-history-link" href="#/history">전체 기록 및 통계 보기 →</a>');
    }
    document.getElementById('recent-items-content').innerHTML = history.length ? `<div class="history-toolbar"><button type="button" class="history-action" id="clear-history">전체 삭제</button></div><ol class="recent-list">${history.map((record, index) => `<li><button type="button" data-history="${index}"><strong>${escapeHtml(record.itemName)}</strong><small>${record.legacy ? '이전 이름 기록 · 다시 판별하기' : escapeHtml(record.result.method)}</small>${record.legacy ? '' : `<small>${escapeHtml(new Date(record.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</small>`}</button><button type="button" class="recent-delete" data-delete-history="${index}" aria-label="${index + 1}번째 ${escapeHtml(record.itemName)} 기록 삭제">삭제</button></li>`).join('')}</ol>` : '<p class="recent-empty">아직 저장한 물건이 없어요.</p>';
    if (history.length) {
      const content = document.getElementById('recent-items-content');
      content.innerHTML = `<details class="recent-disclosure" ${wasOpen ? 'open' : ''}><summary>최근 ${history.length}개 기록 보기</summary>${content.innerHTML}</details>`;
    }
    return true;
  }
  restore(draft);
  savedTools.addEventListener('toggle', () => { if (savedTools.open) { renderRecent(); renderFavorites(); } });
  form.querySelectorAll('[data-item-example]').forEach(button => button.addEventListener('click', () => {
    if (saving || deleting) return;
    nameInput.value = button.dataset.itemExample; changed({ target: nameInput }); closeSuggestions();
  }));
  document.getElementById('clean-shortcut').addEventListener('click', () => {
    if (saving || deleting) return;
    const next = cleanSingleMaterialInput(collect()); if (!next) return;
    restore(next); form.requestSubmit();
  });
  function applySuggestion() {
    const suggestion = suggestItemInfo(nameInput.value);
    const preset = itemPresetInput(nameInput.value);
    // 이름을 바꾸면 이전 물품의 상태와 부속품 답변을 새 물품에 사용하지 않습니다.
    form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
    componentCount = Math.max(1, preset.components?.length || 0); drawComponents();
    form.elements.namedItem('material').value = preset.material;
    form.elements.namedItem('type').value = '';
    for (let pass = 0; pass < 3; pass++) {
      writeValues(preset);
      (preset.components || []).forEach((part,index) => writeValues(part, `part${index}-`));
      updateConditional();
    }
    form.querySelectorAll('.component-material-editor').forEach(editor => { editor.open = !editor.querySelector('[name$="type"]').value; });
    const info = document.getElementById('preset-info');
    info.hidden = !suggestion;
    info.open = Boolean(suggestion?.handling);
    document.getElementById('preset-title').textContent = suggestion?.handling ? '품목 정보 자동 입력 · 재질 선택 불필요' : preset.components?.length ? '대표 구성 자동 입력 · 실제 제품을 확인해 주세요' : '자동 입력 기준 · 수정 가능';
    document.getElementById('preset-note').textContent = suggestion?.note || '';
    materialEditor.open = !suggestion?.type && !suggestion?.handling;
    document.getElementById('composition-editor').open = !preset.combined || (preset.combined === 'yes' && !preset.separable);
    autoFillStatus.textContent = suggestion
      ? '이름에 맞는 정보를 채웠어요. 실제 제품과 다르면 수정해 주세요.'
      : nameInput.value.trim() ? '자동 입력할 수 있는 이름이 아니에요. 실제 재질과 세부 종류를 직접 선택해 주세요.' : '물건 이름을 입력하면 알려진 품목의 재질 정보를 채워요.';
  }
  function changed(event) {
    if (event.isComposing) return;
    if (event.target === nameInput) form.elements.namedItem('category').value = '';
    if (event.target.name === 'category') {
      form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
      componentCount = 1; drawComponents();
      form.elements.namedItem('material').value = event.target.value === 'food' ? '음식물류' : '';
      form.elements.namedItem('type').value = '';
      materialEditor.open = true;
    }
    if (event.target.name?.endsWith('currentState')) {
      const prefix = event.target.closest('.part-fields').dataset.prefix;
      writeValues(stateAnswers(event.target.value, needsWashQuestion(partValue(prefix))), prefix);
    }
    nameInput.setCustomValidity(''); saveStatus.textContent = '';
    if (event.target === nameInput && !aiMatches(nameInput.value.trim())) aiGuess = null;
    // 브라우저가 체크 상태를 복원해도 실제 화면의 선택과 일치시킵니다.
    autoFillEnabled = autoFill.checked;
    if (event.target === autoFill) {
      if (!autoFillEnabled) { autoFillStatus.textContent = '자동 입력을 껐어요. 재질 정보를 직접 선택하거나 수정할 수 있어요.'; document.getElementById('preset-info').hidden = true; }
    }
    if (autoFillEnabled && (event.target === autoFill || event.target === nameInput)) applySuggestion();
    else {
      if (event.target === nameInput || ['material','type'].includes(event.target.name)) document.getElementById('preset-info').hidden = true;
      if (event.target === nameInput) {
        form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
        form.elements.namedItem('material').value = ''; form.elements.namedItem('type').value = '';
      }
      updateConditional();
    }
    if (event.target === nameInput) scheduleAiPrefetch();
    draft = collect(); summary.hidden = true;
  }
  // AI가 켜져 있으면 이름을 0.7초 동안 그대로 둘 때 자동으로 AI 의견을 물어봅니다.
  let prefetchTimer = 0;
  function scheduleAiPrefetch() {
    clearTimeout(prefetchTimer);
    const name = nameInput.value.trim();
    if (!aiEnabled || name.length < 1) return;
    prefetchTimer = setTimeout(() => {
      if (form.isConnected && nameInput.value.trim() === name) askAi(name);
    }, 700);
  }
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  document.getElementById('add-component').addEventListener('click', () => {
    const input = collect(); if (componentCount >= 5) return;
    input.components = [...(input.components || []), {}]; restore(input); summary.hidden = true;
    form.elements.namedItem(`part${componentCount - 1}-material`).focus();
  });
  document.getElementById('component-fields').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]'); if (!button) return;
    const input = collect(); input.components.splice(Number(button.dataset.remove), 1); restore(input); summary.hidden = true;
  });
  document.getElementById('recent-items-content').addEventListener('click', event => {
    if (event.target.closest('#retry-history')) { renderRecent(); return; }
    if (deleting || saving) return;
    const deleteButton = event.target.closest('[data-delete-history], #clear-history');
    if (deleteButton) {
      pendingDeletion = deleteButton.id === 'clear-history' ? { all: true } : { record: history[Number(deleteButton.dataset.deleteHistory)] };
      document.getElementById('history-delete-message').textContent = pendingDeletion.all
        ? '현재 계정의 전체 판별 기록과 이전 이름 기록을 모두 삭제할까요? 최근 목록에 보이지 않는 기록도 삭제되며, 삭제 후에는 복구할 수 없어요.'
        : `‘${pendingDeletion.record.itemName}’ 기록을 삭제할까요? 삭제 후에는 복구할 수 없어요.`;
      historyStatus.textContent = ''; deleteConfirm.hidden = false;
      document.getElementById('cancel-history-delete').focus();
      return;
    }
    const button = event.target.closest('[data-history]'); if (!button) return;
    const record = history[Number(button.dataset.history)];
    if (record.legacy) { restore({ itemName: record.itemName }); summary.hidden = true; saveStatus.textContent = '이전 기록은 이름만 저장되어 있어요. 조건을 입력해 새로 판별해 주세요.'; nameInput.focus(); }
    else showResult(record.input, record.result, record.createdAt, record.id);
  });
  document.getElementById('cancel-history-delete').addEventListener('click', () => {
    pendingDeletion = null; deleteConfirm.hidden = true;
    document.getElementById('clear-history')?.focus();
  });
  document.getElementById('confirm-history-delete').addEventListener('click', async () => {
    if (!pendingDeletion || deleting || saving) return;
    const request = pendingDeletion; deleting = true;
    const buttons = [...deleteConfirm.querySelectorAll('button')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      if (request.all) await clearDisposalHistory(); else await deleteDisposalRecord(request.record);
      if (!form.isConnected) return;
      if (request.all || shownRecordId === request.record?.id) { summary.hidden = true; shownRecordId = null; }
      pendingDeletion = null; deleteConfirm.hidden = true;
      if (await renderRecent()) historyStatus.textContent = request.all ? '최근 분리배출 목록을 모두 삭제했어요.' : '선택한 기록을 삭제했어요.';
      document.getElementById('clear-history')?.focus();
    } catch (error) { if (form.isConnected) historyStatus.textContent = error.message; }
    finally { deleting = false; buttons.forEach(button => { button.disabled = false; }); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving || deleting) return;
    closeSuggestions();
    if (!judgementRegion.validate()) return;
    pendingDeletion = null; deleteConfirm.hidden = true;
    if (!nameInput.value.trim()) { nameInput.setCustomValidity('물건 이름을 입력해 주세요.'); nameInput.reportValidity(); return; }
    // AI가 켜져 있으면 미등록 품목은 AI 답(재질·경로)을 받은 뒤 판별합니다. 실패하면 규칙만으로 판별합니다.
    const typedName = nameInput.value.trim();
    if (aiEnabled && !lookupItem(typedName) && !value('category') && !aiMatches(typedName)) {
      saveStatus.textContent = 'AI 의견을 기다리고 있어요…';
      await askAi(typedName);
      if (!form.isConnected || nameInput.value.trim() !== typedName) return;
      saveStatus.textContent = '';
    }
    updateConditional(); if (!form.reportValidity()) return;
    saving = true;
    form.setAttribute('aria-busy', 'true'); saveStatus.textContent = '판별 결과를 확인하고 저장하고 있어요…';
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      await catalogReady;
      if (!form.isConnected) return;
      updateConditional(); if (!form.reportValidity()) return;
      draft = collect(); const input = structuredClone(draft); const result = judgeDisposal(input);
      showResult(input, result);
      const record = await saveDisposalRecord(input, result);
      if (shownInput === input) shownRecordId = record.id;
      if (form.isConnected) { saveStatus.textContent = getCurrentMember() ? '입력 조건과 판별 결과를 계정에 저장했어요.' : '입력 조건과 판별 결과를 이 브라우저에 저장했어요.'; await renderRecent(); }
    } catch (error) { if (form.isConnected) saveStatus.textContent = error.message; }
    finally { saving = false; submit.disabled = false; form.removeAttribute('aria-busy'); }
  });
  const storageChanged = event => { if (event.key === null || event.key?.startsWith('recycle-helper.')) { renderRecent(); renderFavorites(); } };
  window.addEventListener('storage', storageChanged);
  window.addEventListener('focus', renderRecent);
  window.addEventListener('favorites-changed', renderFavorites);
  return () => { recentVersion++; favoriteVersion++; clearTimeout(prefetchTimer); autocomplete.dispose(); disposeResultTools(); window.removeEventListener('favorites-changed', renderFavorites); window.removeEventListener('storage', storageChanged); window.removeEventListener('focus', renderRecent); };
}
