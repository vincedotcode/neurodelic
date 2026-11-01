// Neurodelic Scrawl: a single-stroke display typeface, drawn by the same four hands as the icons.
// Glyphs live on a 4 x 6 grid (x 0..4, y 0..6, baseline at y = 6). Each glyph is a list of polylines.

import { rng, hashString, uid as makeUid, esc } from '../core/util.js';
import { handDraw } from '../icons/render.js';

const O = [2, 0, 0.6, 0.6, 0, 3, 0.6, 5.4, 2, 6, 3.4, 5.4, 4, 3, 3.4, 0.6, 2, 0];
const P = [0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3];

export const GLYPHS = {
  A: [[0, 6, 2, 0, 4, 6], [0.7, 4, 3.3, 4]],
  B: [[0, 6, 0, 0, 2.8, 0, 3.6, 0.8, 3.6, 2, 2.8, 2.9, 0, 2.9], [2.8, 2.9, 3.9, 3.8, 3.9, 5.1, 3, 6, 0, 6]],
  C: [[4, 1, 3, 0, 1, 0, 0, 1.2, 0, 4.8, 1, 6, 3, 6, 4, 5]],
  D: [[0, 0, 0, 6, 2.4, 6, 4, 4.4, 4, 1.6, 2.4, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1, 3, 0, 1, 0, 0, 1.2, 0, 4.8, 1, 6, 3, 6, 4, 5, 4, 3.4, 2.2, 3.4]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  J: [[4, 0, 4, 4.8, 3, 6, 1, 6, 0, 4.8]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.6], [1.3, 2.7, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3.6, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [O],
  P: [P],
  Q: [O, [2.6, 4.4, 4.2, 6.2]],
  R: [P, [2, 3, 4, 6]],
  S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 2.9, 3, 3.1, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 4.8, 1, 6, 3, 6, 4, 4.8, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1, 6, 2, 2.4, 3, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3], [4, 0, 2, 3, 2, 6]],
  Z: [[0, 0, 4, 0, 0, 6, 4, 6]],
  0: [O, [3.2, 1, 0.8, 5]],
  1: [[1, 1, 2, 0, 2, 6], [1, 6, 3, 6]],
  2: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2.2, 0, 6, 4, 6]],
  3: [[0, 0.6, 1, 0, 3, 0, 4, 1, 4, 2, 3, 2.9, 1.5, 2.9], [3, 2.9, 4, 3.9, 4, 5, 3, 6, 1, 6, 0, 5.4]],
  4: [[3, 6, 3, 0, 0, 4, 4, 4]],
  5: [[4, 0, 0.4, 0, 0, 2.8, 2.8, 2.6, 4, 3.6, 4, 5, 3, 6, 1, 6, 0, 5.4]],
  6: [[3.6, 0.4, 2.4, 0, 1.2, 0.2, 0, 2, 0, 4.8, 1, 6, 3, 6, 4, 5, 4, 3.8, 3, 2.9, 1, 2.9, 0, 3.8]],
  7: [[0, 0, 4, 0, 1.6, 6]],
  8: [[2, 2.9, 0.6, 2.2, 0.6, 0.8, 2, 0, 3.4, 0.8, 3.4, 2.2, 2, 2.9, 0.2, 3.9, 0.2, 5.2, 2, 6, 3.8, 5.2, 3.8, 3.9, 2, 2.9]],
  9: [[4, 2.2, 3, 3.1, 1, 3.1, 0, 2.2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 4.4, 3, 6, 1, 6, 0.4, 5.4]],
  '.': [[1.9, 5.8, 2.1, 6]],
  ',': [[2, 5.6, 1.5, 6.8]],
  '!': [[2, 0, 2, 4.2], [1.9, 5.8, 2.1, 6]],
  '?': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 2, 3.2, 2, 4.2], [1.9, 5.8, 2.1, 6]],
  '-': [[0.8, 3.4, 3.2, 3.4]],
  "'": [[2, 0, 2, 1.5]],
  ':': [[1.9, 1.8, 2.1, 2], [1.9, 5.8, 2.1, 6]],
  '/': [[4, 0, 0, 6]],
  '&': [[4, 6, 0.6, 2.2, 0.6, 0.8, 1.6, 0, 2.6, 0.8, 2.6, 1.8, 0, 4, 0, 5.2, 1, 6, 2.4, 6, 4, 3.8]],
  '+': [[2, 1.6, 2, 5.2], [0.2, 3.4, 3.8, 3.4]],
  '@': [[3, 4, 3, 2, 1.8, 2, 1.2, 3, 1.8, 4, 3, 4, 4, 3.4, 4, 1.6, 3, 0.2, 1, 0.2, 0, 1.6, 0, 4.6, 1, 5.8, 3.4, 5.8]],
  ' ': [],
};

export const CHARSET = Object.keys(GLYPHS).join('');

/**
 * Set a line of text in Scrawl.
 * @param {string} text
 * @param {object} [o] same hand options as icons, plus capHeight (px), tracking (grid units), lineGap
 */
export function renderScrawl(text, o = {}) {
  o = { weight: 1.9, jitter: 2.2, ...o };
  const cap = o.capHeight ?? 64;
  const unit = cap / 6; // px per grid unit
  const tracking = o.tracking ?? 1.6;
  const advance = 4 + tracking;
  const lines = String(text).toUpperCase().split('\n');
  const rand = rng((o.seed ?? 1) * 31 + hashString(text + (o.style || 'scribble')));
  const id = o.id || makeUid('nds');
  const pad = 1.6;
  const all = [];
  let maxW = 0;
  lines.forEach((line, li) => {
    let x = pad;
    const y0 = pad + li * (6 + (o.lineGap ?? 3.2));
    for (const ch of line) {
      const g = GLYPHS[ch] ?? GLYPHS['?'];
      // Proportional: each glyph takes its own width, so a narrow I doesn't leave a hole.
      const xs = g.flatMap((pl) => pl.filter((_, i) => i % 2 === 0));
      const left = xs.length ? Math.min(...xs) : 0, width = xs.length ? Math.max(...xs) - left : 0;
      for (const pl of g) {
        const pts = [];
        // A little slant and baseline drift so it reads as hand-made.
        const drift = rand.gauss() * 0.12;
        for (let i = 0; i < pl.length; i += 2) pts.push([x - left + pl[i] + (6 - pl[i + 1]) * 0.08, y0 + pl[i + 1] + drift]);
        all.push(pts);
      }
      x += ch === ' ' ? advance * 0.7 : Math.max(width, 0.6) + tracking;
    }
    maxW = Math.max(maxW, x - tracking + pad);
  });
  const gW = maxW, gH = pad * 2 + lines.length * 6 + (lines.length - 1) * (o.lineGap ?? 3.2);
  // Icons are drawn on a 24 grid where weight 1.5 looks right; a glyph unit is 1/4 of that scale.
  const scale = 6 / 24;
  const { defs, body } = handDraw({ lines: all.map((p) => p.map(([x, y]) => [x / scale, y / scale])), dots: [] }, { ...o, gradientBox: [0, 0, gW / scale, gH / scale] }, rand, id, 1);
  const vbW = gW / scale, vbH = gH / scale;
  const W = Math.round(gW * unit), H = Math.round(gH * unit);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(vbW)} ${Math.round(vbH)}" width="${W}" height="${H}" role="img" aria-label="${esc(text)}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}
