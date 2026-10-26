import { layout } from './layouts/layout.js';
import { mainPage, bindMain } from './pages/main/main.js';
import { loginPage, submitLogin } from './pages/login/login.js';
import { signupPage, submitSignup } from './pages/signup/signup.js';
import { bindForm } from './utils/validation.js';
import { getCurrentMember, logout, initializeAuth, onMemberChange } from './services/auth.js';
import { itemInputPage, bindItemInput } from './pages/item-input/item-input.js';
import { historyPage, bindHistory } from './pages/history/history.js';
import { initializeItemCatalog } from './services/item-catalog.js';
import { profilePage, bindProfile } from './pages/profile/profile.js';
import { bindRegionFields } from './components/region-fields.js';

const routes = {
  '/': { page: 'main', title: '홈', render: mainPage },
  '/login': { page: 'login', title: '로그인', render: loginPage },
  '/signup': { page: 'signup', title: '회원가입', render: signupPage },
  '/item-input': { page: 'item-input', title: '물건 및 상태 입력', render: itemInputPage },
  '/history': { page: 'history', title: '기록 및 통계', render: historyPage },
  '/profile': { page: 'profile', title: '마이페이지', render: profilePage },
};

let disposePage;
function render(moveFocus = false) {
  const path = location.hash.slice(1) || '/';
  const route = Object.hasOwn(routes, path) ? routes[path] : null;
  if (!route) { location.replace('#/'); return; }
  const member = getCurrentMember();
  if (member && (route.page === 'login' || route.page === 'signup')) {
    location.replace('#/'); return;
  }
  document.title = `${route.title} | 맞춤형 분리배출 도우미`;
  disposePage?.(); disposePage = undefined;
  document.getElementById('app').innerHTML = layout(route.render(member), route.page, member);
  if (route.page === 'main') bindMain();
  else if (route.page === 'item-input') disposePage = bindItemInput();
  else if (route.page === 'history') disposePage = bindHistory();
  else if (route.page === 'profile') bindProfile();
  else {
    if (route.page === 'signup') bindRegionFields(document.querySelector('form'));
    bindForm(document.querySelector('form'), route.page === 'login' ? submitLogin : submitSignup);
  }
  document.getElementById('logout-button')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await logout(); render(true); }
    catch (error) { showAuthNotice(error.message); }
    finally { button.disabled = false; }
  });
  if (moveFocus) {
    document.getElementById('main-content').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
let ready = false;
window.addEventListener('hashchange', () => { if (ready) render(true); });
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main-content')?.focus();
});
function showAuthNotice(message) {
  let notice = document.getElementById('auth-notice');
  if (!notice) {
    notice = document.createElement('p');
    notice.id = 'auth-notice';
    notice.className = 'container demo-notice';
    notice.setAttribute('role', 'alert');
    document.getElementById('app').before(notice);
  }
  notice.textContent = message;
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'history-action auth-notice-retry';
  retry.textContent = '새로고침'; retry.addEventListener('click', () => location.reload()); notice.append(retry);
}

document.getElementById('app').textContent = '로그인 상태를 확인하고 있어요…';
const callbackUrl = new URL(location.href);
const callbackHash = new URLSearchParams(callbackUrl.hash.slice(1));
const callbackError = callbackUrl.searchParams.has('error') || callbackHash.has('error');
try {
  await initializeAuth();
  if (callbackError) showAuthNotice('인증 링크가 만료되었거나 유효하지 않아요. 이메일 인증 상태를 확인하고 로그인해 주세요.');
  else if (callbackUrl.searchParams.has('code')) {
    showAuthNotice(getCurrentMember() ? '이메일 인증이 완료됐어요.' : '이메일 인증 상태를 확인한 뒤 로그인해 주세요.');
  }
} catch (error) { showAuthNotice(error.message); }
// 인증 코드나 오류 값을 주소창에 남기지 않고 해시 라우터를 복원합니다.
if (callbackUrl.searchParams.has('code') || callbackError) {
  ['code', 'error', 'error_code', 'error_description'].forEach(key => callbackUrl.searchParams.delete(key));
  if (!callbackUrl.hash.startsWith('#/')) callbackUrl.hash = getCurrentMember() ? '#/' : '#/login';
  history.replaceState(null, '', callbackUrl);
}
ready = true;
onMemberChange(() => render());
render();
// 품목 조회가 지연돼도 메인·로그인·기록 화면을 먼저 사용할 수 있습니다.
initializeItemCatalog();
