// Mark-making primitives: the hand of the genre.
// Scribble passes, wandering fills, dot fields and grain.

import { wobble, linePath, smoothPath, resample, n, bbox } from './util.js';

// One line drawn as several loose passes, like a pen going over it again.
export function scribbleLine(pts, rand, { passes = 3, amp = 1.6, width = 1, color = '#fff', opacity = 0.9, smooth = true, closed = false, step = 4 } = {}) {
  let out = '';
  for (let p = 0; p < passes; p++) {
    const src = closed ? [...pts, pts[0]] : pts;
    const w = wobble(src, amp, rand, step);
    const d = smooth ? smoothPath(w, false) : linePath(w);
    const sw = width * rand.range(0.7, 1.15);
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(sw)}" stroke-opacity="${n(opacity * rand.range(0.75, 1))}"/>`;
  }
  return out;
}

// A wandering pen inside a region: starts where `inside` is true and turns back at the edge.
export function wanderFill(rand, inside, bounds, { walks = 20, steps = 140, stepLen = 3.2, turn = 0.55 } = {}) {
  const lines = [];
  const { x0, y0, x1, y1 } = bounds;
  for (let w = 0; w < walks; w++) {
    let x, y, tries = 0;
    do { x = rand.range(x0, x1); y = rand.range(y0, y1); tries++; } while (!inside(x, y) && tries < 200);
    if (tries >= 200) continue;
    let a = rand.range(0, Math.PI * 2), da = 0;
    const pts = [[x, y]];
    for (let s = 0; s < steps; s++) {
      da = da * 0.8 + rand.gauss() * turn * 0.45;
      a += da;
      let nx = x + Math.cos(a) * stepLen, ny = y + Math.sin(a) * stepLen;
      if (!inside(nx, ny)) {
        a += Math.PI * rand.range(0.6, 1.4);
        da = 0;
        nx = x + Math.cos(a) * stepLen; ny = y + Math.sin(a) * stepLen;
        if (!inside(nx, ny)) continue;
      }
      x = nx; y = ny;
      pts.push([x, y]);
    }
    if (pts.length > 3) lines.push(pts);
  }
  return lines;
}

// Many dots in one path: each "M x y h0" with a round cap is a dot.
export function dotPath(points, { r = 1, color = '#000', opacity = 1 } = {}) {
  if (!points.length) return '';
  let d = '';
  for (const [x, y] of points) d += `M${n(x)} ${n(y)}h0`;
  return `<path d="${d}" stroke="${color}" stroke-width="${n(r * 2)}" stroke-linecap="round" stroke-opacity="${n(opacity)}" fill="none"/>`;
}

// Rejection-sample points from a density field.
export function sampleField(rand, field, bounds, tries, gain = 1) {
  const pts = [];
  const { x0, y0, x1, y1 } = bounds;
  for (let i = 0; i < tries; i++) {
    const x = rand.range(x0, x1), y = rand.range(y0, y1);
    const v = field(x, y);
    if (v > 0 && rand() < v * gain) pts.push([x, y, v]);
  }
  return pts;
}

export function dotsAlong(pts, rand, { step = 2.2, spread = 1.4 } = {}) {
  return resample(pts, step).map(([x, y]) => [x + rand.gauss() * spread, y + rand.gauss() * spread]);
}

export function polyPath(poly, smooth = true) {
  return smooth ? smoothPath(poly, true) : linePath(poly, true);
}

export function figurePath(fig, smooth = true) {
  return fig.polys.map((p) => polyPath(p, smooth)).join('');
}

export function figuresBounds(figs, pad = 0) {
  const b = bbox(figs.flatMap((f) => f.polys));
  return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad };
}

// Film grain as an SVG filter (fractal noise, desaturated).
export function grainFilter(id, { freq = 0.9, octaves = 2, seed = 1 } = {}) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed % 1000}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;
}

export function blurFilter(id, sd) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
}

export function roughFilter(id, { freq = 0.04, scale = 6, seed = 1 } = {}) {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed % 1000}"/><feDisplacementMap in="SourceGraphic" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
}
