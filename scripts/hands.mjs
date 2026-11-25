// Procedural hands for the "creation" variant: signed distance fields in px space.
// signed distance helpers (px space). Exports a function sampling both hands.
const cap = (px, py, ax, ay, bx, by, ra, rb = ra) => {
  const pax = px - ax,
    pay = py - ay,
    bax = bx - ax,
    bay = by - ay;
  const h = Math.max(
    0,
    Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)),
  );
  return Math.hypot(pax - bax * h, pay - bay * h) - (ra + (rb - ra) * h);
};
const ell = (px, py, cx, cy, rx, ry, rot = 0) => {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const x = (px - cx) * c + (py - cy) * s,
    y = -(px - cx) * s + (py - cy) * c;
  const k = Math.hypot(x / rx, y / ry);
  return (k - 1) * Math.min(rx, ry);
};
const smin = (a, b, k = 8) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
};
const chain = (px, py, pts, r) => {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++)
    d = Math.min(d, cap(px, py, ...pts[i], ...pts[i + 1], r[i], r[i + 1]));
  return d;
};

// LEFT: robot hand reaching right, palm down, fingers relaxed and drooping
export function robot(px, py) {
  const parts = [
    cap(px, py, -60, 150, 250, 128, 40, 30), // forearm
    ell(px, py, 300, 128, 48, 30, -0.08), // palm
    chain(
      px,
      py,
      [
        [338, 118],
        [378, 118],
        [404, 130],
        [418, 152],
      ],
      [9, 8, 7, 6],
    ), // index
    chain(
      px,
      py,
      [
        [340, 130],
        [374, 136],
        [392, 156],
        [398, 180],
      ],
      [9, 8, 7, 6],
    ), // middle
    chain(
      px,
      py,
      [
        [334, 142],
        [360, 152],
        [372, 172],
        [374, 194],
      ],
      [8, 7, 6, 5],
    ), // ring
    chain(
      px,
      py,
      [
        [322, 150],
        [342, 162],
        [348, 180],
        [348, 196],
      ],
      [7, 6, 5, 5],
    ), // little
    chain(
      px,
      py,
      [
        [300, 146],
        [326, 168],
        [346, 180],
      ],
      [10, 8, 7],
    ), // thumb
  ];
  let d = parts[0];
  for (const p of parts.slice(1)) d = smin(d, p, 6);
  return d;
}
// RIGHT: human hand from the right, index finger pointing left
export function human(px, py) {
  const parts = [
    cap(px, py, 940, 126, 650, 138, 34, 28), // forearm
    ell(px, py, 600, 140, 46, 30, 0.1), // palm
    chain(
      px,
      py,
      [
        [566, 132],
        [516, 132],
        [458, 136],
      ],
      [11, 10, 9],
    ), // index, extended
    chain(
      px,
      py,
      [
        [566, 146],
        [534, 154],
        [518, 172],
        [524, 186],
      ],
      [9, 8, 7, 6],
    ), // middle, curled
    chain(
      px,
      py,
      [
        [572, 156],
        [546, 168],
        [536, 186],
        [542, 198],
      ],
      [8, 7, 6, 6],
    ), // ring
    chain(
      px,
      py,
      [
        [582, 164],
        [562, 176],
        [556, 192],
        [562, 202],
      ],
      [7, 6, 5, 5],
    ), // little
    chain(
      px,
      py,
      [
        [600, 120],
        [574, 112],
        [548, 116],
      ],
      [10, 8, 7],
    ), // thumb
  ];
  let d = parts[0];
  for (const p of parts.slice(1)) d = smin(d, p, 6);
  return d;
}
