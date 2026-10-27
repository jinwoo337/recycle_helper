import { escapeHtml } from '../../utils/html.js';
import { queueInput } from '../../services/input-draft.js';
import { searchItemNames } from '../../domain/disposal/item-suggestions.js';
export function mainPage(member) {
  return `<section class="container home-page">
    <header class="home-heading"><p class="eyebrow">버리기 전, 한 번만 확인해요</p><h1>이건 어디에 버릴까요?</h1><p>물건 이름으로 찾고, 내 물건의 상태에 맞게 분리배출하세요.</p></header>
    <form id="quick-search" class="quick-search home-search"><label for="quick-item">어떤 물건을 버리려고 하나요?</label><div class="quick-search-row"><input id="quick-item" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자봉지" list="quick-items" autocomplete="off"><button class="button primary" type="submit">배출 방법 찾기 <span aria-hidden="true">→</span></button></div><datalist id="quick-items"></datalist><div class="example-items" aria-label="자주 찾는 물건"><span>자주 찾아요</span>${['우유팩', '투명생수병', '과자봉지'].map(name => `<button class="history-action" type="button" data-example="${name}">${name}</button>`).join('')}</div><p class="input-hint">${member ? `${escapeHtml(member.nickname)}님, 실제 물건의 재질과 현재 상태를 확인해 주세요.` : '가입 없이 사용할 수 있어요. 로그인하면 지역과 기록을 계정에 저장해요.'}</p></form>
    <nav class="home-shortcuts" aria-label="주요 기능 바로가기">
      <a href="#/history" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('history')}</span><div><h2>나의 기록</h2><p>찾아본 물건과 통계를 한눈에</p></div><span aria-hidden="true">↗</span></a>
      <a href="#/game" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('game')}</span><div><h2>분리배출 게임</h2><p>60초 도전으로 배우고 대결해요</p></div><span aria-hidden="true">↗</span></a>
      <a href="${member ? '#/profile' : '#/login'}" class="home-shortcut"><span class="shortcut-symbol" aria-hidden="true">${homeIcon('profile')}</span><div><h2>${member ? '마이페이지' : '내 지역 설정'}</h2><p>${member ? '닉네임과 배출 지역을 관리해요' : '로그인하고 지역별 안내를 받아요'}</p></div><span aria-hidden="true">↗</span></a>
    </nav>
    <details class="home-guide"><summary>처음 이용하시나요?</summary><ol><li><strong>물건 이름 찾기</strong><span>추천에서 실제 물건과 맞는 이름을 선택해요.</span></li><li><strong>현재 상태 확인</strong><span>재질과 오염, 다른 재질이 붙어 있는지 확인해요.</span></li><li><strong>배출 방법 확인</strong><span>배출 전 처리 순서와 거주 지역의 기준을 확인해요.</span></li></ol></details>
  </section>`;
}

function homeIcon(name) {
  const paths={history:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',game:'<circle cx="12" cy="13" r="7"/><path d="M9 2h6M12 6V2M12 13l3-3"/>',profile:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'};
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

export function bindMain() {
  const form = document.getElementById('quick-search');
  const input = form.elements.itemName;
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    document.getElementById('quick-items').innerHTML = searchItemNames(input.value).map(name => `<option value="${escapeHtml(name)}"></option>`).join('');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim()) { input.setCustomValidity('물건 이름을 입력해 주세요.'); input.reportValidity(); return; }
    queueInput({ itemName: input.value.trim() }); location.hash = '/item-input';
  });
  form.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.example; input.setCustomValidity(''); form.requestSubmit();
  }));
}

