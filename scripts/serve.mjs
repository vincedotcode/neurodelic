// Zero-dependency dev server: serves site/ at / and src/ at /src.
// Usage: npm run dev  (PORT=5173 by default). For the built site: node scripts/serve.mjs dist
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const distMode = process.argv[2] === 'dist';
const port = Number(process.env.PORT) || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

function resolvePath(url) {
  const path = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (distMode) return join(root, 'dist', path);
  if (path.startsWith('/src/')) return join(root, path);
  if (path === '/neurodelic.skill.md') return join(root, 'SKILL.md');
  return join(root, 'site', path);
}

http.createServer(async (req, res) => {
  let file = resolvePath(req.url);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => console.log(`Neurodelic on http://localhost:${port}${distMode ? ' (dist)' : ''}`));
