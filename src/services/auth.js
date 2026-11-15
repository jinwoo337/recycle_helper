import { getSupabase, isGoogleLoginEnabled, SUPABASE_URL } from './supabase.js';
import { rememberGoogleLogin, clearGoogleLogin } from '../utils/auth-callback.js';
import { normalizeRegion } from '../domain/disposal/regions.js';
import { rememberPasswordRecovery, hasPasswordRecovery, clearPasswordRecovery } from '../utils/password-recovery.js';

let auth;
let currentMember = null;
let subscription;
let initialized = false;
let initializationVersion = 0;
let recoveryFor = null;
let recoveryUntil = 0;
const listeners = new Set();
function clearRecoveryState() { recoveryFor = null; recoveryUntil = 0; clearPasswordRecovery(); }

function publicMember(user) {
  if (!user) return null;
  const nickname = user.user_metadata?.nickname || user.user_metadata?.full_name || user.user_metadata?.name;
  const region = normalizeRegion(user.user_metadata?.region);
  return { id: user.id, email: user.email || '', ...(region ? { region } : {}),
    nickname: typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 20) : '회원' };
}

function updateMember(user, force = false) {
  const next = publicMember(user);
  if (JSON.stringify(currentMember) === JSON.stringify(next) && !force) return;
  currentMember = next;
  // 인증 이벤트 안에서 다른 인증 API를 호출하지 않도록 화면 갱신은 다음 작업으로 미룹니다.
  setTimeout(() => listeners.forEach(listener => listener()), 0);
}

export function authError(error) {
  const messages = {
    invalid_credentials: '이메일 또는 비밀번호가 일치하지 않아요.',
    email_not_confirmed: '이메일 인증이 필요해요. 가입할 때 받은 인증 메일을 확인해 주세요.',
    user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
    weak_password: '더 안전한 비밀번호를 입력해 주세요.',
    same_password: '이전과 다른 새 비밀번호를 입력해 주세요.',
    otp_expired: '인증 링크가 만료됐어요. 새 재설정 링크를 요청해 주세요.',
    flow_state_expired: '인증 시간이 지났어요. 같은 브라우저에서 새 재설정 링크를 요청해 주세요.',
    flow_state_not_found: '인증을 시작한 브라우저에서 링크를 열어 주세요. 계속되면 새 링크를 요청해 주세요.',
    session_not_found: '인증 세션이 만료됐어요. 새 재설정 링크를 요청해 주세요.',
    reauthentication_needed: '다시 인증해야 해요. 새 재설정 링크를 요청해 주세요.',
    signup_disabled: '현재 신규 회원가입이 중단되어 있어요.',
    email_address_invalid: '사용 가능한 이메일 주소를 입력해 주세요.',
    email_address_not_authorized: '현재 메일 발송 설정으로는 이 주소에 인증 메일을 보낼 수 없어요. 운영자의 SMTP 설정이 필요해요.',
    email_provider_disabled: '현재 이메일 가입·로그인이 비활성화되어 있어요. 운영자의 인증 설정 확인이 필요해요.',
    provider_disabled: 'Google 로그인 설정이 아직 완료되지 않았어요. 이메일 로그인을 이용하거나 잠시 후 다시 시도해 주세요.',
    oauth_provider_not_supported: 'Google 로그인 공급자 설정을 확인해 주세요.',
    unexpected_failure: '인증 서버에서 오류가 발생했어요. 잠시 후 다시 시도하고, 계속되면 운영자의 인증 로그·메일 발송 설정 확인이 필요해요.',
    request_timeout: '인증 서버의 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.',
    over_email_send_rate_limit: '인증 메일 요청이 많아요. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
  };
  const message = messages[error?.code] || (error?.status === 429
    ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
    : error?.status >= 500
      ? '인증 서버에서 오류가 발생했어요. 잠시 후 다시 시도하고, 계속되면 운영자에게 알려주세요.'
      : error?.status >= 400 || error?.code
        ? '인증 요청을 처리하지 못했어요. 입력 내용 또는 서비스 인증 설정을 확인해 주세요.'
        : '인증 서버에 연결하지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.');
  // 이메일·서버 원문·개인정보는 노출하지 않고 지원 요청에 필요한 코드만 표시합니다.
  const code = typeof error?.code === 'string' && /^[a-z0-9_]{1,80}$/.test(error.code) ? error.code : '';
  return new Error(`${message}${code && !['invalid_credentials', 'email_not_confirmed', 'weak_password', 'user_already_exists'].includes(code) ? ` (오류 코드: ${code})` : ''}`);
}

