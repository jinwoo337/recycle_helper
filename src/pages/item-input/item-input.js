import { escapeHtml } from '../../utils/html.js';
import { getDisposalHistory, saveDisposalRecord, deleteDisposalRecord, clearDisposalHistory } from '../../services/disposal-history.js';
import { MATERIALS, TYPES, supportsState, needsWashQuestion, normalizePart, judgeDisposal, RULE_SOURCE, RULE_VERSION } from '../../domain/disposal/rules.js';
import { suggestItemInfo } from '../../domain/disposal/item-suggestions.js';

let draft = {};
let componentCount = 1;
let autoFillEnabled = false;
const yesNo = [['yes', '네'], ['no', '아니요'], ['unknown', '모르겠어요']];
const titles = { material: '주요 재질', type: '세부 종류', contaminated: '현재 오염 여부', washed: '세척 여부', removable: '남은 오염 제거 가능 여부', combined: '다른 재질과 결합', separable: '재질 분리 가능 여부' };
function question(name, title, options = yesNo) {
  return `<fieldset class="item-question"><legend>${title}</legend><div class="choice-row">${options.map(([value, label]) => `<label class="choice"><input type="radio" name="${name}" value="${value}" required><span>${label}</span></label>`).join('')}</div></fieldset>`;
}
function partFields(prefix, label) {
  return `<div class="part-fields" data-prefix="${prefix}">
    <div class="field"><label for="${prefix}material">${label}</label><select id="${prefix}material" name="${prefix}material" required><option value="">재질을 선택해 주세요</option>${MATERIALS.map(material => `<option>${material}</option>`).join('')}</select></div>
    <div class="field" data-condition="type" hidden><label for="${prefix}type">세부 종류</label><select id="${prefix}type" name="${prefix}type" required></select></div>
    <div data-condition="state" hidden>
      ${question(`${prefix}contaminated`, '현재 음식물·기름·이물질이 남아 있나요?', [['yes', '남아 있어요'], ['no', '없어요'], ['unknown', '모르겠어요']])}
      <div data-condition="washed" hidden>${question(`${prefix}washed`, '이미 세척을 해 보았나요?', [['yes', '세척했어요'], ['no', '아직 안 했어요']])}</div>
      <div data-condition="removable" hidden>${question(`${prefix}removable`, '남은 오염을 제거할 수 있나요?')}</div>
    </div></div>`;
}

export function itemInputPage() {
  return `<section class="container item-page">
    <a class="back-link" href="#/">← 메인으로</a>
    <header class="item-heading"><p class="eyebrow">나의 물건 살펴보기</p><h1>어떤 물건을 버리려고 하나요?</h1><p>물건의 재질과 현재 상태를 알려주세요.</p></header>
    <div class="item-grid"><form id="item-form" class="item-card">
      <section aria-labelledby="item-basic"><h2 id="item-basic"><span class="section-index">01</span> 물건 정보</h2>
        <div class="field"><label for="item-name">물건 이름</label><input id="item-name" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자 봉지" aria-describedby="item-name-hint"><p class="input-hint" id="item-name-hint">한 번에 한 가지 물건을 입력해 주세요.</p></div>
        <label class="auto-fill-choice"><input type="checkbox" id="auto-fill-item"><span>물건 정보 자동 입력</span></label><p id="auto-fill-status" class="input-hint auto-fill-status" role="status" aria-live="polite">체크하면 우유팩·생수병 등 알려진 물품의 재질 정보를 채워요.</p>
        ${partFields('', '주요 재질과 현재 상태')}
      </section>
      <section id="combination-section" aria-labelledby="item-state" hidden><h2 id="item-state"><span class="section-index">02</span> 결합된 재질</h2>
        ${question('combined', '라벨·뚜껑·테이프 등 다른 재질과 결합되어 있나요?')}
        <p class="input-hint">종이팩 자체의 코팅층은 부속품으로 입력하지 않아도 돼요. 빨대·뚜껑 등 별도 부속품을 확인해 주세요.</p>
        <div id="separable-question" hidden>${question('separable', '결합된 재질을 분리할 수 있나요?')}</div>
        <div id="components-section" hidden><p class="input-hint">분리한 부속품의 재질과 상태도 알려주세요. 같은 재질·상태는 함께 묶어 최대 5개까지 입력할 수 있어요. 부속품 자체가 복합재질이면 ‘기타’를 선택해 주세요. 페트병 뚜껑은 본체의 처리 안내를 따라 주세요.</p><div id="component-fields"></div><button class="button secondary" type="button" id="add-component">부속품 추가</button></div>
      </section>
      <button type="submit" class="button primary full-width">분리배출 방법 알아보기 <span aria-hidden="true">→</span></button>
      <p class="input-hint">재질과 현재 상태를 기준으로 판단해요. 확실하지 않으면 ‘모르겠어요’를 선택해 주세요.</p>
      <p id="item-save-status" class="item-save-status" role="status" aria-live="polite"></p>
    </form>
    <div class="item-sidebar"><aside class="recent-items" aria-labelledby="recent-items-title"><p class="eyebrow">MY RECENT ITEMS</p><h2 id="recent-items-title">최근 분리배출 목록</h2><p class="recent-explanation">최근 8개 판별 기록이에요. 물품을 누르면 당시 입력과 결과를 다시 볼 수 있어요.</p><div id="recent-items-content"></div><div id="history-delete-confirm" class="history-delete-confirm" hidden><p id="history-delete-message"></p><div class="choice-row"><button type="button" id="confirm-history-delete" class="history-action">삭제하기</button><button type="button" id="cancel-history-delete" class="history-action">취소</button></div></div><p id="history-status" class="input-hint" role="status" aria-live="polite"></p></aside>
    <aside class="item-help"><p class="eyebrow">입력 가이드</p><h2>천천히 살펴봐도 괜찮아요</h2><p>포장의 재질 표시와 용도를 확인해 보세요. 답변에 따라 필요한 질문만 표시돼요.</p><hr><h3>세척보다 현재 상태가 중요해요</h3><p>씻었어도 오염이 남으면 추가 처리가 필요해요. 깨끗한 물건은 세척 여부를 묻지 않아요. 일반 종이는 물로 씻지 마세요.</p><p class="help-note">입력 조건과 결과는 이 브라우저에만 저장돼요. 회원별·비회원별로 구분하며 서버로 전송하지 않아요.</p></aside></div></div>
    <section id="item-summary" class="item-card item-summary" hidden tabindex="-1" aria-labelledby="summary-title"></section>
  </section>`;
}

