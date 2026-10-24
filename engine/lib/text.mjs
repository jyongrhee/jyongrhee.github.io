// Small text helpers shared by every view.
// © 2026 Jaeyong Rhee. All rights reserved.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for HTML (content and attribute values). */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Pick the language variant of a {en, ko} field (falls back to the other language). */
export function pick(field, lang) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field[lang === 'ko' ? 'en' : 'ko'] || '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-11" -> "Nov 2025" / "2025.11"; "2025" -> "2025". */
export function fmtDate(d, lang) {
  if (!d) return '';
  const [y, m] = String(d).split('-');
  if (!m) return y;
  return lang === 'ko' ? `${y}.${m}` : `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Sort key for "YYYY" / "YYYY-MM" (missing month sorts as December). */
export const dateKey = (d) => {
  if (!d) return '0000-00';
  const [y, m] = String(d).split('-');
  return `${y}-${m || '12'}`;
};

export const byDateDesc = (a, b) => dateKey(b.date).localeCompare(dateKey(a.date));

/** Relative URL prefix for a page at the given folder depth. */
export const up = (depth) => (depth > 0 ? '../'.repeat(depth) : './');

/** Join prefix + path without doubling "./". */
export function href(depth, path = '') {
  const p = up(depth);
  if (!path) return p;
  return p === './' ? path : p + path;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Deterministic 32-bit hash for seeds and ids. */
export function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
