import { escapeHtml } from '../../utils/html.js';
import { getRecentItems, saveRecentItem } from '../../services/recent-items.js';

// 화면을 오갈 때 입력을 유지합니다. 새로고침하면 초기화됩니다.
let draft = {};
const materials = ['종이', '플라스틱', '비닐', '유리', '금속·캔', '스티로폼', '기타', '모르겠어요'];

function question(name, title, options) {
  return `<fieldset class="item-question"><legend>${title}</legend><div class="choice-row">${options.map(([value, label]) => `<label class="choice"><input type="radio" name="${name}" value="${value}" required><span>${label}</span></label>`).join('')}</div></fieldset>`;
}

export function itemInputPage() {
  return `<section class="container item-page">
    <a class="back-link" href="#/">← 메인으로</a>
    <header class="item-heading"><p class="eyebrow">나의 물건 살펴보기</p><h1>어떤 물건을 버리려고 하나요?</h1><p>물건의 재질과 현재 상태를 알려주세요.</p></header>
    <div class="item-grid"><form id="item-form" class="item-card">
      <section aria-labelledby="item-basic"><h2 id="item-basic"><span class="section-index">01</span> 물건 정보</h2>
        <div class="field"><label for="item-name">물건 이름</label><input id="item-name" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자 봉지" aria-describedby="item-name-hint"><p class="input-hint" id="item-name-hint">한 번에 한 가지 물건을 입력해 주세요.</p></div>
        <div class="field"><label for="material">주요 재질</label><select id="material" name="material" required><option value="">재질을 선택해 주세요</option>${materials.map(material => `<option>${material}</option>`).join('')}</select></div>
      </section>
      <section aria-labelledby="item-state"><h2 id="item-state"><span class="section-index">02</span> 물건 상태</h2>
        ${question('contaminated', '음식물이나 이물질이 남아 있나요?', [['yes', '남아 있어요'], ['no', '없어요'], ['unknown', '모르겠어요']])}
        ${question('washed', '물건을 세척했나요?', [['yes', '세척했어요'], ['no', '세척하지 않았어요']])}
        ${question('combined', '다른 재질과 결합되어 있나요?', [['yes', '결합되어 있어요'], ['no', '한 가지 재질이에요'], ['unknown', '모르겠어요']])}
        <div id="separable-question" hidden>${question('separable', '결합된 재질을 분리할 수 있나요?', [['yes', '분리할 수 있어요'], ['no', '분리하기 어려워요'], ['unknown', '모르겠어요']])}</div>
      </section>
      <button type="submit" class="button primary full-width">입력 내용 확인하고 저장하기 <span aria-hidden="true">→</span></button>
      <p class="input-hint">현재는 입력 내용을 확인하는 단계예요. 분리배출 판별 기능은 준비 중이에요.</p>
      <p id="item-save-status" class="item-save-status" role="status" aria-live="polite"></p>
    </form>
    <div class="item-sidebar"><aside class="recent-items" aria-labelledby="recent-items-title"><p class="eyebrow">MY RECENT ITEMS</p><h2 id="recent-items-title">최근 분리배출한 물품</h2><p class="recent-explanation">입력해 저장한 물건 이름이에요. 배출 방법 판단이나 배출 완료를 뜻하지 않아요.</p><div id="recent-items-content"></div></aside>
    <aside class="item-help"><p class="eyebrow">입력 가이드</p><h2>천천히 살펴봐도 괜찮아요</h2><p>포장에 표시된 재질을 확인해 보세요. 알기 어렵다면 ‘모르겠어요’를 선택할 수 있어요.</p><hr><h3>결합된 재질이란?</h3><p>서로 다른 재질이 붙어 있는 상태예요. 예를 들어 병에 붙은 라벨이나 상자에 붙은 테이프를 살펴보세요.</p><p class="help-note">물건 이름은 이 브라우저에 저장돼요. 입력한 상태 정보는 페이지에서만 유지되며 서버로 전송하지 않아요.</p></aside></div></div>
    <section id="item-summary" class="item-card item-summary" hidden tabindex="-1" aria-labelledby="summary-title"><p class="eyebrow">입력 확인</p><h2 id="summary-title">이렇게 입력했어요</h2><dl id="summary-details"></dl><p class="demo-notice">아직 분리배출 판별 결과가 아니에요. 입력 내용을 바탕으로 배출 방법을 안내하는 기능은 다음 단계에서 연결할 예정이에요.</p><button class="button secondary" type="button" id="edit-item">입력 수정하기</button></section>
  </section>`;
}

export function bindItemInput() {
  const form = document.getElementById('item-form');
  const summary = document.getElementById('item-summary');
  const nameInput = form.elements.namedItem('itemName');
  const saveStatus = document.getElementById('item-save-status');
  function renderRecent(items = getRecentItems()) {
    document.getElementById('recent-items-content').innerHTML = items.length
      ? `<ol class="recent-list">${items.map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ol>`
      : '<p class="recent-empty">아직 저장한 물건이 없어요.</p>';
  }
  renderRecent();
  for (const [name, value] of Object.entries(draft)) {
    const controls = [...form.querySelectorAll(`[name="${name}"]`)];
    if (controls[0]?.type === 'radio') {
      controls.forEach(control => { control.checked = control.value === value; });
    } else if (controls[0]) {
      controls[0].value = value;
    }
  }
  function updateConditional() {
    const combined = form.querySelector('[name="combined"]:checked')?.value === 'yes';
    document.getElementById('separable-question').hidden = !combined;
    form.querySelectorAll('[name="separable"]').forEach(input => {
      input.disabled = !combined;
      input.required = combined;
      if (!combined) input.checked = false;
    });
  }
  updateConditional();
  function updateDraft() {
    nameInput.setCustomValidity('');
    saveStatus.textContent = '';
    updateConditional();
    draft = Object.fromEntries(new FormData(form));
    summary.hidden = true;
  }
  form.addEventListener('input', updateDraft);
  form.addEventListener('change', updateDraft);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!nameInput.value.trim()) {
      nameInput.setCustomValidity('물건 이름을 입력해 주세요.');
      nameInput.reportValidity();
      return;
    }
    draft = Object.fromEntries(new FormData(form));
    draft.itemName = draft.itemName.trim();
    try {
      renderRecent(saveRecentItem(draft.itemName));
      saveStatus.textContent = '물건 이름을 최근 목록에 저장했어요.';
    } catch (error) {
      saveStatus.textContent = error.message;
    }
    const labels = { itemName: '물건 이름', material: '주요 재질', contaminated: '오염 여부', washed: '세척 여부', combined: '다른 재질과 결합', separable: '재질 분리 가능 여부' };
    document.getElementById('summary-details').innerHTML = Object.entries(draft).map(([key, value]) => {
      const radio = [...form.querySelectorAll('input[type="radio"]')].find(input => input.name === key && input.value === value);
      return `<div><dt>${labels[key]}</dt><dd>${escapeHtml(radio ? radio.nextElementSibling.textContent : value)}</dd></div>`;
    }).join('');
    summary.hidden = false;
    summary.focus();
    summary.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  document.getElementById('edit-item').addEventListener('click', () => {
    summary.hidden = true;
    nameInput.focus();
  });
}
