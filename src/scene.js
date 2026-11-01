// A scene is the drawing before it has a style: who is in it, where they
// stand, and what is happening inside their head. Every state of mind
// renders the same scene its own way.

import { rng, hashString, clamp } from './core/util.js';
import { makeNoise } from './core/noise.js';
import { Grid } from './core/field.js';
import { figure, poseBox, sceneSdf } from './figures.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- geometry

function arc(cx, cy, rx, ry, a0, a1, rot = 0, step = 0.05) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

function spiral(cx, cy, r0, r1, turns, squash = 1, rot = 0, phase = 0, step = 0.05) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  const n = Math.ceil((turns * TAU) / step);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = phase + t * turns * TAU, r = r0 + (r1 - r0) * t;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * squash;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

// A living line: walks forward while noise bends it.
function tendril(S, x, y, a, len, { curl = 0.6, step = 3, bias = null, biasW = 0, scale = 0.012, seed = 0 } = {}) {
  const pts = [[x, y]];
  const n = Math.ceil(len / step);
  for (let i = 0; i < n; i++) {
    a += S.noise.n2(x * scale + seed, y * scale - seed) * curl * 0.35;
    if (bias != null) {
      let d = bias - a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      a += d * biasW;
    }
    x += Math.cos(a) * step; y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
}

function bezier(p0, p1, p2, steps = 40) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

function catmull(ctrl, per = 12) {
  const out = [];
  const g = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

const g2 = (dx, dy, s) => Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
const angleTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// ---------------------------------------------------------------- motifs
// Each motif returns { focal, guides: [{ pts, w }], orbs: [{ x, y, r }], base(x, y) 0..1, flow(x, y) radians }.

const MOTIFS = {
  bloom(S, o = {}) {
    const { rand } = S;
    const f = o.focal || [S.mind.x, S.mind.y];
    const n = rand.int(7, 13), guides = [];
    const off = rand() * TAU;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU + rand.range(-0.2, 0.2);
      const len = S.R * rand.range(1.1, 2.4);
      guides.push({ pts: tendril(S, f[0] + Math.cos(a) * S.R * 0.15, f[1] + Math.sin(a) * S.R * 0.15, a, len, { curl: 0.5, step: 3, seed: i * 3.1 }), w: rand.range(0.5, 1) });
    }
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => g2(x - f[0], y - f[1], S.R * 1.1) * (0.8 + 0.4 * S.noise.fbm(x * 0.01, y * 0.01)),
      flow: (x, y) => angleTo(f, [x, y]) + S.noise.n2(x * 0.008, y * 0.008) * 0.9,
    };
  },

  gift(S) {
    const f = S.figs[0].hands || [S.figs[0].head.x, S.figs[0].head.y + S.figs[0].head.r * 3.6];
    return MOTIFS.bloom(S, { focal: f });
  },

  spiral(S) {
    const { rand } = S;
    const grounded = S.ground != null;
    const f = grounded ? [S.figs[0].x, S.ground] : [S.mind.x, S.mind.y];
    const squash = grounded ? rand.range(0.24, 0.36) : rand.range(0.8, 1);
    const arms = rand.int(1, 3);
    const r1 = grounded ? S.W * rand.range(0.55, 0.8) : S.R * rand.range(2.2, 3.2);
    const turns = rand.range(2.5, 4.5);
    const phase = rand() * TAU;
    const guides = [];
    for (let k = 0; k < arms; k++) guides.push({ pts: spiral(f[0], f[1], S.R * 0.25, r1, turns, squash, 0, phase + (k / arms) * TAU), w: 1 });
    const lam = (r1 / turns) || 30;
    return {
      focal: f, guides, orbs: grounded ? [{ x: f[0] + rand.range(-0.15, 0.15) * S.W, y: S.H * rand.range(0.12, 0.22), r: S.R * rand.range(0.12, 0.2), kind: 'ring' }] : [],
      base: (x, y) => {
        const dx = x - f[0], dy = (y - f[1]) / squash, r = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        return clamp(1 - r / (r1 * 1.1)) * (0.5 + 0.5 * Math.sin((r / lam) * TAU - a * arms - phase));
      },
      flow: (x, y) => Math.atan2((y - f[1]) / squash, x - f[0]) + Math.PI / 2 + 0.2,
    };
  },

  eruption(S, o = {}) {
    const { rand } = S;
    const m = S.mind;
    const top = [m.x, m.y - m.ry * 0.6];
    const n = o.count || rand.int(10, 17), guides = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a = -Math.PI + 0.25 + t * (Math.PI - 0.5) + rand.range(-0.1, 0.1);
      const sx = m.x + Math.cos(a) * m.rx * 0.8, sy = m.y + Math.sin(a) * m.ry * 0.8;
      const len = S.R * rand.range(1.4, 3.4) * (o.len || 1);
      guides.push({ pts: tendril(S, sx, sy, a, len, { curl: o.curl || 0.9, step: 3, bias: o.bias ?? -Math.PI / 2, biasW: o.biasW ?? 0.025, seed: i * 2.3 }), w: rand.range(0.4, 1) });
    }
    return {
      focal: top, guides, orbs: [],
      base: (x, y) => g2((x - top[0]) * 0.8, Math.max(0, y - top[1]) * 2.2 + Math.min(0, y - top[1]) * 0.5, S.R * 1.3),
      flow: (x, y) => -Math.PI / 2 + (x - top[0]) / (S.R * 4) + S.noise.n2(x * 0.01, y * 0.01) * 0.7,
    };
  },

  smoke(S) {
    const side = S.figs[0].facing >= 0 ? -1 : 1;
    return MOTIFS.eruption(S, { count: S.rand.int(5, 8), len: 1.5, curl: 0.5, bias: -Math.PI / 2 + side * 0.7, biasW: 0.03 });
  },

  drift(S) {
    const { rand } = S;
    const guides = [];
    const n = rand.int(4, 7);
    const flow = (x, y) => S.noise.fbm(x * 0.004 + 3, y * 0.004, 2) * TAU * 0.8 + 0.4;
    for (let i = 0; i < n; i++) {
      let x = rand() * S.W, y = rand() * S.H;
      const pts = [[x, y]];
      for (let k = 0; k < 120; k++) { const a = flow(x, y); x += Math.cos(a) * 4; y += Math.sin(a) * 4; pts.push([x, y]); }
      guides.push({ pts, w: rand.range(0.3, 0.9) });
    }
    const orbs = [];
    for (let i = rand.int(2, 4); i > 0; i--) orbs.push({ x: rand() * S.W, y: rand() * S.H, r: S.R * rand.range(0.1, 0.5), kind: 'soft' });
    return {
      focal: [S.mind.x, S.mind.y], guides, orbs,
      base: (x, y) => clamp(0.15 + 0.85 * S.noise.fbm(x * 0.006, y * 0.006, 3)),
      flow,
    };
  },

  river(S) {
    const { rand } = S;
    const m = S.mind, fig = S.figs[0];
    const d = fig.at.x + (fig.facing || 0) * S.R < S.W / 2 ? 1 : -1;
    const start = [m.x, m.y - m.ry * 0.4];
    const R = S.R;
    const ctrl = [
      start,
      [start[0] + d * R * 0.5, start[1] - R * rand.range(1.1, 1.6)],
      [S.W * 0.5 + d * S.W * rand.range(0.05, 0.2), Math.max(S.H * 0.08, start[1] - R * rand.range(2, 2.8))],
      [S.W * (0.5 + d * rand.range(0.3, 0.38)), S.H * rand.range(0.3, 0.5)],
      [S.W * (0.5 + d * 0.65), S.H * rand.range(0.5, 0.85)],
    ];
    const pts = catmull(ctrl, 16);
    return {
      focal: start, guides: [{ pts, w: 1, ribbon: R * rand.range(0.6, 0.9) }],
      orbs: [{ x: S.W * (0.5 - d * rand.range(0.2, 0.38)), y: S.H * rand.range(0.1, 0.22), r: R * rand.range(0.22, 0.4), kind: 'planet' }],
      base: null,
      flow: (x, y) => d * 0.3 + S.noise.n2(x * 0.01, y * 0.01) * 0.8,
    };
  },

  orbit(S, o = {}) {
    const { rand } = S;
    const f = [S.mind.x, S.mind.y];
    const rings = o.rings || rand.int(2, 3), guides = [], orbs = [];
    for (let i = 0; i < rings; i++) {
      const rx = S.R * (1.25 + i * rand.range(0.35, 0.55)), ry = rx * rand.range(0.22, 0.42), rot = rand.range(-0.45, 0.45);
      guides.push({ pts: arc(f[0], f[1], rx, ry, 0, TAU, rot), w: 1 - i * 0.2, closed: true, ring: { rx, ry, rot } });
      const a = rand() * TAU, c = Math.cos(rot), s = Math.sin(rot);
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      orbs.push({ x: f[0] + x * c - y * s, y: f[1] + x * s + y * c, r: S.R * rand.range(0.07, 0.17), kind: 'planet' });
    }
    return {
      focal: f, guides, orbs,
      base: (x, y) => g2(x - f[0], (y - f[1]) * 2.2, S.R * 2),
      flow: (x, y) => angleTo(f, [x, y]) + Math.PI / 2,
    };
  },

  think(S) {
    const o = MOTIFS.orbit(S, { rings: 2 });
    const k = MOTIFS.knot(S);
    return { ...o, guides: [...o.guides, ...k.guides], base: (x, y) => Math.max(o.base(x, y), k.base(x, y)) };
  },

  bridge(S) {
    const { rand } = S;
    const a = S.figs[0].mind, b = (S.figs[1] || S.figs[0]).mind;
    const A = [a.x, a.y - a.ry * 0.4];
    const B = S.figs[1] ? [b.x, b.y - b.ry * 0.4] : [S.W * (A[0] < S.W / 2 ? 0.85 : 0.15), S.H * 0.25];
    const n = rand.int(4, 8), guides = [];
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    for (let i = 0; i < n; i++) {
      const h = S.R * (0.9 + (i / n) * 1.8 + rand.range(-0.1, 0.1));
      guides.push({ pts: bezier([A[0] + rand.range(-1, 1) * S.R * 0.2, A[1]], [mid[0] + rand.range(-1, 1) * S.R * 0.3, mid[1] - h * 2], [B[0] + rand.range(-1, 1) * S.R * 0.2, B[1]], 48), w: 1 - i / n * 0.5 });
    }
    return {
      focal: [mid[0], mid[1] - S.R * 1.6], guides, orbs: S.figs[1] ? [] : [{ x: B[0], y: B[1], r: S.R * 0.3, kind: 'planet' }],
      base: (x, y) => Math.max(g2(x - A[0], y - A[1], S.R * 0.9), g2(x - B[0], y - B[1], S.R * 0.9), g2((x - mid[0]) * 0.5, y - mid[1] + S.R * 1.6, S.R)),
      flow: (x, y) => (x < mid[0] ? -0.6 : 0.6) * (A[0] < B[0] ? 1 : -1),
    };
  },

  rise(S) {
    const { rand } = S;
    const h = S.figs[0].head;
    const top = [h.x, h.y - h.r];
    const n = rand.int(5, 9), guides = [];
    for (let i = 0; i < n; i++) {
      const x0 = top[0] + (i - (n - 1) / 2) * h.r * 0.25, amp = S.R * rand.range(0.1, 0.35), fr = rand.range(0.015, 0.035), ph = rand() * TAU;
      const spread = (i - (n - 1) / 2) * rand.range(0.05, 0.18);
      const pts = [];
      for (let y = top[1]; y > -10; y -= 4) {
        const t = (top[1] - y) / top[1];
        pts.push([x0 + Math.sin(y * fr + ph) * amp * t + spread * (top[1] - y), y]);
      }
      guides.push({ pts, w: rand.range(0.5, 1) });
    }
    return {
      focal: [top[0], S.H * 0.18], guides,
      orbs: [{ x: top[0] + rand.range(-0.1, 0.1) * S.W, y: S.H * rand.range(0.08, 0.16), r: S.R * rand.range(0.18, 0.32), kind: 'ring' }],
      base: (x, y) => (y < top[1] ? g2(x - top[0], 0, S.R * 0.9) * (0.5 + 0.5 * (1 - y / top[1])) : 0),
      flow: (x, y) => -Math.PI / 2 + Math.sin(y * 0.03) * 0.4,
    };
  },

  void(S) {
    const { rand } = S;
    const h = S.figs[0].head;
    const c = [h.x + rand.range(-0.1, 0.1) * S.W, Math.max(S.H * 0.25, h.y - S.R * rand.range(1.8, 2.6))];
    const r = S.R * rand.range(1.1, 1.8);
    return {
      focal: c, guides: [{ pts: arc(c[0], c[1], r, r, 0, TAU), w: 0.6, closed: true, ring: { rx: r, ry: r, rot: 0 } }],
      orbs: [{ x: c[0] + r * rand.range(-1.4, 1.4), y: c[1] - r * rand.range(0.6, 1.2), r: S.R * 0.07, kind: 'spark' }],
      base: (x, y) => 0.15 * clamp(0.5 + S.noise.fbm(x * 0.004, y * 0.004)),
      flow: (x, y) => angleTo(c, [x, y]) + Math.PI / 2,
    };
  },

  halo(S) {
    const { rand } = S;
    const f = [S.mind.x, S.mind.y];
    const r = S.R * rand.range(1.15, 1.45);
    const n = rand.int(14, 28), guides = [{ pts: arc(f[0], f[1], r, r, 0, TAU), w: 1, closed: true, ring: { rx: r, ry: r, rot: 0 } }];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand.range(-0.05, 0.05), r0 = r * rand.range(1.15, 1.3), r1 = r * rand.range(1.5, 2.1);
      guides.push({ pts: [[f[0] + Math.cos(a) * r0, f[1] + Math.sin(a) * r0], [f[0] + Math.cos(a) * r1, f[1] + Math.sin(a) * r1]], w: rand.range(0.3, 0.7), ray: true });
    }
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => { const d = Math.hypot(x - f[0], y - f[1]); return Math.exp(-((d - r) ** 2) / (2 * (S.R * 0.35) ** 2)) + 0.4 * g2(x - f[0], y - f[1], r * 0.6); },
      flow: (x, y) => angleTo(f, [x, y]),
    };
  },

  dawn(S) {
    const { rand } = S;
    const gy = S.ground ?? S.H * 0.72;
    const c = [S.figs[0].x + rand.range(-0.15, 0.15) * S.W, gy];
    const r = S.R * rand.range(1.6, 2.4);
    const guides = [];
    const n = rand.int(9, 15);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + ((i + 0.5) / n) * Math.PI;
      guides.push({ pts: [[c[0] + Math.cos(a) * r * 1.15, c[1] + Math.sin(a) * r * 1.15], [c[0] + Math.cos(a) * r * rand.range(1.6, 2.3), c[1] + Math.sin(a) * r * rand.range(1.6, 2.3)]], w: 0.6, ray: true });
    }
    return {
      focal: c, guides, orbs: [{ x: c[0], y: c[1], r, kind: 'sun' }],
      base: (x, y) => (y < gy ? g2(x - c[0], y - c[1], r * 1.4) : 0),
      flow: (x, y) => angleTo(c, [x, y]),
    };
  },

  scatter(S) {
    const { rand } = S;
    const m = S.mind;
    const side = -(S.figs[0].facing || 1);
    const guides = [];
    const n = rand.int(18, 34);
    for (let i = 0; i < n; i++) {
      const t = rand() ** 0.7;
      const x = m.x + side * t * S.R * 3.2 + rand.gauss() * S.R * 0.25 * (1 + t);
      const y = m.y - m.ry * 0.3 + t * S.R * 2.2 + rand.gauss() * S.R * 0.3;
      const a = Math.atan2(1, side * 1.4) + rand.range(-0.6, 0.6), l = S.R * rand.range(0.08, 0.28) * (1 - t * 0.5);
      guides.push({ pts: [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], w: 1 - t * 0.7, frag: true });
    }
    return {
      focal: [m.x, m.y], guides, orbs: [],
      base: (x, y) => g2((x - m.x - side * S.R * 1.4) * 0.6, y - m.y - S.R * 0.8, S.R * 1.1),
      flow: () => Math.atan2(1, side * 1.4),
    };
  },

  knot(S) {
    const { rand } = S;
    const m = S.mind;
    const c = Math.cos(-m.rot), s = Math.sin(-m.rot);
    const inside = (x, y) => { const dx = x - m.x, dy = y - m.y; const u = (dx * c - dy * s) / m.rx, v = (dx * s + dy * c) / m.ry; return u * u + v * v < 0.8; };
    let x = m.x, y = m.y, a = rand() * TAU;
    const pts = [[x, y]];
    for (let i = 0; i < 520; i++) {
      a += rand.gauss() * 0.45;
      let nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3, tries = 0;
      while (!inside(nx, ny) && tries++ < 12) { a += 0.6 + rand() * 0.6; nx = x + Math.cos(a) * 3; ny = y + Math.sin(a) * 3; }
      x = nx; y = ny; pts.push([x, y]);
    }
    return {
      focal: [m.x, m.y], guides: [{ pts, w: 1, knot: true }], orbs: [],
      base: (px, py) => { const dx = px - m.x, dy = py - m.y; const u = (dx * c - dy * s) / m.rx, v = (dx * s + dy * c) / m.ry; return clamp(1.1 - Math.hypot(u, v)); },
      flow: (px, py) => S.noise.n2(px * 0.03, py * 0.03) * TAU,
    };
  },

  wave(S, o = {}) {
    const { rand } = S;
    const f = [S.mind.x, S.mind.y];
    const n = o.count || rand.int(5, 8), guides = [];
    const gap = S.R * rand.range(0.22, 0.35);
    const fr = rand.range(0.02, 0.045);
    for (let i = 0; i < n; i++) {
      const y0 = f[1] + (i - (n - 1) / 2) * gap, ph = rand() * TAU, amp = S.R * rand.range(0.25, 0.5) * (o.amp || 1);
      const pts = [];
      for (let x = -10; x <= S.W + 10; x += 4) pts.push([x, y0 + Math.sin(x * fr + ph) * amp * (0.25 + g2(x - f[0], 0, S.R * 1.4))]);
      guides.push({ pts, w: 1 - Math.abs(i - (n - 1) / 2) / n });
    }
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => g2(0, y - f[1], gap * n * 0.5) * (0.4 + 0.6 * g2(x - f[0], 0, S.R * 1.8)),
      flow: (x, y) => Math.cos(x * fr) * 0.5,
    };
  },

  calm(S) { return MOTIFS.wave(S, { count: S.rand.int(4, 6), amp: 0.35 }); },

  shatter(S) {
    const { rand } = S;
    const f = [S.mind.x + rand.range(-0.3, 0.3) * S.mind.rx, S.mind.y + rand.range(-0.3, 0.3) * S.mind.ry];
    const guides = [];
    const crack = (x, y, a, len, depth) => {
      const pts = [[x, y]];
      let l = 0;
      while (l < len) {
        const st = rand.range(5, 12);
        a += rand.range(-0.45, 0.45);
        x += Math.cos(a) * st; y += Math.sin(a) * st; l += st;
        pts.push([x, y]);
        if (depth < 2 && rand() < 0.12) crack(x, y, a + rand.pick([-1, 1]) * rand.range(0.5, 1), len * 0.4, depth + 1);
      }
      guides.push({ pts, w: 1 - depth * 0.35, crack: true });
    };
    const n = rand.int(5, 9), off = rand() * TAU;
    for (let i = 0; i < n; i++) crack(f[0], f[1], off + (i / n) * TAU + rand.range(-0.2, 0.2), S.R * rand.range(1.4, 3), 0);
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => g2(x - f[0], y - f[1], S.R * 1.3),
      flow: (x, y) => angleTo(f, [x, y]),
    };
  },

  flash(S) {
    const { rand } = S;
    const m = S.mind;
    const guides = [];
    const bolt = (x, y, tx, ty, w) => {
      const pts = [[x, y]];
      const n = rand.int(7, 11);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        pts.push([x + (tx - x) * t + (i < n ? rand.range(-1, 1) * S.R * 0.35 : 0), y + (ty - y) * t]);
        if (i < n - 2 && rand() < 0.25) guides.push({ pts: [pts[i], [pts[i][0] + rand.range(-1, 1) * S.R * 0.8, pts[i][1] + S.R * rand.range(0.3, 0.8)]], w: w * 0.5, crack: true });
      }
      guides.push({ pts, w, crack: true });
    };
    bolt(m.x + rand.range(-0.4, 0.4) * S.W * 0.5, -10, m.x, m.y - m.ry * 0.5, 1);
    return {
      focal: [m.x, m.y - m.ry * 0.5], guides, orbs: [{ x: m.x, y: m.y - m.ry * 0.5, r: S.R * 0.2, kind: 'spark' }],
      base: (x, y) => Math.max(g2(x - m.x, y - m.y, S.R * 0.9), y < m.y ? g2(x - m.x, 0, S.R * 0.7) * 0.6 : 0),
      flow: () => Math.PI / 2,
    };
  },

  split(S) {
    const { rand } = S;
    const m = S.mind;
    const tilt = rand.range(-0.25, 0.25);
    const line = [[m.x + Math.tan(tilt) * m.y, -10], [m.x - Math.tan(tilt) * (S.H - m.y), S.H + 10]];
    const left = MOTIFS.knot(S), right = MOTIFS.halo(S);
    const side = (x, y) => (x - m.x) - Math.tan(-tilt) * (y - m.y) < 0;
    return {
      focal: [m.x, m.y],
      guides: [{ pts: line, w: 1, crack: true }, ...left.guides.map((g) => ({ ...g, pts: g.pts.filter(([x, y]) => side(x, y)) })).filter((g) => g.pts.length > 2), ...right.guides.map((g) => ({ ...g, pts: g.pts.filter(([x, y]) => !side(x, y)) })).filter((g) => g.pts.length > 1)],
      orbs: [],
      base: (x, y) => (side(x, y) ? 0.7 * clamp(0.6 + S.noise.fbm(x * 0.02, y * 0.02)) * g2(x - m.x, y - m.y, S.R * 2) : 0.2 * g2(x - m.x, y - m.y, S.R * 2)),
      flow: (x, y) => (side(x, y) ? S.noise.n2(x * 0.02, y * 0.02) * TAU : 0),
    };
  },

  stack(S) {
    const { rand } = S;
    const m = S.mind;
    const n = rand.int(6, 10), guides = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, y = m.y - m.ry * 0.85 + t * m.ry * 1.7;
      const half = m.rx * Math.sqrt(Math.max(0, 1 - ((y - m.y) / m.ry) ** 2)) * 0.9;
      const pts = [];
      for (let x = m.x - half; x <= m.x + half; x += 3) pts.push([x, y + Math.sin(x * 0.08 + i) * 2.5]);
      if (pts.length > 2) guides.push({ pts, w: 0.6 + 0.4 * t });
    }
    // Blocks rising into place above the head.
    const orbs = [];
    for (let i = rand.int(3, 5); i > 0; i--) orbs.push({ x: m.x + rand.range(-1.4, 1.4) * S.R, y: m.y - S.R * rand.range(1.3, 2.6), r: S.R * rand.range(0.1, 0.2), kind: 'card' });
    return {
      focal: [m.x, m.y], guides, orbs,
      base: (x, y) => clamp(1 - Math.hypot((x - m.x) / m.rx, (y - m.y) / m.ry)) + 0.5 * g2(x - m.x, y - m.y + S.R * 2, S.R),
      flow: () => 0,
    };
  },

  memory(S) {
    const { rand } = S;
    const m = S.mind;
    const orbs = [], guides = [];
    for (let i = rand.int(5, 8); i > 0; i--) {
      const a = rand.range(-Math.PI, 0) + rand.range(-0.3, 0.3), d = S.R * rand.range(1.5, 3);
      const o = { x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d * 0.9, r: S.R * rand.range(0.18, 0.34), kind: 'card', rot: rand.range(-0.5, 0.5) };
      orbs.push(o);
      guides.push({ pts: bezier([o.x, o.y], [(o.x + m.x) / 2 + rand.range(-1, 1) * S.R * 0.4, (o.y + m.y) / 2 - S.R * 0.3], [m.x, m.y], 24), w: 0.4, trail: true });
    }
    return {
      focal: [m.x, m.y], guides, orbs,
      base: (x, y) => Math.max(g2(x - m.x, y - m.y, S.R * 0.9), ...orbs.map((o) => g2(x - o.x, y - o.y, o.r * 1.5) * 0.7)),
      flow: (x, y) => angleTo([x, y], [m.x, m.y]),
    };
  },

  web(S) {
    const { rand } = S;
    const m = S.mind;
    const nodes = [[m.x, m.y]];
    for (let i = rand.int(6, 10); i > 0; i--) {
      const a = rand() * TAU, d = S.R * rand.range(1.3, 2.8);
      nodes.push([m.x + Math.cos(a) * d, m.y + Math.sin(a) * d * 0.8]);
    }
    const guides = [];
    for (let i = 1; i < nodes.length; i++) {
      const near = nodes.map((p, j) => [j, Math.hypot(p[0] - nodes[i][0], p[1] - nodes[i][1])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
      for (const [j] of near) if (j < i || j === 0) guides.push({ pts: [nodes[i], nodes[j]], w: j === 0 ? 1 : 0.6 });
    }
    return {
      focal: [m.x, m.y], guides,
      orbs: nodes.slice(1).map(([x, y]) => ({ x, y, r: S.R * rand.range(0.06, 0.14), kind: 'node' })),
      base: (x, y) => Math.max(...nodes.map(([nx, ny], i) => g2(x - nx, y - ny, S.R * (i ? 0.35 : 0.8)))),
      flow: (x, y) => angleTo([m.x, m.y], [x, y]),
    };
  },

  tide(S) {
    const { rand } = S;
    const grounded = S.ground != null;
    const f = grounded ? [S.figs[0].x, S.ground] : [S.mind.x, S.mind.y];
    const squash = grounded ? rand.range(0.22, 0.32) : 1;
    const n = rand.int(5, 9), guides = [];
    const gap = (grounded ? S.W * 0.09 : S.R * 0.38) * rand.range(0.8, 1.2);
    for (let i = 1; i <= n; i++) guides.push({ pts: arc(f[0], f[1], gap * i + S.R * 0.3, (gap * i + S.R * 0.3) * squash, 0, TAU), w: 1 - i / (n + 1), closed: true, ring: { rx: gap * i + S.R * 0.3, ry: (gap * i + S.R * 0.3) * squash, rot: 0 } });
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => { const r = Math.hypot(x - f[0], (y - f[1]) / squash); return clamp(1 - r / (gap * (n + 1))) * (0.5 + 0.5 * Math.cos((r / gap) * TAU)); },
      flow: (x, y) => Math.atan2((y - f[1]) / squash, x - f[0]) + Math.PI / 2,
    };
  },

  vortex(S) {
    const { rand } = S;
    const f = [S.mind.x, S.mind.y];
    const guides = [];
    const n = rand.int(2, 4);
    for (let k = 0; k < n; k++) guides.push({ pts: spiral(f[0], f[1], S.R * 2.6, S.R * 0.08, rand.range(3, 5), rand.range(0.85, 1), rand.range(-0.3, 0.3), (k / n) * TAU), w: 1 });
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => { const r = Math.hypot(x - f[0], y - f[1]); return clamp(1 - r / (S.R * 2.8)) * (0.6 + 0.4 * Math.sin(r * 0.15 - Math.atan2(y - f[1], x - f[0]) * n)); },
      flow: (x, y) => angleTo(f, [x, y]) + Math.PI / 2 + 0.35,
    };
  },

  maze(S) {
    const { rand } = S;
    const grounded = S.ground != null;
    const f = grounded ? [S.figs[0].x, S.ground - (S.figs[0].head ? S.figs[0].head.r * 4 : 0)] : [S.mind.x, S.mind.y];
    const n = rand.int(4, 6), guides = [];
    const gap = S.R * rand.range(0.4, 0.55);
    for (let i = 1; i <= n; i++) {
      const r = S.R * 0.6 + gap * i;
      const gapA = rand() * TAU, gw = rand.range(0.35, 0.7);
      guides.push({ pts: arc(f[0], f[1], r, r * (grounded ? 0.5 : 1), gapA + gw / 2, gapA + TAU - gw / 2), w: 1 - i / (n + 2) });
      const sa = rand() * TAU;
      guides.push({ pts: [[f[0] + Math.cos(sa) * r, f[1] + Math.sin(sa) * r * (grounded ? 0.5 : 1)], [f[0] + Math.cos(sa) * (r + gap), f[1] + Math.sin(sa) * (r + gap) * (grounded ? 0.5 : 1)]], w: 0.6 });
    }
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => { const r = Math.hypot(x - f[0], (y - f[1]) / (grounded ? 0.5 : 1)); return clamp(1 - r / (S.R * 0.6 + gap * (n + 1))) * 0.6; },
      flow: (x, y) => angleTo(f, [x, y]) + Math.PI / 2,
    };
  },

  roots(S) {
    const { rand } = S;
    const h = S.figs[0].head;
    const guides = [];
    const grow = (x, y, a, len, w, depth) => {
      const pts = tendril(S, x, y, a, len, { curl: 0.5, step: 3, bias: -Math.PI / 2, biasW: 0.01, seed: depth * 7 + x * 0.1 });
      guides.push({ pts, w });
      if (depth < 4) {
        const e = pts[pts.length - 1];
        const k = depth < 1 ? 3 : 2;
        for (let i = 0; i < k; i++) grow(e[0], e[1], a + rand.range(-0.7, 0.7), len * rand.range(0.55, 0.8), w * 0.7, depth + 1);
      }
    };
    grow(h.x, h.y - h.r * 0.8, -Math.PI / 2 + rand.range(-0.2, 0.2), S.R * rand.range(0.9, 1.3), 1, 0);
    return {
      focal: [h.x, h.y - S.R * 2], guides, orbs: [],
      base: (x, y) => (y < h.y ? g2(x - h.x, (y - h.y + S.R * 2) * 0.7, S.R * 1.5) : 0),
      flow: () => -Math.PI / 2,
    };
  },

  portal(S) {
    const { rand } = S;
    const fig = S.figs[0];
    const dir = fig.facing || (fig.x < S.W / 2 ? 1 : -1);
    const cx = clamp(fig.x + dir * S.W * rand.range(0.22, 0.32), S.W * 0.12, S.W * 0.88);
    const cy = S.ground != null ? S.ground - S.R * 1.6 : S.mind.y;
    const rx = S.R * rand.range(0.7, 0.95), ry = S.R * rand.range(1.5, 1.9);
    const guides = [];
    for (let i = 0; i < 6; i++) { const k = 1 - i * 0.14; guides.push({ pts: arc(cx, cy, rx * k, ry * k, 0, TAU), w: 1 - i * 0.12, closed: true, ring: { rx: rx * k, ry: ry * k, rot: 0 } }); }
    return {
      focal: [cx, cy], guides, orbs: [],
      base: (x, y) => clamp(1 - Math.hypot((x - cx) / rx, (y - cy) / ry)) + 0.3 * g2(x - cx, y - cy, rx * 2),
      flow: (x, y) => angleTo([cx, cy], [x, y]),
    };
  },

  voice(S) {
    const { rand } = S;
    const fig = S.figs[0];
    const f = fig.face || [fig.head.x + fig.head.r * (fig.facing || 1), fig.head.y];
    const dir = fig.facing || 1;
    const n = rand.int(4, 7), guides = [];
    const a0 = dir > 0 ? 0 : Math.PI;
    for (let i = 1; i <= n; i++) {
      const r = S.R * 0.3 * i * rand.range(0.9, 1.1), sp = 0.55 - i * 0.02;
      guides.push({ pts: arc(f[0], f[1], r, r, a0 - sp, a0 + sp), w: 1 - i / (n + 1) });
    }
    return {
      focal: f, guides, orbs: [],
      base: (x, y) => ((x - f[0]) * dir > 0 ? g2((x - f[0]) * 0.6, y - f[1], S.R * 0.9) : 0),
      flow: (x, y) => angleTo(f, [x, y]),
    };
  },

  crowd(S) {
    const { rand } = S;
    const heads = S.figs.map((f) => [f.head.x, f.head.y - f.head.r]);
    const f = [S.W / 2 + rand.range(-0.1, 0.1) * S.W, Math.min(...heads.map((h) => h[1])) - S.R * 1.4];
    const guides = heads.map((h) => ({ pts: bezier(h, [(h[0] + f[0]) / 2, h[1] - S.R * 0.8], f, 30), w: 0.8 }));
    return {
      focal: f, guides, orbs: [{ x: f[0], y: f[1], r: S.R * 0.45, kind: 'planet' }],
      base: (x, y) => Math.max(g2(x - f[0], y - f[1], S.R * 1.2), ...heads.map((h) => g2(x - h[0], y - h[1], S.R * 0.4))),
      flow: (x, y) => angleTo([x, y], f),
    };
  },
};

