import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeAuth, isPasswordRecovery, requestPasswordReset, resetPassword, getCurrentMember } from '../src/services/auth.js';
import { rememberPasswordRecovery, hasPasswordRecovery, clearPasswordRecovery } from '../src/utils/password-recovery.js';
import { forgotPasswordPage, resetPasswordPage, submitForgotPassword, submitResetPassword } from '../src/pages/password/password.js';
import { fakeAuthClient } from './helpers/auth-client.js';

const member = {id:'recovery-owner',email:'member@example.com',user_metadata:{nickname:'회원'}};
function store() {
  const entries = new Map();
  return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
}

test('복구 표시는 같은 탭·계정·15분 이내에서만 유효하고 저장소가 막혀도 실패하지 않는다', () => {
  const storage = store(), now = 1_000_000;
  rememberPasswordRecovery('a',storage,now);
  assert.equal(hasPasswordRecovery('a',storage,now),true);
  assert.equal(hasPasswordRecovery('b',storage,now),false);
  assert.equal(hasPasswordRecovery('a',storage,now-1),false);
  assert.equal(hasPasswordRecovery('a',storage,now+15*60*1000),false);
  clearPasswordRecovery(storage); assert.equal(hasPasswordRecovery('a',storage,now),false);
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  assert.doesNotThrow(()=>rememberPasswordRecovery('a',blocked,now));
  assert.equal(hasPasswordRecovery('a',blocked,now),false);
  assert.doesNotThrow(()=>clearPasswordRecovery(blocked));
});

test('재설정 메일 요청은 이메일을 검증·정규화하고 외부 복귀 주소를 받지 않는다', async () => {
  globalThis.location = {origin:'https://recyclehelper.vercel.app',pathname:'/'};
  const client = fakeAuthClient(); let calls = 0;
  client.auth.resetPasswordForEmail = async (email,options)=>{
    calls++; assert.equal(email,'member@example.com');
    assert.deepEqual(options,{redirectTo:'https://recyclehelper.vercel.app/'});
    return {data:{},error:null};
  };
  try {
    await initializeAuth(client);
    await assert.rejects(requestPasswordReset('invalid'),/이메일/);
    assert.equal(calls,0);
    await requestPasswordReset(' MEMBER@example.com '); assert.equal(calls,1);
    const status = {};
    await submitForgotPassword({isConnected:true,elements:{namedItem:()=>({value:'member@example.com'})}},status);
    assert.match(status.textContent,/등록된 이메일이라면/);
    assert.equal(getCurrentMember(),null);
    client.auth.resetPasswordForEmail=async()=>({error:{code:'over_email_send_rate_limit'}});
    await assert.rejects(requestPasswordReset('member@example.com'),/인증 메일 요청/);
  } finally { delete globalThis.location; }
});

test('이메일 복구 인증 없이 로그인만 한 경우는 새 비밀번호 저장을 차단한다', async () => {
  const client = fakeAuthClient(member); let calls=0;
  client.auth.updateUser=async()=>{calls++;return {data:{user:member},error:null};};
  await initializeAuth(client);
  assert.equal(isPasswordRecovery(),false);
  assert.doesNotMatch(resetPasswordPage(),/id="reset-password-form"/);
  await assert.rejects(resetPassword('new-test-password'),/재설정 링크/);
  assert.equal(calls,0);
});

test('초기 세션 조회 중 PASSWORD_RECOVERY 이벤트를 놓치지 않고 성공 후 복구 상태를 해제한다', async () => {
  globalThis.sessionStorage=store();
  const client = fakeAuthClient(); let changed=0;
  client.auth.getSession=async()=>{client.emit('PASSWORD_RECOVERY',member);return {data:{session:{user:member}},error:null};};
  client.auth.updateUser=async args=>{changed++;assert.deepEqual(args,{password:' new-test-password '});return {data:{user:member},error:null};};
  try {
    await initializeAuth(client); assert.equal(isPasswordRecovery(),true);
    assert.match(resetPasswordPage(),/autocomplete="new-password"/);
    await assert.rejects(resetPassword('short'),/8자/); assert.equal(changed,0);
    await resetPassword(' new-test-password ');
    assert.equal(changed,1); assert.equal(isPasswordRecovery(),false);
    assert.equal(getCurrentMember().id,member.id);
    await assert.rejects(resetPassword('another-password'),/재설정 링크/);
  } finally { delete globalThis.sessionStorage; }
});

test('복구 중 계정 변경·만료·서버 거절을 구분하고 입력한 비밀번호를 비운다', async () => {
  const client = fakeAuthClient(member); await initializeAuth(client);
  client.emit('PASSWORD_RECOVERY',member);
  client.auth.updateUser=async()=>({error:{code:'same_password'}});
  const fields={password:{value:'another-password'},'password-confirm':{value:'another-password'}};
  await assert.rejects(submitResetPassword({elements:{namedItem:name=>fields[name]}},{}),/이전과 다른/);
  assert.equal(fields.password.value,''); assert.equal(fields['password-confirm'].value,'');
  assert.equal(isPasswordRecovery(),true);
  client.auth.updateUser=async()=>{client.emit('SIGNED_IN',{...member,id:'another-owner'});return {data:{user:member},error:null};};
  await assert.rejects(resetPassword('another-password'),/계정이 변경/);
  assert.equal(isPasswordRecovery(),false);
  const realNow=Date.now;
  try {
    let now=realNow(); Date.now=()=>now;
    client.emit('PASSWORD_RECOVERY',member); assert.equal(isPasswordRecovery(),true);
    now+=15*60*1000+1; assert.equal(isPasswordRecovery(),false);
  } finally { Date.now=realNow; }
});

test('요청 화면에는 계정 존재 여부나 비밀번호를 미리 노출하지 않는다', () => {
  const markup=forgotPasswordPage();
  assert.match(markup,/id="forgot-password-form"/);
  assert.match(markup,/같은|요청한 브라우저/);
  assert.doesNotMatch(markup,/name="password"|member@example.com/);
});

test('초기 세션 응답보다 나중의 인증 이벤트를 우선하고 오래된 초기화는 계정을 덮지 않는다', async () => {
  const recovery=fakeAuthClient();
  recovery.auth.getSession=async()=>{recovery.emit('PASSWORD_RECOVERY',member);return {data:{session:null},error:null};};
  await initializeAuth(recovery);
  assert.equal(getCurrentMember().id,member.id);assert.equal(isPasswordRecovery(),true);
  let finishOld;
  const old=fakeAuthClient({ ...member,id:'old-owner'});
  old.auth.getSession=()=>new Promise(resolve=>{finishOld=resolve;});
  const oldTask=initializeAuth(old);
  const latest={...member,id:'latest-owner'};
  await initializeAuth(fakeAuthClient(latest));
  finishOld({data:{session:{user:{...member,id:'old-owner'}}},error:null});
  await assert.rejects(oldTask,/확인 요청이 변경/);
  assert.equal(getCurrentMember().id,'latest-owner');assert.equal(isPasswordRecovery(),false);
});
