// Vercel 서버리스 함수: 미등록 물품 이름을 Gemini로 분류합니다.
// API 키는 Vercel 환경변수 GEMINI_API_KEY에만 두고 브라우저에 보내지 않습니다.
import { cleanAiName, validateAiGuess, aiResponseSchema, aiInstruction } from '../src/domain/disposal/ai-classification.js';
import { lookupItem } from '../src/domain/disposal/item-suggestions.js';

// 생각(thinking)하는 모델은 응답이 늦을 수 있어 함수 실행 시간을 늘립니다.
export const config = { maxDuration: 30 };
// gemini-2.5-flash는 새 사용자에게 제공되지 않아(404) Google이 안내한 모델을 기본으로 씁니다.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const ENV_MODEL = process.env.GEMINI_MODEL || '';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || '';
// 기본은 속도 우선: 키로 쓸 수 있는 가장 가벼운 flash-lite 모델을 먼저 쓰고, 더 큰 모델을 예비로 둡니다.
// GEMINI_PREFER_SPEED=off이면 GEMINI_MODEL을 그대로 기본 모델로 씁니다.
const PREFER_SPEED = process.env.GEMINI_PREFER_SPEED !== 'off';
// 생각 단계: 기본 minimal(가장 빠름). 모델이 거절하면 low → 생각 설정 없음 순으로 낮춰 기억합니다. 'off'면 보내지 않습니다.
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'minimal';
const THINKING_LADDER = THINKING_LEVEL === 'off' ? [null] : [...new Set([THINKING_LEVEL, 'low']), null];
const thinkingStep = new Map();
let discovered = { models: null, at: 0 };
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

// 분류는 간단한 일이라 생각을 최소로 줄여 빨리 답하게 합니다.
const thinkingFor = model => {
  const level = THINKING_LADDER[thinkingStep.get(model) || 0];
  return level ? { thinkingConfig: { thinkingLevel: level } } : {};
};

const versionOf = name => Number((name.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1]);
// 모델 목록에서 가장 가벼운 flash-lite와 일반 flash를 하나씩 고릅니다. 이미지·음성 등 특수 모델 제외, 정식판·높은 버전 우선.
export function pickModels(models) {
  const names = (models || [])
    .filter(model => model?.supportedGenerationMethods?.includes('generateContent'))
    .map(model => String(model.name || '').replace(/^models\//, ''))
    .filter(name => name.includes('flash') && !/image|tts|audio|live|embedding/.test(name));
  const best = list => list.sort((a, b) => ((/preview|exp/.test(a) ? 1 : 0) - (/preview|exp/.test(b) ? 1 : 0)) || versionOf(b) - versionOf(a))[0] || '';
  return { lite: best(names.filter(name => name.includes('flash-lite'))), flash: best(names.filter(name => !name.includes('flash-lite'))) };
}

// 기본 모델(빠른 것)과 예비 모델(동시 요청용)을 정합니다. 모델 목록은 1시간 기억합니다.
export async function chooseModels({ apiKey = process.env.GEMINI_API_KEY, fetcher = fetch, now = Date.now } = {}) {
  if (!PREFER_SPEED && ENV_MODEL) return { primary: ENV_MODEL, fallback: FALLBACK_MODEL !== ENV_MODEL ? FALLBACK_MODEL : '' };
  if (!discovered.models || now() - discovered.at >= 3_600_000) {
    let models = { lite: '', flash: '' };
    try {
      const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(2_000) });
      if (response.ok) models = pickModels((await response.json())?.models);
    } catch { /* 목록을 못 받으면 기본 모델만 씁니다. */ }
    discovered = { models, at: now() };
  }
  const strong = ENV_MODEL || discovered.models.flash || DEFAULT_MODEL;
  const primary = discovered.models.lite || strong;
  const fallback = FALLBACK_MODEL || strong;
  return { primary, fallback: fallback !== primary ? fallback : '' };
}

export async function classifyWithGemini(name, { apiKey = process.env.GEMINI_API_KEY, fetcher = fetch, model = DEFAULT_MODEL, timeoutMs = 8_000, signal } = {}) {
  const thinking = thinkingFor(model);
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: aiInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: `물건 이름: ${JSON.stringify(name)}` }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 512, responseMimeType: 'application/json', responseSchema: aiResponseSchema(), ...thinking },
    }),
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
  });
  if (!response.ok) {
    // 원인 확인용으로 상태 코드와 Google 오류 문구만 기록합니다. 키는 기록하지 않습니다.
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* 본문 없음 */ }
    if (response.status === 400 && thinking.thinkingConfig && /think/i.test(detail)) {
      // 이 모델이 받지 않는 생각 단계면 한 단계 낮춰 기억하고 다시 부릅니다.
      thinkingStep.set(model, (thinkingStep.get(model) || 0) + 1);
      return classifyWithGemini(name, { apiKey, fetcher, model, timeoutMs, signal });
    }
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

// 동시 요청: 빠른 기본 모델을 먼저 부르고, 2.5초 안에 답이 없거나 실패하면 예비 모델도 함께 부릅니다.
// 먼저 온 답을 쓰고 나머지 요청은 취소합니다. 둘 다 실패하면 과부하 오류를 우선 알립니다. 요청마다 최대 8초입니다.
export async function classifyWithRetry(name, { models, hedgeMs = 2_500, timeoutMs = 8_000, ...options } = {}) {
  const { primary, fallback } = models || await chooseModels(options);
  const controllers = [];
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      const errors = [];
      let running = 0, fallbackStarted = false;
      const start = model => {
        const controller = new AbortController(); controllers.push(controller);
        const startedAt = Date.now(); running++;
        classifyWithGemini(name, { ...options, model, timeoutMs, signal: controller.signal }).then(guess => {
          console.log('classify ok', model, `${Date.now() - startedAt}ms`);
          resolve(guess);
        }, error => {
          running--; errors.push(error);
          console.error('classify retry', model, error?.message);
          if (!fallbackStarted && fallback) startFallback();
          else if (!running) reject(errors.find(isBusy) || errors[0]);
        });
      };
      const startFallback = () => {
        if (fallbackStarted || !fallback) return;
        fallbackStarted = true; clearTimeout(timer);
        console.error('classify fallback', fallback);
        start(fallback);
      };
      start(primary);
      if (fallback) timer = setTimeout(startFallback, hedgeMs);
    });
  } finally {
    clearTimeout(timer);
    controllers.forEach(controller => controller.abort());
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
  // 등록된 품목은 기존 규칙을 쓰므로 AI를 부르지 않습니다. 단, mode=opinion이면 화면에 참고 의견으로만 보여 줄 AI 답을 받습니다.
  const opinion = (Array.isArray(req.query?.mode) ? req.query.mode[0] : req.query?.mode) === 'opinion';
  if (lookupItem(name) && !opinion) { send(res, 200, { guess: null, reason: 'known_item' }, 86400); return; }
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