// ---------------------------------------------------------------- moments
// The 32 moments a product has where someone is thinking.

export const MOMENTS = [
  { id: 'new-idea', title: 'New idea', motif: 'bloom', frames: ['profile', 'front', 'stand:reach'], use: ['Empty state with a first action', 'Onboarding', 'Feature launch'], line: 'Something opens up behind the eyes.' },
  { id: 'deep-focus', title: 'Deep focus', motif: 'spiral', frames: ['robe', 'sit', 'stand'], use: ['Focus mode', 'Timers', 'Do not disturb'], line: 'Everything turns around one still point.' },
  { id: 'overload', up: true, title: 'Overload', motif: 'eruption', frames: ['hands', 'profile', 'front'], use: ['Too many notifications', 'Rate limits', 'Errors that pile up'], line: 'Too much, all at once.' },
  { id: 'letting-go', title: 'Letting go', motif: 'drift', frames: ['fall'], use: ['Log out', 'Cancel', 'Delete account'], line: 'The ground stops mattering.' },
  { id: 'daydream', title: 'Daydream', motif: 'river', frames: ['profile', 'robe', 'stand'], use: ['Loading', 'Idle screens', 'Inspiration'], line: 'A thought leaves and keeps going.' },
  { id: 'searching', title: 'Searching', motif: 'orbit', frames: ['profile', 'front', 'stand'], use: ['Search', 'No results', 'Filters'], line: 'Going round it again.' },
  { id: 'in-sync', title: 'In sync', motif: 'bridge', frames: ['pair', 'pair-stand'], use: ['Collaboration', 'Sharing', 'Invites'], line: 'Two heads, one thought.' },
  { id: 'rising', up: true, title: 'Rising', motif: 'rise', frames: ['robe', 'sit', 'stand:raise'], use: ['Upload', 'Progress', 'Level up'], line: 'Lighter than it was a minute ago.' },
  { id: 'empty-mind', title: 'Empty mind', motif: 'void', frames: ['sit', 'robe'], use: ['Empty states', 'All caught up', 'Inbox zero'], line: 'Nothing to hold. Good.' },
  { id: 'clarity', title: 'Clarity', motif: 'halo', frames: ['profile', 'front', 'sit'], use: ['Success', 'Confirmed', 'Done'], line: 'It all lines up.' },
  { id: 'forgetting', title: 'Forgetting', motif: 'scatter', frames: ['profile', 'front'], use: ['404', 'Session expired', 'Cache cleared'], line: 'It was right here a second ago.' },
  { id: 'doubt', title: 'Doubt', motif: 'knot', frames: ['profile', 'front', 'hands'], use: ['Are you sure?', 'Warnings', 'Confirm dialogs'], line: 'The same loop, tighter each time.' },
  { id: 'listening', title: 'Listening', motif: 'wave', frames: ['profile', 'front'], use: ['Voice input', 'Recording', 'Audio'], line: 'Letting it all come in.' },
  { id: 'broken', title: 'Broken', motif: 'shatter', frames: ['front', 'hands', 'profile'], use: ['Server error', 'Crash', 'Connection lost'], line: 'Something cracked.' },
  { id: 'deciding', title: 'Deciding', motif: 'split', frames: ['front', 'profile'], use: ['Choose a plan', 'Settings', 'A or B'], line: 'Half of me wants the other half.' },
  { id: 'making', title: 'Making', motif: 'gift', frames: ['stand:chest', 'sit'], use: ['Create new', 'Editor', 'Compose'], line: 'It starts in the hands.' },
  { id: 'thinking', title: 'Thinking', motif: 'think', frames: ['profile', 'front'], use: ['AI is thinking', 'Processing', 'Generating'], line: 'Turning it over, and over.' },
  { id: 'learning', title: 'Learning', motif: 'stack', frames: ['profile', 'front'], use: ['Courses', 'Onboarding steps', 'Docs'], line: 'One layer, then the next.' },
  { id: 'remembering', title: 'Remembering', motif: 'memory', frames: ['profile', 'front', 'robe'], use: ['History', 'Saved items', 'Archive'], line: 'Pieces coming back.' },
  { id: 'dreaming', title: 'Dreaming', motif: 'drift', frames: ['sit', 'robe', 'fall'], use: ['Sleep mode', 'Scheduled', 'Night mode'], line: 'Floating somewhere warm.' },
  { id: 'waking', title: 'Waking', motif: 'dawn', frames: ['robe', 'stand', 'sit'], use: ['Welcome back', 'Morning summary', 'Unlocked'], line: 'The light gets in first.' },
  { id: 'connecting', title: 'Connecting', motif: 'web', frames: ['profile', 'front'], use: ['Integrations', 'Connected', 'Network'], line: 'Everything links to everything.' },
  { id: 'waiting', title: 'Waiting', motif: 'tide', frames: ['robe', 'sit', 'profile'], use: ['Queues', 'Pending', 'In review'], line: 'Rings on still water.' },
  { id: 'burnout', up: true, title: 'Burnout', motif: 'smoke', frames: ['hands', 'profile', 'front'], use: ['Limits reached', 'Take a break', 'Usage caps'], line: 'Running on what is left.' },
  { id: 'flow-state', title: 'Flow', motif: 'vortex', frames: ['profile', 'front'], use: ['Streaks', 'Productivity', 'Deep work'], line: 'Pulled in, and happy about it.' },
  { id: 'insight', up: true, title: 'Insight', motif: 'flash', frames: ['profile', 'front', 'stand'], use: ['Tips', 'AI suggestions', 'Did you know'], line: 'It lands all at once.' },
  { id: 'calm', title: 'Calm', motif: 'calm', frames: ['sit', 'profile', 'robe'], use: ['Wellness', 'Breathing', 'Quiet hours'], line: 'Slow water.' },
  { id: 'lost', title: 'Lost', motif: 'maze', frames: ['stand', 'robe', 'profile'], use: ['Page not found', 'No access', 'Wrong turn'], line: 'Every way out looks the same.' },
  { id: 'growing', up: true, title: 'Growing', motif: 'roots', frames: ['profile', 'sit', 'robe'], use: ['Growth', 'Analytics', 'Milestones'], line: 'Branching into something.' },
  { id: 'welcome', title: 'Welcome', motif: 'portal', frames: ['stand', 'robe'], use: ['Sign up', 'Welcome', 'Invite accepted'], line: 'A door that was not there before.' },
  { id: 'speaking', title: 'Speaking', motif: 'voice', frames: ['profile'], use: ['Chat', 'Comments', 'Messages'], line: 'Saying it out loud.' },
  { id: 'together', title: 'Together', motif: 'crowd', frames: ['crowd'], use: ['Community', 'Teams', 'Followers'], line: 'Many heads, one sky.' },
];

