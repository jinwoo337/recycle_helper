import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeAuth, loginWithGoogle, getCurrentMember } from '../src/services/auth.js';
import { SUPABASE_URL, isGoogleLoginEnabled } from '../src/services/supabase.js';
import { rememberGoogleLogin, clearGoogleLogin, consumeGoogleLogin, callbackMessage } from '../src/utils/auth-callback.js';
import { loginPage } from '../src/pages/login/login.js';
import { signupPage } from '../src/pages/signup/signup.js';
import { fakeAuthClient } from './helpers/auth-client.js';

test('Google: 공급자 사전 확인, PKCE OAuth 시작과 같은 사이트 복귀, 로그인 취소·오류 시 기존 세션 유지', async () => {
  const values = new Map();
  globalThis.sessionStorage = { setItem:(k,v)=>values.set(k,v), getItem:k=>values.get(k) ?? null, removeItem:k=>values.delete(k) };
  let destination, calls = 0;
  globalThis.location = { origin: 'https://recyclehelper.vercel.app', pathname: '/', assign:url=>{ destination=url; } };
  const user = { id: 'owner', email: 'member@example.com', user_metadata: { nickname: '기존회원' } };
  const client = fakeAuthClient(user); await initializeAuth(client);
  client.auth.signInWithOAuth = async args => {
    calls++; assert.deepEqual(args, { provider:'google', options:{ redirectTo:'https://recyclehelper.vercel.app/', skipBrowserRedirect:true, queryParams:{prompt:'select_account'} } });
    return { data:{url:`${SUPABASE_URL}/auth/v1/authorize?provider=google&code_challenge=test-only`}, error:null };
  };
  await assert.rejects(loginWithGoogle({checkEnabled:async()=>false}), /설정이 아직/);
  assert.equal(calls, 0); assert.equal(destination, undefined);
  await loginWithGoogle({checkEnabled:async()=>true});
  assert.match(destination, /\/auth\/v1\/authorize\?provider=google/);
  assert.equal(consumeGoogleLogin(), true); assert.equal(consumeGoogleLogin(), false);
  assert.equal(getCurrentMember().id, 'owner');
  client.auth.signInWithOAuth = async () => ({error:{code:'provider_disabled',status:400}});
  await assert.rejects(loginWithGoogle({checkEnabled:async()=>true}), /Google 로그인 설정/);
  assert.equal(getCurrentMember().id, 'owner');
  for (const url of ['https://example.com/steal','javascript:alert(1)',`${SUPABASE_URL}/auth/v1/authorize?provider=github`,undefined]) {
    client.auth.signInWithOAuth = async () => ({data:{url}});
    await assert.rejects(loginWithGoogle({checkEnabled:async()=>true}), /주소를 확인/);
  }
  delete globalThis.location; delete globalThis.sessionStorage;
});
test('Google: 복귀 안내는 성공·지역 미설정·사용자 취소를 구분하고 인증 상태를 단정하지 않는다', () => {
  assert.match(callbackMessage({google:true,member:{region:{}}}), /Google 로그인이 완료/);
  assert.match(callbackMessage({google:true,member:{}}), /마이페이지/);
  assert.match(callbackMessage({google:true,member:null}), /완료하지 못/);
  assert.match(callbackMessage({google:true,error:true}), /취소/);
  assert.doesNotMatch(callbackMessage({google:false,error:true}), /이메일 인증 상태를 확인/);
  assert.match(callbackMessage({google:false,member:{}}), /로그인 또는 이메일 인증/);
  globalThis.sessionStorage = {setItem(){throw new Error('blocked')},getItem(){throw new Error('blocked')},removeItem(){throw new Error('blocked')}};
  assert.doesNotThrow(rememberGoogleLogin); assert.doesNotThrow(clearGoogleLogin); assert.equal(consumeGoogleLogin(),false);
  delete globalThis.sessionStorage;
});
test('Google: 공개 공급자 설정을 확인하며 오류·연결 실패는 사용자 안내로 반환한다', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => { assert.equal(url, `${SUPABASE_URL}/auth/v1/settings`); assert.ok(options.headers.apikey); return {ok:true,json:async()=>({external:{google:true}})}; };
    assert.equal(await isGoogleLoginEnabled(),true);
    globalThis.fetch = async () => ({ok:true,json:async()=>({external:{google:false}})});
    assert.equal(await isGoogleLoginEnabled(),false);
    globalThis.fetch = async () => ({ok:false}); await assert.rejects(isGoogleLoginEnabled(), /설정을 확인하지 못/);
    globalThis.fetch = async () => {throw new TypeError('Failed to fetch')}; await assert.rejects(isGoogleLoginEnabled(), /네트워크/);
  } finally { globalThis.fetch=previous; }
});
test('Google: 로그인·가입 화면에 두 가지 인증 방법이 있고 Google 이름을 닉네임 기본값으로 복원한다', async () => {
  for (const markup of [loginPage(),signupPage()]) { assert.match(markup,/Google로 계속하기/); assert.match(markup,/name="email"/); assert.match(markup,/name="password"/); assert.match(markup,/type="button" data-google-login/); }
  await initializeAuth(fakeAuthClient({id:'google-owner',email:'google@example.com',user_metadata:{full_name:'구글 사용자'}}));
  assert.equal(getCurrentMember().nickname,'구글 사용자');
});
