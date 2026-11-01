// Thermal: a false-colour scan of a body feeling something.
// Tissue, folds and bone give it structure; the feeling gives it heat.

import { Grid } from '../core/field.js';
import { regionPath } from '../core/marks.js';
import { mindAt } from '../figures.js';

export function thermal(S, pal, { rand, id, density = 1 }) {
  const { W, H, noise, body, heat } = S;
  const ramp = pal.ramp;
  const ox = rand() * 50, oy = rand() * 50;
  const spines = S.figs.filter((f) => f.spine).map((f) => ({ f, pts: f.spine }));
  const vert = (x, y) => {
    let best = 0;
    for (const { f, pts } of spines) {
      const step = 15 * f.at.s;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.floor(L / step));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
          const dx = x - cx, dy = y - cy;
          const r = 6.2 * f.at.s;
          const v = Math.exp(-(dx * dx * 0.7 + dy * dy * 1.6) / (2 * r * r));
          if (v > best) best = v;
        }
      }
    }
    return best;
  };
  const T = Grid.of(W, H, 2, (x, y) => {
    const v = body.at(x, y);
    const h = heat.at(x, y);
    if (v <= 0) {
      // Outside: a faint aura round the body, and the feeling leaking out.
      return 0.12 * Math.exp(v / 9) + Math.max(0, h - 0.22) * 0.75 * (0.7 + 0.3 * noise.fbm(x * 0.03 + ox, y * 0.03, 2));
    }
    let t = 0.27 + 0.2 * noise.warp(x * 0.012 + ox, y * 0.012 + oy, 1.4, 3) + 0.18 * Math.min(1, v / 45);
    t += 0.3 * Math.exp(-v / 4.5);
    t -= 0.13 * Math.exp(-((v - 11) ** 2) / 26);
    for (const f of S.figs) {
      const m = mindAt(f, x, y);
      if (m > -0.08) {
        const sc = 0.085 / Math.max(0.6, f.at.s);
        const folds = noise.ridged(x * sc + ox + noise.n2(x * 0.025, y * 0.025) * 0.9, y * sc + oy + noise.n2(y * 0.025, x * 0.025) * 0.9, 3);
        const k = Math.min(1, (m + 0.08) * 5);
        t = t * (1 - k) + (0.5 + 0.48 * folds) * k;
      }
      if (f.eye) {
        const d = Math.hypot(x - f.eye[0], y - f.eye[1]) / (9 * f.at.s);
        if (d < 1.6) t = t * (1 - Math.exp(-d * d * 2)) + (0.18 + 0.5 * Math.exp(-((d - 1) ** 2) * 6)) * Math.exp(-d * d * 2);
      }
    }
    if (spines.length) t = Math.max(t, 0.25 + vert(x, y) * 0.55);
    return t + h * 0.4 * (0.8 + 0.2 * noise.n2(x * 0.04, y * 0.04));
  });

  const N = ramp.length - 1;
  const defs = [];
  const fills = [];
  const lines = [];
  for (let k = 1; k <= N; k++) {
    const level = 0.05 + (k - 1) * (0.86 / (N - 1)) * (0.92 + 0.16 * (k / N));
    const d = regionPath(T, level, 0.5, 8);
    if (!d) continue;
    defs.push(`<path id="${id}-b${k}" d="${d}"/>`);
    fills.push(`<use href="#${id}-b${k}" fill="${ramp[k]}"/>`);
    lines.push(`<use href="#${id}-b${k}"/>`);
  }
  const texture = `<filter id="${id}-tx" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${(0.03 + rand() * 0.02).toFixed(3)}" numOctaves="3" seed="${rand.int(1, 999)}" result="t"/>`
    + `<feDiffuseLighting in="t" surfaceScale="${(2.2 * density).toFixed(1)}" diffuseConstant="1.15" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>`
    + '<feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1=".8" k2=".32" k3="0" k4="0"/></filter>';
  defs.push(texture);
  const body2 = [
    `<rect width="${W}" height="${H}" fill="${ramp[0]}"/>`,
    `<g class="nd-field" fill-rule="evenodd" filter="url(#${id}-tx)">${fills.join('')}`,
    `<g fill="none" stroke-linejoin="round"><g stroke="#000" stroke-opacity=".38" stroke-width=".9" transform="translate(.7 .8)">${lines.join('')}</g>`,
    `<g stroke="#fff" stroke-opacity=".2" stroke-width=".6" transform="translate(-.5 -.5)">${lines.join('')}</g></g></g>`,
  ];
  // The hottest bands glow on and off, like a live scan.
  const hot = fills.slice(-3, -1).map((u) => u.replace(/fill="[^"]+"/, `fill="${ramp[N]}"`));
  body2.push(`<g class="nd-motif" fill-rule="evenodd" opacity=".5">${hot.join('')}</g>`);
  return { defs: defs.join(''), body: body2.join(''), motion: 'glow' };
}
