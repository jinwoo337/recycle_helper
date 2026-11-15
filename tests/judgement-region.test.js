import test from 'node:test';
import assert from 'node:assert/strict';
import { readJudgementRegion, rememberJudgementRegion } from '../src/services/judgement-region.js';

const seoul = {province:'서울특별시',district:'강남구'};
const daejeon = {province:'대전광역시',district:'유성구'};
const storage = () => {
  const entries = new Map();
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
};
test('임시 지역을 화면 이동·새로고침 뒤 복원하고 프로필은 변경하지 않는다', () => {
  const store = storage(), member = {id:'a',region:seoul};
  const original = structuredClone(member);
  assert.deepEqual(readJudgementRegion(member, store), seoul);
  rememberJudgementRegion(daejeon, member, store);
  assert.deepEqual(readJudgementRegion(member, store), daejeon);
  assert.deepEqual(member, original);
  assert.deepEqual(readJudgementRegion({...member,region:{...seoul,district:'서초구'}}, store), {province:'서울특별시',district:'서초구'});
});
test('회원·비회원·다른 회원의 지역을 섞지 않고 지역 해제도 기억한다', () => {
  const store = storage(), a = {id:'a',region:seoul}, b = {id:'b',region:seoul};
  rememberJudgementRegion(daejeon, null, store);
  assert.deepEqual(readJudgementRegion(null, store), daejeon);
  assert.deepEqual(readJudgementRegion(a, store), seoul);
  rememberJudgementRegion(daejeon, a, store);
  assert.deepEqual(readJudgementRegion(b, store), seoul);
  rememberJudgementRegion(null, a, store);
  assert.equal(readJudgementRegion(a, store), null);
});
test('잘못된 지역·손상된 저장소·저장소 차단은 프로필 기본값으로 처리한다', () => {
  const member = {id:'a',region:seoul}, store = storage();
  rememberJudgementRegion({province:'서울특별시',district:'없는구'}, member, store);
  assert.equal(store.entries.size, 0);
  const key = 'recycle-helper.judgement-region.v1.a';
  for (const value of ['bad', JSON.stringify({version:1,profile:seoul,region:{province:'서울특별시',district:'없는구'}}), JSON.stringify({version:2,profile:seoul,region:null})]) {
    store.setItem(key,value); assert.deepEqual(readJudgementRegion(member, store), seoul);
  }
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.deepEqual(readJudgementRegion(member,blocked),seoul);
  assert.doesNotThrow(()=>rememberJudgementRegion(daejeon,member,blocked));
});