export const MOMENT_IDS = MOMENTS.map((m) => m.id);
export const momentById = (id) => MOMENTS.find((m) => m.id === id) || MOMENTS[0];

// ---------------------------------------------------------------- layout

function fit(pose, opts, at) { return figure(pose, opts, at); }

function layout(frame, W, H, rand, up = false) {
  const [pose, armArg] = frame.split(':');
  const figs = [];
  let ground = null, R;
  const mirror = rand() < 0.5;
  if (pose === 'profile') {
    const tilt = rand.range(-0.22, 0.12);
    const s = (H * (up ? rand.range(0.34, 0.4) : rand.range(0.42, 0.52))) / 125;
    const faceX = W * (W > H ? rand.range(0.4, 0.5) : rand.range(0.56, 0.66));
    const x = mirror ? W - faceX + 116 * s : faceX - 116 * s;
    figs.push(fit('profile', { tilt }, { x, y: H * (up ? rand.range(0.4, 0.46) : rand.range(0.2, 0.32)), s, mirror }));
    R = 44 * s;
  } else if (pose === 'front' || pose === 'hands') {
    const s = (H * (up ? rand.range(0.3, 0.36) : rand.range(0.36, 0.44))) / 110;
    const x = W / 2 + (W > H ? rand.range(-0.15, 0.15) * W : rand.range(-0.06, 0.06) * W);
    figs.push(fit(pose, { tilt: rand.range(-0.15, 0.15), hair: rand() < 0.4 ? rand.range(0.3, 1) : 0 }, { x, y: H * (up ? rand.range(0.46, 0.52) : rand.range(0.3, 0.4)), s }));
    R = 34 * s;
  } else if (pose === 'pair' || pose === 'pair-stand') {
    if (pose === 'pair') {
      const s = (H * rand.range(0.34, 0.42)) / 125;
      const y = H * rand.range(0.3, 0.42);
      figs.push(fit('profile', { tilt: rand.range(-0.15, 0.05) }, { x: W * 0.3 - 116 * s, y, s }));
      figs.push(fit('profile', { tilt: rand.range(-0.15, 0.05) }, { x: W * 0.7 + 116 * s, y, s, mirror: true }));
      R = 40 * s;
    } else {
      ground = H * rand.range(0.74, 0.84);
      const s = (H * rand.range(0.3, 0.38)) / 262;
      figs.push(fit('stand', {}, { x: W * rand.range(0.24, 0.32), y: ground - 262 * s, s }));
      figs.push(fit('stand', {}, { x: W * rand.range(0.68, 0.76), y: ground - 262 * s, s }));
      R = H * 0.16;
    }
  } else if (pose === 'fall') {
    const s = (W * rand.range(0.42, 0.58)) / 202;
    figs.push(fit('fall', {}, { x: W * rand.range(0.4, 0.6), y: H * rand.range(0.42, 0.58), s, rot: rand.range(-0.7, 0.5), mirror }));
    R = 40 * s;
  } else if (pose === 'crowd') {
    ground = H * rand.range(0.76, 0.86);
    const n = rand.int(3, 5);
    for (let i = 0; i < n; i++) {
      const kind = rand() < 0.5 ? 'robe' : 'stand';
      const hh = H * rand.range(0.18, 0.3);
      const s = hh / (kind === 'robe' ? 200 : 262);
      const x = W * ((i + 0.5) / n) + rand.range(-0.04, 0.04) * W;
      figs.push(fit(kind, {}, { x, y: ground - (kind === 'robe' ? 200 : 262) * s, s }));
    }
    R = H * 0.15;
  } else {
    // robe, stand, sit: a whole small figure in a big space.
    const kind = pose;
    const heights = { robe: [0.24, 0.36], stand: [0.3, 0.42], sit: [0.2, 0.28] };
    const hh = H * rand.range(...heights[kind]);
    const local = { robe: 200, stand: 262 + (armArg === 'raise' ? 50 : armArg === 'reach' ? 64 : 19), sit: 122 };
    const s = hh / local[kind];
    ground = H * (up ? rand.range(0.84, 0.9) : rand.range(0.68, 0.84));
    const x = W * (rand() < 0.6 ? 0.5 + rand.range(-0.04, 0.04) : rand.pick([0.34, 0.66]));
    const baseY = { robe: 200, stand: 262, sit: 106 }[kind];
    figs.push(fit(kind, { arms: armArg || 'down' }, { x, y: ground - baseY * s, s }));
    R = H * rand.range(0.14, 0.19);
  }
  for (const f of figs) f.x = f.at.x;
  return { figs, ground, R };
}

