// The figures: original bodies sculpted from signed-distance shapes.
// Every pose is built in its own local units, then placed on the stage.
// The body is always the quiet part of a Neurodelic picture.

import { circle, ellipse, capsule, limb, polygon, union, place, placePoint } from './core/sdf.js';

const rotAbout = ([x, y], [cx, cy], a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

// A head in profile facing right. Crown at y = 0, chin near y = 125.
const PROFILE = [
  [10, 96], [3, 80], [0, 62], [2, 44], [9, 28], [20, 15], [35, 5], [52, 0], [68, 0], [82, 5], [93, 14],
  [100, 26], [104, 38], [105, 48], [104, 55], [106, 58], [104, 62], [106, 67], [110, 75], [114, 83],
  [116, 88], [113, 91], [107, 91], [106, 94], [108, 97], [108, 100], [105, 101], [107, 103], [106, 107],
  [102, 110], [104, 115], [103, 120], [99, 124], [90, 126], [80, 125], [70, 121], [62, 115], [56, 108],
  [44, 104], [28, 102], [16, 100],
];

const POSES = {
  // Head and shoulders in profile. tilt < 0 lifts the chin.
  profile({ tilt = 0 }) {
    const pivot = [44, 112];
    const head = PROFILE.map((p) => rotAbout(p, pivot, tilt));
    const m = rotAbout([50, 42], pivot, tilt);
    const parts = [
      { name: 'head', sdf: polygon(head) },
      { name: 'neck', sdf: capsule(42, 108, 46, 156, 29, 31) },
      { name: 'torso', sdf: polygon([[6, 150], [72, 148], [98, 166], [112, 198], [119, 245], [124, 320], [-52, 320], [-48, 245], [-38, 192], [-20, 162]]) },
    ];
    return {
      parts, k: 16,
      box: [-44, Math.min(0, rotAbout([52, 0], pivot, tilt)[1]), 120, 320],
      mind: { x: m[0], y: m[1], rx: 45, ry: 34, rot: -0.15 + tilt },
      head: { x: rotAbout([56, 58], pivot, tilt)[0], y: rotAbout([56, 58], pivot, tilt)[1], r: 60 },
      face: rotAbout([116, 88], pivot, tilt),
      spine: [rotAbout([32, 96], pivot, tilt), [30, 132], [30, 176], [22, 240], [14, 320]],
      eye: rotAbout([90, 62], pivot, tilt),
      facing: 1, crop: true,
    };
  },

  // Head and shoulders facing us. hair widens the crown.
  front({ tilt = 0, hair = 0 }) {
    const pivot = [0, 62];
    const R = (p) => rotAbout(p, pivot, tilt);
    const c = R([0, -8]), j = R([0, 22]), h = R([0, -22]);
    const head = [ellipse(c[0], c[1], 41, 46, tilt), ellipse(j[0], j[1], 29, 34, tilt)];
    if (hair) head.push(ellipse(h[0], h[1], 44 + hair * 8, 34 + hair * 6, tilt));
    const parts = [
      { name: 'head', sdf: union(head, 14) },
      { name: 'neck', sdf: capsule(0, 40, 0, 92, 19, 21) },
      { name: 'torso', sdf: polygon([[-20, 84], [20, 84], [58, 98], [92, 110], [111, 128], [119, 170], [123, 320], [-123, 320], [-119, 170], [-111, 128], [-92, 110], [-58, 98]]) },
    ];
    const m = R([0, -16]);
    return {
      parts, k: 14, box: [-118, -60, 118, 320],
      mind: { x: m[0], y: m[1], rx: 33, ry: 27, rot: tilt },
      head: { x: c[0], y: c[1] + 10, r: 52 }, face: R([0, 10]), facing: 0, crop: true,
    };
  },

  // Head held in both hands: too much at once.
  hands({ tilt = 0.1 }) {
    const pivot = [0, 90];
    const R = (p) => rotAbout(p, pivot, tilt);
    const c = R([0, 30]), j = R([0, 58]);
    const parts = [
      { name: 'head', sdf: union([ellipse(c[0], c[1], 38, 44, tilt), ellipse(j[0], j[1], 27, 30, tilt)], 12) },
      { name: 'torso', sdf: polygon([[-30, 104], [30, 104], [70, 116], [98, 132], [108, 170], [112, 320], [-112, 320], [-108, 170], [-98, 132], [-70, 116]]) },
    ];
    for (const s of [-1, 1]) {
      const hp = R([s * 31, -2]);
      parts.push({ name: s < 0 ? 'armL' : 'armR', sdf: limb([[s * 86, 140], [s * 122, 66], [hp[0] + s * 8, hp[1] + 22]], [19, 15, 11]) });
      parts.push({ name: s < 0 ? 'handL' : 'handR', sdf: ellipse(hp[0], hp[1], 15, 29, -s * 0.55 + tilt) });
    }
    const m = R([0, 18]);
    return {
      parts, k: 6, box: [-142, -32, 142, 320],
      mind: { x: m[0], y: m[1], rx: 30, ry: 26, rot: tilt },
      head: { x: c[0], y: c[1], r: 46 }, face: R([0, 20]), facing: 0, crop: true,
    };
  },

  // A robed figure standing still.
  robe() {
    const parts = [
      { name: 'head', sdf: circle(0, 13, 12.5) },
      { name: 'body', sdf: union([
        capsule(0, 20, 0, 36, 10.5),
        polygon([[-12, 30], [12, 30], [23, 39], [28, 58], [30, 100], [33, 150], [37, 195], [28, 200], [-28, 200], [-37, 195], [-33, 150], [-30, 100], [-28, 58], [-23, 39]]),
        capsule(-25, 48, -29, 118, 8), capsule(25, 48, 29, 118, 8),
      ], 7) },
    ];
    return { parts, k: 5, box: [-38, 0, 38, 200], mind: { x: 0, y: 12, rx: 11, ry: 11, rot: 0 }, head: { x: 0, y: 13, r: 13 }, ground: 200, facing: 0 };
  },

  // A person standing. arms: down | reach | raise | chest. back: seen from behind.
  stand({ arms = 'down' }) {
    const L = (s, a) => {
      if (a === 'reach') return limb([[s * 34, 40], [s * 52, -6], [s * 60, -58]], [9, 7.5, 6]);
      if (a === 'raise') return limb([[s * 34, 40], [s * 66, 2], [s * 80, -44]], [9, 7.5, 6]);
      if (a === 'chest') return limb([[s * 34, 42], [s * 40, 98], [s * 4, 72]], [9, 7.5, 6.5]);
      return limb([[s * 35, 42], [s * 42, 96], [s * 45, 150]], [9, 7.5, 6]);
    };
    const parts = [
      { name: 'head', sdf: ellipse(0, 0, 15, 19) },
      { name: 'body', sdf: union([
        capsule(0, 12, 0, 30, 7),
        capsule(-31, 41, 31, 41, 10),
        polygon([[-36, 38], [36, 38], [33, 70], [29, 112], [26, 130], [-26, 130], [-29, 112], [-33, 70]]),
        limb([[-12, 124], [-14, 196], [-15, 258]], [13, 9.5, 7]), limb([[12, 124], [14, 196], [15, 258]], [13, 9.5, 7]),
      ], 8) },
      { name: 'armL', sdf: L(-1, arms === 'reach' ? 'down' : arms) },
      { name: 'armR', sdf: L(1, arms) },
    ];
    const top = arms === 'reach' ? -64 : arms === 'raise' ? -50 : -19;
    return { parts, k: 6, box: [-90, top, 90, 262], mind: { x: 0, y: -3, rx: 13, ry: 15, rot: 0 }, head: { x: 0, y: 0, r: 19 }, ground: 262, facing: 0 };
  },

  // Falling, or floating: letting go.
  fall() {
    const parts = [
      { name: 'head', sdf: circle(55, 20, 13.5) },
      { name: 'body', sdf: union([
        capsule(-30, -6, 28, 8, 15, 17), capsule(36, 12, 47, 17, 7),
        limb([[-30, -12], [-66, -46], [-104, -40]], [13, 9, 6]),
        limb([[-32, 2], [-70, 10], [-100, -14]], [13, 9, 6]),
      ], 7) },
      { name: 'armL', sdf: limb([[30, 0], [44, -30], [36, -62]], [8, 6.5, 5.5]) },
      { name: 'armR', sdf: limb([[30, 14], [56, 44], [84, 52]], [8, 6.5, 5.5]) },
    ];
    return { parts, k: 6, box: [-112, -68, 90, 60], mind: { x: 55, y: 20, rx: 12, ry: 12, rot: 0 }, head: { x: 55, y: 20, r: 14 }, facing: 1 };
  },

  // Sitting cross-legged.
  sit() {
    const parts = [
      { name: 'head', sdf: circle(0, 0, 15) },
      { name: 'body', sdf: union([
        capsule(0, 14, 0, 24, 7), capsule(0, 26, 0, 66, 17, 24), capsule(-22, 30, 22, 30, 9),
        ellipse(0, 92, 56, 15), circle(-44, 89, 13), circle(44, 89, 13),
      ], 8) },
      { name: 'armL', sdf: limb([[-24, 30], [-36, 60], [-32, 86]], [8, 7, 6]) },
      { name: 'armR', sdf: limb([[24, 30], [36, 60], [32, 86]], [8, 7, 6]) },
    ];
    return { parts, k: 6, box: [-58, -15, 58, 107], mind: { x: 0, y: -2, rx: 12, ry: 12, rot: 0 }, head: { x: 0, y: 0, r: 15 }, ground: 106, facing: 0 };
  },
};

export const POSE_NAMES = Object.keys(POSES);

// Build a pose and place it on the stage.
// at: { x, y, s, rot, mirror } in stage pixels. Returns the stage-space figure.
export function figure(pose, opts = {}, at = {}) {
  const f = POSES[pose](opts);
  const shapes = f.parts.map((p) => p.sdf);
  const local = union(shapes, f.k);
  const P = (pt) => placePoint(pt, at);
  const s = at.s || 1;
  const m = P([f.mind.x, f.mind.y]);
  const h = P([f.head.x, f.head.y]);
  const corners = [[f.box[0], f.box[1]], [f.box[2], f.box[1]], [f.box[0], f.box[3]], [f.box[2], f.box[3]]].map(P);
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  return {
    pose,
    sdf: place(local, at),
    parts: f.parts.map((p) => ({ name: p.name, sdf: place(p.sdf, at) })),
    mind: { x: m[0], y: m[1], rx: f.mind.rx * s, ry: f.mind.ry * s, rot: (at.mirror ? -f.mind.rot : f.mind.rot) + (at.rot || 0) },
    head: { x: h[0], y: h[1], r: f.head.r * s },
    face: f.face ? P(f.face) : null,
    spine: f.spine ? f.spine.map(P) : null,
    eye: f.eye ? P(f.eye) : null,
    ground: f.ground != null ? P([0, f.ground])[1] : null,
    facing: (at.mirror ? -1 : 1) * f.facing,
    box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    crop: !!f.crop,
    at,
  };
}

// Local bounds of a pose, for layout.
export function poseBox(pose, opts = {}) {
  return POSES[pose](opts).box;
}

// Signed distance to the union of several placed figures.
export function sceneSdf(figs) {
  if (!figs.length) return () => 1e9;
  return (x, y) => {
    let d = 1e9;
    for (const f of figs) { const v = f.sdf(x, y); if (v < d) d = v; }
    return d;
  };
}

// Inside the mind ellipse: 1 at the centre, 0 at the rim, negative outside.
export function mindAt(f, x, y) {
  const { mind } = f;
  const c = Math.cos(-mind.rot), s = Math.sin(-mind.rot);
  const dx = x - mind.x, dy = y - mind.y;
  const u = (dx * c - dy * s) / mind.rx, v = (dx * s + dy * c) / mind.ry;
  return 1 - Math.hypot(u, v);
}
