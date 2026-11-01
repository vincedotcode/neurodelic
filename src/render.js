// renderIllustration: subject + state + options -> a self-contained SVG string.

import { rng, hashString, uid as makeUid, hueShift, esc } from './core/util.js';
import { STATES, stateById, paletteFor } from './core/tokens.js';
import { SUBJECTS, buildScene, subjectById } from './subjects.js';
import { RENDERERS } from './states/index.js';

export const ASPECTS = {
  square: { W: 400, H: 400, label: 'Square 1:1', size: 'spot' },
  wide: { W: 640, H: 400, label: 'Wide 16:10', size: 'section' },
  tall: { W: 400, H: 500, label: 'Tall 4:5', size: 'poster' },
};

function shiftPalette(pal, deg) {
  if (!deg) return pal;
  const walk = (v) => (typeof v === 'string' && v.startsWith('#') ? hueShift(v, deg) : Array.isArray(v) ? v.map(walk) : v);
  return Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, walk(v)]));
}

const MOTION_CSS = {
  spin: (fx, fy) => `animation:nd-spin 48s linear infinite;transform-origin:${fx}px ${fy}px`,
  orbit: (fx, fy) => `animation:nd-sway 9s ease-in-out infinite alternate;transform-origin:${fx}px ${fy}px`,
  pulse: (fx, fy) => `animation:nd-pulse 5s ease-in-out infinite alternate;transform-origin:${fx}px ${fy}px`,
  rise: () => 'animation:nd-rise 3.6s ease-in-out infinite',
  drift: () => 'animation:nd-drift 9s ease-in-out infinite alternate',
  flicker: (fx, fy) => `animation:nd-flicker 1.8s steps(3) infinite;transform-origin:${fx}px ${fy}px`,
};

function motionStyle(id, motion, focal) {
  const [fx, fy] = focal.map((v) => Math.round(v));
  return `<style>
#${id} .nd-motif{transform-box:view-box;${MOTION_CSS[motion](fx, fy)}}
#${id} .nd-field{animation:nd-breathe 7s ease-in-out infinite alternate}
@keyframes nd-spin{to{transform:rotate(360deg)}}
@keyframes nd-sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes nd-pulse{from{transform:scale(.97);opacity:.85}to{transform:scale(1.04);opacity:1}}
@keyframes nd-rise{0%{transform:translateY(6px);opacity:.4}50%{opacity:1}100%{transform:translateY(-10px);opacity:.4}}
@keyframes nd-drift{from{transform:translate(-4px,3px)}to{transform:translate(5px,-4px)}}
@keyframes nd-flicker{0%{transform:scale(1)}50%{transform:scale(1.025) rotate(.6deg)}100%{transform:scale(.99) rotate(-.4deg)}}
@keyframes nd-breathe{from{opacity:.82}to{opacity:1}}
@media (prefers-reduced-motion:reduce){#${id} *{animation:none!important}}
</style>`;
}

/**
 * @param {object} o
 * @param {string} o.subject   subject id, e.g. "deep-focus"
 * @param {string} o.state     state id, e.g. "stipple"
 * @param {string} [o.palette] palette id inside the state
 * @param {number} [o.seed]    any integer; same seed, same picture
 * @param {number} [o.density] 0.5 - 1.6, how much the hand puts down
 * @param {number} [o.hue]     -180 - 180, rotates every colour in the palette
 * @param {boolean} [o.animate]
 * @param {'square'|'wide'|'tall'} [o.aspect]
 * @param {string} [o.title]   accessible title
 */
export function renderIllustration(o) {
  const subject = subjectById[o.subject];
  const state = stateById[o.state];
  if (!subject) throw new Error(`Unknown subject "${o.subject}"`);
  if (!state) throw new Error(`Unknown state "${o.state}"`);
  const seed = Number.isFinite(o.seed) ? o.seed : hashString(`${o.subject}:${o.state}`) % 9999;
  const density = Math.max(0.4, Math.min(1.8, o.density ?? 1));
  const aspect = ASPECTS[o.aspect] || ASPECTS.square;
  const { W, H } = aspect;
  const ox = (W - 400) / 2, oy = (H - 400) / 2;
  const id = o.id || makeUid('nd');
  const pal = shiftPalette(paletteFor(state.id, o.palette), o.hue || 0);

  const sceneRand = rng(seed * 7919 + 17);
  const { figs, motif } = buildScene(subject.id, sceneRand);
  const ctx = {
    W, H, ox, oy, id, seed, density, pal, figs, motif,
    rand: rng(seed * 104729 + hashString(state.id)),
    S: { x0: -ox, y0: -oy, x1: W - ox, y1: H - oy },
  };
  const out = RENDERERS[state.id](ctx);
  const title = o.title || `${subject.title}, in ${state.name}`;
  const desc = `${subject.line} Neurodelic illustration, ${state.name} state.`;
  const animate = o.animate !== false;

  return `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>` +
    (animate ? motionStyle(id, motif.motion, motif.focal) : '') +
    `<defs>${out.defs || ''}</defs>${out.back || ''}<g transform="translate(${ox} ${oy})">${out.scene}</g>${out.front || ''}</svg>`;
}

export function catalog() {
  const items = [];
  for (const s of SUBJECTS) for (const st of STATES) {
    items.push({ key: `${s.id}--${st.id}`, subject: s.id, state: st.id, title: s.title, line: s.line, use: s.use, stateName: st.name });
  }
  return items;
}

export { STATES, SUBJECTS };
