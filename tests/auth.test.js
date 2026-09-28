import test from 'node:test';
import assert from 'node:assert/strict';
import { signup, login, logout, getCurrentMember } from '../src/services/auth.js';

test('가입한 계정으로 로그인, 중복 거절, 재로드 및 저장 실패', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const member = await signup('나의닉네임', ' NEW@example.com ', 'test-password');
  assert.equal(member.email, 'new@example.com');
  assert.equal(JSON.stringify([...values.values()]).includes('test-password'), false);
  assert.equal(await login('new@example.com', 'wrong-password'), null);
  assert.deepEqual(await login('NEW@example.com', 'test-password'), member);
  assert.deepEqual(getCurrentMember(), member);
  await assert.rejects(signup('다른닉네임', 'new@example.com', 'other-password'), /이미 가입/);
  await assert.rejects(signup('다른닉네임', 'demo@example.com', 'other-password'), /이미 가입/);
  logout();
  const reloaded = await import('../src/services/auth.js?signup-refresh');
  assert.deepEqual(await reloaded.login('new@example.com', 'test-password'), member);
  reloaded.logout();
  localStorage.setItem = () => { throw new Error('storage blocked'); };
  await assert.rejects(signup('저장실패', 'blocked@example.com', 'test-password'), /저장하지 못/);
  assert.equal(await login('blocked@example.com', 'test-password'), null);
  delete globalThis.localStorage;
});

test('테스트 회원 일치, 불일치, 로그인 유지 및 로그아웃', async () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  assert.equal(getCurrentMember(), null);
  assert.equal(await login('unknown@example.com', 'recycle1234'), null);
  assert.equal(await login('demo@example.com', 'wrong-password'), null);
  assert.equal(await login('demo@example.com', 'recycle1234 '), null);
  assert.equal(getCurrentMember(), null);
  const member = await login(' DEMO@example.com ', 'recycle1234');
  assert.equal(member.nickname, '새싹');
  assert.equal('password' in member, false);
  assert.deepEqual([...values.values()], ['demo-member']);
  const refreshed = await import('../src/services/auth.js?refresh');
  assert.deepEqual(refreshed.getCurrentMember(), member);
  logout();
  assert.equal(getCurrentMember(), null);
  assert.equal(refreshed.getCurrentMember(), null);
  values.set('recycle-helper.demo-member', 'unknown');
  assert.equal(getCurrentMember(), null);
  delete globalThis.sessionStorage;
  assert.equal((await login('demo@example.com', 'recycle1234')).id, 'demo-member');
  assert.equal(getCurrentMember().id, 'demo-member');
  logout();
  assert.equal(getCurrentMember(), null);
});

