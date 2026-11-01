// Burst: paint shards fly out of one point, with patterns, drips and splatter.

import { P } from '../core/path.js';
import { bodyLoops, bodyPath, grain, blur, mix } from '../core/marks.js';
import { isolines, cleanLoop, Grid } from '../core/field.js';

export function burst(S, pal, { rand, id, density = 1 }) {
  const { W, H, noise } = S;
  const cols = pal.colors;
  const ink = pal.ink;
  const f0 = S.focal;
  const defs = [];
  const sc = W / 400;

  // Patterns that some shards are filled with.
  const pat = (name, w, h, inner, bg) => `<pattern id="${id}-${name}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rand.int(0, 90)})"><rect width="${w}" height="${h}" fill="${bg}"/>${inner}</pattern>`;
  const accent = cols[0], dark = cols[1], soft = cols[4] || pal.bg;
  defs.push(pat('leo', 14, 14, `<path d="M3 3c2-1 4 0 4 2s-3 2-4 1-1-2 0-3zM10 9c2 0 3 1 3 3s-2 1-3 1-2-3 0-4z" fill="${dark}"/><circle cx="11" cy="3" r="1.2" fill="${dark}"/>`, accent));
  defs.push(pat('str', 6, 6, `<rect width="3" height="6" fill="${dark}"/>`, soft));
  defs.push(pat('dot', 6, 6, `<circle cx="3" cy="3" r="1.4" fill="${dark}"/>`, cols[2]));
  defs.push(pat('chk', 10, 10, `<rect width="5" height="5" fill="${dark}"/><rect x="5" y="5" width="5" height="5" fill="${dark}"/>`, cols[3]));
  const fills = [...cols, ...cols.slice(0, 3), `url(#${id}-leo)`, `url(#${id}-str)`, `url(#${id}-dot)`, `url(#${id}-chk)`];

  // A paint shard: a tapering, slightly curved blade with a torn edge.
  const shard = (x, y, a, len, w0, bend) => {
    const n = Math.max(6, Math.round(len / 5));
    const left = [], right = [];
    let ang = a;
    let px = x, py = y;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = w0 * (1 - Math.pow(t, 1.4)) * (0.7 + 0.6 * Math.abs(noise.n2(px * 0.05, py * 0.05)));
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const tear = () => noise.n2(px * 0.09 + i * 0.2, py * 0.09) * w0 * 0.28 + (rand() < 0.05 ? -w0 * 0.3 : 0);
      left.push([px + nx * (w / 2 + tear()), py + ny * (w / 2 + tear())]);
      right.push([px - nx * (w / 2 + tear()), py - ny * (w / 2 + tear())]);
      ang += bend / n;
      px += Math.cos(ang) * (len / n); py += Math.sin(ang) * (len / n);
    }
    return { poly: [...left, ...right.reverse()], spine: left.map((p, i) => [(p[0] + right[right.length - 1 - i][0]) / 2, (p[1] + right[right.length - 1 - i][1]) / 2]), tip: [px, py], ang };
  };

  const back = [], front = [], streaks = [], drips = [];
  const R = S.R;
  const nRadial = Math.round(rand.int(24, 36) * density);
  for (let i = 0; i < nRadial; i++) {
    const a = rand() * Math.PI * 2;
    const flowA = S.flow(f0[0] + Math.cos(a) * R, f0[1] + Math.sin(a) * R);
    const ang = a * 0.65 + flowA * 0.35;
    const r0 = R * rand.range(0.05, 0.85);
    const len = R * rand.range(0.9, 3.4) * (rand() < 0.2 ? 1.5 : 1);
    const s = shard(f0[0] + Math.cos(a) * r0, f0[1] + Math.sin(a) * r0 * 0.8, ang, len, rand.range(14, 46) * sc * (len / (R * 2)) ** 0.3, rand.range(-0.9, 0.9));
    const fill = rand.pick(fills);
    const svg = `<path d="${P(s.poly, true)}" fill="${fill}"/>`;
    (r0 < R * 0.35 && rand() < 0.5 ? front : back).push(svg);
    if (rand() < 0.7) for (const off of [-0.18, 0.12]) streaks.push(P(s.spine.slice(1, -2).map(([x, y], k, arr) => { const [ax, ay] = arr[Math.max(0, k - 1)], [bx, by] = arr[Math.min(arr.length - 1, k + 1)]; const l = Math.hypot(bx - ax, by - ay) || 1; return [x - ((by - ay) / l) * off * 14 * sc, y + ((bx - ax) / l) * off * 14 * sc]; })));
    if (rand() < 0.08) drips.push([s.tip[0], s.tip[1], rand.range(10, 50) * sc, fill.startsWith('url') ? ink : fill]);
  }
  // Shards that ride the motif's guides.
  for (const g of S.motif.guides) {
    if (g.pts.length < 3) continue;
    const k = Math.min(6, Math.max(1, Math.round(g.pts.length / 18)));
    for (let j = 0; j < k; j++) {
      const idx = Math.floor((j / k) * (g.pts.length - 2));
      const [x, y] = g.pts[idx], [x2, y2] = g.pts[Math.min(g.pts.length - 1, idx + 3)];
      const s = shard(x, y, Math.atan2(y2 - y, x2 - x), R * rand.range(0.5, 1.4), rand.range(4, 12) * sc * (g.w ?? 1), rand.range(-0.4, 0.4));
      back.push(`<path d="${P(s.poly, true)}" fill="${rand.pick(fills)}"/>`);
    }
  }

  // Splatter: drops thrown out from the centre, stretched by their speed.
  const drops = cols.map(() => []);
  const nDrops = Math.round(140 * density);
  for (let i = 0; i < nDrops; i++) {
    const a = rand() * Math.PI * 2, d = R * (0.6 + rand() ** 0.6 * 4);
    const x = f0[0] + Math.cos(a) * d, y = f0[1] + Math.sin(a) * d;
    const r = Math.max(0.6, 4.5 * rand() ** 3) * sc;
    const st = r < 1.5 && rand() < 0.6 ? 3 : 1;
    drops[rand.int(0, cols.length - 1)].push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * st).toFixed(1)}" ry="${r.toFixed(1)}" transform="rotate(${((a * 180) / Math.PI).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }
  // A few big splats.
  const splats = [];
  for (let i = rand.int(2, 4); i > 0; i--) {
    const a = rand() * 6.28, d = R * rand.range(1.2, 3);
    const cx = f0[0] + Math.cos(a) * d, cy = f0[1] + Math.sin(a) * d, r = rand.range(5, 12) * sc;
    const pts = [];
    for (let k = 0; k < 24; k++) { const t = (k / 24) * 6.28; const rr = r * (1 + (k % 3 === 0 ? rand.range(0.2, 0.7) : rand.range(-0.1, 0.15))); pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
    splats.push(`<path d="${P(pts, true)}" fill="${rand.pick(cols)}"/>`);
  }

  // The figure: solid ink, its parts drawn in with thin lines, stripes on the sleeves.
  const fig = bodyPath(S, 0);
  const partLines = [];
  for (const f of S.figs) for (const p of f.parts) {
    if (!/arm|hand/.test(p.name)) continue;
    const g = Grid.of(W, H, 2, (x, y) => -p.sdf(x, y));
    for (const l of isolines(g, 0)) partLines.push(P(cleanLoop(l.pts, l.closed, 0.5), l.closed));
  }
  const stripes = [];

  defs.push(blur(`${id}-wash`, 30 * sc, 80), grain(`${id}-gr`, { freq: 0.7, opacity: 0.2, mode: 'multiply', seed: rand.int(1, 999) }));
  const out = [
    `<g filter="url(#${id}-gr)">`,
    `<rect width="${W}" height="${H}" fill="${pal.bg}"/>`,
    `<g class="nd-field" filter="url(#${id}-wash)" opacity=".35"><circle cx="${f0[0].toFixed(0)}" cy="${f0[1].toFixed(0)}" r="${(R * 2.4).toFixed(0)}" fill="${accent}"/><circle cx="${(f0[0] + R).toFixed(0)}" cy="${(f0[1] - R * 0.6).toFixed(0)}" r="${(R * 1.4).toFixed(0)}" fill="${cols[2]}"/></g>`,
    `<g class="nd-motif">${back.join('')}`,
    `<path d="${streaks.join('')}" fill="none" stroke="${pal.bg}" stroke-width=".8" opacity=".45" stroke-linecap="round"/>`,
    drips.map(([x, y, l, c]) => `<path d="M${x.toFixed(1)} ${y.toFixed(1)}v${l.toFixed(1)}" stroke="${c}" stroke-width="${(2 * sc).toFixed(1)}" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${(y + l).toFixed(1)}" r="${(2.2 * sc).toFixed(1)}" fill="${c}"/>`).join(''),
    drops.map((d, i) => (d.length ? `<g fill="${cols[i]}">${d.join('')}</g>` : '')).join(''),
    splats.join(''),
    '</g>',
    `<path d="${fig}" fill="${ink}" fill-rule="evenodd"/>`,
    `<path d="${partLines.join('')}" fill="none" stroke="${mix(ink, pal.bg, 0.45)}" stroke-width="${(1.1 * sc).toFixed(1)}" opacity=".9"/>`,
    `<path d="${stripes.join('')}" fill="none" stroke="${accent}" stroke-width="${(2.2 * sc).toFixed(1)}" stroke-linecap="round" opacity=".9"/>`,
    `<g class="nd-motif">${front.join('')}</g>`,
    '</g>',
  ];
  return { defs: defs.join(''), body: out.join('') };
}
