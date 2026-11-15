import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthCallback, cleanAuthCallbackUrl } from '../src/utils/auth-callback.js';

test('인증 콜백의 코드·오류·토큰을 정리하고 일반 화면 주소는 구분한다', () => {
  for (const query of ['?code=test-only', '?error=access_denied', '#access_token=test-only&refresh_token=test-only&expires_in=3600', '?token_hash=test-only']) {
    const parsed = parseAuthCallback(`https://example.com/${query}`);
    assert.equal(parsed.hasCallback,true);
    const clean = cleanAuthCallbackUrl(parsed.url,{member:{id:'owner',region:{}}});
    assert.equal(clean.search,''); assert.equal(clean.hash,'#/');
    assert.doesNotMatch(clean.href,/test-only|access_token|refresh_token/);
  }
  const normal = parseAuthCallback('https://example.com/#/guide?material=vinyl');
  assert.equal(normal.hasCallback,false); assert.equal(normal.error,false);
});
test('인증된 복구·Google 첫 로그인·실패에 맞는 내부 화면만 선택한다', () => {
  const url='https://example.com/?code=test-only&utm_source=test#access_token=test-only';
  const member={id:'owner'};
  const recovery=cleanAuthCallbackUrl(url,{member,google:true,recovery:true});
  assert.equal(recovery.hash,'#/reset-password'); assert.equal(recovery.search,'?utm_source=test');
  assert.equal(cleanAuthCallbackUrl(url,{member,google:true}).hash,'#/profile');
  assert.equal(cleanAuthCallbackUrl(url,{member:null,google:true,recovery:true}).hash,'#/login');
  assert.equal(cleanAuthCallbackUrl(url,{member,error:true,recovery:true}).hash,'#/');
  assert.equal(cleanAuthCallbackUrl('https://example.com/?code=test-only#/guide?material=glass',{member}).hash,'#/guide?material=glass');
});