// ---------------------------------------------------------------- scene

export function buildScene({ moment = 'new-idea', seed = 1, W = 400, H = 400, cell = 2 } = {}) {
  const m = momentById(moment);
  const key = hashString(`${m.id}:${seed}:${W}x${H}`);
  const rand = rng(key);
  const noise = makeNoise(key);
  const frame = m.frames[rand.int(0, m.frames.length - 1)];
  const { figs, ground, R } = layout(frame, W, H, rand, !!m.up);
  // Hands for the motifs that start there.
  for (const f of figs) {
    if (f.pose === 'stand' && frame.includes('chest')) f.hands = [f.x + 4 * f.at.s, f.head.y + 72 * f.at.s];
    if (f.pose === 'sit') f.hands = [f.x, f.head.y + 80 * f.at.s];
  }
  const mind = figs[0].mind;
  const S = { W, H, rand, noise, figs, ground, R, mind, frame, moment: m, seed, cell };
  const mo = MOTIFS[m.motif](S);
  S.motif = { kind: m.motif, ...mo };
  S.focal = mo.focal;
  S.flow = mo.flow;
  S.sdf = sceneSdf(figs);
  // Inside-ness: positive inside a body, in pixels.
  S.body = Grid.of(W, H, cell, (x, y) => -S.sdf(x, y));
  // Heat: where the mind is active, 0..1.
  S.heat = heatGrid(S, mo);
  return S;
}

