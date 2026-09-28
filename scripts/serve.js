import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
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
server.listen(5173, '127.0.0.1', () => console.log('http://127.0.0.1:5173'));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
