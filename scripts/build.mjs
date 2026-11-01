// Builds the static site into dist/: the app, the renderer source, and every
// illustration and icon as a plain SVG file (for direct links, agents and no-JS visitors).
import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { renderIllustration, catalog } from '../src/render.js';
import { renderIcon, ICONS } from '../src/icons/render.js';
import { ICON_STYLES, STATES, GENRE } from '../src/core/tokens.js';
import { SUBJECTS } from '../src/subjects.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = join(root, 'dist');
const SITE = 'https://neurodelic.vincedotcode.com';
const t0 = Date.now();

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'site'), dist, { recursive: true });
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'SKILL.md'), join(dist, 'neurodelic.skill.md'));

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Neurodelic</title><link rel="icon" href="/favicon.png"><style>body{margin:0;padding:32px;background:#08070b;color:#f3efe6;font:15px/1.5 system-ui,sans-serif}a{color:inherit}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}img{width:100%;border-radius:10px;background:#15131a}li span{display:block;font:12px ui-monospace,monospace;color:#9a94a6;margin-top:6px}</style></head><body><p><a href="/">← Neurodelic</a></p><h1>${title}</h1>${body}</body></html>`;

// Illustrations
await mkdir(join(dist, 'art'), { recursive: true });
let artBytes = 0;
const items = catalog();
for (const it of items) {
  for (const aspect of ['square', 'wide']) {
    const svg = renderIllustration({ subject: it.subject, state: it.state, aspect, id: `nd-${it.subject}-${it.state}` });
    artBytes += svg.length;
    await writeFile(join(dist, 'art', `${it.key}${aspect === 'wide' ? '--wide' : ''}.svg`), svg);
  }
}
await writeFile(join(dist, 'art', 'index.html'), page('Illustrations', `<ul>${items.map((it) => `<li><a href="${it.key}.svg"><img loading="lazy" src="${it.key}.svg" alt="${it.title}, ${it.stateName}"><span>${it.key}.svg</span></a></li>`).join('')}</ul>`));

// Icons
const iconNames = Object.keys(ICONS);
for (const s of ICON_STYLES) {
  await mkdir(join(dist, 'icons', s.id), { recursive: true });
  for (const name of iconNames) await writeFile(join(dist, 'icons', s.id, `${name}.svg`), renderIcon(name, { style: s.id, id: `nd-${name}` }));
}
await writeFile(join(dist, 'icons', 'index.html'), page('Icons', ICON_STYLES.map((s) => `<h2>${s.name}</h2><ul style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">${iconNames.map((n) => `<li><a href="${s.id}/${n}.svg" style="color:#f3efe6"><img loading="lazy" src="${s.id}/${n}.svg" alt="${n}" style="background:#f3efe6;padding:14px;box-sizing:border-box"><span>${n}</span></a></li>`).join('')}</ul>`).join('')));

// Machine-readable index for agents and tools
await writeFile(join(dist, 'catalog.json'), JSON.stringify({
  genre: GENRE,
  states: STATES.map(({ id, name, mood, summary, texture, rules, palettes }) => ({ id, name, mood, summary, texture, rules, palettes: Object.keys(palettes) })),
  subjects: SUBJECTS.map(({ id, title, line, use }) => ({ id, title, line, use })),
  icons: { styles: ICON_STYLES.map((s) => s.id), names: iconNames },
  files: { art: `${SITE}/art/{subject}--{state}.svg`, artWide: `${SITE}/art/{subject}--{state}--wide.svg`, icons: `${SITE}/icons/{style}/{name}.svg` },
}, null, 2));

// SEO
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/art/', '/icons/'].map((p) => `<url><loc>${SITE}${p}</loc></url>`).join('')}</urlset>\n`);

console.log(`Built dist/ in ${Date.now() - t0}ms: ${items.length * 2} illustrations (${(artBytes / 1048576).toFixed(1)} MB), ${iconNames.length * ICON_STYLES.length} icon files.`);
