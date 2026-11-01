// Signed distance shapes. Negative inside, positive outside, in pixels.
// Figures are sculpted from these with smooth unions, so silhouettes
// read as bodies, not as stacked circles.

export const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;

// Rotated ellipse (a close approximation, exact on the axes).
export const ellipse = (cx, cy, rx, ry, rot = 0) => {
  const c = Math.cos(-rot), s = Math.sin(-rot), m = Math.min(rx, ry);
  return (x, y) => {
    const dx = x - cx, dy = y - cy;
    const u = (dx * c - dy * s) / rx, v = (dx * s + dy * c) / ry;
    return (Math.hypot(u, v) - 1) * m;
  };
};

// Tapered capsule: radius ra at A, rb at B.
export const capsule = (ax, ay, bx, by, ra, rb = ra) => {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
  return (x, y) => {
    let h = ((x - ax) * vx + (y - ay) * vy) / l2;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    return Math.hypot(x - ax - vx * h, y - ay - vy * h) - (ra + (rb - ra) * h);
  };
};

// A chain of tapered capsules through points with radii.
export const limb = (pts, radii) => {
  const parts = [];
  for (let i = 0; i < pts.length - 1; i++) parts.push(capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radii[i], radii[i + 1]));
  return union(parts, 3);
};

// Exact signed distance to a closed polygon.
export const polygon = (pts) => {
  const N = pts.length;
  const xs = Float64Array.from(pts, (p) => p[0]), ys = Float64Array.from(pts, (p) => p[1]);
  return (x, y) => {
    let d = Infinity, inside = false;
    for (let i = 0, j = N - 1; i < N; j = i++) {
      const ex = xs[j] - xs[i], ey = ys[j] - ys[i];
      const wx = x - xs[i], wy = y - ys[i];
      let h = (wx * ex + wy * ey) / (ex * ex + ey * ey || 1);
      h = h < 0 ? 0 : h > 1 ? 1 : h;
      const dx = wx - ex * h, dy = wy - ey * h;
      const dd = dx * dx + dy * dy;
      if (dd < d) d = dd;
      if ((ys[i] > y) !== (ys[j] > y) && x < (ex * (y - ys[i])) / (ey || 1e-9) + xs[i]) inside = !inside;
    }
    return inside ? -Math.sqrt(d) : Math.sqrt(d);
  };
};

// Polynomial smooth minimum: k is the blend radius in pixels.
export const smin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export const union = (shapes, k = 0) => (x, y) => {
  let d = shapes[0](x, y);
  for (let i = 1; i < shapes.length; i++) d = smin(d, shapes[i](x, y), k);
  return d;
};

export const subtract = (a, b, k = 0) => (x, y) => -smin(-a(x, y), b(x, y), k);

// Place a local-space shape on the stage: scale, rotate (radians), mirror, move.
export const place = (shape, { x = 0, y = 0, s = 1, rot = 0, mirror = false }) => {
  const c = Math.cos(-rot), si = Math.sin(-rot);
  return (px, py) => {
    let dx = (px - x) / s, dy = (py - y) / s;
    const lx = dx * c - dy * si, ly = dx * si + dy * c;
    return shape(mirror ? -lx : lx, ly) * s;
  };
};

// Map a local point to the stage with the same placement.
export const placePoint = ([lx, ly], { x = 0, y = 0, s = 1, rot = 0, mirror = false }) => {
  const px = mirror ? -lx : lx;
  const c = Math.cos(rot), si = Math.sin(rot);
  return [x + (px * c - ly * si) * s, y + (px * si + ly * c) * s];
};
