// Wall: every thought written down at once. A wall of glowing handwriting,
// one still figure in front of it.

import { P } from '../core/path.js';
import { bodyPath, handLine, blur, grain } from '../core/marks.js';

// One cursive word as a polyline: humps, loops, ascenders and descenders.
function word(x0, base, xh, len, rand, slope) {
  const pts = [[x0, base - xh * 0.3]];
  let x = x0;
  const end = x0 + len;
  while (x < end) {
    const r = rand();
    const w = xh * rand.range(0.75, 1.15);
    const y = (dy) => base + dy + (x - x0) * slope;
    if (r < 0.3) pts.push([x + w * 0.15, y(-xh)], [x + w * 0.55, y(-xh * 1.05)], [x + w * 0.85, y(-xh * 0.35)], [x + w, y(0)]);
    else if (r < 0.52) pts.push([x + w * 0.65, y(-xh)], [x + w * 0.2, y(-xh * 0.55)], [x + w * 0.45, y(0)], [x + w, y(-xh * 0.5)]);
    else if (r < 0.66) pts.push([x + w * 0.6, y(-xh * 0.65)], [x + w * 0.3, y(-xh * 0.7)], [x + w * 0.35, y(-xh * 0.1)], [x + w, y(-xh * 0.1)]);
    else if (r < 0.82) pts.push([x + w * 0.55, y(-xh * 2.1)], [x + w * 0.25, y(-xh * 1.9)], [x + w * 0.45, y(0)], [x + w, y(-xh * 0.3)]);
    else if (r < 0.94) pts.push([x + w * 0.5, y(-xh * 0.85)], [x + w * 0.3, y(-xh * 0.2)], [x + w * 0.6, y(xh * 1)], [x + w * 0.35, y(xh * 0.85)], [x + w, y(-xh * 0.25)]);
    else pts.push([x + w * 0.4, y(-xh * 0.9)], [x + w * 0.6, y(0)], [x + w, y(-xh * 0.4)]);
    x += w;
  }
  return pts;
}

export function wall(S, pal, { rand, id, density = 1 }) {
  const { W, H, heat, body } = S;
  const cols = pal.colors;
  const sc = W / 400;
  const defs = [];

  // Two layers of writing: the main rows, and a looser layer written over them at an angle.
  const ink = cols.map(() => []);
  const writeLayer = (lh, angle, cover, cx, cy) => {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const span = Math.hypot(W, H);
    for (let base = -span / 2; base < span / 2; base += lh * rand.range(0.92, 1.08)) {
      let x = -span / 2 + rand() * 20;
      const slope = rand.range(-0.02, 0.02);
      while (x < span / 2) {
        const len = rand.range(14, 58) * sc;
        if (rand() < cover) {
          const pts = word(x, base, lh * rand.range(0.3, 0.42), len, rand, slope).map(([px, py]) => [cx + px * ca - py * sa, cy + px * sa + py * ca]);
          const mid = pts[Math.floor(pts.length / 2)];
          if (mid[0] > -30 && mid[1] > -30 && mid[0] < W + 30 && mid[1] < H + 30 && body.at(mid[0], mid[1]) < 6) {
            const h = heat.at(mid[0], mid[1]);
            let c;
            if (h > 0.45 && rand() < h) c = rand() < 0.6 ? 2 : 0;
            else c = rand.int(0, cols.length - 1);
            ink[c].push(P(pts.map(([px, py]) => [px + rand.gauss() * 0.35, py + rand.gauss() * 0.35])));
          }
        }
        x += len + rand.range(3, 9) * sc;
      }
    }
  };
  const lh = rand.range(10, 13) * sc / Math.sqrt(density);
  writeLayer(lh, rand.range(-0.04, 0.04), 0.92, W / 2, H / 2);
  writeLayer(lh * 1.3, rand.range(0.08, 0.2) * (rand() < 0.5 ? -1 : 1), 0.3, W / 2 + rand.range(-60, 60), H / 2);

  // Starbursts where the feeling is strongest.
  const bursts = [], over = [];
  const centres = [S.focal, ...S.motif.orbs.map((o) => [o.x, o.y])];
  for (const [cx, cy] of centres) {
    const inside = body.at(cx, cy) > 0;
    const n = rand.int(22, 40);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r0 = rand.range(2, 8) * sc, r1 = r0 + S.R * rand.range(0.25, 1.1) * (inside ? 1.5 : 1);
      (inside ? over : bursts).push(P([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]));
    }
  }
  // Guides: bright marks scrawled over the writing.
  const marks = [];
  for (const g of S.motif.guides) {
    if (g.pts.length < 2) continue;
    marks.push(P(handLine(g.pts, rand, 1.4, 3, !!g.closed)));
    if ((g.w ?? 1) > 0.6) marks.push(P(handLine(g.pts, rand, 2, 3, !!g.closed)));
  }

  const fig = bodyPath(S, 0);
  defs.push(blur(`${id}-gl`, 2.4 * sc, 10), blur(`${id}-rim`, 1.6 * sc, 20), grain(`${id}-gr`, { freq: 0.9, opacity: 0.15, seed: rand.int(1, 999) }));
  const weights = [0.85, 0.85, 0.9, 0.8, 0.85, 0.8];
  const out = [
    `<g filter="url(#${id}-gr)">`,
    `<rect width="${W}" height="${H}" fill="${pal.bg}"/>`,
    `<use href="#${id}-txt" filter="url(#${id}-gl)" opacity=".7"/>`,
    `<g id="${id}-txt" class="nd-field" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    ink.map((ds, i) => (ds.length ? `<path d="${ds.join('')}" stroke="${cols[i]}" stroke-width="${(0.85 * sc).toFixed(2)}" opacity="${weights[i % weights.length]}"/>` : '')).join(''),
    '</g>',
    `<g class="nd-motif" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="${bursts.join('')}${marks.join('')}" stroke="${cols[0]}" stroke-width="${(2.4 * sc).toFixed(1)}" filter="url(#${id}-gl)" opacity=".8"/>`,
    `<path d="${bursts.join('')}" stroke="#fff" stroke-width="${(0.9 * sc).toFixed(1)}"/>`,
    `<path d="${marks.join('')}" stroke="${cols[2]}" stroke-width="${(1.5 * sc).toFixed(1)}"/>`,
    '</g>',
    `<path d="${fig}" fill="none" stroke="${pal.rim}" stroke-width="${(3 * sc).toFixed(1)}" filter="url(#${id}-rim)"/>`,
    `<path d="${fig}" fill="${pal.ink}" fill-rule="evenodd"/>`,
    over.length ? `<g class="nd-motif" fill="none" stroke-linecap="round"><path d="${over.join('')}" stroke="${cols[0]}" stroke-width="${(2.2 * sc).toFixed(1)}" filter="url(#${id}-gl)"/><path d="${over.join('')}" stroke="#fff" stroke-width="${(0.8 * sc).toFixed(1)}"/></g>` : '',
    '</g>',
  ];
  return { defs: defs.join(''), body: out.join('') };
}
