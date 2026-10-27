import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { validateAiGuess, aiResponseSchema } from '../src/domain/disposal/ai-classification.js';
import { requestAiGuess } from '../src/services/ai-classify.js';
import handler, { classifyWithGemini, classifyWithRetry, pickModels, chooseModels } from '../api/classify.js';

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

test('동시 요청: 빠른 모델이 늦으면 예비 모델을 함께 부르고 먼저 온 답을 쓴다', async () => {
  const answer = route => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '기타', type: 'none', route, confidence: 'high', reason: '' }) }] } }] }) });
  const busy = { ok: false, status: 503, json: async () => ({ error: { message: 'high demand' } }) };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const models = { primary: 'lite-model', fallback: 'big-model' };
  const run = async (handlers, extra = {}) => {
    const urls = [];
    const fetcher = async (url, init) => {
      urls.push(url);
      const handle = handlers[url.includes('lite-model') ? 'lite' : 'big'];
      return handle(init.signal);
    };
    return { urls, result: classifyWithRetry('실리콘 주걱', { apiKey: 'k', fetcher, models, hedgeMs: 30, ...extra }) };
  };

  const fast = await run({ lite: async () => answer('general'), big: async () => answer('large') });
  const fastResult = await fast.result;
  assert.equal(fastResult.route, 'general'); assert.equal(fastResult.type, '', "'none'은 빈 값으로 바뀜");
  await sleep(50); assert.equal(fast.urls.length, 1, '빠르면 예비 모델을 부르지 않음');

  let aborted = false;
  const slowLite = async signal => { await new Promise(resolve => { const t = setTimeout(resolve, 300); signal.addEventListener('abort', () => { aborted = true; clearTimeout(t); resolve(); }); }); return answer('general'); };
  const slow = await run({ lite: slowLite, big: async () => answer('large') });
  assert.equal((await slow.result).route, 'large', '늦으면 예비 모델 답을 씀');
  assert.equal(slow.urls.length, 2); assert.ok(aborted, '남은 요청은 취소');

  const failFast = await run({ lite: async () => busy, big: async () => answer('large') }, { hedgeMs: 5_000 });
  assert.equal((await failFast.result).route, 'large', '기본 모델이 실패하면 기다리지 않고 바로 예비 모델');

  const both = await run({ lite: async () => busy, big: async () => ({ ok: false, status: 400, json: async () => ({}) }) });
  await assert.rejects(both.result, error => error.status === 503, '둘 다 실패하면 과부하 오류를 우선');

  const alone = await run({ lite: async () => busy }, { models: { primary: 'lite-model', fallback: '' } });
  await assert.rejects(alone.result, error => error.status === 503);
  assert.equal(alone.urls.length, 1);
});

test('빠른 응답: 생각 단계를 minimal → low → 없음 순으로 낮춰 기억한다', async () => {
  const bodies = [];
  const answer = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '기타', type: 'none', route: 'general', confidence: 'high', reason: '' }) }] } }] }) };
  const rejectThinking = { ok: false, status: 400, json: async () => ({ error: { message: 'thinking_level is not supported for this model.' } }) };
  const responses = [rejectThinking, rejectThinking, answer, answer];
  const fetcher = async (url, options) => { bodies.push(JSON.parse(options.body)); return responses.shift(); };
  assert.equal((await classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher, model: 'old-model' })).route, 'general');
  assert.equal(bodies[0].generationConfig.thinkingConfig.thinkingLevel, 'minimal');
  assert.equal(bodies[1].generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(bodies[2].generationConfig.thinkingConfig, undefined, '모두 거절되면 생각 설정 없이');
  await classifyWithGemini('실리콘 주걱', { apiKey: 'k', fetcher, model: 'old-model' });
  assert.equal(bodies[3].generationConfig.thinkingConfig, undefined, '다음부터도 바로 통하는 설정을 씀');
});

test('모델 자동 선택: 가장 가벼운 flash-lite를 기본으로, flash를 예비로 고르고 키는 헤더로만 보낸다', async () => {
  const model = (name, methods = ['generateContent']) => ({ name: `models/${name}`, supportedGenerationMethods: methods });
  const list = [model('gemini-3.8-flash'), model('gemini-3.8-flash-lite-preview'), model('gemini-3.5-flash-lite'), model('gemini-3.8-flash-lite'),
    model('gemini-3.8-flash-image'), model('gemini-3.8-pro'), model('text-embedding-4', ['embedContent']), model('gemini-3.8-flash-tts')];
  assert.deepEqual(pickModels(list), { lite: 'gemini-3.8-flash-lite', flash: 'gemini-3.8-flash' });
  assert.deepEqual(pickModels([model('gemini-3.8-flash')]), { lite: '', flash: 'gemini-3.8-flash' });
  let request;
  const picked = await chooseModels({ apiKey: 'secret', now: () => 1e15, fetcher: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ models: list }) }; } });
  assert.deepEqual(picked, { primary: 'gemini-3.8-flash-lite', fallback: 'gemini-3.8-flash' });
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

test('AI 위험 경로만으로 전자제품 처리를 단정하지 않고 직접 고른 종류로 전용 안내한다', () => {
  const result = judgeDisposal({ itemName: '무선마우스X', material: '기타', aiGuess: guess('hazardous', { itemName: '무선마우스X' }) });
  assert.equal(result.status, 'check'); assert.match(result.method, /물건 종류 확인/);
  assert.ok(!result.steps.some(step => /1599-0903|폐건전지|전자제품/.test(step)));
  const selected = judgeDisposal({ itemName: '무선마우스X', category: 'electronic' });
  assert.match(selected.method, /소형 폐가전/);
  assert.ok(selected.steps.some(step => /전용 수거함|회수 서비스/.test(step)));
  assert.equal(selected.aiAssisted, undefined);
});

test('서버 함수: mode=opinion이면 등록 품목도 AI 의견을 받는다', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, fetch: globalThis.fetch };
  const urls = [];
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async url => { urls.push(url); return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ material: '종이', type: 'carton', route: 'recyclable', confidence: 'high', reason: '종이팩이에요.' }) }] } }] }) }; };
  try {
    const call = async query => { const res = fakeResponse(); await handler({ method: 'GET', query, headers: {} }, res); return res; };
    const plain = await call({ name: '우유팩' });
    assert.equal(JSON.parse(plain.body).reason, 'known_item'); assert.equal(urls.length, 0, '기본은 등록 품목에 AI를 부르지 않음');
    const generated = () => urls.filter(url => url.includes(':generateContent')).length;
    const opinion = await call({ name: '우유팩', mode: 'opinion' });
    assert.equal(opinion.statusCode, 200); assert.equal(JSON.parse(opinion.body).guess.route, 'recyclable');
    assert.equal(generated(), 1);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
  }
});

test('브라우저 서비스: 등록 품목 의견 요청은 mode=opinion을 붙이고 따로 기억한다', async () => {
  const urls = [];
  const fetcher = async url => { urls.push(url); return { ok: true, json: async () => ({ guess: { itemName: '물건I', material: '기타', type: '', route: 'general', confidence: 'high', reason: '' } }) }; };
  await requestAiGuess('물건I', fetcher);
  await requestAiGuess('물건I', fetcher, { opinion: true });
  assert.equal(urls.length, 2); assert.ok(!urls[0].includes('mode=')); assert.ok(urls[1].endsWith('&mode=opinion'));
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
