import { allowRequest, chooseModels } from './classify.js';
import { parseAssistanceInput, validateAssistance, assistanceSchema, assistanceInstruction, assistanceParts } from '../src/domain/disposal/ai-assistance.js';

export const config = { maxDuration: 30 };
const busy = error => [429, 500, 503, 504].includes(error?.status) || ['TimeoutError', 'AbortError'].includes(error?.name);

export function hasImageSignature(image) {
  if (!image) return true;
  const bytes = Buffer.from(image.data, 'base64');
  if (image.mimeType === 'image/jpeg') return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (image.mimeType === 'image/png') return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

// 사진과 설명은 로그·캐시·공용 DB에 저장하지 않고 이번 안내 생성에만 사용합니다.
export async function generateAssistance(input, { apiKey = process.env.GEMINI_API_KEY, fetcher = fetch, models, signal } = {}) {
  const selected = models || await chooseModels({ apiKey, fetcher });
  const deadline = AbortSignal.timeout(23_000);
  let lastError;
  for (const model of [...new Set([selected.primary, selected.fallback].filter(Boolean))]) {
    let useThinking = true;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: assistanceInstruction() }] }, contents: [{ role: 'user', parts: assistanceParts(input) }],
            generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json', responseSchema: assistanceSchema(), ...(useThinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}) } }),
          signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]),
        });
        if (response.status === 400 && useThinking) { useThinking = false; continue; }
        if (!response.ok) { const error = new Error('upstream_failed'); error.status = response.status; throw error; }
        const data = await response.json();
        const output = data?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || '';
        const answer = validateAssistance(JSON.parse(output));
        if (!answer) throw new Error('invalid_response');
        return answer;
      } catch (error) {
        lastError = error;
        if (deadline.aborted || signal?.aborted) throw error;
        break;
      }
    }
  }
  throw lastError || new Error('invalid_response');
}

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export function createAssistanceHandler({ generate = generateAssistance, configured = () => Boolean(process.env.GEMINI_API_KEY), limit = allowRequest } = {}) {
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); send(res, 405, { error: 'method_not_allowed' }); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) { send(res, 415, { error: 'invalid_content_type' }); return; }
    let raw = req.body;
    try {
      if (typeof raw === 'string') { if (Buffer.byteLength(raw) > 2_100_000) { send(res, 413, { error: 'too_large' }); return; } raw = JSON.parse(raw); }
    } catch { send(res, 400, { error: 'invalid_input' }); return; }
    const input = parseAssistanceInput(raw);
    if (!input || !hasImageSignature(input.image)) { send(res, 400, { error: 'invalid_input' }); return; }
    if (!configured()) { send(res, 503, { error: 'not_configured' }); return; }
    const ip = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (!limit(ip)) { send(res, 429, { error: 'rate_limited' }); return; }
    try {
      const answer = validateAssistance(await generate(input));
      if (!answer) { send(res, 502, { error: 'invalid_response' }); return; }
      send(res, 200, { answer });
    } catch (error) {
      // 공급자 오류 원문에는 입력이 섞일 수 있으므로 상태만 기록합니다.
      console.warn('assistance failed', Number(error?.status) || error?.name || 'Error');
      send(res, busy(error) ? 503 : 502, { error: busy(error) ? 'busy' : 'upstream_failed' });
    }
  };
}

export default createAssistanceHandler();
