import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecentItems, saveRecentItem } from '../src/services/recent-items.js';
import { login, logout } from '../src/services/auth.js';

test('최근 이름은 브라우저에 저장되고 계정별로 구분된다', async () => {
  const stored = new Map();
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const session = new Map();
  globalThis.sessionStorage = {
    getItem: key => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, value),
    removeItem: key => session.delete(key),
  };
  assert.deepEqual(getRecentItems(), []);
  saveRecentItem('  생수병  ');
  saveRecentItem('우유팩');
  saveRecentItem('생수병');
  assert.deepEqual(getRecentItems(), ['생수병', '우유팩']);
  for (let index = 0; index < 10; index++) saveRecentItem(`물건 ${index}`);
  assert.equal(getRecentItems().length, 8);
  assert.equal(getRecentItems()[0], '물건 9');
  assert.deepEqual((await import('../src/services/recent-items.js?refresh')).getRecentItems(), getRecentItems());
  await login('demo@example.com', 'recycle1234');
  assert.deepEqual(getRecentItems(), []);
  saveRecentItem('유리병');
  assert.deepEqual(getRecentItems(), ['유리병']);
  logout();
  assert.equal(getRecentItems()[0], '물건 9');
  localStorage.setItem = () => { throw new Error('blocked'); };
  assert.throws(() => saveRecentItem('종이컵'), /저장하지 못/);
});
