import { getSupabase } from './supabase.js';

let auth;
let currentMember = null;
let subscription;
let initialized = false;
const listeners = new Set();

function publicMember(user) {
  if (!user) return null;
  const nickname = user.user_metadata?.nickname;
  return { id: user.id, email: user.email || '',
    nickname: typeof nickname === 'string' && nickname.trim() ? nickname : '회원' };
}

function updateMember(user) {
  const next = publicMember(user);
  if (JSON.stringify(currentMember) === JSON.stringify(next)) return;
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
    signup_disabled: '현재 신규 회원가입이 중단되어 있어요.',
    email_address_invalid: '사용 가능한 이메일 주소를 입력해 주세요.',
    email_address_not_authorized: '현재 메일 발송 설정으로는 이 주소에 인증 메일을 보낼 수 없어요. 운영자의 SMTP 설정이 필요해요.',
    over_email_send_rate_limit: '인증 메일 요청이 많아요. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
  };
  return new Error(messages[error?.code] || (error?.status === 429
    ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
    : '인증 요청을 처리하지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.'));
}

export async function initializeAuth(client) {
  initialized = false;
  const selected = client || await getSupabase();
  const { data, error } = await selected.auth.getSession();
  if (error) throw authError(error);
  subscription?.unsubscribe();
  auth = selected.auth;
  updateMember(data.session?.user);
  ({ data: { subscription } } = auth.onAuthStateChange((_event, session) => updateMember(session?.user)));
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

export async function signup(nickname, email, password) {
  nickname = nickname.trim();
  email = email.trim().toLowerCase();
  if (nickname.length < 2 || nickname.length > 20 || !/^[^\s@]+@[^\s@]+$/.test(email) || password.length < 8) {
    throw new Error('닉네임, 이메일, 비밀번호 입력 조건을 확인해 주세요.');
  }
  const api = await requireAuth();
  const { data, error } = await api.signUp({ email, password, options: {
    data: { nickname }, emailRedirectTo: `${location.origin}${location.pathname}`,
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
  updateMember(null);
}
