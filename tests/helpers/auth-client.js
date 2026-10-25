// 실제 서버나 공개 데모 계정을 사용하지 않는 인증 테스트 대역입니다.
export function fakeAuthClient(initialUser = null) {
  let user = initialUser;
  let callback;
  const fixture = { id: 'test-member-id', email: 'member@example.com', user_metadata: { nickname: '테스트 회원' } };
  return { auth: {
    async getSession() { return { data: { session: user ? { user } : null }, error: null }; },
    onAuthStateChange(listener) { callback = listener; return { data: { subscription: { unsubscribe() { callback = undefined; } } } }; },
    async signInWithPassword() { user = fixture; callback?.('SIGNED_IN', { user }); return { data: { user, session: { user } }, error: null }; },
    async signOut() { user = null; callback?.('SIGNED_OUT', null); return { error: null }; },
  }, emit(event, nextUser) { user = nextUser; callback?.(event, user ? { user } : null); } };
}
