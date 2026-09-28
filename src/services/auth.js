// 화면 동작 확인을 위한 공개 테스트 계정입니다. 실제 인증에 사용하지 않습니다.
const members = [
  { id: 'demo-member', nickname: '새싹', email: 'demo@example.com', password: 'recycle1234' },
];
const sessionKey = 'recycle-helper.demo-member';
const membersKey = 'recycle-helper.members.v1';
let currentMemberId = null;

function savedMembers() {
  try {
    const data = JSON.parse(localStorage.getItem(membersKey) || '[]');
    return Array.isArray(data) ? data.filter(member =>
      typeof member.id === 'string' && typeof member.nickname === 'string' &&
      typeof member.email === 'string' && typeof member.salt === 'string' &&
      typeof member.passwordHash === 'string') : [];
  } catch { return []; }
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function signup(nickname, email, password) {
  email = email.trim().toLowerCase();
  nickname = nickname.trim();
  if (nickname.length < 2 || nickname.length > 20 || !/^[^\s@]+@[^\s@]+$/.test(email) || password.length < 8) {
    throw new Error('닉네임, 이메일, 비밀번호 입력 조건을 확인해 주세요.');
  }
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const saved = savedMembers();
  if ([...members, ...saved].some(member => member.email === email)) {
    throw new Error('이미 가입된 이메일이에요. 로그인해 주세요.');
  }
  const member = { id: crypto.randomUUID(), nickname, email, salt, passwordHash };
  try { localStorage.setItem(membersKey, JSON.stringify([...saved, member])); }
  catch { throw new Error('회원 정보를 저장하지 못했어요. 브라우저 저장소 설정을 확인한 뒤 다시 시도해 주세요.'); }
  return publicMember(member);
}

function publicMember(member) {
  return member ? { id: member.id, nickname: member.nickname, email: member.email } : null;
}

export function getCurrentMember() {
  try { currentMemberId = sessionStorage.getItem(sessionKey); } catch { /* 저장소가 차단되면 메모리 상태 사용 */ }
  return publicMember([...members, ...savedMembers()].find(member => member.id === currentMemberId));
}

export async function login(email, password) {
  const member = [...members, ...savedMembers()].find(member => member.email === email.trim().toLowerCase());
  if (!member) return null;
  const matches = member.passwordHash ? await hashPassword(password, member.salt) === member.passwordHash : member.password === password;
  if (!matches) return null;
  currentMemberId = member.id;
  try { sessionStorage.setItem(sessionKey, member.id); } catch { /* 현재 페이지에서는 로그인 유지 */ }
  return publicMember(member);
}

export function logout() {
  currentMemberId = null;
  try { sessionStorage.removeItem(sessionKey); } catch { /* 메모리 상태는 이미 해제됨 */ }
}
