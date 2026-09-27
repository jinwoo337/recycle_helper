import { layout } from './layouts/layout.js';
import { mainPage } from './pages/main/main.js';
import { loginPage } from './pages/login/login.js';
import { signupPage } from './pages/signup/signup.js';
import { bindForm } from './utils/validation.js';

const routes = {
  '/': { page: 'main', title: '홈', render: mainPage },
  '/login': { page: 'login', title: '로그인', render: loginPage },
  '/signup': { page: 'signup', title: '회원가입', render: signupPage },
};

function render(moveFocus = false) {
  const route = routes[location.hash.slice(1) || '/'];
  if (!route) { location.replace('#/'); return; }
  document.title = `${route.title} | 맞춤형 분리배출 도우미`;
  document.getElementById('app').innerHTML = layout(route.render(), route.page);
  bindForm(document.querySelector('form'));
  if (moveFocus) {
    document.getElementById('main-content').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
window.addEventListener('hashchange', () => render(true));
render();