function heatGrid(S, mo) {
  const { W, H } = S;
  const cell = 4;
  const g = Grid.of(W, H, cell, (x, y) => (mo.base ? mo.base(x, y) : 0));
  const r = Math.max(6, S.R * 0.32);
  const rc = Math.ceil((r * 2) / cell);
  for (const gd of mo.guides) {
    const w = (gd.w ?? 1) * (gd.ribbon ? 1 : 0.85);
    const rr = gd.ribbon ? Math.max(r, gd.ribbon * 0.7) : r;
    const rcc = gd.ribbon ? Math.ceil((rr * 2) / cell) : rc;
    for (let k = 0; k < gd.pts.length; k += 2) {
      const [px, py] = gd.pts[k];
      const ci = Math.round(px / cell), cj = Math.round(py / cell);
      for (let j = cj - rcc; j <= cj + rcc; j++) {
        if (j < 0 || j >= g.ny) continue;
        for (let i = ci - rcc; i <= ci + rcc; i++) {
          if (i < 0 || i >= g.nx) continue;
          const dx = i * cell - px, dy = j * cell - py;
          const v = w * Math.exp(-(dx * dx + dy * dy) / (2 * rr * rr * 0.36));
          const idx = j * g.nx + i;
          if (v > g.v[idx]) g.v[idx] = v;
        }
      }
    }
  }
  for (const o of mo.orbs) {
    const ci = Math.round(o.x / cell), cj = Math.round(o.y / cell), rcc = Math.ceil((o.r * 2.4) / cell);
    for (let j = cj - rcc; j <= cj + rcc; j++) for (let i = ci - rcc; i <= ci + rcc; i++) {
      if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) continue;
      const d = Math.hypot(i * cell - o.x, j * cell - o.y);
      const v = Math.exp(-(d * d) / (2 * (o.r * 1.1) ** 2));
      const idx = j * g.nx + i;
      if (v > g.v[idx]) g.v[idx] = v;
    }
  }
  for (let k = 0; k < g.v.length; k++) g.v[k] = clamp(g.v[k]);
  return g;
}
