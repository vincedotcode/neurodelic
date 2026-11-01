// The eight states of the genre. Each one turns the same scene
// (figures + motif) into a picture with its own palette, texture and line rules.

import { n, smoothPath, linePath, resample, circlePoly, hexToRgb, clamp, wobble } from '../core/util.js';
import {
  scribbleLine, wanderFill, dotPath, sampleField, dotsAlong, figurePath, polyPath,
  grainFilter, blurFilter, roughFilter,
} from '../core/marks.js';
import { inFigure } from '../figures.js';

const TAU = Math.PI * 2;

const rect = (W, H, fill, extra = '') => `<rect width="${W}" height="${H}" fill="${fill}"${extra}/>`;

function anyFigure(figs, x, y) {
  for (const f of figs) if (inFigure(f, x, y)) return true;
  return false;
}

function orbRing(o, rand, color, passes = 4, width = 1) {
  return scribbleLine(circlePoly(o.x, o.y, o.r, 40), rand, { passes, amp: 1.2, width, color, closed: true });
}

// ---------------------------------------------------------------- Tangle
function tangle(ctx) {
  const { rand, pal, figs, motif, S, density } = ctx;
  const fieldIn = (x, y) => motif.field(x, y) > 0.38;
  const walks = wanderFill(rand, fieldIn, S, { walks: Math.round(30 * density), steps: 150, stepLen: 3, turn: 0.7 });
  let field = '';
  walks.forEach((w, i) => {
    field += `<path d="${linePath(w)}" stroke="${pal.colors[i % pal.colors.length]}" stroke-width="${n(rand.range(0.5, 0.9))}" stroke-opacity="0.85"/>`;
  });

  let body = '';
  for (const f of figs) {
    for (const poly of f.polys) body += scribbleLine(poly, rand, { passes: 5, amp: 2.4, width: 0.7, color: pal.ink, opacity: 0.85, closed: true });
    const inner = wanderFill(rand, (x, y) => inFigure(f, x, y) && motif.field(x, y) < 0.38, { x0: S.x0, y0: S.y0, x1: S.x1, y1: S.y1 }, { walks: Math.round(8 * density), steps: 90, stepLen: 3.4, turn: 0.4 });
    for (const w of inner) body += `<path d="${linePath(w)}" stroke="${pal.ink}" stroke-width="0.45" stroke-opacity="0.38"/>`;
  }

  let m = '';
  motif.strokes.forEach((s, i) => { m += scribbleLine(s, rand, { passes: 3, amp: 1.4, width: 0.9, color: pal.colors[(i + 2) % pal.colors.length] }); });
  for (const o of motif.orbs) m += orbRing(o, rand, pal.ink, 5, 0.8);

  return {
    back: rect(ctx.W, ctx.H, pal.bg),
    scene: `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${body}<g class="nd-field">${field}</g><g class="nd-motif">${m}</g></g>`,
  };
}

