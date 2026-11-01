// Haze: colour fog and heavy grain, a blurred figure that bleeds colour at its rim.

import { P } from '../core/path.js';
import { bodyPath, grain, blur } from '../core/marks.js';

export function haze(S, pal, { rand, id, density = 1 }) {
  const { W, H } = S;
  const cols = pal.colors;
  const big = Math.max(W, H);

  // Fog: big soft blobs, some where the feeling is, some anywhere.
  const blobs = [];
  const seeds = [S.focal, ...S.motif.orbs.map((o) => [o.x, o.y])];
  for (const g of S.motif.guides) if (g.pts.length > 4 && rand() < 0.5) seeds.push(g.pts[Math.floor(g.pts.length * rand())]);
  const n = rand.int(6, 9);
  for (let i = 0; i < n; i++) {
    const p = i < seeds.length && rand() < 0.7 ? seeds[i] : [rand() * W, rand() * H];
    blobs.push(`<circle cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${(big * rand.range(0.14, 0.36)).toFixed(0)}" fill="${cols[i % cols.length]}" opacity="${rand.range(0.55, 0.95).toFixed(2)}"/>`);
  }

  // Light trails along the guides, and bokeh for orbs.
  const trails = [], cores = [];
  for (const g of S.motif.guides) {
    if (g.pts.length < 2) continue;
    const d = P(g.pts, !!g.closed);
    const w = (g.ribbon ? g.ribbon * 0.8 : 4 + (g.w ?? 1) * 9) * density;
    trails.push(`<path d="${d}" stroke="${rand.pick(cols)}" stroke-width="${w.toFixed(1)}"/>`);
    cores.push(`<path d="${d}" stroke-width="${(g.ray || g.frag ? 1.2 : 1.6).toFixed(1)}"/>`);
  }
  const bokeh = S.motif.orbs.map((o) => `<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${o.r.toFixed(1)}" fill="#fff" opacity=".75"/>`
    + `<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${(o.r * 1.35).toFixed(1)}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/>`).join('');

  // The mind glows through the figure, faintly.
  const minds = S.figs.map((f) => `<ellipse cx="${f.mind.x.toFixed(1)}" cy="${f.mind.y.toFixed(1)}" rx="${(f.mind.rx * 0.8).toFixed(1)}" ry="${(f.mind.ry * 0.8).toFixed(1)}" fill="${rand.pick(cols)}"/>`).join('');

  const body = bodyPath(S, 0);
  const fb = (W / 400) * 26;
  const defs = blur(`${id}-fog`, fb.toFixed(1), 60) + blur(`${id}-tr`, 5, 40) + blur(`${id}-co`, 1.4, 20) + blur(`${id}-bo`, 2.5, 40)
    + blur(`${id}-halo`, 7, 40) + blur(`${id}-edge`, 1.6, 20) + blur(`${id}-mind`, 9, 60)
    + grain(`${id}-gr`, { freq: 0.95, opacity: 0.42, mode: 'overlay', seed: rand.int(1, 999) })
    + `<radialGradient id="${id}-vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>`;

  const out = [
    `<g filter="url(#${id}-gr)">`,
    `<rect width="${W}" height="${H}" fill="${pal.bg}"/>`,
    `<g class="nd-field" filter="url(#${id}-fog)">${blobs.join('')}</g>`,
    `<g class="nd-motif"><g fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#${id}-tr)">${trails.join('')}</g>`,
    `<g fill="none" stroke="#fff" stroke-linecap="round" opacity=".85" filter="url(#${id}-co)">${cores.join('')}</g>`,
    `<g filter="url(#${id}-bo)">${bokeh}</g></g>`,
    `<path d="${body}" fill="${pal.halo}" fill-rule="evenodd" opacity=".85" filter="url(#${id}-halo)"/>`,
    `<path d="${body}" fill="#18E0FF" fill-rule="evenodd" opacity=".55" transform="translate(-2.6 .4)" filter="url(#${id}-edge)" style="mix-blend-mode:screen"/>`,
    `<path d="${body}" fill="${pal.halo}" fill-rule="evenodd" opacity=".7" transform="translate(2.4 -.3)" filter="url(#${id}-edge)"/>`,
    `<path d="${body}" fill="${pal.ink}" fill-rule="evenodd" filter="url(#${id}-edge)"/>`,
    `<g opacity=".42" filter="url(#${id}-mind)" style="mix-blend-mode:screen">${minds}</g>`,
    `<rect width="${W}" height="${H}" fill="url(#${id}-vig)"/>`,
    '</g>',
  ];
  return { defs, body: out.join('') };
}