const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
export function resultMarkup(input, result, createdAt) {
  const labels = { yes: '네', no: '아니요', unknown: '모르겠어요' };
  const details = part => Object.entries(titles).filter(([key]) => part[key]).map(([key, title]) => {
    const value = key === 'type' ? TYPES[part.material]?.find(([value]) => value === part.type)?.[1] || part.type : labels[part[key]] || part[key];
    return `<div><dt>${title}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }).join('');
  return `<p class="eyebrow">${createdAt ? '저장된 판별 결과' : '나의 분리배출 안내'}</p><h2 id="summary-title">${escapeHtml(input.itemName)}</h2>
    ${createdAt ? `<p class="input-hint">${escapeHtml(new Date(createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 당시 입력과 기준으로 저장된 결과예요.</p>` : ''}
    ${result.ruleVersion !== RULE_VERSION ? '<p class="demo-notice">판별 기준이 업데이트되었어요. 이전 결과를 그대로 사용하기 전에 아래의 ‘이 조건으로 다시 입력하기’를 눌러 현재 기준으로 다시 판별해 주세요.</p>' : ''}
    <div class="result-verdict ${result.status === 'check' ? 'needs-check' : ''}"><span class="result-badge">${{ recycle: '재활용 안내', general: '일반 배출 안내', check: '추가 확인 필요', mixed: '재질별 배출 안내' }[result.status]}</span><h3>${escapeHtml(result.method)}</h3></div>
    <div class="result-sections"><section><h3>배출하기 전에 해야 할 일</h3>${list(result.steps)}</section><section><h3>이렇게 판단한 이유</h3>${list(result.reasons)}</section></div>
    <h3>재질별 처리 방법</h3><div class="result-parts">${result.parts.map(part => `<article><h4>${escapeHtml(part.label)} · ${escapeHtml(part.material)}</h4><p class="part-method">${escapeHtml(part.method)}</p>${list(part.steps)}<p class="input-hint">${escapeHtml(part.reasons.join(' '))}</p></article>`).join('')}</div>
    <details class="input-details"><summary>입력한 조건 확인하기</summary><dl><div><dt>물건 이름</dt><dd>${escapeHtml(input.itemName)}</dd></div>${details(input)}</dl>${(input.components || []).map((part, index) => `<h4>부속품 ${index + 1}</h4><dl>${details(part)}</dl>`).join('')}</details>
    <p class="demo-notice">${escapeHtml(result.notice)}</p><p class="input-hint">기준 확인일: ${escapeHtml(result.checkedAt || '미기록')} · 규칙 ${escapeHtml(result.ruleVersion)} · <a href="${RULE_SOURCE}" target="_blank" rel="noopener noreferrer">분리의정석 분리배출 지침 확인</a></p>
    <button class="button secondary" type="button" id="edit-item">이 조건으로 다시 입력하기</button>`;
}

export function bindItemInput() {
  const form = document.getElementById('item-form');
  const summary = document.getElementById('item-summary');
  const nameInput = form.elements.namedItem('itemName');
  const saveStatus = document.getElementById('item-save-status');
  const autoFill = document.getElementById('auto-fill-item');
  const autoFillStatus = document.getElementById('auto-fill-status');
  let history = [];
  let shownInput;
  let shownRecordId = null;
  let pendingDeletion = null;
  let deleting = false;
  const deleteConfirm = document.getElementById('history-delete-confirm');
  const historyStatus = document.getElementById('history-status');
  let saving = false;
  const value = name => form.elements.namedItem(name)?.value || '';
  function partValue(prefix) {
    return Object.fromEntries(['material', 'type', 'contaminated', 'washed', 'removable'].map(key => [key, value(`${prefix}${key}`)]));
  }
  function toggle(node, show) {
    node.hidden = !show;
    node.querySelectorAll('input, select').forEach(control => {
      control.disabled = !show;
      control.required = show;
      if (!show) { if (control.type === 'radio') control.checked = false; else control.value = ''; }
    });
  }
  function syncPart(node, active = true) {
    const prefix = node.dataset.prefix;
    const materialSelect = form.elements.namedItem(`${prefix}material`);
    materialSelect.disabled = !active; materialSelect.required = active;
    const material = materialSelect.value;
    const options = TYPES[material] || [];
    const select = form.elements.namedItem(`${prefix}type`);
    if (select.dataset.material !== material) {
      select.innerHTML = '<option value="">세부 종류를 선택해 주세요</option>' + options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
      select.dataset.material = material;
    }
    toggle(node.querySelector('[data-condition="type"]'), active && options.length > 0);
    const supported = active && supportsState(partValue(prefix));
    toggle(node.querySelector('[data-condition="state"]'), supported);
    const dirty = supported && value(`${prefix}contaminated`) === 'yes';
    toggle(node.querySelector('[data-condition="washed"]'), dirty && needsWashQuestion(partValue(prefix)));
    toggle(node.querySelector('[data-condition="removable"]'), dirty);
    node.querySelector('[data-condition="removable"] legend').textContent = material === '종이' && value(`${prefix}type`) === 'paper'
      ? '오염된 부분을 떼어내고 깨끗한 종이만 남길 수 있나요?' : '남은 오염을 헹구거나 닦아 제거할 수 있나요?';
    if (!active) materialSelect.value = '';
  }
  function updateConditional() {
    syncPart(form.querySelector('.part-fields'));
    const supported = supportsState(partValue(''));
    // 부모에서 자식 순서로 갱신해 숨겨진 필수 질문을 비활성화합니다.
    toggle(document.getElementById('combination-section'), supported);
    const combined = supported && value('combined') === 'yes';
    toggle(document.getElementById('separable-question'), combined);
    const components = combined && value('separable') === 'yes';
    document.getElementById('components-section').hidden = !components;
    document.querySelectorAll('#component-fields .part-fields').forEach(node => syncPart(node, components));
  }
  function collect() {
    const input = { itemName: nameInput.value.trim(), ...normalizePart(partValue('')) };
    if (supportsState(input)) {
      input.combined = value('combined');
      if (input.combined === 'yes') {
        input.separable = value('separable');
        if (input.separable === 'yes') input.components = Array.from({ length: componentCount }, (_, index) => normalizePart(partValue(`part${index}-`)));
      }
    }
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
    form.reset(); componentCount = Math.max(1, input.components?.length || 0); drawComponents();
    autoFill.checked = autoFillEnabled;
    autoFillStatus.textContent = autoFillEnabled ? '자동 입력이 켜져 있어요. 물건 이름을 바꾸면 재질 정보를 다시 채워요.' : '체크하면 우유팩·생수병 등 알려진 물품의 재질 정보를 채워요.';
    // 재질→세부 종류→상태 순서로 선택지를 생성한 후 저장된 답변을 복원합니다.
    for (let pass = 0; pass < 3; pass++) {
      writeValues(input);
      (input.components || []).forEach((part, index) => writeValues(part, `part${index}-`));
      updateConditional();
    }
    draft = collect();
  }
  function showResult(input, result, createdAt, recordId = null) {
    shownInput = input;
    shownRecordId = recordId;
    summary.innerHTML = resultMarkup(input, result, createdAt);
    summary.hidden = false; summary.focus(); summary.scrollIntoView({ behavior: 'auto', block: 'start' });
    document.getElementById('edit-item').addEventListener('click', () => {
      restore(shownInput); summary.hidden = true; saveStatus.textContent = ''; nameInput.focus();
    });
  }
  async function renderRecent() {
    const records = await getDisposalHistory();
    if (!form.isConnected) return;
    history = records;
    if (!document.getElementById('all-history-link')) {
      document.getElementById('recent-items-content').insertAdjacentHTML('afterend', '<a id="all-history-link" class="all-history-link" href="#/history">전체 기록 및 통계 보기 →</a>');
    }
    document.getElementById('recent-items-content').innerHTML = history.length ? `<div class="history-toolbar"><button type="button" class="history-action" id="clear-history">전체 삭제</button></div><ol class="recent-list">${history.map((record, index) => `<li><button type="button" data-history="${index}"><strong>${escapeHtml(record.itemName)}</strong><small>${record.legacy ? '이전 이름 기록 · 다시 판별하기' : escapeHtml(record.result.method)}</small>${record.legacy ? '' : `<small>${escapeHtml(new Date(record.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</small>`}</button><button type="button" class="recent-delete" data-delete-history="${index}" aria-label="${index + 1}번째 ${escapeHtml(record.itemName)} 기록 삭제">삭제</button></li>`).join('')}</ol>` : '<p class="recent-empty">아직 저장한 물건이 없어요.</p>';
  }
  restore(draft); renderRecent();
  function applySuggestion() {
    const suggestion = suggestItemInfo(nameInput.value);
    // 이름을 바꾸면 이전 물품의 상태와 부속품 답변을 새 물품에 사용하지 않습니다.
    form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
    form.elements.namedItem('material').value = suggestion?.material || '';
    form.elements.namedItem('type').value = '';
    updateConditional();
    if (suggestion?.type) form.elements.namedItem('type').value = suggestion.type;
    updateConditional();
    autoFillStatus.textContent = suggestion
      ? `${suggestion.material}${suggestion.type ? ' · ' + TYPES[suggestion.material].find(([value]) => value === suggestion.type)[1] : ''} 정보를 채웠어요. ${suggestion.note}`
      : nameInput.value.trim() ? '자동 입력할 수 있는 이름이 아니에요. 실제 재질과 세부 종류를 직접 선택해 주세요.' : '물건 이름을 입력하면 알려진 품목의 재질 정보를 채워요.';
  }
  function changed(event) {
    nameInput.setCustomValidity(''); saveStatus.textContent = '';
    // 브라우저가 체크 상태를 복원해도 실제 화면의 선택과 일치시킵니다.
    autoFillEnabled = autoFill.checked;
    if (event.target === autoFill) {
      if (!autoFillEnabled) autoFillStatus.textContent = '자동 입력을 껐어요. 재질 정보를 직접 선택하거나 수정할 수 있어요.';
    }
    if (autoFillEnabled && (event.target === autoFill || event.target === nameInput)) applySuggestion();
    else updateConditional();
    draft = collect(); summary.hidden = true;
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
      await renderRecent();
      historyStatus.textContent = request.all ? '최근 분리배출 목록을 모두 삭제했어요.' : '선택한 기록을 삭제했어요.';
      document.getElementById('clear-history')?.focus();
    } catch (error) { if (form.isConnected) historyStatus.textContent = error.message; }
    finally { deleting = false; buttons.forEach(button => { button.disabled = false; }); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving || deleting) return;
    pendingDeletion = null; deleteConfirm.hidden = true;
    if (!nameInput.value.trim()) { nameInput.setCustomValidity('물건 이름을 입력해 주세요.'); nameInput.reportValidity(); return; }
    updateConditional(); if (!form.reportValidity()) return;
    draft = collect(); const input = structuredClone(draft); const result = judgeDisposal(input);
    showResult(input, result); saving = true;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const record = await saveDisposalRecord(input, result);
      if (shownInput === input) shownRecordId = record.id;
      if (form.isConnected) { saveStatus.textContent = '입력 조건과 판별 결과를 최근 목록에 저장했어요.'; await renderRecent(); }
    } catch (error) { if (form.isConnected) saveStatus.textContent = error.message; }
    finally { saving = false; submit.disabled = false; }
  });
}
