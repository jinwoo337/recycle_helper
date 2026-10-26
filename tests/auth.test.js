import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeAuth, signup, login, logout, getCurrentMember, onMemberChange, authError } from '../src/services/auth.js';
import { fakeAuthClient } from './helpers/auth-client.js';

test('세션 복원, 로그인 입력 전달, 실패와 로그아웃 실패 시 기존 세션 유지', async () => {
  const user = { id: 'real-id', email: 'member@example.com', user_metadata: { nickname: '<닉네임>' } };
  const client = fakeAuthClient(user);
  await initializeAuth(client);
  assert.deepEqual(getCurrentMember(), { id: 'real-id', email: user.email, nickname: '<닉네임>' });
  client.auth.signInWithPassword = async args => {
    assert.deepEqual(args, { email: 'member@example.com', password: ' exact-password ' });
    return { error: { code: 'invalid_credentials' } };
  };
  await assert.rejects(login(' MEMBER@example.com ', ' exact-password '), /일치하지/);
  assert.equal(getCurrentMember().id, 'real-id');
  client.auth.signOut = async () => ({ error: { status: 503 } });
  await assert.rejects(logout(), /인증 서버/);
  assert.equal(getCurrentMember().id, 'real-id');
  client.auth.signOut = async () => ({ error: null });
  await logout();
  assert.equal(getCurrentMember(), null);
});

test('가입 입력 검증, 닉네임·복귀 URL 전달, 이메일 인증 대기와 즉시 로그인', async () => {
  globalThis.location = { origin: 'http://127.0.0.1:5173', pathname: '/' };
  const client = fakeAuthClient();
  await initializeAuth(client);
  let request;
  const user = { id: 'new-id', email: 'new@example.com', user_metadata: { nickname: '새싹' } };
  client.auth.signUp = async args => { request = args; return { data: { user, session: null }, error: null }; };
  await assert.rejects(signup('a', 'bad', 'short'), /입력 조건/);
  const waiting = await signup(' 새싹 ', ' NEW@example.com ', 'test-password');
  assert.equal(waiting.requiresEmailConfirmation, true);
  assert.equal(getCurrentMember(), null);
  assert.deepEqual(request, { email: 'new@example.com', password: 'test-password', options: {
    data: { nickname: '새싹' }, emailRedirectTo: 'http://127.0.0.1:5173/',
  } });
  client.auth.signUp = async () => ({ data: { user, session: { user } }, error: null });
  assert.equal((await signup('새싹', user.email, 'test-password')).requiresEmailConfirmation, false);
  assert.equal(getCurrentMember().id, 'new-id');
  await logout();
  delete globalThis.location;
});

test('다른 탭의 로그아웃 반영, 토큰 갱신 시 불필요한 화면 갱신 방지', async () => {
  const client = fakeAuthClient();
  await initializeAuth(client);
  await new Promise(resolve => setTimeout(resolve, 5));
  let changes = 0;
  const off = onMemberChange(() => changes++);
  await login('member@example.com', 'password');
  client.emit('TOKEN_REFRESHED', { id: 'test-member-id', email: 'member@example.com', user_metadata: { nickname: '테스트 회원' } });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(changes, 1);
  client.emit('SIGNED_OUT', null);
  assert.equal(getCurrentMember(), null);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(changes, 2);
  off();
});

test('미인증·요청 제한·회원가입 실패와 세션 복원 실패를 전달한다', async () => {
  const client = fakeAuthClient();
  await initializeAuth(client);
  client.auth.signInWithPassword = async () => ({ error: { code: 'email_not_confirmed' } });
  await assert.rejects(login('a@example.com', 'password'), /이메일 인증/);
  client.auth.signInWithPassword = async () => ({ error: { status: 429 } });
  await assert.rejects(login('a@example.com', 'password'), /요청이 많/);
  globalThis.location = { origin: 'http://127.0.0.1:5173', pathname: '/' };
  client.auth.signUp = async () => ({ error: { code: 'over_email_send_rate_limit' } });
  await assert.rejects(signup('새싹', 'a@example.com', 'password'), /인증 메일 요청/);
  delete globalThis.location;
  client.auth.getSession = async () => ({ error: { status: 503 } });
  await assert.rejects(initializeAuth(client), /인증 서버/);
});

test('인증 오류: 메일 설정·서버 응답·실제 연결 실패를 구분하고 개인정보 원문을 표시하지 않는다', () => {
  assert.match(authError({ code: 'email_address_not_authorized', status: 403 }).message, /SMTP/);
  const failure = authError({ code: 'unexpected_failure', status: 500, message: 'private@example.com SMTP secret' }).message;
  assert.match(failure, /인증 서버/); assert.match(failure, /오류 코드: unexpected_failure/);
  assert.doesNotMatch(failure, /네트워크|private@example|secret/);
  assert.doesNotMatch(authError({ status: 503 }).message, /네트워크/);
  assert.match(authError(new TypeError('Failed to fetch')).message, /네트워크/);
  assert.doesNotMatch(authError({ status: 400, code: 'provider_policy_error' }).message, /네트워크/);
  assert.doesNotMatch(authError({ status: 400, code: '<private>' }).message, /<private>/);
});