export async function initializeAuth(client) {
  const version = ++initializationVersion;
  initialized = false;
  const selected = client || await getSupabase();
  if (version !== initializationVersion) throw new Error('인증 상태 확인 요청이 변경됐어요. 다시 시도해 주세요.');
  subscription?.unsubscribe();
  auth = selected.auth;
  let observedEvent = false;
  ({ data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (version !== initializationVersion) return;
    observedEvent = true;
    const id = session?.user?.id;
    if (event === 'PASSWORD_RECOVERY' && id) {
      recoveryFor = id; recoveryUntil = Date.now() + 15 * 60 * 1000; rememberPasswordRecovery(id);
    } else if (!id || event === 'SIGNED_IN' || (currentMember && currentMember.id !== id)) {
      clearRecoveryState();
    }
    updateMember(session?.user, event === 'PASSWORD_RECOVERY');
  }));
  const { data, error } = await auth.getSession();
  if (version !== initializationVersion) throw new Error('인증 상태 확인 요청이 변경됐어요. 다시 시도해 주세요.');
  if (error) { subscription?.unsubscribe(); throw authError(error); }
  if (!observedEvent) updateMember(data.session?.user);
  if (!currentMember || (recoveryFor && recoveryFor !== currentMember.id)) clearRecoveryState();
  initialized = true;
}

export function isAuthReady() { return initialized; }

async function requireAuth() {
  if (!auth || !initialized) await initializeAuth();
  return auth;
}

export function onMemberChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentMember() { return currentMember; }
export function isPasswordRecovery() { return Boolean(initialized && currentMember && ((recoveryFor === currentMember.id && Date.now() < recoveryUntil) || hasPasswordRecovery(currentMember.id))); }

export async function requestPasswordReset(email) {
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('올바른 이메일 주소를 입력해 주세요.');
  const api = await requireAuth();
  const { error } = await api.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}${location.pathname}` });
  if (error) throw authError(error);
}

export async function resetPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || !password.trim()) throw new Error('새 비밀번호는 8자 이상으로 입력해 주세요.');
  const api = await requireAuth();
  const owner = currentMember?.id;
  if (!owner || !isPasswordRecovery()) throw new Error('재설정 링크의 인증이 필요해요. 같은 브라우저에서 새 링크를 열어 주세요.');
  const { data, error } = await api.updateUser({ password });
  if (error) throw authError(error);
  if (currentMember?.id !== owner || data?.user?.id !== owner) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 확인해 주세요.');
  clearRecoveryState(); updateMember(data.user);
}

export async function signup(nickname, email, password, region) {
  nickname = nickname.trim();
  email = email.trim().toLowerCase();
  if (nickname.length < 2 || nickname.length > 20 || !/^[^\s@]+@[^\s@]+$/.test(email) || password.length < 8) {
    throw new Error('닉네임, 이메일, 비밀번호 입력 조건을 확인해 주세요.');
  }
  const api = await requireAuth();
  if (region !== undefined && !normalizeRegion(region)) throw new Error('분리배출 지역을 확인해 주세요.');
  const { data, error } = await api.signUp({ email, password, options: {
    data: { nickname, ...(region ? { region: normalizeRegion(region) } : {}) }, emailRedirectTo: `${location.origin}${location.pathname}`,
  } });
  if (error) throw authError(error);
  updateMember(data.session?.user);
  // 중복 이메일도 동일한 응답일 수 있으므로 계정 생성 여부를 단정하지 않습니다.
  return { member: publicMember(data.user), requiresEmailConfirmation: !data.session };
}

export async function login(email, password) {
  const api = await requireAuth();
  const { data, error } = await api.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw authError(error);
  updateMember(data.session?.user);
  return getCurrentMember();
}

export async function logout() {
  if (!auth) return;
  const { error } = await auth.signOut({ scope: 'local' });
  if (error) throw authError(error);
  clearRecoveryState();
  updateMember(null);
}

export async function loginWithGoogle({ checkEnabled = isGoogleLoginEnabled } = {}) {
  const api = await requireAuth();
  if (!await checkEnabled()) throw new Error('Google 로그인 설정이 아직 완료되지 않았어요. 기존 이메일·비밀번호로 로그인할 수 있어요.');
  const { data, error } = await api.signInWithOAuth({ provider: 'google', options: {
    redirectTo: `${location.origin}${location.pathname}`,
    skipBrowserRedirect: true,
    queryParams: { prompt: 'select_account' },
  } });
  if (error) throw authError(error);
  let url;
  try { url = new URL(data?.url); } catch { throw new Error('Google 로그인 주소를 확인하지 못했어요. 다시 시도해 주세요.'); }
  if (url.origin !== SUPABASE_URL || url.pathname !== '/auth/v1/authorize' || url.searchParams.get('provider') !== 'google') {
    throw new Error('Google 로그인 주소를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  rememberGoogleLogin();
  try { location.assign(url.href); }
  catch { clearGoogleLogin(); throw new Error('Google 로그인 화면을 열지 못했어요. 브라우저 설정을 확인해 주세요.'); }
}

export async function updateProfile(nickname, region) {
  nickname = nickname.trim();
  const normalized = normalizeRegion(region);
  if (nickname.length < 2 || nickname.length > 20 || !normalized) throw new Error('닉네임과 분리배출 지역을 확인해 주세요.');
  const api = await requireAuth();
  const owner = currentMember?.id;
  if (!owner) throw new Error('로그인한 뒤 회원 정보를 변경해 주세요.');
  const { data, error } = await api.updateUser({ data: { nickname, region: normalized } });
  if (error) throw authError(error);
  if (currentMember?.id !== owner || data.user?.id !== owner) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 확인해 주세요.');
  updateMember(data.user);
  return getCurrentMember();
}
