// Draws an icon skeleton in one of the four Neurodelic hands.

import { rng, hashString, wobble, smoothPath, resample, n, uid as makeUid, esc } from '../core/util.js';
import { ICONS } from './defs.js';

const NEON = ['#5B2BC8', '#2F6BFF', '#18C6C0', '#7CE24A', '#FFE53B', '#FF8A1F', '#FF2E2E'];

export function toPolylines(prims) {
  const lines = [], dots = [];
  for (const p of prims) {
    const [type, ...v] = p;
    if (type === 'l' || type === 'z') {
      const pts = [];
      for (let i = 0; i < v.length; i += 2) pts.push([v[i], v[i + 1]]);
      if (type === 'z') pts.push(pts[0]);
      lines.push(pts);
    } else if (type === 'c' || type === 'a') {
      const [cx, cy, r, a0 = 0, a1 = 360] = v;
      const pts = [];
      const steps = Math.max(12, Math.round((Math.abs(a1 - a0) / 360) * 40));
      for (let i = 0; i <= steps; i++) {
        const a = ((a0 + (a1 - a0) * (i / steps)) * Math.PI) / 180;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      lines.push(pts);
    } else if (type === 'd') {
      dots.push([v[0], v[1]]);
    }
  }
  return { lines, dots };
}

// Shared by icons and the Scrawl typeface: draws polylines in one of the four hands.
// `unit` is how big one grid unit is relative to the 24 icon grid (keeps wobble consistent).
export function handDraw({ lines, dots }, o, rand, id, unit = 1) {
  const style = o.style || 'scribble';
  const color = o.color || 'currentColor';
  const weight = (o.weight ?? 1.5) * unit;
  const jitter = (o.jitter ?? 1) * unit;
  let body = '', defs = '';
  const amp = 0.32 * jitter;

  if (style === 'scribble' || style === 'neon') {
    const stroke = style === 'neon' ? `url(#${id}-g)` : color;
    if (style === 'neon') {
      const colors = o.colors || NEON;
      defs = `<linearGradient id="${id}-g" gradientUnits="${o.gradientBox ? 'userSpaceOnUse' : 'objectBoundingBox'}" ${o.gradientBox ? `x1="${o.gradientBox[0]}" y1="${o.gradientBox[3]}" x2="${o.gradientBox[2]}" y2="${o.gradientBox[1]}"` : 'x1="0" y1="1" x2="1" y2="0"'}>${colors.map((c, i) => `<stop offset="${n(i / (colors.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
    }
    for (const pts of lines) {
      for (let p = 0; p < 3; p++) {
        const w = wobble(pts, amp, rand, 0.9 * unit);
        body += `<path d="${smoothPath(w)}" stroke-width="${n(weight * rand.range(0.45, 0.62) * 10) / 10}"/>`;
      }
    }
    for (const [x, y] of dots) body += `<circle cx="${n(x + rand.gauss() * amp * 0.4)}" cy="${n(y + rand.gauss() * amp * 0.4)}" r="${n(weight * 0.62)}" fill="${stroke}" stroke="none"/>`;
    body = `<g fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  } else if (style === 'stipple') {
    let d = '';
    for (const pts of lines) for (const [x, y] of resample(pts, 0.55 * unit)) {
      for (let k = 0; k < 2; k++) d += `M${n(x + rand.gauss() * 0.28 * (o.jitter ?? 1) * weight / 1.5)} ${n(y + rand.gauss() * 0.28 * (o.jitter ?? 1) * weight / 1.5)}h0`;
    }
    for (const [x, y] of dots) for (let k = 0; k < 7; k++) d += `M${n(x + rand.gauss() * 0.45 * unit)} ${n(y + rand.gauss() * 0.45 * unit)}h0`;
    body = `<path d="${d}" stroke="${color}" stroke-width="${n(weight * 0.5 * 10) / 10}" stroke-linecap="round" fill="none"/>`;
  } else if (style === 'hatch') {
    let d = '';
    const len = weight * 0.8;
    for (const pts of lines) {
      const rs = resample(pts, 0.8 * unit);
      for (let i = 0; i < rs.length; i++) {
        const [x, y] = rs[i];
        const nx = rs[Math.min(i + 1, rs.length - 1)], px = rs[Math.max(i - 1, 0)];
        const a = Math.atan2(nx[1] - px[1], nx[0] - px[0]) + Math.PI / 2.6 + rand.gauss() * 0.15 * (o.jitter ?? 1);
        const l = len * rand.range(0.8, 1.2);
        d += `M${n(x - Math.cos(a) * l)} ${n(y - Math.sin(a) * l)}L${n(x + Math.cos(a) * l)} ${n(y + Math.sin(a) * l)}`;
      }
    }
    for (const [x, y] of dots) { const k = 0.9 * unit; d += `M${n(x - k)} ${n(y + k)}L${n(x + k)} ${n(y - k)}M${n(x - k)} ${n(y - k)}L${n(x + k)} ${n(y + k)}`; }
    body = `<path d="${d}" stroke="${color}" stroke-width="${n(weight * 0.38 * 10) / 10}" stroke-linecap="round" fill="none"/>`;
  } else {
    throw new Error(`Unknown icon style "${style}"`);
  }

  return { defs, body };
}

/**
 * @param {string} name icon name
 * @param {object} [o]
 * @param {'scribble'|'neon'|'stipple'|'hatch'} [o.style]
 * @param {string} [o.color]   any CSS colour, defaults to currentColor
 * @param {number} [o.weight]  stroke weight on the 24 grid (1 - 2.5)
 * @param {number} [o.size]    rendered size in px
 * @param {number} [o.seed]
 * @param {number} [o.jitter]  0 = calm, 1 = default, 2 = wild
 */
export function renderIcon(name, o = {}) {
  const prims = ICONS[name];
  if (!prims) throw new Error(`Unknown icon "${name}"`);
  const size = o.size ?? 24;
  const rand = rng((o.seed ?? 1) * 7349 + hashString(name + (o.style || 'scribble')));
  const id = o.id || makeUid('ndi');
  const { defs, body } = handDraw(toPolylines(prims), { gradientBox: [2, 2, 22, 22], ...o }, rand, id, 1);
  const label = o.title ?? name.replace(/-/g, ' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}

export { ICONS };
