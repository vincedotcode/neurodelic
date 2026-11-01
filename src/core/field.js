// Scalar fields on a grid: sampling, contour lines (marching squares),
// streamlines and line simplification.

export class Grid {
  constructor(W, H, cell) {
    this.W = W; this.H = H; this.cell = cell;
    this.nx = Math.ceil(W / cell) + 1;
    this.ny = Math.ceil(H / cell) + 1;
    this.v = new Float32Array(this.nx * this.ny);
  }
  static of(W, H, cell, fn) {
    const g = new Grid(W, H, cell);
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) g.v[j * g.nx + i] = fn(i * cell, j * cell);
    return g;
  }
  map(fn) {
    const g = new Grid(this.W, this.H, this.cell);
    for (let k = 0; k < this.v.length; k++) g.v[k] = fn(this.v[k], (k % this.nx) * this.cell, Math.floor(k / this.nx) * this.cell);
    return g;
  }
  // Bilinear sample at stage coordinates.
  at(x, y) {
    const { nx, ny, cell, v } = this;
    let fx = x / cell, fy = y / cell;
    if (fx < 0) fx = 0; if (fy < 0) fy = 0;
    if (fx > nx - 1.001) fx = nx - 1.001; if (fy > ny - 1.001) fy = ny - 1.001;
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * nx + i;
    const a = v[k], b = v[k + 1], c = v[k + nx], d = v[k + nx + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  grad(x, y, h = this.cell) {
    return [(this.at(x + h, y) - this.at(x - h, y)) / (2 * h), (this.at(x, y + h) - this.at(x, y - h)) / (2 * h)];
  }
}

// Contours where the field crosses `level`. With `close`, the frame counts
// as below the level, so every region outline comes back as a closed loop.
// Returns [{ pts, closed }].
export function isolines(grid, level, close = true) {
  const { nx, ny, cell, v } = grid;
  const OUT = -1e9;
  const get = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? (close ? OUT : NaN) : v[j * nx + i]);
  const i0 = close ? -1 : 0, j0 = close ? -1 : 0, i1 = close ? nx : nx - 1, j1 = close ? ny : ny - 1;
  const W = nx + 2; // key space includes the virtual border
  const hk = (i, j) => (j + 1) * W + (i + 1);
  const vk = (i, j) => 1e7 + (j + 1) * W + (i + 1);
  const pos = new Map();
  const adj = new Map();
  const clampX = (x) => Math.max(0, Math.min(grid.W, x));
  const clampY = (y) => Math.max(0, Math.min(grid.H, y));
  const point = (key, ax, ay, bx, by, va, vb) => {
    if (!pos.has(key)) {
      let t = (level - va) / (vb - va);
      if (!isFinite(t)) t = 0.5;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      pos.set(key, [clampX((ax + (bx - ax) * t) * cell), clampY((ay + (by - ay) * t) * cell)]);
    }
    return key;
  };
  const link = (p, q) => {
    if (!adj.has(p)) adj.set(p, []);
    if (!adj.has(q)) adj.set(q, []);
    adj.get(p).push(q); adj.get(q).push(p);
  };
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const a = get(i, j), b = get(i + 1, j), c = get(i + 1, j + 1), d = get(i, j + 1);
      if (Number.isNaN(a + b + c + d)) continue;
      const idx = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => point(hk(i, j), i, j, i + 1, j, a, b);
      const R = () => point(vk(i + 1, j), i + 1, j, i + 1, j + 1, b, c);
      const B = () => point(hk(i, j + 1), i, j + 1, i + 1, j + 1, d, c);
      const L = () => point(vk(i, j), i, j, i, j + 1, a, d);
      const centre = (a + b + c + d) / 4 >= level;
      switch (idx) {
        case 1: case 14: link(L(), B()); break;
        case 2: case 13: link(B(), R()); break;
        case 3: case 12: link(L(), R()); break;
        case 4: case 11: link(T(), R()); break;
        case 6: case 9: link(T(), B()); break;
        case 7: case 8: link(L(), T()); break;
        case 5: if (centre) { link(L(), T()); link(R(), B()); } else { link(T(), R()); link(L(), B()); } break;
        case 10: if (centre) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(R(), B()); } break;
      }
    }
  }
  const seen = new Set();
  const out = [];
  const walk = (start) => {
    const keys = [start];
    seen.add(start);
    let cur = start;
    for (;;) {
      const nb = adj.get(cur).find((k) => !seen.has(k));
      if (nb === undefined) break;
      seen.add(nb); keys.push(nb); cur = nb;
    }
    const closed = keys.length > 2 && adj.get(cur).includes(start);
    out.push({ pts: keys.map((k) => pos.get(k)), closed });
  };
  for (const [k, nb] of adj) if (nb.length === 1 && !seen.has(k)) walk(k);
  for (const k of adj.keys()) if (!seen.has(k)) walk(k);
  return out;
}

// Ramer-Douglas-Peucker.
export function simplify(pts, tol = 0.5) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    let md = 0, mi = -1;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + dx * t - px, ey = ay + dy * t - py;
      const d = ex * ex + ey * ey;
      if (d > md) { md = d; mi = i; }
    }
    if (md > t2 && mi > 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Chaikin corner cutting: rounds the stair-steps of a contour.
export function chaikin(pts, closed = true, iter = 2) {
  let p = pts;
  for (let k = 0; k < iter; k++) {
    const q = [];
    const n = p.length;
    if (n < 3) return p;
    const last = closed ? n : n - 1;
    if (!closed) q.push(p[0]);
    for (let i = 0; i < last; i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}

// Clean contour: smooth then thin out points.
export function cleanLoop(pts, closed = true, tol = 0.45) {
  return simplify(chaikin(pts, closed, 2), tol);
}

export function loopLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

// Follow an angle field from a start point.
export function streamline(x, y, angleAt, { step = 2, max = 120, keep = () => true, W = 400, H = 400 } = {}) {
  const pts = [[x, y]];
  let px = x, py = y;
  for (let i = 0; i < max; i++) {
    const a = angleAt(px, py);
    const nx = px + Math.cos(a) * step, ny = py + Math.sin(a) * step;
    if (nx < -4 || ny < -4 || nx > W + 4 || ny > H + 4 || !keep(nx, ny)) break;
    pts.push([nx, ny]); px = nx; py = ny;
  }
  return pts;
}
