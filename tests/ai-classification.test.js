import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { validateAiGuess, aiResponseSchema } from '../src/domain/disposal/ai-classification.js';
import { requestAiGuess } from '../src/services/ai-classify.js';
import handler, { classifyWithGemini, classifyWithRetry, pickFallbackModel, fallbackModelFor } from '../api/classify.js';

const guess = (route, extra = {}) => ({ itemName: '실리콘주걱', material: '기타', type: '', route, confidence: 'high', reason: '실리콘 제품은 재활용 대상이 아니에요.', ...extra });

test('AI 추정값은 허용 목록 안의 값만 받고, 확신이 낮으면 배출 방법을 정하지 않는다', () => {
  assert.equal(validateAiGuess(null, '주걱'), null);
  assert.equal(validateAiGuess(guess('general'), '다른물건'), null, '이름이 다르면 사용하지 않음');
  assert.equal(validateAiGuess(guess('burn'), '실리콘주걱'), null, '목록 밖의 경로');
  assert.equal(validateAiGuess(guess('general', { material: '우라늄' }), '실리콘주걱').material, '기타');
  assert.equal(validateAiGuess(guess('general', { confidence: 'low' }), '실리콘주걱').route, 'unknown');
  assert.equal(validateAiGuess(guess('hazardous', { confidence: 'low' }), '실리콘주걱').route, 'hazardous', '위험 가능성은 확신과 무관하게 유지');
  assert.equal(validateAiGuess(guess('recyclable', { material: '플라스틱', type: '' }), '실리콘주걱').route, 'unknown', '종류 없는 재활용 추정');
  assert.equal(validateAiGuess(guess('general', { reason: 'x'.repeat(500) }), '실리콘주걱').reason.length, 160);
  assert.ok(aiResponseSchema().properties.material.enum.includes('플라스틱'));
});

test('AI 경로별 판별: 종량제·대형·위험·불확실', () => {
  const base = { itemName: '실리콘주걱', material: '기타' };
  const general = judgeDisposal({ ...base, aiGuess: guess('general') });
  assert.equal(general.status, 'general'); assert.ok(general.aiAssisted); assert.ok(general.method.includes('종량제'));
  assert.ok(general.reasons.some(reason => reason.includes('AI')));
  assert.equal(judgeDisposal({ ...base, aiGuess: guess('general', { confidence: 'medium' }) }).status, 'check');
  assert.ok(judgeDisposal({ ...base, aiGuess: guess('large') }).method.includes('대형폐기물'));
  const hazard = judgeDisposal({ ...base, aiGuess: guess('hazardous') });
  assert.equal(hazard.status, 'check'); assert.ok(hazard.reasons[0].includes('별도 수거'));
  assert.equal(judgeDisposal({ ...base, aiGuess: guess('unknown') }).method, '추가 확인 필요');
});

test('AI가 재활용 대상으로 분류해도 상태 질문과 규칙을 그대로 거친다', () => {
  const ai = guess('recyclable', { itemName: '요거트컵', material: '플라스틱', type: 'container' });
  const input = { itemName: '요거트컵', material: '플라스틱', type: 'container', aiGuess: ai };
  assert.equal(judgeDisposal(input).status, 'check', '오염 여부를 모르면 확정하지 않음');
  const cleanResult = judgeDisposal({ ...input, contaminated: 'no', combined: 'no' });
  assert.equal(cleanResult.status, 'recycle'); assert.ok(cleanResult.aiAssisted); assert.ok(cleanResult.method.includes('플라스틱'));
  const dirty = judgeDisposal({ ...input, contaminated: 'yes', washed: 'yes', removable: 'no', combined: 'no' });
  assert.equal(dirty.status, 'general');
  const changed = judgeDisposal({ ...input, material: '유리', type: 'bottle', contaminated: 'no', combined: 'no' });
  assert.equal(changed.status, 'check', '사용자가 고른 재질이 AI 추정과 다르면 확인 필요');
});

test('AI 추정은 등록 품목·위험 이름 규칙을 덮어쓰지 않는다', () => {
  const known = judgeDisposal({ itemName: '우유팩', material: '종이', type: 'carton', contaminated: 'no', combined: 'no', aiGuess: guess('general', { itemName: '우유팩' }) });
  assert.equal(known.status, 'recycle'); assert.equal(known.aiAssisted, undefined);
  const battery = judgeDisposal({ itemName: '보조배터리케이스', material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no',
    aiGuess: guess('recyclable', { itemName: '보조배터리케이스', material: '플라스틱', type: 'container' }) });
  assert.equal(battery.status, 'check'); assert.equal(battery.aiAssisted, undefined);
  assert.equal(judgeDisposal({ itemName: '실리콘주걱', material: '기타' }).status, 'check', 'AI 없으면 기존 미등록 안내');
});

