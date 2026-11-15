import { fetchWithTimeout } from '../utils/network.js';
import { cleanAiName, validateAiGuess } from '../domain/disposal/ai-classification.js';
import { verifiedNameGuide } from '../domain/disposal/verified-name-guide.js';

const memory = new Map();
const reported = new Set(); // 신고한 이름은 브라우저 캐시를 피해 새로 묻습니다.
const REQUEST_VERSION = '2026-11-13.item-category-v2';
const messages = {
  400: '물건 이름은 40자 이내로 입력해 주세요.',
  429: 'AI 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  503: 'AI 안내가 아직 설정되지 않았어요. 아는 재질이나 포장재 표시로 이어서 확인할 수 있어요.',
};

// 미등록 물품 이름을 서버 함수로 보내 AI 추정값을 받습니다. 회원 정보는 보내지 않습니다.
// 같은 이름은 진행 중인 요청을 함께 기다리고(미리 조회와 판별), 실패하면 다음에 다시 요청합니다.
// opinion: 등록된 품목도 AI 의견을 받아 화면에 참고로만 보여 줍니다.
// shared: AI 없이 공용 저장소의 답만 찾습니다.
export async function requestAiGuess(itemName, fetcher = fetchWithTimeout, { opinion = false, state = '', shared = false, identify = false, signal } = {}) {
  const name = cleanAiName(itemName);
  if (!name) throw new Error(messages[400]);
  if (verifiedNameGuide(name)) return null;
  const mode = shared ? 'shared' : opinion ? 'opinion' : identify ? 'identify' : '';
  const key = `${REQUEST_VERSION}|${mode}:${name.toLowerCase()}|${state}`;
  if (signal?.aborted) throw signal.reason;
  if (memory.has(key)) return memory.get(key);
  if (signal) return fetchAiGuess(name, fetcher, mode, state, signal).then(guess => {
    if (!signal.aborted && guess) memory.set(key, Promise.resolve(guess));
    return guess;
  });
  const pending = fetchAiGuess(name, fetcher, mode, state);
  memory.set(key, pending);
  pending.catch(() => { if (memory.get(key) === pending) memory.delete(key); });
  return pending;
}

async function fetchAiGuess(name, fetcher, mode, state, signal) {
  let response;
  try { response = await fetcher(`/api/classify?name=${encodeURIComponent(name)}${mode ? `&mode=${mode}` : ''}${state ? `&state=${encodeURIComponent(state)}` : ''}&v=${REQUEST_VERSION}${reported.has(name.toLowerCase()) ? `&r=${Date.now()}` : ''}`, { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) }, 30000); }
  catch (error) { if (signal?.aborted) throw error; throw new Error('AI에 연결하지 못했어요. 다시 시도하거나 아는 재질이나 포장재 표시로 이어서 확인해 주세요.'); }
  if (!response.ok) {
    // 503은 'busy'(AI 과부하)와 'not_configured'(키 미설정)를 본문으로 구분합니다.
    let error = '';
    try { error = (await response.json())?.error || ''; } catch { /* 본문 없음 */ }
    if (error === 'busy') throw new Error('AI 사용자가 많아 잠시 응답하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (!response.ok) throw new Error(messages[response.status] || (response.status === 404
    ? 'AI 안내는 배포된 사이트에서 사용할 수 있어요. 아래에서 아는 재질이나 표시를 확인해 주세요.'
    : 'AI가 응답하지 못했어요. 다시 시도하거나 아래에서 아는 재질이나 표시를 확인해 주세요.'));
  let body;
  try { body = await response.json(); } catch { body = null; }
  const guess = validateAiGuess(body?.guess, name);
  // 다른 사용자가 이미 물어봐 공용 저장소에 있던 답이면 화면에 알려 줍니다.
  return guess && body?.cached === 'shared' ? { ...guess, shared: true } : guess;
}

// "틀렸어요" 신고: 서버가 공용 답을 숨기고, 이 브라우저에 기억한 답도 지웁니다.
export async function reportAiGuess(itemName, fetcher = fetchWithTimeout) {
  const name = cleanAiName(itemName);
  if (!name) throw new Error(messages[400]);
  const lower = name.toLowerCase();
  reported.add(lower);
  for (const key of [...memory.keys()]) if (key.split('|')[1]?.split(':').slice(1).join(':') === lower) memory.delete(key);
  let response;
  try { response = await fetcher('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ action: 'report', name }) }, 10000); }
  catch { throw new Error('신고를 보내지 못했어요. 네트워크를 확인하고 다시 눌러 주세요.'); }
  if (!response.ok) throw new Error(messages[response.status] || '신고를 보내지 못했어요. 잠시 후 다시 눌러 주세요.');
  return true;
}
