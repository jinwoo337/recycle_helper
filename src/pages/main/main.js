import { escapeHtml } from '../../utils/html.js';
import { queueInput } from '../../services/input-draft.js';
import { searchItemNames } from '../../domain/disposal/item-suggestions.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';
import { aiToggleMarkup, bindAiToggle } from '../../components/ai-toggle.js';
import { tipOfTheDay } from '../../domain/disposal/daily-tips.js';
import { voiceButtonMarkup, bindVoiceInput } from '../../components/voice-input.js';
import { getDisposalHistory } from '../../services/disposal-history.js';
export function mainPage(member) {
  return `<section class="container home-page">
    <header class="home-heading"><p class="eyebrow">버리기 전, 한 번만 확인해요</p><h1>이건 어디에 버릴까요?</h1><p>물건 이름으로 찾고, 내 물건의 상태에 맞게 분리배출하세요.</p></header>
    <form id="quick-search" class="quick-search home-search"><label for="quick-item">어떤 물건을 버리려고 하나요?</label><div class="quick-search-row"><div class="item-name-control home-item-control"><input id="quick-item" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자봉지" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="quick-items" aria-expanded="false" aria-describedby="quick-item-status"><div id="quick-items" class="item-name-options" role="listbox" aria-label="추천 물품" hidden></div>${voiceButtonMarkup('home-voice')}</div><button class="button primary" type="submit">배출 방법 찾기 <span aria-hidden="true">→</span></button></div><p id="quick-item-status" class="input-hint" role="status" aria-live="polite"></p><div class="example-items" aria-label="자주 찾는 물건"><span>자주 찾아요</span>${['우유팩', '투명생수병', '과자봉지'].map(name => `<button class="history-action" type="button" data-example="${name}">${name}</button>`).join('')}</div>${aiToggleMarkup('home-ai-enabled', { compact: true })}<p class="input-hint">${member ? `${escapeHtml(member.nickname)}님, 실제 물건의 재질과 현재 상태를 확인해 주세요.` : '가입 없이 사용할 수 있어요. 로그인하면 지역과 기록을 계정에 저장해요.'}</p></form>
    <section id="home-recent" class="home-recent" aria-labelledby="home-recent-title" hidden><h2 id="home-recent-title">최근 찾은 물건</h2><div class="home-recent-items" id="home-recent-items"></div></section>
    ${tipCard()}
    <nav class="home-shortcuts" aria-label="주요 기능 바로가기">
      <a href="#/history" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('history')}</span><div><h2>나의 기록</h2><p>찾아본 물건과 통계를 한눈에</p></div><span aria-hidden="true">↗</span></a>
      <a href="#/game" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('game')}</span><div><h2>분리배출 게임</h2><p>60초 도전으로 배우고 대결해요</p></div><span aria-hidden="true">↗</span></a>
      <a href="#/guide" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('guide')}</span><div><h2>분리배출 방법</h2><p>비우고, 분리하고, 제대로 버려요</p></div><span aria-hidden="true">↗</span></a>
    </nav>
    <details class="home-guide"><summary>처음 이용하시나요?</summary><ol><li><strong>물건 이름 찾기</strong><span>추천에서 실제 물건과 맞는 이름을 선택해요.</span></li><li><strong>현재 상태 확인</strong><span>재질과 오염, 다른 재질이 붙어 있는지 확인해요.</span></li><li><strong>배출 방법 확인</strong><span>배출 전 처리 순서와 거주 지역의 기준을 확인해요.</span></li></ol></details>
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
  const form = document.getElementById('quick-search');
  const input = form.elements.itemName;
  input.addEventListener('input', () => input.setCustomValidity(''));
  const autocomplete = bindItemAutocomplete({ input, options: document.getElementById('quick-items'), status: document.getElementById('quick-item-status'), search: searchItemNames,
    onSelect: () => { input.setCustomValidity(''); form.requestSubmit(); },
    onCompositionEnd: () => input.setCustomValidity(''),
    noResultsMessage: '목록에 없어도 검색할 수 있어요. 배출 방법 찾기를 눌러 물건 종류를 알려주세요.' });
  form.addEventListener('submit', event => {
    event.preventDefault();
    autocomplete.close();
    if (!input.value.trim()) { input.setCustomValidity('물건 이름을 입력해 주세요.'); input.reportValidity(); return; }
    queueInput({ itemName: input.value.trim() }); location.hash = '/item-input';
  });
  document.querySelectorAll('.home-page [data-example]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.example; input.setCustomValidity(''); form.requestSubmit();
  }));
  const aiSwitch = bindAiToggle(document.getElementById('home-ai-enabled'));
  const disposeVoice = bindVoiceInput(document.getElementById('home-voice'), input, { status: document.getElementById('quick-item-status'), onResult: () => { autocomplete.close(); form.requestSubmit(); } });
  let active = true;
  renderRecent(form, () => active);
  return () => { active = false; autocomplete.dispose(); aiSwitch.dispose(); disposeVoice(); };
}

// 최근에 찾아본 물건(최대 6개)을 버튼으로 보여 줘서 한 번에 다시 찾게 합니다. 기록이 없거나 불러오지 못하면 숨깁니다.
async function renderRecent(form, isActive) {
  let records = [];
  try { records = await getDisposalHistory(); } catch { return; }
  const section = document.getElementById('home-recent');
  if (!isActive() || !section) return;
  const names = [...new Set(records.map(record => record.itemName).filter(Boolean))].slice(0, 6);
  if (!names.length) return;
  const list = document.getElementById('home-recent-items');
  list.innerHTML = names.map(name => `<button class="history-action" type="button">🕘 ${escapeHtml(name)}</button>`).join('');
  list.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => {
    form.elements.itemName.value = names[index]; form.requestSubmit();
  }));
  section.hidden = false;
}

