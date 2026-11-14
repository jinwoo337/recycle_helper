import { escapeHtml } from '../../utils/html.js';
import { queueInput, startInputSearch } from '../../services/input-draft.js';
import { disposalQueryName, normalizeItemName, searchItemNames, lookupItem } from '../../domain/disposal/item-suggestions.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';
import { aiToggleMarkup, bindAiToggle } from '../../components/ai-toggle.js';
import { tipOfTheDay } from '../../domain/disposal/daily-tips.js';
import { voiceButtonMarkup, bindVoiceInput } from '../../components/voice-input.js';
import { getDisposalHistory } from '../../services/disposal-history.js';
import { collectionDaysMarkup, bindCollectionDays } from '../../components/collection-days.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { bindJudgementRegion, judgementRegionMarkup } from '../../components/judgement-region.js';
import { regionLabel } from '../../domain/disposal/regions.js';
import { inputModesMarkup, bindInputModes } from '../../components/input-modes.js';
import { getCurrentMember } from '../../services/auth.js';
import { memberTools } from '../../services/member-tools.js';
import { readDisposalBatch } from '../../services/disposal-batch.js';
import { inputForDisplay } from '../../domain/disposal/result-display.js';

let homeDraft = { owner: '', itemName: '' };
const favoriteOrderKey = owner => `recycle-helper.home-favorite-order.v1.${owner}`;
function favoriteOrder(owner) {
  try {
    const order = JSON.parse(localStorage.getItem(favoriteOrderKey(owner)) || '[]');
    return Array.isArray(order) ? order.filter(key => typeof key === 'string') : [];
  } catch { return []; }
}

export function mainPage(member) {
  const region = readJudgementRegion(member);
  return `<section class="container home-page">
    <header class="home-heading"><p class="eyebrow">버리기 전, 한 번만 확인해요</p><h1>이건 어디에 버릴까요?</h1><p>물건 이름으로 찾고, 내 물건의 상태에 맞게 분리배출하세요.</p></header>
    <div class="home-region"><p class="input-hint" data-home-region-label role="status">판별 지역 · ${escapeHtml(regionLabel(region))}</p><button type="button" class="history-action" data-home-region-toggle aria-expanded="false" aria-controls="home-region-form">${region ? '지역 변경' : '지역 선택'}</button></div>
    <form id="home-region-form" class="home-region-form" novalidate hidden>${judgementRegionMarkup(region, { onResult: true })}<div class="choice-row"><button type="submit" class="button primary">이 지역으로 판별</button><button type="button" class="button secondary" data-home-region-cancel>취소</button></div></form>
    <form id="quick-search" class="quick-search home-search" novalidate><label for="quick-item">버릴 물건 이름</label><div class="quick-search-row"><div class="item-name-control home-item-control"><input id="quick-item" name="itemName" type="text" maxlength="80" required placeholder="예: 생수병" autocomplete="off" enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-controls="quick-items" aria-expanded="false" aria-describedby="quick-name-error quick-item-status">${voiceButtonMarkup('home-voice')}</div><button class="button primary" type="submit">배출 방법 찾기 <span aria-hidden="true">→</span></button></div><div id="quick-items" class="item-name-options" role="listbox" aria-label="추천 물품" hidden></div>
      <p id="quick-name-error" class="field-error" role="alert"></p><p id="quick-item-status" class="input-hint" role="status" aria-live="polite"></p>
      <div class="home-search-alternatives">${inputModesMarkup('name')}
      <div class="home-direct-choices"><button class="history-action" type="button" data-home-unnamed>이름 없이 종류 고르기</button><button class="history-action" type="button" data-home-mark>분리배출 표시로 찾기</button></div></div>
      <div class="example-items" aria-label="자주 찾는 물건"><span>자주 찾아요</span>${['나무젓가락', '투명생수병', '과자봉지'].map(name => `<button class="history-action" type="button" data-example="${name}">${name}</button>`).join('')}</div><details class="search-options"><summary>검색 설정</summary><div class="ai-mode-controls">${aiToggleMarkup('home-ai-enabled', { compact: true })}</div></details>${member ? '' : '<p class="input-hint">로그인 없이 찾을 수 있어요.</p>'}</form>
    ${readDisposalBatch().items.length ? '<p><a class="history-action" href="#/batch">함께 버릴 물건 목록 보기 →</a></p>' : ''}
    <div data-home-collection-days>${collectionDaysMarkup(region)}</div>
    <nav class="home-shortcuts" aria-label="주요 기능 바로가기">
      <a href="#/history" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('history')}</span><div><h2>나의 기록</h2><p>찾아본 물건과 통계를 한눈에</p></div><span aria-hidden="true">↗</span></a>
      <a href="#/game" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('game')}</span><div><h2>분리배출 게임</h2><p>60초 도전으로 배우고 대결해요</p></div><span aria-hidden="true">↗</span></a>
      <a href="#/guide" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('guide')}</span><div><h2>분리배출 방법</h2><p>비우고, 분리하고, 제대로 버려요</p></div><span aria-hidden="true">↗</span></a>
    </nav>
    <section id="home-recent" class="home-recent" aria-labelledby="home-recent-title" hidden><h2 id="home-recent-title">최근 찾은 물건</h2><div class="home-recent-items" id="home-recent-items"></div></section>
    <section id="home-favorites" class="home-recent" aria-labelledby="home-favorite-title" hidden><h2 id="home-favorite-title">즐겨찾기</h2><div class="home-recent-items" id="home-favorite-items"></div><details class="search-options"><summary>즐겨찾기 순서 바꾸기</summary><div id="home-favorite-order"></div><p class="input-hint" data-favorite-order-status role="status"></p></details></section>
    <details class="home-guide"><summary>처음 이용하시나요?</summary><ol><li><strong>물건 이름 찾기</strong><span>추천에서 실제 물건과 맞는 이름을 선택해요.</span></li><li><strong>현재 상태 확인</strong><span>재질과 오염, 다른 재질이 붙어 있는지 확인해요.</span></li><li><strong>배출 방법 확인</strong><span>배출 전 처리 순서와 거주 지역의 기준을 확인해요.</span></li></ol></details>
    ${tipCard()}
  </section>`;
}

