// Original silhouettes, drawn as polygons on a 400 x 400 stage.
// Each figure is a list of polygons plus named anchor points (head, mind, feet).

import { circlePoly, capsulePoly, ellipsePoly, pointInPoly } from './core/util.js';

// A head and neck in profile, facing right.
const HEAD_PROFILE = [
  [150, 400], [156, 352], [150, 322], [134, 296], [118, 262], [108, 222], [110, 182], [122, 144],
  [144, 112], [174, 89], [210, 78], [248, 79], [282, 92], [306, 113], [320, 138], [326, 162],
  [327, 182], [323, 194], [330, 206], [340, 222], [350, 236], [353, 243], [346, 249], [338, 252],
  [338, 260], [343, 266], [338, 273], [341, 280], [337, 289], [330, 294], [332, 306], [326, 316],
  [312, 322], [290, 324], [270, 330], [262, 352], [266, 378], [276, 400],
];

function transform(poly, { s = 1, tx = 0, ty = 0, mirror = false, cx = 200 }) {
  return poly.map(([x, y]) => {
    let px = mirror ? 2 * cx - x : x;
    return [cx + (px - cx) * s + tx, 200 + (y - 200) * s + ty];
  });
}
function tp([x, y], o) { return transform([[x, y]], o)[0]; }

export function figure(kind, opts = {}) {
  const o = { s: 1, tx: 0, ty: 0, mirror: false, ...opts };
  switch (kind) {
    case 'head': {
      const polys = [transform(HEAD_PROFILE, o)];
      return {
        kind, polys,
        mind: tp([214, 168], o),
        mindR: 78 * o.s,
        mindPoly: transform(ellipsePoly(214, 168, 92, 70, -0.12), o),
        top: tp([214, 80], o),
        face: tp([340, 230], o),
        base: tp([210, 400], o),
      };
    }
    case 'stand': {
      const body = [[186, 184], [214, 184], [223, 202], [229, 258], [234, 306], [166, 306], [171, 258], [177, 202]];
      const polys = [transform(circlePoly(200, 167, 15, 28), o), transform(body, o), transform(capsulePoly(200, 176, 200, 190, 7), o)];
      return { kind, polys, mind: tp([200, 167], o), mindR: 26 * o.s, top: tp([200, 150], o), base: tp([200, 306], o), face: tp([200, 167], o) };
    }
    case 'sit': {
      const polys = [
        circlePoly(200, 196, 16, 28),
        capsulePoly(200, 218, 200, 258, 21),
        capsulePoly(184, 226, 168, 270, 7),
        capsulePoly(216, 226, 232, 270, 7),
        capsulePoly(158, 286, 242, 286, 15),
        ellipsePoly(200, 278, 44, 14),
      ].map((p) => transform(p, o));
      return { kind, polys, mind: tp([200, 196], o), mindR: 28 * o.s, top: tp([200, 178], o), base: tp([200, 300], o), face: tp([200, 196], o) };
    }
    case 'fall': {
      const polys = [
        circlePoly(268, 236, 15, 28),
        capsulePoly(248, 226, 196, 200, 17),
        capsulePoly(198, 200, 156, 182, 9),
        capsulePoly(156, 182, 124, 196, 8),
        capsulePoly(194, 208, 166, 168, 9),
        capsulePoly(166, 168, 148, 140, 8),
        capsulePoly(240, 216, 250, 180, 6),
        capsulePoly(250, 180, 258, 158, 5),
        capsulePoly(246, 232, 268, 262, 6),
      ].map((p) => transform(p, o));
      return { kind, polys, mind: tp([268, 236], o), mindR: 30 * o.s, top: tp([258, 158], o), base: tp([200, 220], o), face: tp([268, 236], o) };
    }
    default:
      throw new Error(`Unknown figure: ${kind}`);
  }
}

export function inFigure(fig, x, y) {
  for (const p of fig.polys) if (pointInPoly(x, y, p)) return true;
  return false;
}

export function inMind(fig, x, y) {
  if (fig.mindPoly) return pointInPoly(x, y, fig.mindPoly);
  return Math.hypot(x - fig.mind[0], y - fig.mind[1]) < fig.mindR;
}
