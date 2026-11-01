// Ember: thousands of pen strokes. A hatched body, a scratched ground,
// and a fire that lights everything near it.

import { P, dots } from '../core/path.js';
import { hatch, bodyPath, tangent, grain, blur, resample, mix } from '../core/marks.js';
import { mindAt } from '../figures.js';

export function ember(S, pal, { rand, id, density = 1 }) {
  const { W, H, body, heat, noise } = S;
  const f0 = S.focal;
  const sc = W / 400;
  const defs = [];

  // Fire sites: along every guide, and at the focal point.
  const sites = [];
  for (const g of S.motif.guides) {
    const rs = resample(g.pts, Math.max(10, S.R * 0.22));
    for (const p of rs) if (p[0] > -20 && p[1] > -20 && p[0] < W + 20 && p[1] < H + 20) sites.push({ x: p[0], y: p[1], s: (g.w ?? 1) * (g.frag || g.ray ? 0.5 : 1) });
  }
  sites.push({ x: f0[0], y: f0[1], s: 1.6, focal: true });
  while (sites.length > 72) sites.splice(Math.floor(rand() * (sites.length - 1)), 1);
  const lightAt = (x, y) => {
    let l = 0;
    for (let i = 0; i < sites.length; i += 3) { const s = sites[i]; const d = Math.hypot(x - s.x, y - s.y); l += s.s * Math.exp(-d / (S.R * 0.9)); }
    return Math.min(1, l * 0.55 + heat.at(x, y) * 0.5);
  };

  // The ground: short strokes laid along the heat, scratched in four reds.
  const groundLines = pal.hatch.map(() => []);
  const strokes = hatch(W, H, 6 / Math.sqrt(density), {
    angle: (x, y) => { const a = Math.atan2(y - f0[1], x - f0[0]); return a * 0.6 + (-Math.PI / 2) * 0.4 + noise.n2(x * 0.01, y * 0.01) * 0.5; },
    length: (x, y) => 11 + 18 * lightAt(x, y),
    keep: (x, y) => (body.at(x, y) > -1 ? 0 : 1),
    jitter: 0.5,
  }, rand);
  for (const l of strokes) {
    const lit = lightAt(l[0][0], l[0][1]);
    const k = lit > 0.55 && rand() < lit ? 2 : rand() < 0.5 ? 0 : rand() < 0.6 ? 1 : 3;
    groundLines[k].push(l);
  }

  // The body: engraved strokes that follow its form, lit on the side facing the fire.
  const bodyDark = [], bodyLit = [], bodyHot = [];
  const bodyStrokes = hatch(W, H, 3.6 / Math.sqrt(density), {
    angle: (x, y) => tangent(S, x, y),
    length: () => 7,
    keep: (x, y) => (body.at(x, y) > 0.8 ? 1 : 0),
    jitter: 0.2,
  }, rand);
  for (const l of bodyStrokes) {
    const [x, y] = l[0];
    const [gx, gy] = body.grad(x, y, 2);
    const gl = Math.hypot(gx, gy) || 1;
    const fx = f0[0] - x, fy = f0[1] - y, fl = Math.hypot(fx, fy) || 1;
    const facing = Math.max(0, (-gx / gl) * (fx / fl) + (-gy / gl) * (fy / fl));
    const lit = lightAt(x, y) * (0.35 + 0.65 * facing) * Math.exp(-body.at(x, y) / 26);
    if (lit > 0.5) bodyHot.push(l);
    else if (lit > 0.16 || rand() < 0.12) bodyLit.push(l);
    else if (rand() < 0.5) bodyDark.push(l);
  }

  // Flames: tongues of fire, outer to inner.
  // Flames that start inside the body burn behind it, so the figure stays readable;
  // the focal fire (where the thought starts) burns in front.
  const layers = pal.flame.map(() => []);
  const behind = pal.flame.map(() => []);
  for (const s of sites) {
    const hgt = S.R * rand.range(0.35, 0.95) * Math.min(1.4, s.s), wid = hgt * rand.range(0.3, 0.5);
    let crosses = false;
    for (let t = 0; t <= 1 && !crosses; t += 0.2) crosses = body.at(s.x, s.y - hgt * t) > -2;
    // The focal fire burns in front only when it starts in a mind; anywhere else on a body it goes behind.
    const inMind = S.figs.some((f) => mindAt(f, s.x, s.y) > -0.6);
    const into = crosses && !(s.focal && inMind) ? behind : layers;
    const sway = rand.range(-0.5, 0.5);
    // Each tongue is hatched, not filled: pen strokes run from the base to the tip,
    // packed tighter and hotter toward the core.
    const centre = (t) => s.x + sway * hgt * t * t + noise.n2(s.x * 0.05 + t * 2, s.y * 0.05) * wid * 0.3 * t;
    for (let k = 0; k < layers.length; k++) {
      const m = 1 - k * 0.22;
      const half = (t) => wid * m * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - t * 0.2);
      const ns = Math.max(2, Math.round((wid * m * 2) / ((3.1 - k * 0.35) * sc)));
      const strokes = [];
      for (let j = 0; j < ns; j++) {
        const u = -1 + (2 * (j + 0.5)) / ns + rand.gauss() * 0.05;
        const tEnd = (1 - Math.abs(u) ** 1.6 * 0.55) * rand.range(0.86, 1);
        const pts = [];
        for (let i = 0; i <= 6; i++) {
          const t = 0.02 + (tEnd - 0.02) * (i / 6);
          pts.push([centre(t) + u * half(t) * 0.94, s.y - hgt * m * t]);
        }
        strokes.push(P(pts));
      }
      into[k].push(strokes.join(''));
    }
  }
  // Sparks rising off the fire.
  const sparks = [];
  for (let i = 0; i < 90 * density; i++) {
    const s = sites[Math.floor(rand() * sites.length)];
    sparks.push([s.x + rand.gauss() * S.R * 0.5, s.y - rand() ** 0.6 * S.R * 1.8]);
  }
  // Rays: bright strokes thrown out from the heart of the fire.
  const rays = [];
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, r0 = S.R * rand.range(0.5, 1), r1 = r0 + S.R * rand.range(0.6, 2.4);
    rays.push([[f0[0] + Math.cos(a) * r0, f0[1] + Math.sin(a) * r0], [f0[0] + Math.cos(a) * r1, f0[1] + Math.sin(a) * r1]]);
  }

  defs.push(blur(`${id}-glow`, 18 * sc, 80), blur(`${id}-soft`, 0.7, 10), grain(`${id}-gr`, { freq: 0.9, opacity: 0.2, mode: 'overlay', seed: rand.int(1, 999) }));
  const pathOf = (ls) => ls.map((l) => P(l)).join('');
  const fig = bodyPath(S, 0);
  const out = [
    `<g filter="url(#${id}-gr)">`,
    `<rect width="${W}" height="${H}" fill="${pal.bg}"/>`,
    `<g class="nd-field" fill="none" stroke-linecap="round">`,
    groundLines.map((ls, i) => `<path d="${pathOf(ls)}" stroke="${pal.hatch[i]}" stroke-width="${i === 2 ? 1.1 : 0.9}" opacity="${[0.7, 0.75, 0.9, 0.6][i]}"/>`).join(''),
    `<path d="${pathOf(rays)}" stroke="${pal.flame[2]}" stroke-width=".7" opacity=".45"/>`,
    '</g>',
    `<g filter="url(#${id}-glow)" opacity=".75" style="mix-blend-mode:screen">${sites.filter((_, i) => i % 2 === 0).map((s) => `<circle cx="${s.x.toFixed(0)}" cy="${(s.y - S.R * 0.3).toFixed(0)}" r="${(S.R * 0.55 * Math.min(1.5, s.s)).toFixed(0)}" fill="${pal.glow}"/>`).join('')}</g>`,
    behind.some((l) => l.length) ? `<g class="nd-motif">${behind.map((ls, i) => (ls.length ? `<path d="${ls.join('')}" fill="none" stroke="${pal.flame[i]}" stroke-width="${((1.5 - i * 0.12) * sc).toFixed(2)}" stroke-linecap="round"/>` : '')).join('')}</g>` : '',
    `<path d="${fig}" fill="${pal.ink}" fill-rule="evenodd"/>`,
    `<g fill="none" stroke-linecap="round"><path d="${pathOf(bodyDark)}" stroke="${pal.hatch[3]}" stroke-width=".8" opacity=".7"/><path d="${pathOf(bodyLit)}" stroke="${pal.hatch[1]}" stroke-width=".85" opacity=".8"/><path d="${pathOf(bodyHot)}" stroke="${pal.flame[2]}" stroke-width=".95"/></g>`,
    `<g class="nd-motif">${layers.map((ls, i) => `<path d="${ls.join('')}" fill="none" stroke="${pal.flame[i]}" stroke-width="${((1.5 - i * 0.12) * sc).toFixed(2)}" stroke-linecap="round"/>`).join('')}`,
    `<path d="${dots(sparks)}" stroke="${pal.flame[3]}" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>`,
    '</g>',
  ];
  return { defs: defs.join(''), body: out.join('') };
}
