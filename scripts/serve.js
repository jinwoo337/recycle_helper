import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    // 로컬에서도 Vercel 함수와 같은 방식으로 AI 분류를 시험합니다. GEMINI_API_KEY 환경변수가 필요합니다.
    if (pathname === '/api/classify') {
      const { default: classify } = await import('../api/classify.js');
      const res = { setHeader: (name, value) => response.setHeader(name, value), status(code) { response.statusCode = code; return res; }, send: body => response.end(body) };
      await classify({ method: request.method, query: Object.fromEntries(url.searchParams), headers: request.headers }, res);
      return;
    }
    if (pathname === '/api/assist') {
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size <= 2_100_000) chunks.push(chunk); }
      if (size > 2_100_000) { response.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'too_large' })); return; }
      const { default: assist } = await import('../api/assist.js');
      const res = { setHeader: (name, value) => response.setHeader(name, value), status(code) { response.statusCode = code; return res; }, send: body => response.end(body) };
      await assist({ method: request.method, body: Buffer.concat(chunks).toString('utf8'), headers: request.headers }, res);
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = path.resolve(root, relative);
    const safePath = path.relative(root, target);
    if (safePath.startsWith('..') || path.isAbsolute(safePath) || !['index.html', 'src', 'public'].includes(safePath.split(path.sep)[0])) {
      response.writeHead(403).end('Forbidden'); return;
    }
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 사이의 정수여야 합니다.');
server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
