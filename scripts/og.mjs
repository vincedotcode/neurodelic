// Renders site/og.png (1200x630) from the repo's own renderer and fonts.
// Optional dev tool: needs Playwright installed globally (it's not a project dependency).
// Usage: node scripts/og.mjs
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { renderIllustration } from '../src/render.js';
import { renderScrawl } from '../src/type/scrawl.js';
import { STATES } from '../src/core/tokens.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const tiles = STATES.map((s, i) => `<div class="t">${renderIllustration({ moment: 'new-idea', state: s.id, seed: 1, animate: false, id: `og${i}` })}</div>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: B; src: url('file://${join(root, 'site/fonts/BricolageGrotesque-latin.woff2')}') format('woff2'); font-weight: 200 800; font-stretch: 75% 100%; }
html, body { margin: 0; }
body { width: 1200px; height: 630px; background: #EBEDEF; color: #14152B; font-family: B; display: grid; grid-template-columns: 470px 1fr; gap: 40px; padding: 56px 56px 56px 64px; box-sizing: border-box; }
.l { display: flex; flex-direction: column; justify-content: space-between; }
.brand { color: #14152B; line-height: 0; }
h1 { margin: 0; font-size: 92px; font-weight: 800; font-stretch: 76%; line-height: .9; letter-spacing: -.035em; }
p { margin: 0; font-size: 22px; line-height: 1.35; color: #3D3E57; }
.pen { color: #2B3BD6; line-height: 0; }
.g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 6px; background: #F6F7F9; align-self: center; box-shadow: 0 10px 24px -14px rgba(20,21,43,.4); }
.t svg { display: block; width: 100%; height: auto; }
</style></head><body><div class="l"><span class="brand">${renderScrawl('NEURODELIC', { capHeight: 22, seed: 4 })}</span><div><h1>Quiet body,<br>loud mind.</h1></div><div><p>An illustration genre for the moments in a product when someone is thinking.</p><p style="margin-top:14px;font-size:18px;color:#5C5D74">1,024 illustrations · icons · type · a UI kit</p></div></div><div class="g">${tiles}</div></body></html>`;

const file = join(root, 'dist', 'og.html');
await writeFile(file, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${file}`);
await page.waitForTimeout(800);
await page.screenshot({ path: join(root, 'site', 'og.png') });
await browser.close();
console.log('Wrote site/og.png');
