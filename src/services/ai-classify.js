import { fetchWithTimeout } from '../utils/network.js';
import { cleanAiName, validateAiGuess } from '../domain/disposal/ai-classification.js';

const memory = new Map();
const messages = {
  400: '물건 이름은 40자 이내로 입력해 주세요.',
  429: 'AI 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  503: 'AI 안내가 아직 설정되지 않았어요. 재질을 직접 선택해 주세요.',
};

// 미등록 물품 이름을 서버 함수로 보내 AI 추정값을 받습니다. 회원 정보는 보내지 않습니다.
export async function requestAiGuess(itemName, fetcher = fetchWithTimeout) {
  const name = cleanAiName(itemName);
  if (!name) throw new Error(messages[400]);
  const key = name.toLowerCase();
  if (memory.has(key)) return memory.get(key);
  let response;
  try { response = await fetcher(`/api/classify?name=${encodeURIComponent(name)}`, { headers: { Accept: 'application/json' } }, 30000); }
  catch { throw new Error('AI 안내에 연결하지 못했어요. 네트워크를 확인하거나 재질을 직접 선택해 주세요.'); }
  if (!response.ok) {
    // 503은 'busy'(AI 과부하)와 'not_configured'(키 미설정)를 본문으로 구분합니다.
    let error = '';
    try { error = (await response.json())?.error || ''; } catch { /* 본문 없음 */ }
    if (error === 'busy') throw new Error('AI 사용자가 많아 잠시 응답하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (!response.ok) throw new Error(messages[response.status] || (response.status === 404
    ? 'AI 안내는 배포된 사이트에서 사용할 수 있어요. 재질을 직접 선택해 주세요.'
    : 'AI가 응답하지 못했어요. 잠시 후 다시 시도하거나 재질을 직접 선택해 주세요.'));
  let body;
  try { body = await response.json(); } catch { body = null; }
  const guess = validateAiGuess(body?.guess, name);
  memory.set(key, guess);
  return guess;
}
