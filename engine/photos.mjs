#!/usr/bin/env node
// Prepares photos from the private photos repository for the build.
//   node engine/photos.mjs <photos checkout> [out dir, default photos/]
// Every picture is re-encoded: turned upright, its long side capped at
// 2400 px, saved as JPEG with all metadata (camera, date, GPS) dropped.
// inbox/ is never copied: it holds unsorted originals.
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const FOLDERS = ['honors', 'scholarships', 'activities', 'certificates', 'news'];
const RASTER = /\.(jpe?g|png|webp|tiff?|heic|heif|avif)$/i;
const [src, out = 'photos'] = process.argv.slice(2);
if (!src || !fs.existsSync(src)) { console.log('Usage: node engine/photos.mjs <photos checkout> [out dir]'); process.exit(1); }

fs.rmSync(out, { recursive: true, force: true });
let done = 0, failed = 0;
for (const folder of FOLDERS) {
  const dir = path.join(src, folder);
  if (!fs.existsSync(dir)) continue;
  fs.mkdirSync(path.join(out, folder), { recursive: true });
  for (const f of fs.readdirSync(dir).filter((n) => RASTER.test(n)).sort()) {
    const name = f.replace(RASTER, '.jpg');
    try {
      const buf = await sharp(path.join(dir, f)).rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();   // sharp writes no metadata unless asked to
      fs.writeFileSync(path.join(out, folder, name), buf);
      done++;
    } catch (e) { console.log(`  ✗ ${folder}/${f}: ${e.message}`); failed++; }
  }
}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, '.ready'), `${done}\n`);   // so the folder is never empty when cached
console.log(`  · ${done} photo(s) prepared in ${out}/${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
