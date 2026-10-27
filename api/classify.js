// Vercel 서버리스 함수: 미등록 물품 이름을 Gemini로 분류합니다.
// API 키는 Vercel 환경변수 GEMINI_API_KEY에만 두고 브라우저에 보내지 않습니다.
import { cleanAiName, validateAiGuess, aiResponseSchema, aiInstruction } from '../src/domain/disposal/ai-classification.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

// 생각(thinking)하는 모델은 응답이 늦을 수 있어 함수 실행 시간을 늘립니다.
export const config = { maxDuration: 30 };
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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

export async function classifyWithGemini(name, { apiKey = process.env.GEMINI_API_KEY, fetcher = fetch, model = MODEL } = {}) {
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: aiInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: `물건 이름: ${JSON.stringify(name)}` }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: aiResponseSchema() },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    // 원인 확인용으로 상태 코드와 Google 오류 문구만 기록합니다. 키는 기록하지 않습니다.
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* 본문 없음 */ }
    throw new Error(`Gemini ${response.status} ${String(detail).slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  return validateAiGuess({ ...parsed, itemName: name }, name);
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
    const guess = await classifyWithGemini(name);
    if (guess) cache.set(key, guess);
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    send(res, 200, { guess }, guess ? 604800 : 0);
  } catch (error) {
    console.error('classify failed', error?.message);
    send(res, 502, { error: 'upstream_failed' });
  }
}
