// Seeded 2D simplex noise, plus the layered variants the renderers draw with.
// Same seed, same field: every picture stays reproducible.

import { rng } from './util.js';

const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export function makeNoise(seed) {
  const rand = rng(seed ^ 0x9e3779b9);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // Simplex noise in [-1, 1].
  function n2(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = GRAD[perm[ii + perm[jj]] & 7]; t0 *= t0; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = GRAD[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = GRAD[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }

  // Fractal sum: soft clouds.
  function fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += a * n2(x * f + o * 17.3, y * f - o * 9.1);
      norm += a; a *= gain; f *= lac;
    }
    return sum / norm;
  }

  // Ridged fractal: creases and folds (brain tissue, mountain ridges).
  function ridged(x, y, oct = 4) {
    let a = 0.5, f = 1, sum = 0, prev = 1;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(n2(x * f + o * 31.7, y * f + o * 7.7));
      v *= v;
      sum += v * a * prev;
      prev = v; a *= 0.5; f *= 2.1;
    }
    return sum;
  }

  // Domain warp: marbled, liquid flows.
  function warp(x, y, amt = 1, oct = 3) {
    const qx = fbm(x, y, oct), qy = fbm(x + 5.2, y + 1.3, oct);
    return fbm(x + amt * qx, y + amt * qy, oct);
  }

  return { n2, fbm, ridged, warp };
}
