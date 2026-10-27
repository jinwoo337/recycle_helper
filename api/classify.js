// Vercel 서버리스 함수: 미등록 물품 이름을 Gemini로 분류합니다.
// API 키는 Vercel 환경변수 GEMINI_API_KEY에만 두고 브라우저에 보내지 않습니다.
import { cleanAiName, validateAiGuess, aiResponseSchema, aiInstruction } from '../src/domain/disposal/ai-classification.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

// 생각(thinking)하는 모델은 응답이 늦을 수 있어 함수 실행 시간을 늘립니다.
export const config = { maxDuration: 30 };
// gemini-2.5-flash는 새 사용자에게 제공되지 않아(404) Google이 안내한 모델을 기본으로 씁니다.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// 기본 모델이 붐비거나(503 등) 없어졌으면(404) 이 모델로 한 번 더 시도합니다. 비어 있으면 건너뜁니다.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || '';
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

// 일시적인 과부하는 기본 모델로 최대 3번(0.8초, 2초 쉬고) 시도하고, 그래도 안 되면 예비 모델을 씁니다.
// 기본 모델이 없어졌으면(404) 바로 예비 모델로 넘어갑니다. 예비 모델이 없으면 마지막 오류를 알립니다.
// 함수 실행 시간(30초) 안에 끝나도록 전체 27초 안에서 시도마다 시간을 나눠 씁니다.
export async function classifyWithRetry(name, { model = MODEL, fallbackModel = FALLBACK_MODEL, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, budgetMs = 27_000, ...options } = {}) {
  const deadline = now() + budgetMs;
  const attempt = current => classifyWithGemini(name, { ...options, model: current, timeoutMs: Math.max(1_000, Math.min(12_000, deadline - now())) });
  let lastError;
  for (const pause of [0, 800, 2_000]) {
    if (pause) await wait(pause);
    try { return await attempt(model); }
    catch (error) {
      console.error('classify retry', model, error?.message);
      lastError = error;
      if (!isBusy(error)) break;
      if (now() >= deadline - 1_000) break;
    }
  }
  if (!isBusy(lastError) && lastError?.status !== 404) throw lastError;
  if (!fallbackModel || fallbackModel === model || now() >= deadline - 1_000) throw lastError;
  try { return await attempt(fallbackModel); }
  catch (error) {
    console.error('classify retry', fallbackModel, error?.message);
    // 예비 모델이 붐비면 그 오류를, 그 밖이면 기본 모델의 오류를 알립니다.
    throw isBusy(error) ? error : isBusy(lastError) ? lastError : error;
  }
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
