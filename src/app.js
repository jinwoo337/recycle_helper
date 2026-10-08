import { layout } from './layouts/layout.js';
import { mainPage } from './pages/main/main.js';
import { loginPage, submitLogin } from './pages/login/login.js';
import { signupPage, submitSignup } from './pages/signup/signup.js';
import { bindForm } from './utils/validation.js';
import { getCurrentMember, logout } from './services/auth.js';
import { itemInputPage, bindItemInput } from './pages/item-input/item-input.js';
import { historyPage, bindHistory } from './pages/history/history.js';

const routes = {
  '/': { page: 'main', title: '홈', render: mainPage },
  '/login': { page: 'login', title: '로그인', render: loginPage },
  '/signup': { page: 'signup', title: '회원가입', render: signupPage },
  '/item-input': { page: 'item-input', title: '물건 및 상태 입력', render: itemInputPage },
  '/history': { page: 'history', title: '기록 및 통계', render: historyPage },
};

let disposePage;
function render(moveFocus = false) {
  const route = routes[location.hash.slice(1) || '/'];
  if (!route) { location.replace('#/'); return; }
  const member = getCurrentMember();
  if (member && (route.page === 'login' || route.page === 'signup')) {
    location.replace('#/'); return;
  }
  document.title = `${route.title} | 맞춤형 분리배출 도우미`;
  disposePage?.(); disposePage = undefined;
  document.getElementById('app').innerHTML = layout(route.render(member), route.page, member);
  if (route.page === 'item-input') bindItemInput();
  else if (route.page === 'history') disposePage = bindHistory();
  else bindForm(document.querySelector('form'), route.page === 'login' ? submitLogin : submitSignup);
  if (route.page === 'login') {
    try {
      if (sessionStorage.getItem('recycle-helper.signup-complete')) {
        document.querySelector('.form-status').textContent = '회원가입이 완료됐어요. 가입한 이메일과 비밀번호로 로그인해 주세요.';
        sessionStorage.removeItem('recycle-helper.signup-complete');
      }
    } catch { /* 저장소가 차단된 경우 안내만 생략 */ }
  }
  document.getElementById('logout-button')?.addEventListener('click', () => {
    logout();
    render(true);
  });
  if (moveFocus) {
    document.getElementById('main-content').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
window.addEventListener('hashchange', () => render(true));
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main-content').focus();
});
render();