// ---------------------------------------------------------------- Thermal
function thermal(ctx) {
  const { rand, pal, figs, motif, S, id, density } = ctx;
  const ramp = pal.ramp.map(hexToRgb);
  const table = (c) => ramp.map((rgb) => n(rgb[c] / 255)).join(' ');
  const defs = `<filter id="${id}-th" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feGaussianBlur stdDeviation="5" result="b"/>
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${ctx.seed % 1000}" result="t"/>
<feDisplacementMap in="b" in2="t" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feColorMatrix in="d" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
<feComponentTransfer><feFuncR type="discrete" tableValues="${table(0)}"/><feFuncG type="discrete" tableValues="${table(1)}"/><feFuncB type="discrete" tableValues="${table(2)}"/></feComponentTransfer>
</filter>`;

  const cell = density > 1.2 ? 8 : 10;
  let grid = '';
  for (let y = S.y0; y < S.y1; y += cell) {
    for (let x = S.x0; x < S.x1; x += cell) {
      const v = motif.field(x + cell / 2, y + cell / 2);
      if (v > 0.05) grid += `<rect x="${n(x)}" y="${n(y)}" width="${cell}" height="${cell}" fill-opacity="${n(v * 0.78)}"/>`;
    }
  }
  let body = '';
  for (const f of figs) {
    const d = figurePath(f);
    body += `<path d="${d}" fill="#4d4d4d" stroke="#a6a6a6" stroke-width="7"/>`;
    body += `<path d="${d}" fill="none" stroke="#8a8a8a" stroke-width="2" transform="translate(${n(rand.range(-3, 3))} ${n(rand.range(-2, 2))})"/>`;
  }
  let m = '';
  for (const s of motif.strokes) m += `<path d="${smoothPath(s)}" stroke="#e6e6e6" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  for (const o of motif.orbs) m += o.ring ? `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(o.r)}" fill="none" stroke="#e0e0e0" stroke-width="6"/>` : `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(o.r)}" fill="#f2f2f2"/>`;

  let edge = '';
  for (const f of figs) edge += `<path d="${figurePath(f)}" fill="none" stroke="${pal.ink}" stroke-opacity="0.22" stroke-width="0.7"/>`;

  return {
    defs,
    back: rect(ctx.W, ctx.H, pal.bg),
    scene: `<g filter="url(#${id}-th)"><rect x="${n(S.x0)}" y="${n(S.y0)}" width="${n(S.x1 - S.x0)}" height="${n(S.y1 - S.y0)}" fill="#000"/>${body}<g class="nd-field" fill="#fff">${grid}</g><g class="nd-motif">${m}</g></g>${edge}`,
  };
}

// ---------------------------------------------------------------- Stipple
function stipple(ctx) {
  const { rand, pal, figs, motif, S, id, W, H, oy, density } = ctx;
  const horizonY = H * 0.6; // frame coords
  const sky = pal.sky;
  const defs = `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="0.45" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
<filter id="${id}-streak" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.55" numOctaves="2" seed="${ctx.seed % 1000}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 -0.18"/></filter>`;
  const groundR = W * 1.6;
  const back = rect(W, H, `url(#${id}-sky)`) + `<rect width="${W}" height="${n(horizonY + 20)}" filter="url(#${id}-streak)" opacity="0.45"/>` +
    `<ellipse cx="${n(W / 2)}" cy="${n(horizonY + groundR * 0.42)}" rx="${n(groundR)}" ry="${n(groundR * 0.42)}" fill="${pal.bg}"/>`;

  const hy = horizonY - oy; // horizon in scene coords (approx, flat)
  const groundY = (x) => hy; // flat enough for sampling
  const pts = sampleField(rand, (x, y) => (anyFigure(figs, x, y) ? 0 : motif.field(x, y)), S, Math.round(26000 * density), 0.95);
  const ground = [], skyDots = [];
  for (const [x, y] of pts) (y > groundY(x) ? ground : skyDots).push([x, y]);
  // The mind shows through the silhouette as pale stipple.
  const inner = sampleField(rand, (x, y) => (anyFigure(figs, x, y) ? Math.max(0, motif.field(x, y) - 0.15) : 0), S, Math.round(26000 * density), 0.9);
  // A little ambient dust on the ground so it never looks flat.
  const dust = sampleField(rand, (x, y) => (y > hy && !anyFigure(figs, x, y) ? 0.06 : 0), S, Math.round(9000 * density), 1).map(([x, y]) => [x, y]);

  let m = '';
  for (const s of motif.strokes) {
    const d = dotsAlong(s, rand, { step: 1.6, spread: 1.6 });
    m += dotPath(d.filter(([, y]) => y > hy), { r: 0.95, color: pal.dot });
    m += dotPath(d.filter(([, y]) => y <= hy), { r: 0.9, color: pal.bg, opacity: 0.9 });
  }
  for (const o of motif.orbs) {
    const ring = [];
    const count = Math.round(o.r * (o.ring ? 9 : 22));
    for (let i = 0; i < count; i++) {
      const a = rand.range(0, TAU);
      const r = o.ring ? o.r + rand.gauss() * 2.4 : o.r * Math.sqrt(rand());
      ring.push([o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]);
    }
    m += dotPath(ring, { r: 0.9, color: o.y > hy ? pal.dot : pal.bg, opacity: 0.95 });
  }

  let body = '';
  for (const f of figs) {
    const [bx, by] = f.base;
    if (by > hy && f.kind !== 'head') body += `<ellipse cx="${n(bx)}" cy="${n(by)}" rx="22" ry="5" fill="${pal.ink}" opacity="0.35"/>`;
    body += `<path d="${figurePath(f)}" fill="${pal.ink}"/>`;
  }

  return {
    defs,
    back,
    scene: `<g class="nd-field">${dotPath(dust, { r: 0.7, color: pal.dot, opacity: 0.6 })}${dotPath(ground, { r: 0.85, color: pal.dot })}${dotPath(skyDots, { r: 0.8, color: pal.bg, opacity: 0.85 })}</g><g class="nd-motif">${m}</g>${body}<g class="nd-field">${dotPath(inner, { r: 0.8, color: pal.bg, opacity: 0.92 })}</g>`,
  };
}