test('Gemini 호출: 키는 헤더로만 보내고 응답을 검증한다', async () => {
  let request;
  const fetcher = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '기타', type: '', route: 'general', confidence: 'high', reason: '일반 생활용품' }) }] } }] }) };
  };
  const result = await classifyWithGemini('실리콘 주걱', { apiKey: 'test-key', fetcher, model: 'test-model' });
  assert.equal(result.route, 'general'); assert.equal(result.itemName, '실리콘 주걱');
  assert.ok(!request.url.includes('test-key')); assert.equal(request.options.headers['x-goog-api-key'], 'test-key');
  assert.ok(request.url.includes('test-model'));
  const body = JSON.parse(request.options.body);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  const broken = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '정답은 플라스틱' }] } }] }) });
  assert.equal(await classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher: broken }), null);
  await assert.rejects(classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher: async () => ({ ok: false, status: 500 }) }));
});

test('Gemini 과부하: 같은 모델로 재시도하고, 그래도 안 되면 예비 모델을 쓴다', async () => {
  const answer = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '기타', type: 'none', route: 'general', confidence: 'high', reason: '일반 생활용품' }) }] } }] }) };
  const busy = { ok: false, status: 503, json: async () => ({ error: { message: 'high demand' } }) };
  const scripted = (...responses) => { const urls = []; const fetcher = async url => { urls.push(url); return responses.shift(); }; return { urls, fetcher }; };
  const options = { apiKey: 'k', model: 'main-model', fallbackModel: 'backup-model', wait: async () => {} };

  const retry = scripted(busy, answer);
  assert.equal((await classifyWithRetry('실리콘 주걱', { ...options, fetcher: retry.fetcher })).route, 'general');
  assert.equal(retry.urls.length, 2); assert.ok(retry.urls[1].includes('main-model'));

  const fallback = scripted(busy, busy, answer);
  const result = await classifyWithRetry('실리콘 주걱', { ...options, fetcher: fallback.fetcher });
  assert.equal(result.route, 'general'); assert.equal(result.type, '', "'none'은 빈 값으로 바뀜");
  assert.equal(fallback.urls.length, 3); assert.ok(fallback.urls[1].includes('main-model')); assert.ok(fallback.urls[2].includes('backup-model'));

  const last = scripted(busy, busy, busy, answer);
  assert.equal((await classifyWithRetry('실리콘 주걱', { ...options, fetcher: last.fetcher })).route, 'general');
  assert.equal(last.urls.length, 4); assert.ok(last.urls[3].includes('main-model'), '예비 모델도 붐비면 기본 모델로 마지막 시도');

  const alone = scripted(busy, busy, busy);
  await assert.rejects(classifyWithRetry('실리콘 주걱', { ...options, fallbackModel: '', fetcher: alone.fetcher }), error => error.status === 503);
  assert.equal(alone.urls.length, 3, '예비 모델이 없으면 기본 모델만 3번');

  const bad = scripted({ ok: false, status: 400, json: async () => ({}) });
  await assert.rejects(classifyWithRetry('실리콘 주걱', { ...options, fetcher: bad.fetcher }), error => error.status === 400);
  assert.equal(bad.urls.length, 1, '400은 재시도하지 않음');

  const gone = scripted({ ok: false, status: 404, json: async () => ({ error: { message: 'no longer available' } }) }, answer);
  assert.equal((await classifyWithRetry('실리콘 주걱', { ...options, fetcher: gone.fetcher })).route, 'general');
  assert.equal(gone.urls.length, 2, '없어진 모델은 다시 부르지 않고 예비 모델로'); assert.ok(gone.urls[1].includes('backup-model'));
});

test('빠른 응답: 생각 단계를 낮추고, 거절되면 생각 설정 없이 다시 부른다', async () => {
  const bodies = [];
  const answer = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '기타', type: 'none', route: 'general', confidence: 'high', reason: '' }) }] } }] }) };
  const rejectThinking = { ok: false, status: 400, json: async () => ({ error: { message: 'thinking_level is not supported for this model.' } }) };
  const responses = [rejectThinking, answer, answer];
  const fetcher = async (url, options) => { bodies.push(JSON.parse(options.body)); return responses.shift(); };
  assert.equal((await classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher, model: 'old-model' })).route, 'general');
  assert.equal(bodies[0].generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(bodies[1].generationConfig.thinkingConfig, undefined, '거절되면 생각 설정 없이 다시');
  await classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher, model: 'old-model' });
  assert.equal(bodies[2].generationConfig.thinkingConfig, undefined, '다음부터도 생각 설정을 보내지 않음');
});

