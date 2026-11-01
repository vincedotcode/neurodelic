// Tangle: the body drawn with dozens of loose contour lines, and a knot of
// colour where the thinking happens.

import { P } from '../core/path.js';
import { streamline, simplify } from '../core/field.js';
import { bodyLoops, handLine, breakLine, tangent } from '../core/marks.js';

export function tangle(S, pal, { rand, density = 1 }) {
  const { W, H, noise, body } = S;
  const out = [];
  out.push(`<rect width="${W}" height="${H}" fill="${pal.bg}"/>`);

  // The body: contour lines stepping inwards, every one drawn by hand.
  const levels = [0, 1.6, 3.6, 6.2, 9.5, 13.5, 18.5, 25];
  const bodyLines = [];
  levels.forEach((lv, i) => {
    for (const loop of bodyLoops(S, lv, 10)) {
      const passes = i === 0 ? 3 : i < 3 ? 2 : 1;
      for (let p = 0; p < passes; p++) {
        const line = handLine(loop.pts, rand, i === 0 ? 1.1 : 1.6, 3, loop.closed);
        for (const seg of breakLine(line, rand, 0.985)) bodyLines.push({ d: P(simplify(seg, 0.35)), o: Math.max(0.28, 0.95 - i * 0.07), w: i === 0 ? 1 : 0.75 });
      }
    }
  });

  // Strands that run along the body, like a pencil following the form.
  const strands = [];
  const nStrands = Math.round(180 * density);
  for (let k = 0, tries = 0; k < nStrands && tries < nStrands * 30; tries++) {
    const x = rand() * W, y = rand() * H;
    const v = body.at(x, y);
    if (v < 1 || v > 40) continue;
    k++;
    const dir = rand() < 0.5 ? 0 : Math.PI;
    const pts = streamline(x, y, (px, py) => tangent(S, px, py) + dir + noise.n2(px * 0.02, py * 0.02) * 0.25, { step: 2.5, max: rand.int(20, 70), keep: (px, py) => body.at(px, py) > 0.6, W, H });
    if (pts.length > 4) strands.push(P(simplify(handLine(pts, rand, 0.5, 2.5), 0.35)));
  }

  // The mind: a knot of random walks inside each head.
  const colors = pal.colors;
  const byColor = colors.map(() => []);
  const hueAt = (x, y) => {
    const t = noise.fbm(x * 0.007 + 11, y * 0.007 - 4, 2) * 0.5 + 0.5;
    return Math.floor(((t * 1.7 + rand() * 0.12) % 1) * colors.length);
  };
  const push = (pts) => { if (pts.length > 3) byColor[hueAt(pts[0][0], pts[0][1])].push(P(simplify(pts, 0.45))); };
  const quiet = S.motif.kind === 'void';
  for (const f of S.figs) {
    const m = f.mind;
    const c = Math.cos(-m.rot), sn = Math.sin(-m.rot);
    const inMind = (x, y) => { const dx = x - m.x, dy = y - m.y; const u = (dx * c - dy * sn) / m.rx, v = (dx * sn + dy * c) / m.ry; return u * u + v * v < 1; };
    const walks = Math.round(Math.min(150, Math.max(10, (Math.PI * m.rx * m.ry) / 70)) * density * (quiet ? 0.25 : 1));
    for (let k = 0; k < walks; k++) {
      const a0 = rand() * Math.PI * 2, r0 = Math.sqrt(rand()) * 0.9;
      let x = m.x + Math.cos(a0) * m.rx * r0, y = m.y + Math.sin(a0) * m.ry * r0;
      let a = rand() * Math.PI * 2;
      const pts = [[x, y]];
      const steps = rand.int(30, 90), st = Math.max(1.6, Math.min(2.8, m.rx / 18));
      for (let s2 = 0; s2 < steps; s2++) {
        a += rand.gauss() * 0.55;
        let nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st, t = 0;
        while (!inMind(nx, ny) && t++ < 8) { a += 0.8 + rand(); nx = x + Math.cos(a) * st; ny = y + Math.sin(a) * st; }
        if (t > 8) break;
        x = nx; y = ny; pts.push([x, y]);
      }
      push(pts);
    }
  }

  // Energy: short strokes that follow the motif's flow wherever it is active.
  if (S.motif.base) {
    const base = S.motif.base, flow = S.motif.flow;
    const n = Math.round(260 * density);
    for (let k = 0, tries = 0; k < n && tries < n * 25; tries++) {
      const x = rand() * W, y = rand() * H;
      const v = base(x, y);
      if (v < 0.25 || rand() > v * v) continue;
      k++;
      const len = rand.range(8, 26) * (0.6 + v);
      const pts = streamline(x, y, (px, py) => flow(px, py) + rand.gauss() * 0.08, { step: 2.5, max: Math.round(len / 2.5), W, H });
      push(handLine(pts, rand, 0.5, 2.5));
    }
  }

  // Guides: each one a bundle of coloured strands.
  const guideLines = colors.map(() => []);
  for (const g of S.motif.guides) {
    if (g.pts.length < 2) continue;
    const w = g.w ?? 1;
    const n = g.frag ? 2 : g.ray ? 2 : g.knot ? 3 : Math.round(3 + w * 6);
    const spread = g.frag || g.ray ? 1.2 : 2 + w * 5;
    for (let i = 0; i < n; i++) {
      const off = (rand() - 0.5) * spread * 2;
      const shifted = g.pts.map(([x, y], k, arr) => {
        const [ax, ay] = arr[Math.max(0, k - 1)], [bx, by] = arr[Math.min(arr.length - 1, k + 1)];
        const l = Math.hypot(bx - ax, by - ay) || 1;
        return [x - ((by - ay) / l) * off, y + ((bx - ax) / l) * off];
      });
      const line = handLine(shifted, rand, 1.4, 3, !!g.closed);
      guideLines[rand.int(0, colors.length - 1)].push(P(simplify(line, 0.4)));
    }
    if (g.ribbon) {
      for (let i = 0; i < 12; i++) {
        const off = (i / 11 - 0.5) * g.ribbon;
        const line = handLine(g.pts.map(([x, y], k, arr) => {
          const [ax, ay] = arr[Math.max(0, k - 1)], [bx, by] = arr[Math.min(arr.length - 1, k + 1)];
          const l = Math.hypot(bx - ax, by - ay) || 1;
          const t = k / arr.length;
          return [x - ((by - ay) / l) * off * (0.3 + 0.7 * t), y + ((bx - ax) / l) * off * (0.3 + 0.7 * t)];
        }), rand, 1.2, 3);
        guideLines[Math.floor(i / 2) % colors.length].push(P(simplify(line, 0.4)));
      }
    }
  }
  // Orbs: scribbled moons, a few loose passes round the rim.
  const orbLines = [];
  for (const o of S.motif.orbs) {
    const col = rand.pick(colors);
    const passes = o.r > 30 ? 4 : 3;
    for (let p = 0; p < passes; p++) {
      const ring = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; ring.push([o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r]); }
      orbLines.push({ d: P(handLine(ring, rand, Math.max(0.8, o.r * 0.04), 3, true)), c: col });
    }
    const fill = [];
    let a = rand() * 6;
    for (let i = 0; i < Math.min(160, o.r * 4); i++) {
      a += 0.9 + rand() * 0.5;
      const r = o.r * Math.sqrt(rand()) * 0.92;
      fill.push([o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]);
    }
    orbLines.push({ d: P(fill), c: col, thin: true });
  }

  const ink = pal.ink;
  out.push(`<g class="nd-field" fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">`);
  out.push(`<path d="${strands.join('')}" stroke-width=".55" opacity=".42"/>`);
  for (const bucket of [[0.28, 0.5], [0.5, 0.75], [0.75, 1.01]]) {
    const ls = bodyLines.filter((l) => l.o >= bucket[0] && l.o < bucket[1]);
    if (ls.length) out.push(`<path d="${ls.map((l) => l.d).join('')}" stroke-width="${bucket[1] > 1 ? 0.95 : 0.7}" opacity="${((bucket[0] + bucket[1]) / 2).toFixed(2)}"/>`);
  }
  out.push('</g>');
  out.push(`<g class="nd-motif" fill="none" stroke-linecap="round" stroke-linejoin="round">`);
  byColor.forEach((ds, i) => { if (ds.length) out.push(`<path d="${ds.join('')}" stroke="${colors[i]}" stroke-width=".8" opacity=".9"/>`); });
  guideLines.forEach((ds, i) => { if (ds.length) out.push(`<path d="${ds.join('')}" stroke="${colors[i]}" stroke-width="1.05" opacity=".95"/>`); });
  for (const o of orbLines) out.push(`<path d="${o.d}" stroke="${o.c}" stroke-width="${o.thin ? 0.45 : 0.9}"${o.thin ? ' opacity=".6"' : ''}/>`);
  out.push('</g>');
  return { body: out.join('') };
}