// ---------------------------------------------------------------- Haze
function haze(ctx) {
  const { rand, pal, figs, motif, S, id, W, H } = ctx;
  const defs = blurFilter(`${id}-b1`, 42) + blurFilter(`${id}-b2`, 9) + blurFilter(`${id}-b3`, 2.2) + blurFilter(`${id}-b4`, 5) +
    grainFilter(`${id}-g`, { freq: 0.85, octaves: 2, seed: ctx.seed });
  let blobs = '';
  for (let i = 0; i < 6; i++) {
    blobs += `<circle cx="${n(rand.range(-40, W + 40))}" cy="${n(rand.range(-40, H + 40))}" r="${n(rand.range(80, 170))}" fill="${pal.colors[i % pal.colors.length]}" opacity="${n(rand.range(0.6, 0.95))}"/>`;
  }
  // Field blobs: put colour where the energy is.
  const hot = sampleField(rand, motif.field, S, 600, 1).slice(0, 7);
  let fieldBlobs = '';
  hot.forEach(([x, y], i) => { fieldBlobs += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rand.range(40, 80))}" fill="${pal.colors[(i + 1) % pal.colors.length]}" opacity="0.75"/>`; });

  let m = '';
  motif.strokes.forEach((s, i) => { m += `<path d="${smoothPath(resample(s, 6))}" stroke="${pal.colors[(i + 3) % pal.colors.length]}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.7"/>`; });
  for (const o of motif.orbs) m += `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(o.r * 1.3)}" fill="${o.ring ? 'none' : pal.colors[1]}" stroke="${pal.colors[0]}" stroke-width="${o.ring ? 8 : 0}" opacity="0.85"/>`;

  let body = '';
  for (const f of figs) {
    const d = figurePath(f);
    body += `<path d="${d}" fill="${pal.halo}" filter="url(#${id}-b2)" opacity="0.9" transform="translate(-3 2)"/>`;
    body += `<path d="${d}" fill="${pal.ink}" filter="url(#${id}-b3)"/>`;
  }
  return {
    defs,
    back: rect(W, H, pal.bg) + `<g filter="url(#${id}-b1)">${blobs}</g>`,
    scene: `<g class="nd-field" filter="url(#${id}-b1)">${fieldBlobs}</g>${body}<g class="nd-motif" filter="url(#${id}-b4)" style="mix-blend-mode:screen">${m}</g>`,
    front: `<rect width="${W}" height="${H}" filter="url(#${id}-g)" opacity="0.42" style="mix-blend-mode:overlay"/><rect width="${W}" height="${H}" filter="url(#${id}-g)" opacity="0.1"/>`,
  };
}

