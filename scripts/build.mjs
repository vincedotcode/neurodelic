// Builds the static site into dist/: the app, the renderer source, the UI kit, and every
// gallery piece and icon as a plain SVG file (for direct links, agents and no-JS visitors).
import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { renderIllustration, catalog } from '../src/render.js';
import { renderIcon, ICONS } from '../src/icons/render.js';
import { ICON_STYLES, STATES, GENRE } from '../src/core/tokens.js';
import { MOMENTS } from '../src/scene.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = join(root, 'dist');
const SITE = 'https://neurodelic.vincedotcode.com';
const t0 = Date.now();

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'site'), dist, { recursive: true });
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'ui'), join(dist, 'ui'), { recursive: true });
await cp(join(root, 'SKILL.md'), join(dist, 'neurodelic.skill.md'));

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Neurodelic</title><link rel="icon" href="/favicon.png"><style>body{margin:0;padding:32px;background:#EBEDEF;color:#14152B;font:15px/1.5 system-ui,sans-serif}a{color:inherit}h2{margin-top:40px}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}img{width:100%;display:block;background:#DEE1E6;padding:4px;box-sizing:border-box}li span{display:block;font:12px ui-monospace,monospace;color:#5C5D74;margin-top:6px;word-break:break-all}</style></head><body><p><a href="/">← Neurodelic</a></p><h1>${title}</h1>${body}</body></html>`;

// Gallery pieces, square, animated (they go still for reduced motion).
await mkdir(join(dist, 'art'), { recursive: true });
let artBytes = 0;
const items = catalog();
for (const it of items) {
  const svg = renderIllustration({ moment: it.moment, state: it.state, seed: it.seed, id: `nd-${it.moment}-${it.state}-${it.seed}` });
  artBytes += svg.length;
  await writeFile(join(dist, 'art', `${it.key}.svg`), svg);
}
await writeFile(join(dist, 'art', 'index.html'), page(`${items.length} illustrations`, MOMENTS.map((m) => `<h2>${m.title}</h2><ul>${items.filter((it) => it.moment === m.id).map((it) => `<li><a href="${it.key}.svg"><img loading="lazy" src="${it.key}.svg" alt="${it.title}, ${it.stateName}, seed ${it.seed}"><span>${it.key}.svg</span></a></li>`).join('')}</ul>`).join('')));

// Icons
const iconNames = Object.keys(ICONS);
for (const s of ICON_STYLES) {
  await mkdir(join(dist, 'icons', s.id), { recursive: true });
  for (const name of iconNames) await writeFile(join(dist, 'icons', s.id, `${name}.svg`), renderIcon(name, { style: s.id, id: `nd-${name}`, color: s.id === 'neon' ? undefined : 'currentColor' }));
}
await writeFile(join(dist, 'icons', 'index.html'), page('Icons', ICON_STYLES.map((s) => `<h2>${s.name}</h2><ul style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">${iconNames.map((n) => `<li><a href="${s.id}/${n}.svg"><img loading="lazy" src="${s.id}/${n}.svg" alt="${n}" style="padding:14px;background:${s.id === 'neon' ? '#14152B' : '#F6F7F9'}"><span>${n}</span></a></li>`).join('')}</ul>`).join('')));

// Machine-readable index for agents and tools
await writeFile(join(dist, 'catalog.json'), JSON.stringify({
  genre: GENRE,
  api: { module: `${SITE}/src/render.js`, call: 'renderIllustration({ moment, state, seed, palette?, density?, hue?, aspect?, animate? })' },
  states: STATES.map(({ id, name, mood, summary, texture, rules, palettes }) => ({ id, name, mood, summary, texture, rules, palettes: Object.keys(palettes) })),
  moments: MOMENTS.map(({ id, title, line, use }) => ({ id, title, line, use })),
  pieces: items.map(({ key, moment, state, seed, palette }) => ({ key, moment, state, seed, palette, file: `${SITE}/art/${key}.svg` })),
  icons: { styles: ICON_STYLES.map((s) => s.id), names: iconNames, file: `${SITE}/icons/{style}/{name}.svg` },
  ui: { css: `${SITE}/ui/neurodelic.css`, react: `${SITE}/ui/react.jsx` },
}, null, 2));

// SEO
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/art/', '/icons/', '/catalog.json'].map((p) => `<url><loc>${SITE}${p}</loc></url>`).join('')}</urlset>\n`);

console.log(`Built dist/ in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${items.length} illustrations (${(artBytes / 1048576).toFixed(1)} MB), ${iconNames.length * ICON_STYLES.length} icon files.`);
