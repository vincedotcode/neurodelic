// Zero-dependency dev server: site/ at /, src/ at /src, ui/ at /ui, and /art/*.svg drawn on request.
// Usage: npm run dev  (PORT=5173 by default). For the built site: node scripts/serve.mjs dist
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { renderIllustration } from '../src/render.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const distMode = process.argv[2] === 'dist';
const port = Number(process.env.PORT) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function resolvePath(path) {
  if (distMode) return join(root, 'dist', path);
  if (path.startsWith('/src/') || path.startsWith('/ui/')) return join(root, path);
  if (path === '/neurodelic.skill.md') return join(root, 'SKILL.md');
  return join(root, 'site', path);
}

http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  // In dev, art files are drawn on request so you never need a build to link one.
  const art = !distMode && path.match(/^\/art\/([a-z-]+)--([a-z]+)--(\d+)\.svg$/);
  if (art) {
    try {
      const svg = renderIllustration({ moment: art[1], state: art[2], seed: +art[3], id: `nd-${art[1]}-${art[2]}` });
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' }).end(svg);
    } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); }
    return;
  }
  let file = resolvePath(path);
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
