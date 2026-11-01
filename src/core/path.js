// Compact SVG path writers. Relative commands and one decimal keep
// dense drawings small enough to ship as plain SVG.

const r1 = (v) => Math.round(v * 10) / 10;

function num(v) {
  if (Object.is(v, -0) || v === 0) return '0';
  let s = String(v);
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = '-' + s.slice(2);
  return s;
}

function join(nums) {
  let out = '';
  for (let i = 0; i < nums.length; i++) {
    const s = num(nums[i]);
    out += i === 0 || s[0] === '-' ? s : ' ' + s;
  }
  return out;
}

// Polyline as relative path data.
export function P(pts, closed = false) {
  if (!pts || pts.length < 2) return '';
  let px = r1(pts[0][0]), py = r1(pts[0][1]);
  let d = 'M' + join([px, py]);
  const rel = [];
  for (let i = 1; i < pts.length; i++) {
    const x = r1(pts[i][0]), y = r1(pts[i][1]);
    const dx = r1(x - px), dy = r1(y - py);
    if (dx === 0 && dy === 0) continue;
    rel.push(dx, dy);
    px = x; py = y;
  }
  if (!rel.length) return '';
  d += 'l' + join(rel);
  return closed ? d + 'z' : d;
}

// Smooth Catmull-Rom curve through points, as relative cubic Béziers.
export function C(pts, closed = false, t = 1) {
  const n = pts.length;
  if (n < 3) return P(pts, closed);
  const g = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let px = r1(pts[0][0]), py = r1(pts[0][1]);
  let d = 'M' + join([px, py]) + 'c';
  const seg = closed ? n : n - 1;
  const rel = [];
  for (let i = 0; i < seg; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1x = r1(p1[0] + ((p2[0] - p0[0]) / 6) * t), c1y = r1(p1[1] + ((p2[1] - p0[1]) / 6) * t);
    const c2x = r1(p2[0] - ((p3[0] - p1[0]) / 6) * t), c2y = r1(p2[1] - ((p3[1] - p1[1]) / 6) * t);
    const ex = r1(p2[0]), ey = r1(p2[1]);
    rel.push(r1(c1x - px), r1(c1y - py), r1(c2x - px), r1(c2y - py), r1(ex - px), r1(ey - py));
    px = ex; py = ey;
  }
  d += join(rel);
  return closed ? d + 'z' : d;
}

// Many dots as one path of zero-length round-capped strokes.
export function dots(pts) {
  if (!pts.length) return '';
  let px = r1(pts[0][0]), py = r1(pts[0][1]);
  let d = 'M' + join([px, py]) + 'h0';
  for (let i = 1; i < pts.length; i++) {
    const x = r1(pts[i][0]), y = r1(pts[i][1]);
    d += 'm' + join([r1(x - px), r1(y - py)]) + 'h0';
    px = x; py = y;
  }
  return d;
}

// Closed polygons (filled shapes) in one path.
export function polys(list) {
  let d = '';
  for (const p of list) d += P(p, true);
  return d;
}