// ---------------------------------------------------------------- Collage
function collage(ctx) {
  const { rand, pal, figs, motif, S, id, W, H, ox, oy, density } = ctx;
  const defs = `<pattern id="${id}-ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.05" fill="#000" fill-opacity="0.28"/></pattern>
<radialGradient id="${id}-pl" cx="0.38" cy="0.35" r="0.75"><stop offset="0" stop-color="#F6D9A0"/><stop offset="0.55" stop-color="${pal.bands[3]}"/><stop offset="1" stop-color="${pal.bands[2]}"/></radialGradient>
<radialGradient id="${id}-pl2" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="${pal.paper}"/><stop offset="1" stop-color="#B9A57A"/></radialGradient>` +
    grainFilter(`${id}-g`, { freq: 0.75, octaves: 3, seed: ctx.seed });

  const stars = [], bigStars = [];
  for (let i = 0; i < 320 * density; i++) (rand() < 0.08 ? bigStars : stars).push([rand.range(0, W), rand.range(0, H)]);

  // Mountains along the bottom of the frame.
  const mountain = (baseY, amp, color, rough) => {
    const pts = [[0, H]];
    let y = baseY;
    for (let x = 0; x <= W; x += 16) {
      y = baseY - Math.abs(Math.sin(x / (60 + rough) + rand() * 0.6)) * amp - rand.range(0, amp * 0.25);
      pts.push([x, y]);
    }
    pts.push([W, H]);
    return `<path d="${linePath(pts, true)}" fill="${color}"/><path d="${linePath(pts, true)}" fill="url(#${id}-ht)"/>`;
  };
  const back = rect(W, H, pal.bg) + dotPath(stars, { r: 0.55, color: pal.paper, opacity: 0.8 }) + dotPath(bigStars, { r: 1.2, color: pal.paper }) +
    mountain(H * 0.86, 46, '#5E6B73', 10) + mountain(H * 0.93, 30, pal.ground, 25);

  // Halftone dots where the field is strong: printed matter.
  let ht = '', htIn = '';
  for (let y = S.y0; y < S.y1; y += 8) for (let x = S.x0 + ((y / 8) % 2) * 4; x < S.x1; x += 8) {
    const v = motif.field(x, y);
    if (v > 0.3) (anyFigure(figs, x, y) ? (htIn += `M${n(x)} ${n(y)}h0`) : (ht += `M${n(x)} ${n(y)}h0`));
  }
  const field = ht ? `<path d="${ht}" stroke="${pal.bands[5]}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>` : '';

  const nStrokes = motif.strokes.length;
  const bw = nStrokes > 10 ? 1.4 : nStrokes > 4 ? 2.4 : 4.2;
  let ribbons = '';
  for (const s of motif.strokes) {
    const d = smoothPath(resample(s, 5));
    ribbons += `<path d="${d}" stroke="${pal.paper}" stroke-width="${n(bw * 12 + 3)}"/>`;
    pal.bands.forEach((c, i) => { ribbons += `<path d="${d}" stroke="${c}" stroke-width="${n(bw * (12 - i * 2))}"/>`; });
  }
  let planets = '';
  for (const o of motif.orbs) {
    const r = o.ring ? o.r * 0.9 : o.r;
    planets += `<circle cx="${n(o.x + 4)}" cy="${n(o.y + 4)}" r="${n(r)}" fill="#000" opacity="0.5"/><circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(r)}" fill="url(#${id}-${o.ring ? 'pl2' : 'pl'})" stroke="${pal.paper}" stroke-width="1.5"/><circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(r)}" fill="url(#${id}-ht)"/>`;
  }

  let body = '';
  figs.forEach((f, i) => {
    const d = figurePath(f);
    body += `<path d="${d}" fill="#000" opacity="0.5" transform="translate(6 5)"/><path d="${d}" fill="${pal.figure}" stroke="${pal.paper}" stroke-width="2.6"/><path d="${d}" fill="url(#${id}-ht)"/>`;
    if (f.mindPoly) body += `<path d="${polyPath(f.mindPoly)}" fill="${pal.bands[(i * 2 + 1) % 6]}" opacity="0.18"/>`;
  });

  const rib = `<g class="nd-motif" fill="none" stroke-linecap="round" stroke-linejoin="round">${ribbons}</g>`;
  const allPts = motif.strokes.flat();
  const ribbonsAbove = allPts.filter(([x, y]) => anyFigure(figs, x, y)).length > allPts.length * 0.5;
  return {
    defs,
    back,
    scene: `<g class="nd-field">${field}</g>${planets}${ribbonsAbove ? '' : rib}${body}${ribbonsAbove ? rib : ''}${htIn ? `<path class="nd-field" d="${htIn}" stroke="${pal.bands[2]}" stroke-width="3.4" stroke-linecap="round" opacity="0.8"/>` : ''}`,
    front: `<rect width="${W}" height="${H}" filter="url(#${id}-g)" opacity="0.2" style="mix-blend-mode:multiply"/><rect width="${W}" height="${H}" fill="${pal.paper}" opacity="0.04"/>`,
  };
}

