// Mark-making shared by the renderers: contours of bodies, wobbly hand
// lines, stipple sampling, hatching and paper grain.

import { isolines, cleanLoop, loopLength } from './field.js';
import { P } from './path.js';

// Closed outlines of the bodies at an inset (px inside the edge).
export function bodyLoops(S, inset = 0, minLen = 12) {
  const key = 'loops:' + inset;
  S.cache = S.cache || {};
  if (!S.cache[key]) {
    S.cache[key] = isolines(S.body, inset)
      .map((l) => ({ pts: cleanLoop(l.pts, l.closed, 0.4), closed: l.closed }))
      .filter((l) => loopLength(l.pts) > minLen);
  }
  return S.cache[key];
}

export function bodyPath(S, inset = 0) {
  return bodyLoops(S, inset).map((l) => P(l.pts, l.closed)).join('');
}

// Any grid's region outline as path data (value >= level).
export function regionPath(grid, level, tol = 0.45, minLen = 6) {
  let d = '';
  for (const l of isolines(grid, level)) {
    const pts = cleanLoop(l.pts, l.closed, tol);
    if (loopLength(pts) > minLen) d += P(pts, l.closed);
  }
  return d;
}

// Direction along the body's contour lines.
export function tangent(S, x, y) {
  const [gx, gy] = S.body.grad(x, y, 3);
  return Math.atan2(gy, gx) + Math.PI / 2;
}

// Resample a polyline to an even step.
export function resample(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let t = step - carry;
    while (t <= seg) {
      out.push([ax + ((bx - ax) * t) / seg, ay + ((by - ay) * t) / seg]);
      t += step;
    }
    carry = seg - (t - step);
  }
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// A hand-drawn version of a line: drift that wanders like a real pen.
export function handLine(pts, rand, amp = 1.2, step = 3, closed = false) {
  const src = closed ? [...pts, pts[0]] : pts;
  const rs = resample(src, step);
  let ox = rand.gauss() * amp, oy = rand.gauss() * amp;
  return rs.map(([x, y]) => {
    ox = ox * 0.9 + rand.gauss() * amp * 0.25;
    oy = oy * 0.9 + rand.gauss() * amp * 0.25;
    return [x + ox, y + oy];
  });
}

// Cut a line into a few dashes with gaps, like a pen that lifts.
export function breakLine(pts, rand, keep = 0.85) {
  const out = [];
  let cur = [];
  for (const p of pts) {
    if (rand() > keep && cur.length > 3) { out.push(cur); cur = []; continue; }
    cur.push(p);
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

// Stipple: jittered grid sampled against a density function (0..1).
export function stipple(W, H, spacing, density, rand) {
  const pts = [];
  for (let y = spacing / 2; y < H; y += spacing) {
    for (let x = spacing / 2; x < W; x += spacing) {
      const px = x + (rand() - 0.5) * spacing * 1.1, py = y + (rand() - 0.5) * spacing * 1.1;
      const d = density(px, py);
      if (d > 0 && rand() < d) pts.push([px, py]);
    }
  }
  return pts;
}

// Short strokes laid along an angle field.
export function hatch(W, H, spacing, { angle, length, keep = () => 1, jitter = 0.4 }, rand) {
  const lines = [];
  for (let y = 0; y < H + spacing; y += spacing) {
    for (let x = 0; x < W + spacing; x += spacing) {
      const px = x + (rand() - 0.5) * spacing * 1.6, py = y + (rand() - 0.5) * spacing * 1.6;
      const k = keep(px, py);
      if (k <= 0 || rand() > k) continue;
      const a = angle(px, py) + rand.gauss() * jitter * 0.3;
      const l = length(px, py) * (0.6 + rand() * 0.8);
      lines.push([[px - Math.cos(a) * l * 0.5, py - Math.sin(a) * l * 0.5], [px + Math.cos(a) * l * 0.5, py + Math.sin(a) * l * 0.5]]);
    }
  }
  return lines;
}

export const pathOf = (lines, closed = false) => lines.map((l) => P(l, closed)).join('');

// Paper and film grain as an SVG filter: grey noise blended over the picture.
export function grain(id, { freq = 0.85, opacity = 0.25, mode = 'overlay', seed = 1, octaves = 2 } = {}) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch" result="n"/>`
    + `<feColorMatrix in="n" type="saturate" values="0" result="g"/>`
    + `<feComponentTransfer in="g" result="a"><feFuncA type="linear" slope="0" intercept="${opacity}"/></feComponentTransfer>`
    + `<feBlend in="a" in2="SourceGraphic" mode="${mode}"/></filter>`;
}

// Roughen edges, like paint or torn paper.
export function rough(id, { freq = 0.05, scale = 3, seed = 1 } = {}) {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
}

export function blur(id, sd, pad = 30) {
  return `<filter id="${id}" x="-${pad}%" y="-${pad}%" width="${100 + pad * 2}%" height="${100 + pad * 2}%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
}

// Colour helpers.
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase();
}

export function ramp(colors, t) {
  t = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(t));
  return mix(colors[i], colors[i + 1], t - i);
}
