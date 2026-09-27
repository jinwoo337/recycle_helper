export function layout(content, page) {
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#/" aria-label="맞춤형 분리배출 도우미 홈"><span class="brand-icon" aria-hidden="true">↻</span><span>분리배출 도우미<small>나에게 맞는 작은 실천</small></span></a>
    <nav aria-label="주 메뉴"><a href="#/" ${page === 'main' ? 'aria-current="page"' : ''}>홈</a><a href="#/login" ${page === 'login' ? 'aria-current="page"' : ''}>로그인</a><a class="nav-signup" href="#/signup" ${page === 'signup' ? 'aria-current="page"' : ''}>회원가입</a></nav>
  </div></header>
  <main id="main-content" tabindex="-1">${content}</main>
  <footer class="site-footer"><span>맞춤형 분리배출 도우미</span><span>작은 분리에서 시작하는 더 나은 일상</span></footer>`;
}
