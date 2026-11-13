#!/usr/bin/env node
// Checks content/ without building: format, missing fields, broken links
// between items, missing images, and anything that looks like private data.
//   node engine/check.mjs           content checks
//   node engine/check.mjs --links   also checks that external links respond
// Exit code 1 when there are errors.
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { hasGps } from './lib/media.mjs';
import { fileURLToPath } from 'node:url';
import { loadContent, Report } from './lib/content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = new Report();
const { content: c } = loadContent(ROOT, report);

/* Photos kept in this public repository stay in its history for good, so they
   must arrive small and without location data. (Certificate and activity photos
   belong in the private photos repository; see docs/photos-plan.md.) */
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(path.join(ROOT, 'media')).filter((n) => /\.(jpe?g|png|webp|tiff?|heic|heif|avif)$/i.test(n))) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const size = fs.statSync(f).size;
  if (size > 1024 * 1024) report.warn(rel, `is ${(size / 1048576).toFixed(1)} MB; shrink it below 1 MB before committing (it stays in the history)`);
  try {
    const meta = await sharp(f).metadata();
    if (hasGps(meta.exif)) report.error(rel, 'contains GPS location data; strip the metadata before committing');
  } catch { report.warn(rel, 'could not be read as an image'); }
}

if (process.argv.includes('--links') && !report.errors.length) {
  const urls = new Set();
  const walk = (v) => { if (typeof v === 'string' && /^https:\/\//.test(v)) urls.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  for (const k of ['profile', 'research', 'publications', 'projects', 'honors', 'activities', 'news']) walk(c[k]);
  for (const p of c.publications) if (p.doi) urls.add(`https://doi.org/${p.doi}`);
  await Promise.all([...urls].map(async (u) => {
    try {
      const r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (r.status >= 400 && r.status !== 405 && r.status !== 403) report.warn('link', `${u} answered ${r.status}`);
    } catch (e) { report.warn('link', `${u} did not respond (${e.message})`); }
  }));
  report.note(`checked ${urls.size} external link(s)`);
}

console.log('\n▸ Checking content/');
report.print();
console.log(report.errors.length ? '\n✗ Not ready to publish.\n' : '\n✓ Content is ready.\n');
process.exit(report.errors.length ? 1 : 0);