// 오늘의 분리배출 팁: 날짜마다 바뀌고, 누르면 그 물건의 배출 방법을 바로 찾아요.
function tipCard() {
  const tip = tipOfTheDay();
  return `<aside class="daily-tip" aria-labelledby="daily-tip-title"><p class="eyebrow">💡 오늘의 분리배출 팁</p><h2 id="daily-tip-title">${escapeHtml(tip.title)}</h2><p>${escapeHtml(tip.body)}</p><button class="history-action" type="button" data-example="${escapeHtml(tip.item)}">‘${escapeHtml(tip.item)}’ 배출 방법 보기 →</button></aside>`;
}

function homeIcon(name) {
  const paths={history:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',game:'<circle cx="12" cy="13" r="7"/><path d="M9 2h6M12 6V2M12 13l3-3"/>',profile:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'};
  paths.guide = '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15M6 8h3M6 12h3M15 8h3M15 12h3"/>';
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

export function bindMain() {
  const root = document.querySelector('.home-page');
  const form = document.getElementById('quick-search');
  const input = form.elements.itemName;
  const owner = getCurrentMember()?.id || 'guest';
  let region = readJudgementRegion(getCurrentMember());
  let regionChanged = false;
  if (homeDraft.owner === owner) input.value = homeDraft.itemName;
  const nameError = document.getElementById('quick-name-error');
  function clearNameError() { nameError.textContent = ''; input.removeAttribute('aria-invalid'); }
  input.addEventListener('input', clearNameError);
  const autocomplete = bindItemAutocomplete({ input, options: document.getElementById('quick-items'), status: document.getElementById('quick-item-status'),
    search: query => searchItemNames(query, lookupItem(query)?.material ? 3 : 6),
    onSelect: () => form.requestSubmit(),
    onCompositionEnd: clearNameError,
    noResultsMessage: '등록되지 않은 이름도 계속해서 배출 방법을 확인할 수 있어요.' });
  function openInput(draft) {
    startInputSearch();
    queueInput(regionChanged && !Object.hasOwn(draft, 'region') ? { ...draft, region } : draft);
    location.hash = '/item-input';
  }
  form.querySelector('[data-home-unnamed]').addEventListener('click', () => openInput({ manualLookup: true }));
  form.querySelector('[data-home-mark]').addEventListener('click', () => openInput({ itemName: input.value.trim(), manualLookup: true, showMarkPicker: true }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    autocomplete.close();
    const itemName = input.value.trim();
    if (!itemName) { nameError.textContent = '물건 이름을 입력해 주세요.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    const name = lookupItem(itemName)?.material ? itemName : disposalQueryName(itemName) || itemName;
    clearNameError(); openInput({ itemName: name, quickLookup: true });
  });
  document.querySelectorAll('.home-page [data-example]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.example; form.requestSubmit();
  }));
  const aiSwitch = bindAiToggle(document.getElementById('home-ai-enabled'));
  const disposeModes = bindInputModes(form, path => {
    const name = input.value.trim();
    startInputSearch();
    queueInput({ description: name, sourceName: name, newSearch: !name, ...(regionChanged ? { region } : {}) }, path);
  });
  const disposeVoice = bindVoiceInput(document.getElementById('home-voice'), input, { status: document.getElementById('quick-item-status'), onResult: () => { autocomplete.close(); form.requestSubmit(); } });
  const member = getCurrentMember();
  const regionLabelNode = root.querySelector('[data-home-region-label]');
  const regionForm = root.querySelector('#home-region-form');
  const regionToggle = root.querySelector('[data-home-region-toggle]');
  const collectionDays = root.querySelector('[data-home-collection-days]');
  const regionEditor = bindJudgementRegion(regionForm, region);
  let disposeCollection = bindCollectionDays(collectionDays);
  function closeRegion() {
    regionForm.hidden = true;
    regionToggle.setAttribute('aria-expanded', 'false');
    regionToggle.focus();
  }
  regionToggle.addEventListener('click', () => {
    if (!regionForm.hidden) { closeRegion(); return; }
    regionEditor.set(region);
    regionForm.hidden = false;
    regionToggle.setAttribute('aria-expanded', 'true');
    regionEditor.focus();
  });
  regionForm.querySelector('[data-home-region-cancel]').addEventListener('click', closeRegion);
  regionForm.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeRegion(); } });
  regionForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!regionEditor.validate()) return;
    region = regionEditor.get();
    regionChanged = true;
    rememberJudgementRegion(region, member);
    regionLabelNode.textContent = `판별 지역 · ${regionLabel(region)}`;
    regionToggle.textContent = region ? '지역 변경' : '지역 선택';
    disposeCollection();
    collectionDays.innerHTML = collectionDaysMarkup(region);
    disposeCollection = bindCollectionDays(collectionDays);
    closeRegion();
  });
  let active = true;
  renderSaved('recent', () => active, openInput, owner);
  renderSaved('favorite', () => active, openInput, owner);
  return () => {
    homeDraft = { owner, itemName: input.value };
    active = false;
    disposeCollection();
    autocomplete.dispose();
    aiSwitch.dispose();
    disposeVoice();
    disposeModes();
  };
}