// ---------------------------------------------------------------- Burst
function burst(ctx) {
  const { rand, pal, figs, motif, S, id, W, H, density } = ctx;
  const defs = roughFilter(`${id}-r`, { freq: 0.05, scale: 7, seed: ctx.seed }) + grainFilter(`${id}-g`, { freq: 0.6, octaves: 3, seed: ctx.seed });
  let streaks = '';
  for (let i = 0; i < 26; i++) {
    const y = rand.range(0, H);
    streaks += `<rect x="${n(rand.range(-40, W * 0.6))}" y="${n(y)}" width="${n(rand.range(80, W))}" height="${n(rand.range(2, 9))}" fill="${rand() < 0.5 ? '#fff' : '#000'}" opacity="${n(rand.range(0.03, 0.09))}"/>`;
  }
  const [fx, fy] = motif.focal;
  const targets = sampleField(rand, motif.field, S, 4000, 1);
  const count = Math.min(targets.length, Math.round(70 * density));
  let shards = '';
  for (let i = 0; i < count; i++) {
    const [tx, ty] = targets[Math.floor(rand() * targets.length)];
    let dx = tx - fx, dy = ty - fy;
    const L = Math.hypot(dx, dy) + rand.range(10, 50);
    if (L < 4) continue;
    dx /= L; dy /= L;
    const px = -dy, py = dx;
    const r0 = rand.range(4, 24), w = rand.range(4, 22);
    const P = (t, s) => [fx + dx * (r0 + L * t) + px * s, fy + dy * (r0 + L * t) + py * s];
    const poly = [P(0, w * 0.3), P(0.55, w * rand.range(0.6, 1.1)), P(1, rand.range(-3, 3)), P(0.62, -w * rand.range(0.4, 0.9)), P(0.1, -w * 0.4)];
    const c = pal.colors[Math.floor(rand() * pal.colors.length)];
    shards += `<path d="${linePath(poly, true)}" fill="${c}"/>`;
    if (rand() < 0.18) shards += dotPath([P(0.45, 0), P(0.55, w * 0.25), P(0.65, -w * 0.2)], { r: 1.2, color: pal.bg });
  }
  const splat = [];
  for (let i = 0; i < 170 * density; i++) {
    const a = rand.range(0, TAU), r = Math.abs(rand.gauss()) * 120 + 20;
    splat.push([fx + Math.cos(a) * r, fy + Math.sin(a) * r * 0.85, rand.range(0.6, 3.6)]);
  }
  let spl = '';
  for (const [x, y, r] of splat) spl += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${pal.colors[Math.floor(rand() * 4)]}"/>`;

  let strokes = '';
  for (const s of motif.strokes) strokes += `<path d="${smoothPath(s)}" stroke="${pal.ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  for (const o of motif.orbs) strokes += `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(o.r)}" fill="${o.ring ? 'none' : pal.colors[0]}" stroke="${pal.ink}" stroke-width="3"/>`;

  let body = '';
  for (const f of figs) {
    body += `<path d="${figurePath(f)}" fill="${pal.ink}"/>`;
    // Pinstripes on the body, like a painted jacket.
    for (let k = 0; k < 4; k++) {
      const poly = f.polys[0];
      const p = poly[Math.floor(rand() * poly.length)];
      body += `<path d="M${n(p[0] - 10)} ${n(p[1])}l${n(rand.range(14, 26))} ${n(rand.range(-4, 4))}" stroke="${pal.colors[2]}" stroke-width="1.6" opacity="0.6"/>`;
    }
  }

  return {
    defs,
    back: rect(W, H, pal.bg) + streaks,
    scene: `<g filter="url(#${id}-r)"><g class="nd-motif">${strokes}</g>${body}<g class="nd-field">${shards}${spl}</g></g>`,
    front: `<rect width="${W}" height="${H}" filter="url(#${id}-g)" opacity="0.16" style="mix-blend-mode:multiply"/>`,
  };
}

