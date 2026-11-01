// Collage: heads, mountains, clouds and planets cut from old prints and
// pasted under a sky full of stars. A thought becomes a road of six colours.

import { P, dots } from '../core/path.js';
import { Grid } from '../core/field.js';
import { bodyPath, regionPath, grain, blur, mix } from '../core/marks.js';

const LIGHT = (() => { const v = [-0.55, -0.7, 0.55]; const l = Math.hypot(...v); return v.map((c) => c / l); })();

// Halftone dots on a 45-degree screen. shadeAt returns 0 (lit) .. 1 (dark) or -1 outside.
function halftone(W, H, sp, shadeAt) {
  const buckets = [[], [], [], []];
  const N = Math.ceil(Math.max(W, H) / sp) + 2;
  const k = sp / Math.SQRT2;
  for (let a = -N; a <= N; a++) for (let b = -N; b <= N; b++) {
    const x = (a - b) * k + W / 2, y = (a + b) * k + H / 2;
    if (x < -2 || y < -2 || x > W + 2 || y > H + 2) continue;
    const s = shadeAt(x, y);
    if (s < 0.12) continue;
    buckets[Math.min(3, Math.floor(s * 4))].push([x, y]);
  }
  return buckets;
}

function shadeFromDepth(grid, x, y, soft = 12) {
  const v = grid.at(x, y);
  if (v <= 0.4) return -1;
  const [gx, gy] = grid.grad(x, y, 2);
  const gl = Math.hypot(gx, gy) || 1;
  const e = Math.exp(-v / soft);
  const nx = (-gx / gl) * e, ny = (-gy / gl) * e, nz = Math.sqrt(Math.max(0, 1 - e * e));
  const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  return Math.min(1, (1 - lit) * 1.25);
}

