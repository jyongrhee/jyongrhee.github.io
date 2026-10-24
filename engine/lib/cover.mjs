// Generated covers: each study gets its own bathymetric contour drawing,
// derived from its id, so a study without a figure still has a distinct,
// finished cover. Same id → same drawing on every build.
// © 2026 Jaeyong Rhee. All rights reserved.

import { hash32 } from './text.mjs';

function rng(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

/** Height field built from a few seeded basins, ridges and swells. */
function field(seed) {
  const r = rng(seed);
  const bumps = Array.from({ length: 7 }, () => ({
    x: r(), y: r(), a: (r() - 0.45) * 2, s: 0.04 + r() * 0.12,
  }));
  const k1 = 2 + r() * 3, k2 = 3 + r() * 4, p = r() * 6;
  return (x, y) => {
    let h = 0.18 * Math.sin(x * k1 + p) * Math.cos(y * k2 - p) + 0.08 * Math.sin((x + y) * 7 + p);
    for (const b of bumps) { const dx = x - b.x, dy = (y - b.y) * 1.4; h += b.a * Math.exp(-(dx * dx + dy * dy) / b.s); }
    return h;
  };
}

/** Marching squares for one level; returns joined polylines. */
function contour(grid, nx, ny, level, sx, sy) {
  const segs = [];
  const at = (i, j) => grid[j * (nx + 1) + i];
  const lerp = (a, b, va, vb) => a + (b - a) * ((level - va) / (vb - va || 1e-9));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const idx = (a > level) | ((b > level) << 1) | ((c > level) << 2) | ((d > level) << 3);
    if (idx === 0 || idx === 15) continue;
    const T = [lerp(i, i + 1, a, b) * sx, j * sy];
    const R = [(i + 1) * sx, lerp(j, j + 1, b, c) * sy];
    const B = [lerp(i, i + 1, d, c) * sx, (j + 1) * sy];
    const L = [i * sx, lerp(j, j + 1, a, d) * sy];
    const map = { 1: [[L, T]], 2: [[T, R]], 3: [[L, R]], 4: [[R, B]], 5: [[L, T], [R, B]], 6: [[T, B]], 7: [[L, B]],
      8: [[B, L]], 9: [[B, T]], 10: [[T, R], [B, L]], 11: [[B, R]], 12: [[R, L]], 13: [[R, T]], 14: [[T, L]] };
    for (const s of map[idx]) segs.push(s);
  }
  // join segments that share endpoints into longer polylines
  const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const ends = new Map();
  segs.forEach((s, n) => { for (const p of s) { const k = key(p); (ends.get(k) || ends.set(k, []).get(k)).push(n); } });
  const used = new Uint8Array(segs.length);
  const lines = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const line = [segs[n][0], segs[n][1]];
    for (const dir of [1, -1]) {
      for (;;) {
        const tip = dir === 1 ? line.at(-1) : line[0];
        const next = (ends.get(key(tip)) || []).find((m) => !used[m]);
        if (next == null) break;
        used[next] = 1;
        const [p, q] = segs[next];
        const other = key(p) === key(tip) ? q : p;
        if (dir === 1) line.push(other); else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Contour SVG for an id. Colors come from CSS variables so the drawing
 * follows the light/dark theme: --cv-line, --cv-key, --cv-bg.
 */
export function coverSvg(id, { w = 800, h = 450, cls = 'cover-art', title = '' } = {}) {
  const f = field(hash32(id));
  const nx = 72, ny = Math.round(72 * h / w);
  const grid = new Float32Array((nx + 1) * (ny + 1));
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const v = f(i / nx, j / ny); grid[j * (nx + 1) + i] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  const sx = w / nx, sy = h / ny, levels = 16;
  let paths = '';
  for (let l = 1; l < levels; l++) {
    const level = lo + (hi - lo) * (l / levels);
    const d = contour(grid, nx, ny, level, sx, sy)
      .filter((ln) => ln.length > 3)
      .map((ln) => 'M' + ln.map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`).join('L'))
      .join('');
    if (!d) continue;
    const major = l % 4 === 0;
    paths += `<path d="${d}" class="${major ? 'cv-key' : 'cv-line'}"/>`;
  }
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const x = Math.round((w / 8) * i);
    return `<path d="M${x} ${h}v-8"/>`;
  }).join('');
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${title}"><rect width="${w}" height="${h}" class="cv-bg"/>${paths}<g class="cv-tick">${ticks}</g></svg>`;
}