// ---------------------------------------------------------------- Ember
function ember(ctx) {
  const { rand, pal, figs, motif, S, id, W, H, density } = ctx;
  const g = pal.glow;
  const defs = `<filter id="${id}-mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="4" seed="${ctx.seed % 1000}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.55"/></filter>
<radialGradient id="${id}-glow"><stop offset="0" stop-color="${g[0]}"/><stop offset="0.35" stop-color="${g[1]}" stop-opacity="0.85"/><stop offset="0.7" stop-color="${g[3]}" stop-opacity="0.35"/><stop offset="1" stop-color="${g[3]}" stop-opacity="0"/></radialGradient>` +
    figs.map((f, i) => `<clipPath id="${id}-c${i}"><path d="${figurePath(f)}"/></clipPath>`).join('');

  const [fx, fy] = motif.focal;
  // Background hatch: fine dark strokes swirling around the focal point.
  let bgH = '';
  for (let i = 0; i < 420 * density; i++) {
    const x = rand.range(S.x0, S.x1), y = rand.range(S.y0, S.y1);
    const a = Math.atan2(y - fy, x - fx) + Math.PI / 2 + rand.range(-0.25, 0.25);
    const l = rand.range(14, 46);
    bgH += `M${n(x)} ${n(y)}l${n(Math.cos(a) * l)} ${n(Math.sin(a) * l)}`;
  }
  // Fire hatch: short strokes that rise through the field.
  const hot = sampleField(rand, motif.field, S, Math.round(12000 * density), 1);
  const buckets = [[], [], [], []];
  for (const [x, y, v] of hot) {
    const away = Math.atan2(y - fy, x - fx);
    const a = away * 0.45 + (-Math.PI / 2) * 0.55 + rand.range(-0.2, 0.2);
    const l = 6 + v * 18;
    const b = v > 0.8 ? 0 : v > 0.6 ? 1 : v > 0.4 ? 2 : 3;
    buckets[b].push(`M${n(x)} ${n(y)}l${n(Math.cos(a) * l)} ${n(Math.sin(a) * l)}`);
  }
  const fire = buckets.map((b, i) => (b.length ? `<path d="${b.join('')}" stroke="${g[i]}" stroke-width="${[1.1, 0.9, 0.8, 0.7][i]}" stroke-linecap="round" opacity="${[1, 0.95, 0.85, 0.7][i]}"/>` : '')).join('');

  let body = '';
  figs.forEach((f, i) => {
    const d = figurePath(f);
    body += `<path d="${d}" fill="${pal.ink}" opacity="0.93"/>`;
    const b = f.polys.flat();
    let xs = Infinity, xe = -Infinity, ys = Infinity, ye = -Infinity;
    for (const [x, y] of b) { xs = Math.min(xs, x); xe = Math.max(xe, x); ys = Math.min(ys, y); ye = Math.max(ye, y); }
    let hatch = '';
    for (let k = xs - (ye - ys); k < xe; k += 3.4) hatch += `M${n(k)} ${n(ye)}L${n(k + (ye - ys))} ${n(ys)}`;
    let hatch2 = '';
    for (let k = xs; k < xe + (ye - ys); k += 4.6) hatch2 += `M${n(k)} ${n(ye)}L${n(k - (ye - ys) * 0.6)} ${n(ys)}`;
    body += `<g clip-path="url(#${id}-c${i})"><path d="${hatch}" stroke="${g[3]}" stroke-width="0.6" opacity="0.38"/><path d="${hatch2}" stroke="${pal.hatch}" stroke-width="0.7" opacity="0.6"/></g>`;
    for (const poly of f.polys) body += scribbleLine(poly, rand, { passes: 2, amp: 1.2, width: 0.8, color: pal.ink, closed: true });
  });

  let m = '';
  for (const s of motif.strokes) m += scribbleLine(s, rand, { passes: 3, amp: 1.5, width: 1.1, color: g[1] });
  for (const o of motif.orbs) m += o.ring ? orbRing(o, rand, g[0], 4, 1.1) : `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${n(o.r)}" fill="${g[0]}"/>`;

  return {
    defs,
    back: rect(W, H, pal.bg) + `<rect width="${W}" height="${H}" filter="url(#${id}-mottle)" opacity="0.5"/>`,
    scene: `<path d="${bgH}" stroke="${pal.hatch}" stroke-width="0.5" opacity="0.55" fill="none"/><circle cx="${n(fx)}" cy="${n(fy)}" r="130" fill="url(#${id}-glow)" class="nd-field"/>${body}<g class="nd-field" fill="none">${fire}</g><g class="nd-motif" fill="none" stroke-linecap="round">${m}</g>`,
  };
}

