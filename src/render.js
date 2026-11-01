// renderIllustration: a moment + a state of mind + a seed -> one self-contained SVG.

import { rng, hashString, uid as makeUid, hueShift, esc } from './core/util.js';
import { STATES, stateById, GENRE } from './core/tokens.js';
import { MOMENTS, momentById, buildScene } from './scene.js';
import { RENDERERS } from './states/index.js';

export const ASPECTS = {
  square: { W: 400, H: 400, label: 'Square 1:1', size: 'spot' },
  wide: { W: 640, H: 400, label: 'Wide 16:10', size: 'section' },
  tall: { W: 400, H: 500, label: 'Tall 4:5', size: 'poster' },
};

// How many curated seeds each moment has in each state.
export const SEEDS_PER_PAIR = 4;

function shiftPalette(pal, deg) {
  if (!deg) return pal;
  const walk = (v) => (typeof v === 'string' && v.startsWith('#') ? hueShift(v, deg) : Array.isArray(v) ? v.map(walk) : v);
  return Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, walk(v)]));
}

const MOTION = {
  bloom: 'pulse', gift: 'pulse', halo: 'pulse', dawn: 'pulse', flash: 'flicker', web: 'pulse', voice: 'pulse', crowd: 'pulse',
  spiral: 'breathe', vortex: 'sway', orbit: 'sway', think: 'sway', tide: 'breathe', maze: 'sway', portal: 'breathe', void: 'breathe',
  eruption: 'rise', smoke: 'rise', rise: 'rise', roots: 'breathe',
  drift: 'drift', river: 'drift', calm: 'drift', wave: 'drift', scatter: 'drift', memory: 'drift',
  knot: 'flicker', shatter: 'flicker', split: 'flicker', stack: 'breathe', bridge: 'pulse',
};

const MOTION_CSS = {
  sway: (fx, fy) => `animation:nd-sway 10s ease-in-out infinite alternate;transform-origin:${fx}px ${fy}px`,
  pulse: (fx, fy) => `animation:nd-pulse 5s ease-in-out infinite alternate;transform-origin:${fx}px ${fy}px`,
  breathe: (fx, fy) => `animation:nd-breathe 7s ease-in-out infinite alternate;transform-origin:${fx}px ${fy}px`,
  rise: () => 'animation:nd-rise 4.2s ease-in-out infinite',
  drift: () => 'animation:nd-drift 9s ease-in-out infinite alternate',
  flicker: (fx, fy) => `animation:nd-flicker 2.4s steps(4) infinite;transform-origin:${fx}px ${fy}px`,
  glow: () => 'animation:nd-glow 3.2s ease-in-out infinite alternate',
};

function motionStyle(id, motion, focal) {
  const [fx, fy] = focal.map((v) => Math.round(v));
  return `<style>#${id} .nd-motif{transform-box:view-box;${MOTION_CSS[motion](fx, fy)}}`
    + '@keyframes nd-sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}'
    + '@keyframes nd-pulse{from{transform:scale(.975);opacity:.86}to{transform:scale(1.03);opacity:1}}'
    + '@keyframes nd-breathe{from{transform:scale(1,.985);opacity:.9}to{transform:scale(1.01,1.015);opacity:1}}'
    + '@keyframes nd-rise{0%{transform:translateY(5px);opacity:.55}50%{opacity:1}100%{transform:translateY(-7px);opacity:.55}}'
    + '@keyframes nd-drift{from{transform:translate(-4px,3px)}to{transform:translate(5px,-4px)}}'
    + '@keyframes nd-flicker{0%{transform:scale(1)}50%{transform:scale(1.02) rotate(.5deg)}100%{transform:scale(.995) rotate(-.4deg)}}'
    + '@keyframes nd-glow{from{opacity:0}to{opacity:.75}}'
    + `@media (prefers-reduced-motion:reduce){#${id} *{animation:none!important}}</style>`;
}

// The curated palette for a seed: seeds 1-4 walk through a state's four palettes.
export function paletteNameFor(state, seed) {
  const names = Object.keys(stateById(state).palettes);
  return names[(Math.abs(seed) - 1 + names.length * 1000) % names.length];
}

/**
 * @param {object} o
 * @param {string} o.moment    moment id, e.g. "deep-focus" (o.subject works too)
 * @param {string} o.state     state id, e.g. "stipple"
 * @param {number} [o.seed]    any integer; same seed, same picture
 * @param {string} [o.palette] palette name inside the state (defaults to one picked by the seed)
 * @param {number} [o.density] 0.5 - 1.6, how much the hand puts down
 * @param {number} [o.hue]     -180 - 180, rotates every colour in the palette
 * @param {boolean} [o.animate]
 * @param {'square'|'wide'|'tall'} [o.aspect]
 * @param {string} [o.id]      element id (keep it unique on a page)
 * @param {string} [o.title]   accessible title
 */
export function renderIllustration(o = {}) {
  const momentId = o.moment || o.subject || 'new-idea';
  const moment = momentById(momentId);
  const state = stateById(o.state || 'tangle');
  if (moment.id !== momentId) throw new Error(`Unknown moment "${momentId}"`);
  if (state.id !== (o.state || 'tangle')) throw new Error(`Unknown state "${o.state}"`);
  const seed = Number.isFinite(+o.seed) && o.seed !== '' && o.seed != null ? Math.trunc(+o.seed) : 1;
  const density = Math.max(0.4, Math.min(1.8, o.density ?? 1));
  const aspect = ASPECTS[o.aspect] || ASPECTS.square;
  const { W, H } = aspect;
  const id = o.id || makeUid('nd');
  const palName = state.palettes[o.palette] ? o.palette : paletteNameFor(state.id, seed);
  const pal = shiftPalette(state.palettes[palName], o.hue || 0);

  const S = buildScene({ moment: moment.id, seed, W, H });
  const rand = rng(hashString(`${moment.id}:${state.id}:${seed}:${W}x${H}`));
  const out = RENDERERS[state.id](S, pal, { rand, density, id, seed });
  const title = o.title || `${moment.title}, in ${state.name}`;
  const desc = `${moment.line} ${GENRE.name} illustration, ${state.name} state, seed ${seed}.`;
  const animate = o.animate !== false;
  const motion = out.motion || MOTION[S.motif.kind] || 'breathe';

  return `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${id}-t ${id}-d" data-focal="${(S.focal[0] / W).toFixed(3)} ${(S.focal[1] / H).toFixed(3)}">`
    + `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`
    + (animate ? motionStyle(id, motion, S.focal) : '')
    + (out.defs ? `<defs>${out.defs}</defs>` : '')
    + out.body + '</svg>';
}

// Every curated piece: moments x states x seeds.
export function catalog() {
  const items = [];
  for (const m of MOMENTS) for (const st of STATES) for (let seed = 1; seed <= SEEDS_PER_PAIR; seed++) {
    items.push({ key: `${m.id}--${st.id}--${seed}`, moment: m.id, state: st.id, seed, palette: paletteNameFor(st.id, seed), title: m.title, line: m.line, use: m.use, stateName: st.name });
  }
  return items;
}

export { STATES, MOMENTS };
