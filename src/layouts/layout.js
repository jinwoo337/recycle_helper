import { escapeHtml } from '../utils/html.js';
export function layout(content, page, member) {
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#/" aria-label="맞춤형 분리배출 도우미 홈"><span class="brand-icon" aria-hidden="true">↻</span><span>분리배출 도우미<small>나에게 맞는 작은 실천</small></span></a>
    <button type="button" class="text-size-toggle" data-text-size-toggle aria-pressed="false">가 글자 크게</button>
    <nav aria-label="주 메뉴"><a href="#/" ${page === 'main' ? 'aria-current="page"' : ''}>홈</a><a href="#/history" ${page === 'history' ? 'aria-current="page"' : ''}>기록 및 통계</a><a href="#/game" ${page === 'game' ? 'aria-current="page"' : ''}>게임</a>${member ? `<a href="#/profile" ${page === 'profile' ? 'aria-current="page"' : ''}>마이페이지</a><span class="member-label">${escapeHtml(member.nickname)}님</span><button type="button" class="nav-signup logout-button" id="logout-button">로그아웃</button>` : `<a href="#/login" ${page === 'login' ? 'aria-current="page"' : ''}>로그인</a><a class="nav-signup" href="#/signup" ${page === 'signup' ? 'aria-current="page"' : ''}>회원가입</a>`}</nav>
  </div></header>
  <main id="main-content" class="page-${page}" tabindex="-1">${content}</main>
  <nav class="bottom-nav" aria-label="빠른 메뉴">${[['main', '/', '🏠', '홈'], ['item-input', '/item-input', '🔍', '찾기'], ['guide', '/guide', '📘', '방법'], ['history', '/history', '📊', '기록'], ['game', '/game', '🎮', '게임']].map(([id, href, icon, label]) => `<a href="#${href}" ${page === id ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`).join('')}</nav>
  <footer class="site-footer"><span>맞춤형 분리배출 도우미</span><span>작은 분리에서 시작하는 더 나은 일상</span></footer>`;
}