function ribbonBands(pts, width, bands, taper, closed) {
  const n = pts.length;
  const out = bands.map(() => ({ left: [], right: [] }));
  const paper = { left: [], right: [] };
  for (let k = 0; k < n; k++) {
    const [ax, ay] = pts[Math.max(0, k - 1)], [bx, by] = pts[Math.min(n - 1, k + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l, ny = (bx - ax) / l;
    const t = k / (n - 1);
    const w = width * (taper ? 0.3 + 0.7 * t : 1);
    const [x, y] = pts[k];
    bands.forEach((_, i) => {
      const o0 = (i / bands.length - 0.5) * w, o1 = ((i + 1) / bands.length - 0.5) * w;
      out[i].left.push([x + nx * o0, y + ny * o0]);
      out[i].right.push([x + nx * o1, y + ny * o1]);
    });
    paper.left.push([x + nx * (-w / 2 - 1.6), y + ny * (-w / 2 - 1.6)]);
    paper.right.push([x + nx * (w / 2 + 1.6), y + ny * (w / 2 + 1.6)]);
  }
  const poly = (b) => [...b.left, ...b.right.reverse()];
  return { bands: out.map(poly), paper: poly(paper), closed };
}

export function collage(S, pal, { rand, id, density = 1 }) {
  const { W, H, body, noise } = S;
  const grounded = S.ground != null;
  const horizon = grounded ? S.ground - H * 0.02 : H * rand.range(0.7, 0.86);
  const defs = [];
  const out = [];
  const sp = 3.4 * (W / 400);

  // Space and stars.
  out.push(`<rect width="${W}" height="${H}" fill="${pal.space}"/>`);
  const small = [], mid = [], bright = [];
  for (let i = 0; i < 260 * density; i++) small.push([rand() * W, rand() * horizon]);
  for (let i = 0; i < 40; i++) mid.push([rand() * W, rand() * horizon]);
  for (let i = 0; i < 7; i++) bright.push([rand() * W, rand() * horizon * 0.8]);
  out.push(`<g fill="none" stroke="${pal.paper}" stroke-linecap="round"><path d="${dots(small)}" stroke-width=".7" opacity=".55"/><path d="${dots(mid)}" stroke-width="1.4" opacity=".8"/><path d="${dots(bright)}" stroke-width="2.4" filter="url(#${id}-gl)"/><path d="${dots(bright)}" stroke-width="1.8"/></g>`);
  defs.push(blur(`${id}-gl`, 2.2, 200), blur(`${id}-sh`, 2.4, 20));

  // Planets: the motif's orbs, plus sometimes a big moon of our own.
  const orbs = S.motif.orbs.filter((o) => o.r > 4).map((o) => ({ ...o }));
  if (rand() < 0.6) orbs.unshift({ x: W * rand.range(0.1, 0.9), y: horizon * rand.range(0.12, 0.45), r: S.R * rand.range(0.4, 0.95), kind: 'planet', big: true });
  const planetSvg = [];
  for (const o of orbs) {
    const col = o.kind === 'sun' ? pal.bands[4] : rand.pick(pal.planet);
    const shadeCol = mix(col, pal.space, 0.55);
    const ht = halftone(W, H, sp * 0.9, (x, y) => {
      const dx = (x - o.x) / o.r, dy = (y - o.y) / o.r, d2 = dx * dx + dy * dy;
      if (d2 > 0.96) return -1;
      const lit = Math.max(0, dx * LIGHT[0] + dy * LIGHT[1] + Math.sqrt(1 - d2) * LIGHT[2]);
      return o.kind === 'sun' ? (1 - lit) * 0.5 : (1 - lit) * 1.1;
    });
    planetSvg.push(`<circle cx="${o.x.toFixed(1)}" cy="${(o.y + 2).toFixed(1)}" r="${(o.r + 1.8).toFixed(1)}" fill="#000" opacity=".45" filter="url(#${id}-sh)"/>`);
    planetSvg.push(`<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${(o.r + 1.6).toFixed(1)}" fill="${pal.paper}"/><circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${o.r.toFixed(1)}" fill="${col}"/>`);
    planetSvg.push(htPaths(ht, sp * 0.9, shadeCol));
    if (o.kind !== 'sun' && o.r > 10) {
      const craters = [];
      for (let i = rand.int(2, 5); i > 0; i--) {
        const a = rand() * 6.28, d = Math.sqrt(rand()) * o.r * 0.7, cr = o.r * rand.range(0.06, 0.16);
        craters.push(`<ellipse cx="${(o.x + Math.cos(a) * d).toFixed(1)}" cy="${(o.y + Math.sin(a) * d).toFixed(1)}" rx="${cr.toFixed(1)}" ry="${(cr * 0.8).toFixed(1)}"/>`);
      }
      planetSvg.push(`<g fill="${shadeCol}" opacity=".45">${craters.join('')}</g>`);
    }
    if (o.big && rand() < 0.35) planetSvg.push(`<ellipse cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" rx="${(o.r * 1.7).toFixed(1)}" ry="${(o.r * 0.32).toFixed(1)}" transform="rotate(${rand.range(-25, 25).toFixed(0)} ${o.x.toFixed(1)} ${o.y.toFixed(1)})" fill="none" stroke="${pal.paper}" stroke-width="${(o.r * 0.12).toFixed(1)}" opacity=".9"/>`);
  }
  out.push(`<g class="nd-motif">${planetSvg.join('')}</g>`);

  // Clouds: cut-paper cumulus banks along the horizon, shaded in halftone.
  const cloudCircles = [];
  const banks = rand.int(1, 3);
  for (let b = 0; b < banks; b++) {
    const cy = horizon - H * rand.range(0.02, 0.16), cx = W * rand.range(0.05, 0.95), span = W * rand.range(0.25, 0.6);
    for (let i = 0; i < 9; i++) {
      const t = i / 8 - 0.5;
      const r = H * rand.range(0.035, 0.07) * (1.3 - Math.abs(t) * 1.2);
      cloudCircles.push([cx + t * span + rand.range(-8, 8), cy - r * rand.range(0.2, 0.6), r, cy + H * 0.03]);
    }
  }
  const clouds = Grid.of(W, H, 3, (x, y) => {
    let d = -1e9;
    for (const [cx, cy, r, base] of cloudCircles) { if (y > base) continue; const v = r - Math.hypot(x - cx, y - cy); if (v > d) d = v; }
    return d;
  });

  // Mountains: a far range with snow, then the desert.
  const ridge = (base, amp, f, off) => {
    const pts = [];
    for (let x = -6; x <= W + 6; x += 3) pts.push([x, base - amp * (0.62 * noise.ridged(x * f + off, off * 0.3, 4) + 0.38 * (noise.fbm(x * f * 2.3 + off, 3.3, 2) * 0.5 + 0.5))]);
    return pts;
  };
  const far = ridge(horizon, H * rand.range(0.14, 0.26), 0.009 * (400 / W), rand() * 50);
  const snowLine = horizon - H * 0.12;
  const snow = [];
  far.forEach(([x, y]) => snow.push([x, y]));
  for (let i = far.length - 1; i >= 0; i--) { const [x, y] = far[i]; snow.push([x, Math.max(y, snowLine + noise.n2(x * 0.08, 1) * 6)]); }
  const strata = [];
  for (let i = 0; i < 70 * density; i++) {
    const k = rand.int(0, far.length - 1), [x, y] = far[k];
    const len = H * rand.range(0.02, 0.09), a = Math.PI / 2 + rand.range(-0.5, 0.5);
    strata.push([[x, y + 2], [x + Math.cos(a) * len, y + 2 + Math.sin(a) * len]]);
  }
  out.push(`<g class="nd-field">`);
  out.push(`<path d="${P([...far, [W + 6, H + 6], [-6, H + 6]], true)}" fill="${pal.mountain[0]}"/>`);
  out.push(`<path d="${P(snow, true)}" fill="${pal.mountain[1]}"/>`);
  out.push(`<path d="${strata.map((l) => P(l)).join('')}" stroke="${mix(pal.mountain[0], pal.space, 0.5)}" stroke-width=".9" opacity=".55" fill="none" stroke-linecap="round"/>`);
  const cloudPath = regionPath(clouds, 0, 0.5, 10);
  if (cloudPath) {
    out.push(`<path d="${cloudPath}" fill="#000" opacity=".35" transform="translate(1.5 2.5)" filter="url(#${id}-sh)"/>`);
    out.push(`<path d="${regionPath(clouds, -1.6, 0.5, 10)}" fill="${pal.paper}"/>`);
    out.push(`<path d="${cloudPath}" fill="#F7F5EF"/>`);
    out.push(htPaths(halftone(W, H, sp * 0.8, (x, y) => { const s = shadeFromDepth(clouds, x, y, 9); return s < 0 ? -1 : s * 0.75; }), sp * 0.8, '#8E97A8'));
  }
  // Desert foreground.
  const dunes = [];
  const bands = rand.int(3, 5);
  for (let i = 0; i < bands; i++) {
    const top = horizon + ((H - horizon) * i) / bands + 2;
    const pts = [];
    const amp = 3 + i * 2, fr = rand.range(0.01, 0.025), ph = rand() * 6;
    for (let x = -6; x <= W + 6; x += 4) pts.push([x, top + Math.sin(x * fr + ph) * amp]);
    dunes.push(`<path d="${P([...pts, [W + 6, H + 6], [-6, H + 6]], true)}" fill="${pal.ground[i % pal.ground.length]}"/>`);
  }
  out.push(dunes.join(''));
  out.push('</g>');

  // The thought: ribbons of six colours along every guide.
  const behind = [], above = [];
  for (const g of S.motif.guides) {
    if (g.pts.length < 2) continue;
    let inside = 0;
    for (const [x, y] of g.pts) if (body.at(x, y) > 0) inside++;
    const thin = g.ray || g.frag || g.crack || g.trail || g.knot;
    const width = g.ribbon ? g.ribbon : thin ? 3.2 + (g.w ?? 1) * 2.4 : 6 + (g.w ?? 1) * 10;
    const bandCols = thin ? pal.bands.filter((_, i) => i % 2 === 0) : pal.bands;
    const r = ribbonBands(g.pts, width * density * (W / 400) ** 0.5, bandCols, !!g.ribbon, !!g.closed);
    const svg = `<path d="${P(r.paper, true)}" fill="#000" opacity=".4" transform="translate(1.5 2.5)" filter="url(#${id}-sh)"/>`
      + `<path d="${P(r.paper, true)}" fill="${pal.paper}"/>` + r.bands.map((b, i) => `<path d="${P(b, true)}" fill="${bandCols[i]}"/>`).join('');
    (inside > g.pts.length * 0.5 ? above : behind).push(svg);
  }
  out.push(`<g class="nd-motif">${behind.join('')}</g>`);

  // Figures: a paper margin, a drop shadow, a tinted print with halftone shading.
  const edge = regionPath(body, -2.4, 0.4, 10);
  const fig = bodyPath(S, 0);
  out.push(`<path d="${edge}" fill="#000" opacity=".5" transform="translate(2 3)" filter="url(#${id}-sh)"/>`);
  out.push(`<path d="${edge}" fill="${pal.paper}"/>`);
  out.push(`<path d="${fig}" fill="${pal.figure}" fill-rule="evenodd"/>`);
  defs.push(`<clipPath id="${id}-cl"><path d="${fig}" clip-rule="evenodd"/></clipPath>`);
  // Rainbow stripes inside each head: the mind, printed in colour.
  const stripes = [];
  for (const f of S.figs) {
    const m = f.mind;
    const front = !f.facing;
    const back = -(f.facing || 0) * m.rx * 0.6;
    const cx = m.x + back, cy = front ? m.y + m.ry * 1.6 : m.y + m.ry * 0.15;
    const kx = front ? 1.5 : 1.25, ky = front ? 2.1 : 1.15;
    const bandsN = pal.bands.length;
    for (let i = 0; i < bandsN; i++) {
      const k = 1 - i / bandsN;
      if (front && k < 0.45) break;
      stripes.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(m.rx * kx * k).toFixed(1)}" ry="${(m.ry * ky * k).toFixed(1)}" fill="${pal.bands[i]}"/>`);
    }
  }
  out.push(`<g clip-path="url(#${id}-cl)"><g class="nd-motif">${stripes.join('')}</g>`);
  out.push(htPaths(halftone(W, H, sp, (x, y) => shadeFromDepth(body, x, y, 14)), sp, pal.shade));
  out.push('</g>');
  out.push(`<g class="nd-motif">${above.join('')}</g>`);

  defs.push(grain(`${id}-gr`, { freq: 0.8, opacity: 0.22, mode: 'overlay', seed: rand.int(1, 999) }));
  return { defs: defs.join(''), body: `<g filter="url(#${id}-gr)">${out.join('')}</g>` };
}

function htPaths(buckets, sp, color) {
  const widths = [0.3, 0.52, 0.72, 0.92].map((k) => (k * sp).toFixed(2));
  return `<g fill="none" stroke="${color}" stroke-linecap="round">${buckets.map((b, i) => (b.length ? `<path d="${dots(b)}" stroke-width="${widths[i]}"/>` : '')).join('')}</g>`;
}