// ---------------------------------------------------------------- Wall
function wall(ctx) {
  const { rand, pal, figs, motif, S, id, W, H, density } = ctx;
  const defs = roughFilter(`${id}-r`, { freq: 0.02, scale: 30, seed: ctx.seed }) + blurFilter(`${id}-b`, 1.2);
  let patches = '';
  for (let i = 0; i < 12; i++) {
    patches += `<rect x="${n(rand.range(-30, W))}" y="${n(rand.range(-30, H))}" width="${n(rand.range(40, 160))}" height="${n(rand.range(20, 90))}" fill="${pal.patches[i % pal.patches.length]}" opacity="${n(rand.range(0.45, 0.8))}"/>`;
  }
  // Rows of handwriting you can't quite read.
  const gap = 15 / Math.sqrt(density);
  let rows = '';
  const word = (pts, w) => `<path d="${linePath(pts)}" stroke="${pal.colors[Math.floor(rand() * 3)]}" stroke-width="${n(w)}"/>`;
  for (let y0 = 12; y0 < H + 6; y0 += gap) {
    let x = rand.range(-30, 0);
    const w = rand.range(1, 1.9);
    while (x < W + 10) {
      const wordLen = rand.range(40, 150);
      const end = x + wordLen;
      const pts = [];
      while (x < end) {
        // One letter: a trochoid loop. r > k makes a loop, r < k an arch.
        let r = rand.range(2.2, 6.5);
        if (rand() < 0.14) r *= 2.1; // ascender
        const k = rand.range(1.6, 3.6);
        const steps = 9;
        for (let i = 0; i < steps; i++) {
          const t = (i / steps) * TAU;
          const yy = -r * (1 - Math.cos(t));
          pts.push([x + k * t - r * Math.sin(t) - yy * 0.28, y0 + yy + Math.sin(x / 50) * 2]);
        }
        x += k * TAU;
      }
      if (pts.length > 3) rows += word(pts, w);
      x += rand.range(7, 16);
    }
    if (rand() < 0.3) {
      const xs = rand.range(0, W * 0.6);
      rows += `<path d="${linePath(wobble([[xs, y0 - 4], [xs + rand.range(60, 260), y0 - 4]], 1.4, rand, 6))}" stroke="${pal.colors[rand() < 0.5 ? 1 : 2]}" stroke-width="${n(rand.range(2.2, 4))}" opacity="0.85"/>`;
    }
  }
  // Brighter tangles where the field is strong.
  const hot = wanderFill(rand, (x, y) => motif.field(x, y) > 0.45 && !anyFigure(figs, x, y), S, { walks: Math.round(16 * density), steps: 110, stepLen: 3, turn: 0.9 });
  let hotP = '';
  hot.forEach((w, i) => { hotP += `<path d="${linePath(w)}" stroke="${pal.colors[i % 2 ? 0 : 3]}" stroke-width="1.3"/>`; });

  let body = '';
  for (const f of figs) {
    body += `<path d="${figurePath(f)}" fill="${pal.ink}"/>`;
    for (const poly of f.polys) body += scribbleLine(poly, rand, { passes: 3, amp: 1.8, width: 1.3, color: pal.colors[0], closed: true });
  }
  let m = '';
  for (const s of motif.strokes) m += scribbleLine(s, rand, { passes: 3, amp: 1.6, width: 1.6, color: pal.colors[1] });
  for (const o of motif.orbs) m += orbRing(o, rand, pal.colors[4], 4, 1.4);

  return {
    defs,
    back: rect(W, H, pal.bg) + `<g filter="url(#${id}-r)">${patches}</g><g fill="none" stroke-linecap="round" stroke-linejoin="round">${rows}</g>`,
    scene: `<g fill="none" stroke-linecap="round" class="nd-field">${hotP}</g>${body}<g class="nd-motif" fill="none" stroke-linecap="round">${m}</g>`,
  };
}

export const RENDERERS = { tangle, thermal, stipple, haze, collage, burst, ember, wall };
export { clamp };