test('예비 모델 자동 선택: 가벼운 정식 flash 모델을 고르고 키는 헤더로만 보낸다', async () => {
  const model = (name, methods = ['generateContent']) => ({ name: `models/${name}`, supportedGenerationMethods: methods });
  const list = [model('gemini-3.8-flash'), model('gemini-3.8-flash-lite-preview'), model('gemini-3.5-flash-lite'), model('gemini-3.8-flash-lite'),
    model('gemini-3.8-flash-image'), model('gemini-3.8-pro'), model('text-embedding-4', ['embedContent']), model('gemini-3.8-flash-tts')];
  assert.equal(pickFallbackModel(list, 'gemini-3.8-flash'), 'gemini-3.8-flash-lite');
  assert.equal(pickFallbackModel([model('gemini-3.8-flash')], 'gemini-3.8-flash'), '', '기본 모델뿐이면 예비 없음');
  let request;
  const picked = await fallbackModelFor('gemini-3.8-flash', { apiKey: 'secret', fetcher: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ models: list }) }; } });
  assert.equal(picked, 'gemini-3.8-flash-lite');
  assert.ok(!request.url.includes('secret')); assert.equal(request.options.headers['x-goog-api-key'], 'secret');
});

test('브라우저 서비스: 같은 이름의 요청은 하나로 합치고, 실패하면 다시 요청한다', async () => {
  let calls = 0;
  const ok = async () => { calls++; return { ok: true, json: async () => ({ guess: { itemName: '물건G', material: '기타', type: '', route: 'general', confidence: 'high', reason: '' } }) }; };
  const [first, second] = await Promise.all([requestAiGuess('물건G', ok), requestAiGuess('물건G', ok)]);
  assert.equal(calls, 1); assert.equal(first, second);
  let failures = 0;
  const flaky = async () => { failures++; return { ok: false, status: 502, json: async () => ({}) }; };
  await assert.rejects(requestAiGuess('물건H', flaky));
  await assert.rejects(requestAiGuess('물건H', flaky));
  assert.equal(failures, 2, '실패한 요청은 기억하지 않음');
});

function fakeResponse() {
  const res = { headers: {}, statusCode: 200, body: '' };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.status = code => { res.statusCode = code; return res; };
  res.send = body => { res.body = body; };
  return res;
}

test('서버 함수: 잘못된 요청·등록 품목·키 미설정', async () => {
  const call = async (method, name) => { const res = fakeResponse(); await handler({ method, query: { name }, headers: {} }, res); return res; };
  assert.equal((await call('POST', '주걱')).statusCode, 405);
  assert.equal((await call('GET', '')).statusCode, 400);
  assert.equal((await call('GET', 'x'.repeat(41))).statusCode, 400);
  const known = await call('GET', '우유팩');
  assert.equal(known.statusCode, 200); assert.equal(JSON.parse(known.body).guess, null);
  const previous = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
  try { assert.equal((await call('GET', '실리콘주걱')).statusCode, 503); }
  finally { if (previous !== undefined) process.env.GEMINI_API_KEY = previous; }
});

test('브라우저 서비스: 오류 안내와 응답 검증', async () => {
  await assert.rejects(requestAiGuess(''), /40자/);
  await assert.rejects(requestAiGuess('물건A', async () => ({ ok: false, status: 503, json: async () => ({ error: 'not_configured' }) })), /설정되지 않았어요/);
  await assert.rejects(requestAiGuess('물건F', async () => ({ ok: false, status: 503, json: async () => ({ error: 'busy' }) })), /사용자가 많아/);
  await assert.rejects(requestAiGuess('물건B', async () => ({ ok: false, status: 404 })), /배포된 사이트/);
  await assert.rejects(requestAiGuess('물건C', async () => { throw new Error('offline'); }), /연결하지 못했어요/);
  const ok = await requestAiGuess('물건D', async url => {
    assert.ok(url.startsWith('/api/classify?name='));
    return { ok: true, json: async () => ({ guess: { itemName: '물건D', material: '기타', type: '', route: 'general', confidence: 'high', reason: '' } }) };
  });
  assert.equal(ok.route, 'general');
  const forged = await requestAiGuess('물건E', async () => ({ ok: true, json: async () => ({ guess: { itemName: '다른이름', material: '기타', type: '', route: 'general', confidence: 'high' } }) }));
  assert.equal(forged, null);
});
