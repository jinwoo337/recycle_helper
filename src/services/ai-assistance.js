import { fetchWithTimeout } from '../utils/network.js';
import { parseAssistanceInput, validateAssistance } from '../domain/disposal/ai-assistance.js';

export async function requestAssistance(raw, { signal, fetcher = fetchWithTimeout } = {}) {
  const input = parseAssistanceInput(raw);
  if (!input) throw new Error('설명은 10~2,000자로 입력하고, 사진 모드에서는 사진을 선택해 주세요.');
  let response;
  try {
    response = await fetcher('/api/assist', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(input), signal }, 30_000);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('AI에 연결하지 못했어요. 입력은 그대로 있으니 연결 상태를 확인하고 다시 시도해 주세요.');
  }
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    const message = body?.error === 'not_configured' ? 'AI 안내가 아직 설정되지 않았어요. 이름으로 찾기는 계속 이용할 수 있어요.'
      : body?.error === 'busy' || response.status === 429 ? 'AI 요청이 많아 잠시 응답하지 못했어요. 잠시 후 다시 시도해 주세요.'
      : response.status === 413 ? '사진 용량이 너무 커요. 더 작은 사진을 선택해 주세요.'
      : response.status === 400 ? '설명이나 사진을 확인해 주세요. 사진은 JPG·PNG·WebP 형식을 지원해요.'
      : response.status === 404 ? '이 기능은 새 버전이 배포된 서버에서 이용할 수 있어요.'
      : 'AI가 안내를 만들지 못했어요. 설명을 보완하거나 사진을 바꿔 다시 시도해 주세요.';
    throw new Error(message);
  }
  const answer = validateAssistance(body?.answer);
  if (!answer) throw new Error('AI 답변을 제대로 읽지 못했어요. 입력을 유지했으니 다시 시도해 주세요.');
  return answer;
}
