// Subjects: one idea each. A subject says WHAT is drawn (figures + a motif);
// a state says HOW it is drawn. Every subject works in every state.
//
// A motif returns:
//   strokes  polylines that carry the idea (spiral, rays, rings...)
//   field    (x, y) -> 0..1, where the "mental energy" sits
//   focal    the point everything relates to
//   orbs     round accents (planets, moons, sparks) { x, y, r }
//   motion   how it moves when animated: spin | pulse | rise | drift | orbit | flicker

import { figure, inMind } from './figures.js';
import { gauss2, clamp, ellipsePoly } from './core/util.js';

const TAU = Math.PI * 2;

function rays(cx, cy, r0, r1, count, rand, jitter = 0.25) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rand.range(-jitter, jitter);
    const l1 = r1 * rand.range(0.7, 1.15);
    out.push([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * l1, cy + Math.sin(a) * l1]]);
  }
  return out;
}

function arc(cx, cy, rx, ry, a0, a1, steps = 64, rot = 0) {
  const pts = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

const ringField = (cx, cy, rx, ry, width) => (x, y) => {
  const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return Math.exp(-((d - 1) ** 2) / (2 * (width / rx) ** 2));
};

export const SUBJECTS = [
  {
    id: 'new-idea',
    title: 'New idea',
    line: 'A thought lights up, and the whole head notices.',
    use: ['onboarding', 'feature launch', 'empty editor'],
    figures: [['head', {}]],
    motif(rand, [f]) {
      const [cx, cy] = f.mind;
      return {
        focal: [cx, cy],
        strokes: rays(cx, cy, 22, 58, 9, rand),
        field: (x, y) => clamp(gauss2(x, y, cx, cy, 34) * 1.1 + (inMind(f, x, y) ? 0.32 : 0)),
        orbs: [{ x: cx, y: cy, r: 13 }],
        motion: 'pulse',
      };
    },
  },
  {
    id: 'deep-focus',
    title: 'Deep focus',
    line: 'Everything spins out, and one person stays still in the middle.',
    use: ['focus mode', 'do not disturb', 'productivity'],
    figures: [['stand', { s: 0.9, ty: -6 }]],
    motif(rand, [f]) {
      const cx = f.base[0], cy = f.base[1] + 4;
      const pts = [];
      for (let t = 0; t < 4.4 * TAU; t += 0.05) {
        const r = 8 + t * 6.4;
        pts.push([cx + Math.cos(t) * r * 1.25, cy + Math.sin(t) * r * 0.34]);
      }
      return {
        focal: [cx, cy],
        strokes: [pts],
        field: (x, y) => {
          const dx = (x - cx) / 1.25, dy = (y - cy) / 0.34;
          const r = Math.hypot(dx, dy);
          if (r > 190) return 0;
          const th = Math.atan2(dy, dx);
          const band = 0.5 + 0.5 * Math.cos(TAU * (r / 40.2) - th);
          return clamp(band ** 2 * (1 - r / 200) * 1.25);
        },
        orbs: [{ x: 288, y: 74, r: 22, ring: true }],
        motion: 'drift',
      };
    },
  },
  {
    id: 'overload',
    title: 'Overload',
    line: 'Forty tabs open in one head. Something has to give.',
    use: ['error state', 'rate limit', 'too many notifications'],
    figures: [['head', { s: 0.82, ty: 52, tx: -14 }]],
    motif(rand, [f]) {
      const [cx, cy] = [f.mind[0] + 10, f.mind[1] - 16];
      const strokes = [];
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI / 2 + rand.range(-1.35, 1.35);
        const len = rand.range(70, 200);
        const pts = [];
        for (let k = 0; k <= 6; k++) {
          const r = 14 + (len * k) / 6;
          const wig = (k % 2 ? 1 : -1) * rand.range(2, 9);
          pts.push([cx + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * wig, cy + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * wig]);
        }
        strokes.push(pts);
      }
      const seed = rand() * 10;
      return {
        focal: [cx, cy],
        strokes,
        field: (x, y) => {
          const d = Math.hypot(x - cx, y - cy);
          const a = Math.atan2(y - cy, x - cx);
          const up = y < cy + 30 ? 1 : 0.25;
          return clamp((1 - d / 230) * (0.45 + 0.55 * Math.sin(a * 11 + seed) ** 2) * up * 1.3);
        },
        orbs: [],
        motion: 'flicker',
      };
    },
  },
  {
    id: 'letting-go',
    title: 'Letting go',
    line: 'Falling, but softly. It turns out that was fine.',
    use: ['logout', 'cancel subscription', 'undo'],
    figures: [['fall', {}]],
    motif(rand, [f]) {
      const blobs = Array.from({ length: 4 }, () => ({ x: rand.range(60, 340), y: rand.range(60, 340), s: rand.range(55, 95) }));
      const strokes = [];
      for (let i = 0; i < 5; i++) {
        const x0 = 150 + i * 18 + rand.range(-6, 6);
        const pts = [];
        for (let y = 120; y > 20; y -= 8) pts.push([x0 + Math.sin(y / 18 + i) * 6, y - i * 6]);
        strokes.push(pts);
      }
      return {
        focal: f.base,
        strokes,
        field: (x, y) => clamp(blobs.reduce((m, b) => Math.max(m, gauss2(x, y, b.x, b.y, b.s)), 0)),
        orbs: [{ x: 92, y: 330, r: 26, soft: true }],
        motion: 'drift',
      };
    },
  },
  {
    id: 'searching',
    title: 'Searching',
    line: 'Looking for something you know is out there.',
    use: ['search', 'no results', 'discovery'],
    figures: [['stand', { s: 0.82, ty: 44 }]],
    motif(rand, [f]) {
      const cx = 200, cy = f.mind[1] - 2;
      const rings = [[150, 40, -0.22], [118, 30, 0.18], [86, 22, -0.08]];
      const strokes = rings.map(([rx, ry, rot]) => arc(cx, cy, rx, ry, 0, TAU, 90, rot));
      const fields = rings.map(([rx, ry]) => ringField(cx, cy, rx, ry, 10));
      const a = rand.range(0, TAU);
      return {
        focal: [cx, cy],
        strokes,
        field: (x, y) => clamp(Math.max(...fields.map((fn) => fn(x, y))) * 0.9),
        orbs: [
          { x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 40, r: 14 },
          { x: 300, y: 70, r: 30 },
          { x: 84, y: 96, r: 11 },
        ],
        motion: 'orbit',
      };
    },
  },
  {
    id: 'memory',
    title: 'Memory',
    line: 'Every note I ever wrote, playing back at the same time.',
    use: ['history', 'archive', 'notes app'],
    figures: [['head', { s: 0.72, ty: 86, tx: 0 }]],
    motif(rand, [f]) {
      const strokes = [];
      for (let row = 0; row < 7; row++) {
        const y0 = 34 + row * 30 + rand.range(-4, 4);
        const pts = [];
        let x = 20 + rand.range(0, 20);
        const amp = rand.range(6, 10);
        while (x < 380) {
          const t = x / 6.5;
          pts.push([x + Math.cos(t) * amp * 0.9, y0 - Math.sin(t) * amp]);
          x += 1.6;
        }
        strokes.push(pts);
      }
      return {
        focal: f.mind,
        strokes,
        field: (x, y) => clamp((y < 250 ? 0.55 : 0.15) + 0.45 * Math.sin(x / 37 + y / 23) ** 2 * (y < 250 ? 1 : 0.2) + (inMind(f, x, y) ? 0.3 : 0)),
        orbs: [],
        motion: 'drift',
      };
    },
  },
  {
    id: 'dreaming',
    title: 'Dreaming',
    line: 'Offline for now. Somewhere else, and back soon.',
    use: ['offline', 'maintenance', 'sleep mode'],
    figures: [['sit', { ty: 30 }]],
    motif(rand, [f]) {
      const mx = 286, my = 92;
      const stars = Array.from({ length: 7 }, () => {
        const x = rand.range(40, 360), y = rand.range(30, 190);
        return [[x - 5, y], [x + 5, y]];
      });
      return {
        focal: [mx, my],
        strokes: [arc(mx, my, 34, 34, -1.1, 3.6, 60), ...stars],
        field: (x, y) => clamp((1 - y / 300) * 0.55 + gauss2(x, y, mx, my, 44) * 0.6),
        orbs: [{ x: mx, y: my, r: 30, ring: true }],
        motion: 'pulse',
      };
    },
  },
  {
    id: 'in-sync',
    title: 'In sync',
    line: 'Two minds, one wavelength. Connected.',
    use: ['integrations', 'team invite', 'sync complete'],
    figures: [['head', { s: 0.56, tx: -112, ty: 74 }], ['head', { s: 0.56, tx: 112, ty: 74, mirror: true }]],
    motif(rand, [a, b]) {
      const [ax, ay] = a.mind, [bx, by] = b.mind;
      const strokes = [];
      for (let k = -2; k <= 2; k++) {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const x = ax + (bx - ax) * t;
          const lift = Math.sin(t * Math.PI) * 110;
          pts.push([x, ay + (by - ay) * t - lift + k * 9 + Math.sin(t * TAU * 2) * 4]);
        }
        strokes.push(pts);
      }
      return {
        focal: [(ax + bx) / 2, ay - 110],
        strokes,
        field: (x, y) => {
          const t = clamp((x - ax) / (bx - ax));
          const yc = ay + (by - ay) * t - Math.sin(t * Math.PI) * 110;
          return clamp(Math.exp(-((y - yc) ** 2) / (2 * 22 * 22)) * (x > ax - 20 && x < bx + 20 ? 1 : 0) + (inMind(a, x, y) || inMind(b, x, y) ? 0.5 : 0));
        },
        orbs: [],
        motion: 'drift',
      };
    },
  },
  {
    id: 'upload',
    title: 'Rising',
    line: 'The thought leaves the head and goes up to where it\'s kept.',
    use: ['upload', 'publish', 'backup'],
    figures: [['stand', { s: 0.92, ty: 50 }]],
    motif(rand, [f]) {
      const [cx, cy] = f.top;
      const strokes = [];
      for (let i = 0; i < 7; i++) {
        const x0 = cx + (i - 3) * 13;
        const pts = [];
        for (let y = cy - 10; y > 24; y -= 6) pts.push([x0 + Math.sin(y / 16 + i * 1.3) * (4 + (cy - y) * 0.05), y]);
        strokes.push(pts);
      }
      return {
        focal: [cx, 60],
        strokes,
        field: (x, y) => clamp(Math.exp(-((x - cx) ** 2) / (2 * 46 * 46)) * (y < cy ? 0.35 + 0.65 * (1 - y / cy) : 0)),
        orbs: [{ x: cx, y: 56, r: 16 }],
        motion: 'rise',
      };
    },
  },
  {
    id: 'thinking',
    title: 'Thinking',
    line: 'Give me a second, I\'m working it out.',
    use: ['loading', 'processing', 'AI is generating'],
    figures: [['head', { s: 0.78, ty: 40 }]],
    motif(rand, [f]) {
      const [cx, cy] = f.mind;
      return {
        focal: [cx, cy],
        strokes: [arc(cx, cy, 104, 104, -Math.PI / 2, Math.PI * 1.15, 90)],
        field: (x, y) => clamp(ringField(cx, cy, 104, 104, 12)(x, y) * 0.95 + (inMind(f, x, y) ? 0.45 : 0)),
        orbs: [{ x: cx + Math.cos(Math.PI * 1.15) * 104, y: cy + Math.sin(Math.PI * 1.15) * 104, r: 9 }],
        motion: 'spin',
      };
    },
  },
  {
    id: 'empty-mind',
    title: 'Empty mind',
    line: 'Nothing here yet. Which is a good place to start.',
    use: ['empty state', 'blank page', 'inbox zero'],
    figures: [['sit', { ty: 46 }]],
    motif(rand, [f]) {
      const cx = 200, cy = 132;
      return {
        focal: [cx, cy],
        strokes: [arc(cx, cy, 78, 78, 0, TAU, 96)],
        field: (x, y) => clamp(ringField(cx, cy, 78, 78, 9)(x, y)),
        orbs: [],
        motion: 'pulse',
      };
    },
  },
  {
    id: 'clarity',
    title: 'Clarity',
    line: 'It clicks. Everything makes sense for a moment.',
    use: ['success', 'payment complete', 'task done'],
    figures: [['stand', { s: 0.95, ty: 36 }]],
    motif(rand, [f]) {
      const [cx, cy] = f.mind;
      return {
        focal: [cx, cy],
        strokes: [arc(cx, cy, 52, 52, 0, TAU, 80), ...rays(cx, cy, 66, 150, 14, rand, 0.08)],
        field: (x, y) => clamp(gauss2(x, y, cx, cy, 70) * 1.1),
        orbs: [{ x: cx, y: cy, r: 40, ring: true }],
        motion: 'pulse',
      };
    },
  },
];

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

export function buildScene(subjectId, rand) {
  const subject = subjectById[subjectId];
  if (!subject) throw new Error(`Unknown subject: ${subjectId}`);
  const figs = subject.figures.map(([kind, o]) => figure(kind, o));
  const motif = subject.motif(rand, figs);
  return { subject, figs, motif };
}

export { ellipsePoly };