// 최근에 찾아본 물건(최대 6개)을 버튼으로 보여 줘서 한 번에 다시 찾게 합니다. 기록이 없거나 불러오지 못하면 숨깁니다.
async function renderSaved(kind, isActive, openInput, owner) {
  let records;
  const favorite = kind === 'favorite';
  try { records = await (favorite ? memberTools.listFavorites() : getDisposalHistory()); } catch { return; }
  const section = document.getElementById(favorite ? 'home-favorites' : 'home-recent');
  if (!isActive() || !section) return;
  const byName = new Map();
  for (const record of records) {
    const name = record.itemName || record.input?.itemName;
    const key = normalizeItemName(name);
    if (key && !byName.has(key)) byName.set(key, record);
  }
  if (!byName.size) return;
  const list = document.getElementById(`home-${kind}-items`);
  let keys = [...new Set([...(favorite ? favoriteOrder(owner).filter(key => byName.has(key)) : []), ...byName.keys()])];
  const orderEditor = favorite ? section.querySelector('#home-favorite-order') : null;
  const nameOf = record => record.itemName || record.input.itemName;
  function draw() {
    const entries = keys.slice(0, 6).map(key => byName.get(key));
    list.innerHTML = entries.map(record => `<button class="history-action" type="button">${escapeHtml(nameOf(record))}</button>`).join('');
    list.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => {
      const record = entries[index];
      const input = record.result ? inputForDisplay(record.input, record.result) : record.input || { itemName: record.itemName };
      openInput({ ...input, reviewSaved: Boolean(record.input && !record.legacy), ...(record.result ? { savedLookup: record } : {}) });
    }));
    if (orderEditor) {
      orderEditor.parentElement.hidden = keys.length < 2;
      orderEditor.innerHTML = `<ol>${keys.map((key, index) => {
        const name = escapeHtml(nameOf(byName.get(key)));
        return `<li><span>${name}</span><button class="history-action" type="button" data-pin-favorite="${index}" aria-label="${name} 맨 앞으로" ${index ? '' : 'disabled'}>맨 앞으로</button><button class="history-action" type="button" data-lower-favorite="${index}" aria-label="${name} 한 칸 뒤로" ${index < keys.length - 1 ? '' : 'disabled'}>아래로</button></li>`;
      }).join('')}</ol>`;
    }
  }
  orderEditor?.addEventListener('click', event => {
    const control = event.target.closest('[data-pin-favorite], [data-lower-favorite]');
    if (!control || control.disabled) return;
    const index = Number(control.dataset.pinFavorite ?? control.dataset.lowerFavorite);
    const [key] = keys.splice(index, 1);
    const next = control.hasAttribute('data-pin-favorite') ? 0 : index + 1;
    keys.splice(next, 0, key);
    let saved = true;
    try { localStorage.setItem(favoriteOrderKey(owner), JSON.stringify(keys)); } catch { saved = false; }
    draw();
    section.querySelector('[data-favorite-order-status]').textContent = saved ? '이 브라우저에 순서를 저장했어요.' : '순서는 이 화면에서만 바뀌었어요.';
    (orderEditor.querySelector(`[data-pin-favorite="${next}"]:not(:disabled), [data-lower-favorite="${next}"]:not(:disabled)`) || orderEditor.parentElement.querySelector('summary')).focus();
  });
  draw();
  section.hidden = false;
}

