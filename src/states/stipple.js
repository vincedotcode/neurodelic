// Stipple: a small solid figure under an enormous sky. The world is made
// of dots and slow, wide rings drawn like crayon on rough paper.

import { dots, P } from '../core/path.js';
import { stipple as sample, bodyPath, resample, grain } from '../core/marks.js';
import { mindAt } from '../figures.js';

export function stipple(S, pal, { rand, id, density = 1 }) {
  const { W, H, heat, body, noise } = S;
  const grounded = S.ground != null;
  const sky = pal.sky;

  // The pale surface: a planet horizon under standing figures, a huge moon behind heads.
  let surface;
  const look = grounded ? 'ground' : rand.pick(['moon', 'moon', 'horizon', 'eclipse']);
  if (grounded || look === 'horizon') {
    const hY = grounded ? S.ground - H * 0.05 : H * rand.range(0.62, 0.78), R0 = H * rand.range(0.8, 1.2);
    surface = { kind: 'ground', cx: W / 2, cy: hY + R0, rx: W * 1.3, ry: R0, top: hY };
  } else if (look === 'eclipse') {
    surface = { kind: 'none', cx: -1e4, cy: -1e4, rx: 1, ry: 1 };
  } else {
    const f = S.figs[0];
    const r = S.R * rand.range(2.2, 2.9);
    const dx = (f.facing || (rand() < 0.5 ? -1 : 1)) * -S.R * rand.range(0.2, 0.9);
    surface = { kind: 'moon', cx: f.mind.x + dx, cy: f.mind.y + rand.range(-0.4, 0.3) * S.R, rx: r, ry: r };
  }
  const onSurface = (x, y) => ((x - surface.cx) / surface.rx) ** 2 + ((y - surface.cy) / surface.ry) ** 2 < 1;
  const surfEdge = (x, y) => Math.sqrt(((x - surface.cx) / surface.rx) ** 2 + ((y - surface.cy) / surface.ry) ** 2);

  // Crayon: a guide line laid down as a band of dots.
  const crayonOn = [], crayonOff = [], under = [];
  for (const g of S.motif.guides) {
    if (g.pts.length < 2) continue;
    const w = (g.ribbon ? g.ribbon * 0.45 : 2.2 + (g.w ?? 1) * 4.2) * density;
    const rs = resample(g.closed ? [...g.pts, g.pts[0]] : g.pts, 0.8);
    under.push(`<path d="${P(resample(g.closed ? [...g.pts, g.pts[0]] : g.pts, 3), false)}" stroke-width="${(w * 0.75).toFixed(1)}"/>`);
    rs.forEach(([x, y], k) => {
      const [ax, ay] = rs[Math.max(0, k - 1)], [bx, by] = rs[Math.min(rs.length - 1, k + 1)];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / l, ny = (bx - ax) / l;
      const grit = 0.6 + 0.4 * noise.n2(x * 0.15, y * 0.15);
      const count = g.ribbon ? 4 : 3;
      for (let c = 0; c < count; c++) {
        if (rand() > grit) continue;
        const o = rand.gauss() * w * 0.24;
        const px = x + nx * o, py = y + ny * o;
        if (body.at(px, py) > 0) continue;
        (onSurface(px, py) ? crayonOn : crayonOff).push([px, py]);
      }
    });
  }

  // Sky dots: darker grit near the top, light where the feeling is.
  const skyDark = sample(W, H, 2.6, (x, y) => (onSurface(x, y) || body.at(x, y) > 0 ? 0 : 0.18 * (1 - y / H) ** 2 + 0.05), rand);
  const skyLight = sample(W, H, 2.2, (x, y) => {
    if (onSurface(x, y) || body.at(x, y) > 0) return 0;
    const h = heat.at(x, y);
    let edge;
    if (surface.kind === 'ground') edge = Math.max(0, 1 - (surface.top - y) / (H * 0.12)) * 0.12;
    else if (surface.kind === 'moon') edge = Math.max(0, 1 - (surfEdge(x, y) - 1) * 6) * 0.35;
    else edge = Math.max(0, 1 - Math.abs(-body.at(x, y) - S.R * 0.18) / (S.R * 0.35)) * 0.7;
    return Math.min(0.85, h * h * 0.8 * density + edge);
  }, rand);
  // Surface dots: shade the planet with dot density.
  const ground = sample(W, H, 2.5, (x, y) => {
    if (!onSurface(x, y) || body.at(x, y) > -1) return 0;
    const e = surfEdge(x, y);
    const rim = surface.kind === 'ground' ? Math.max(0, 1 - (y - surface.top) / (H * 0.2)) * 0.22 : Math.max(0, e - 0.75) * 0.9;
    const h = heat.at(x, y);
    return Math.min(0.55, rim + h * 0.28 + 0.05 + 0.16 * Math.max(0, noise.fbm(x * 0.012 + 3, y * 0.012, 3)));
  }, rand);

  // Shadows at the figures' feet.
  const shadow = [];
  if (grounded) for (const f of S.figs) {
    const r = (f.box.x1 - f.box.x0) * 0.75;
    for (let i = 0; i < r * 14; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
      shadow.push([f.at.x + Math.cos(a) * d * r * 1.2, S.ground + Math.sin(a) * d * r * 0.18]);
    }
  }

  // Inside the figure: pale dots where the thought is, and a thin lit rim.
  const inner = sample(W, H, 2, (x, y) => {
    const v = body.at(x, y);
    if (v <= 0.6) return 0;
    let m = 0;
    for (const f of S.figs) m = Math.max(m, mindAt(f, x, y));
    const h = heat.at(x, y);
    const rim = v < 3.5 ? 0.22 * (1 - v / 3.5) : 0;
    return Math.min(0.7, Math.max(0, m) * 0.55 * (0.4 + h) + rim);
  }, rand);

  // Orbs: moons and rings of dots.
  const orbDots = [];
  for (const o of S.motif.orbs) {
    const n = Math.min(2600, Math.round(o.r * o.r * (o.kind === 'ring' ? 0.9 : 1.6)));
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      let r;
      if (o.kind === 'ring') r = o.r * (0.78 + rand.gauss() * 0.09);
      else r = o.r * Math.sqrt(rand());
      const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
      const lit = o.kind === 'ring' ? 1 : 0.35 + 0.65 * Math.max(0, -(Math.cos(a) + Math.sin(a)) * 0.5 * (r / o.r) + 0.5);
      if (rand() < lit) orbDots.push([x, y]);
    }
  }

  const sk = `${id}-sky`, gr = `${id}-gr`;
  const defs = `<linearGradient id="${sk}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".55" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>`
    + grain(gr, { freq: 0.75, opacity: 0.3, seed: rand.int(1, 999) })
    + `<filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter>`
    + `<mask id="${id}-sky"><rect width="${W}" height="${H}" fill="#fff"/>${surfShape('#000')}</mask><clipPath id="${id}-surf">${surfShape('')}</clipPath>`;
  function surfShape(fill) {
    if (surface.kind === 'none') return '';
    const f = fill ? ` fill="${fill}"` : '';
    return surface.kind === 'ground'
      ? `<ellipse cx="${surface.cx.toFixed(1)}" cy="${surface.cy.toFixed(1)}" rx="${surface.rx.toFixed(1)}" ry="${surface.ry.toFixed(1)}"${f}/>`
      : `<circle cx="${surface.cx.toFixed(1)}" cy="${surface.cy.toFixed(1)}" r="${surface.rx.toFixed(1)}"${f}/>`;
  }
  const surf = surfShape(pal.ground);
  const out = [
    `<g filter="url(#${gr})">`,
    `<rect width="${W}" height="${H}" fill="url(#${sk})"/>`,
    `<g class="nd-field" fill="none" stroke-linecap="round">`,
    `<path d="${dots(skyDark)}" stroke="${sky[0]}" stroke-width="1.3" opacity=".55"/>`,
    surf,
    `<path d="${dots(ground)}" stroke="${pal.dot}" stroke-width="1.25"/>`,
    `<path d="${dots(shadow)}" stroke="${pal.ink}" stroke-width="1.3" opacity=".5"/>`,
    '</g>',
    `<g class="nd-motif" fill="none" stroke-linecap="round">`,
    `<g filter="url(#${id}-soft)" stroke-linecap="round" opacity=".55"><g stroke="${pal.dot}" clip-path="url(#${id}-surf)">${under.join('')}</g><g stroke="${pal.light}" mask="url(#${id}-sky)" opacity=".7">${under.join('')}</g></g>`,
    `<path d="${dots(skyLight)}" stroke="${pal.light}" stroke-width="1.25" opacity=".92"/>`,
    `<path d="${dots(crayonOn)}" stroke="${pal.dot}" stroke-width="1.5"/>`,
    `<path d="${dots(crayonOff)}" stroke="${pal.light}" stroke-width="1.4"/>`,
    `<path d="${dots(orbDots)}" stroke="${pal.light}" stroke-width="1.3"/>`,
    '</g>',
    `<path d="${bodyPath(S, 0)}" fill="${pal.ink}" fill-rule="evenodd"/>`,
    `<path d="${dots(inner)}" fill="none" stroke="${pal.light}" stroke-width="1.15" stroke-linecap="round" opacity=".8"/>`,
    '</g>',
  ];
  return { defs, body: out.join('') };
}
