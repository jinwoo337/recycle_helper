// Vercel 서버리스 함수: 미등록 물품 이름을 Gemini로 분류합니다.
// API 키는 Vercel 환경변수 GEMINI_API_KEY에만 두고 브라우저에 보내지 않습니다.
import { cleanAiName, validateAiGuess, aiResponseSchema, aiInstruction } from '../src/domain/disposal/ai-classification.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

// 생각(thinking)하는 모델은 응답이 늦을 수 있어 함수 실행 시간을 늘립니다.
export const config = { maxDuration: 30 };
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// 기본 모델이 붐비면(503 등) 이 모델로 한 번 더 시도합니다.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || (MODEL === 'gemini-2.5-flash' ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash');
const BUSY_STATUSES = [429, 500, 503, 504];
const PER_MINUTE = Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 10);
const PER_DAY = Number(process.env.AI_DAILY_LIMIT || 500);
const cache = new Map();
const visitors = new Map();
let day = '', dailyCount = 0;

// 인스턴스 메모리 기준의 간단한 제한입니다. 공유 캐시는 아래 CDN 캐시 헤더가 담당합니다.
export function allowRequest(ip, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; dailyCount = 0; visitors.clear(); }
  if (dailyCount >= PER_DAY) return false;
  const recent = (visitors.get(ip) || []).filter(time => now - time < 60_000);
  if (recent.length >= PER_MINUTE) { visitors.set(ip, recent); return false; }
  recent.push(now); visitors.set(ip, recent); dailyCount++;
  return true;
}

export async function classifyWithGemini(name, { apiKey = process.env.GEMINI_API_KEY, fetcher = fetch, model = MODEL, timeoutMs = 25_000 } = {}) {
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: aiInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: `물건 이름: ${JSON.stringify(name)}` }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: aiResponseSchema() },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    // 원인 확인용으로 상태 코드와 Google 오류 문구만 기록합니다. 키는 기록하지 않습니다.
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* 본문 없음 */ }
    const error = new Error(`Gemini ${response.status} ${String(detail).slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  return validateAiGuess({ ...parsed, itemName: name }, name);
}

const isBusy = error => BUSY_STATUSES.includes(error?.status) || ['TimeoutError', 'AbortError'].includes(error?.name);

// 일시적인 과부하는 잠시 뒤 같은 모델로 한 번, 그래도 안 되면 예비 모델로 한 번 더 시도합니다.
// 함수 실행 시간(30초) 안에 끝나도록 시도마다 9초 제한을 둡니다.
export async function classifyWithRetry(name, { model = MODEL, fallbackModel = FALLBACK_MODEL, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), ...options } = {}) {
  const models = [model, model, ...(fallbackModel && fallbackModel !== model ? [fallbackModel] : [])];
  let lastError;
  for (const [index, current] of models.entries()) {
    if (index === 1) await wait(800);
    try { return await classifyWithGemini(name, { timeoutMs: 9_000, ...options, model: current }); }
    catch (error) {
      if (!isBusy(error)) throw error;
      console.error('classify retry', current, error?.message);
      lastError = error;
    }
  }
  throw lastError;
}

function send(res, status, body, cacheSeconds = 0) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheSeconds ? `public, max-age=3600, s-maxage=${cacheSeconds}` : 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); send(res, 405, { error: 'method_not_allowed' }); return; }
  const name = cleanAiName(Array.isArray(req.query?.name) ? req.query.name[0] : req.query?.name);
  if (!name) { send(res, 400, { error: 'invalid_name' }); return; }
  // 이미 등록된 품목은 AI를 부르지 않고 기존 규칙을 사용하게 합니다.
  if (lookupItem(name)) { send(res, 200, { guess: null, reason: 'known_item' }, 86400); return; }
  if (!process.env.GEMINI_API_KEY) { send(res, 503, { error: 'not_configured' }); return; }
  const key = name.toLowerCase();
  if (cache.has(key)) { send(res, 200, { guess: cache.get(key) }, 604800); return; }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!allowRequest(ip)) { send(res, 429, { error: 'rate_limited' }); return; }
  try {
    const guess = await classifyWithRetry(name);
    if (guess) cache.set(key, guess);
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    send(res, 200, { guess }, guess ? 604800 : 0);
  } catch (error) {
    console.error('classify failed', error?.message);
    if (isBusy(error)) { send(res, 503, { error: 'busy' }); return; }
    send(res, 502, { error: 'upstream_failed' });
  }
}
