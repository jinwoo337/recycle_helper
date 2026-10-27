import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRegion, regionLabel, PROVINCES, REGIONAL_SOURCES } from '../src/domain/disposal/regions.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { initializeAuth, signup, updateProfile, getCurrentMember } from '../src/services/auth.js';
import { fakeAuthClient } from './helpers/auth-client.js';
import { validRecord } from '../src/services/disposal-history.js';
import { DAEJEON_DISTRICTS } from '../src/domain/disposal/daejeon-guides.js';
import { profilePage } from '../src/pages/profile/profile.js';

const gimpo = { province: '경기도', district: '김포시' };
const geumcheon = { province: '서울특별시', district: '금천구' };
test('지역: 17개 시도, 서울 자치구, 세종, 상세주소·비정상 값 검증', () => {
  assert.equal(PROVINCES.length, 17);
  assert.deepEqual(normalizeRegion({ ...gimpo, district: ' 김포시 ' }), gimpo);
  assert.deepEqual(normalizeRegion({ province: '세종특별자치시', district: '어떤 값' }), { province: '세종특별자치시', district: '' });
  for (const value of [null, {}, { province: '가짜시', district: '금천구' }, { ...geumcheon, district: '김포시' }, { ...gimpo, district: '<script>' }, { ...gimpo, district: '주소 123' }]) assert.equal(normalizeRegion(value), null);
  assert.equal(regionLabel(geumcheon), '서울특별시 금천구');
});
test('지역: 김포 깨진 유리 전용마대 기준, 다른 지역/이름충돌/위험품/복합재질은 미적용', () => {
  const input = { itemName: '깨진유리', material: '유리', type: 'broken', region: gimpo };
  const result = judgeDisposal(input);
  assert.match(result.method, /백색마대/);
  assert.equal(result.regional.coverage, 'verified');
  assert.match(result.parts[0].method, /백색마대/);
  assert.ok(result.regional.sources.includes(REGIONAL_SOURCES.gimpoWaste));
  const seoul = judgeDisposal({ ...input, region: geumcheon });
  assert.equal(seoul.regional.coverage, 'verified');
  assert.equal(seoul.regional.scope, 'city');
  assert.doesNotMatch(seoul.method, /백색마대/);
  for (const altered of [{ ...input, itemName: '건전지' }, { ...input, itemName: '모르는유리' }, { ...input, combined: 'yes' }, { ...input, type: 'bottle' }]) {
    const other = judgeDisposal(altered);
    assert.equal(other.regional.coverage, 'unverified');
    assert.doesNotMatch(other.method, /백색마대/);
  }
});
test('지역: 금천 음식물·김포 투명페트병에만 검증 안내를 표시하고 오염/정보 누락을 넘기지 않는다', () => {
  const food = { itemName: '사과껍질', material: '음식물류', type: 'soft', foodSeparated: 'yes', region: geumcheon };
  assert.equal(judgeDisposal(food).regional.coverage, 'verified');
  assert.equal(judgeDisposal({ ...food, foodSeparated: 'no' }).regional.coverage, 'unverified');
  const pet = { itemName: '투명생수병', material: '페트병', type: 'clear-drink', contaminated: 'no', combined: 'no', region: gimpo };
  const result = judgeDisposal(pet);
  assert.equal(result.regional.coverage, 'verified');
  assert.equal(judgeDisposal({ ...pet, contaminated: '' }).regional.coverage, 'unverified');
  const fallback = judgeDisposal({ ...pet, region: { province: '부산광역시', district: '해운대구' } });
  assert.equal(fallback.regional.coverage, 'unverified');
  assert.match(fallback.regional.notes[0], /검증하지 못/);
  assert.match(resultToText(pet, result), /경기도 김포시/);
});
test('지역: 판별 당시 스냅샷은 지역 변경 이후에도 유지되며 기존 기록 형식과 호환된다', () => {
  const input = { itemName: '깨진유리', material: '유리', type: 'broken', region: gimpo };
  const result = judgeDisposal(input);
  input.region = geumcheon;
  assert.deepEqual(result.region, gimpo);
  const record = { schemaVersion: 2, id: 'id', itemName: input.itemName, input, result, createdAt: new Date().toISOString() };
  assert.equal(validRecord(record), true);
  const prior = structuredClone(record); delete prior.input.region; delete prior.result.region; delete prior.result.regional;
  assert.equal(validRecord(prior), true);
  const malformed = structuredClone(record); malformed.result.regional.notes = null;
  assert.equal(validRecord(malformed), false);
});
test('대전: 5개 구의 재활용·음식물 출처, 유성 크린넷 예외, 서구 깨진 유리를 구분한다', () => {
  for (const district of DAEJEON_DISTRICTS) {
    const region = { province: '대전광역시', district };
    assert.deepEqual(normalizeRegion(region), region);
    const paper = judgeDisposal({ itemName: '신문지', material: '종이', type: 'paper', contaminated: 'no', combined: 'no', region });
    assert.equal(paper.regional.coverage, 'verified', district);
    assert.equal(paper.regional.label, `대전광역시 ${district}`);
    const food = judgeDisposal({ itemName: '밥', material: '음식물류', type: 'soft', foodSeparated: 'yes', region });
    assert.equal(food.regional.coverage, 'verified', district);
    assert.equal(food.regional.sources.length, 1);
    assert.doesNotMatch(food.steps.join(), /전용 봉투·전용 용기·RFID/);
    if (district === '유성구') assert.match(food.regional.notes.join(), /자동크린넷/);
    const glass = judgeDisposal({ itemName: '깨진유리', material: '유리', type: 'broken', region });
    assert.equal(glass.regional.coverage, district === '서구' ? 'verified' : 'unverified');
    if (district === '서구') { assert.equal(glass.status, 'general'); assert.match(glass.method, /종량제/); }
    const unsafe = judgeDisposal({ itemName: '스프레이', material: '금속·캔', type: 'food-can', region });
    assert.equal(unsafe.status, 'check'); assert.equal(unsafe.regional.coverage, 'unverified');
  }
  assert.equal(normalizeRegion({ province: '대전광역시', district: '금천구' }), null);
  const foam = judgeDisposal({ itemName: '스티로폼상자', material: '스티로폼', type: 'packaging', contaminated: 'no', combined: 'no', region: { province: '대전광역시', district: '유성구' } });
  assert.equal(foam.status, 'check'); assert.match(foam.method, /색상/);
});
test('마이페이지: 비회원 로그인 안내, 기존 회원 지역 설정과 HTML 이스케이프', () => {
  assert.match(profilePage(null), /로그인해 주세요/);
  const markup = profilePage({ id: 'x', nickname: '<새싹>', email: 'a@example.com', region: gimpo });
  assert.match(markup, /&lt;새싹&gt;/); assert.match(markup, /value="김포시"/);
  assert.match(markup, /경기도<\/option>/); assert.doesNotMatch(markup, /<새싹>/);
});
test('회원: 가입 지역 전달, 회원 정보 저장·복원, 실패 및 계정 전환 시 보호', async () => {
  globalThis.location = { origin: 'http://localhost', pathname: '/' };
  const user = { id: 'member-a', email: 'a@example.com', user_metadata: { nickname: '새싹', region: gimpo } };
  const client = fakeAuthClient(user);
  await initializeAuth(client);
  assert.deepEqual(getCurrentMember().region, gimpo);
  client.auth.signUp = async args => { assert.deepEqual(args.options.data.region, geumcheon); return { data: { user, session: null }, error: null }; };
  await signup('새싹', user.email, 'test-password', geumcheon);
  await assert.rejects(signup('새싹', user.email, 'test-password', {}), /지역/);
  await initializeAuth(client);
  client.auth.updateUser = async args => ({ data: { user: { ...user, user_metadata: args.data } }, error: null });
  await updateProfile('새이름', geumcheon);
  assert.equal(getCurrentMember().nickname, '새이름'); assert.deepEqual(getCurrentMember().region, geumcheon);
  client.auth.updateUser = async () => ({ error: { status: 503 } });
  await assert.rejects(updateProfile('새이름', gimpo), /인증 서버/);
  assert.deepEqual(getCurrentMember().region, geumcheon);
  await assert.rejects(updateProfile('a', gimpo), /닉네임/);
  client.auth.updateUser = async () => { client.emit('SIGNED_IN', { ...user, id: 'member-b' }); return { data: { user }, error: null }; };
  await assert.rejects(updateProfile('새이름', gimpo), /계정이 변경/);
  assert.equal(getCurrentMember().id, 'member-b');
  client.emit('SIGNED_OUT', null);
  await assert.rejects(updateProfile('새이름', gimpo), /로그인/);
  delete globalThis.location;
});
