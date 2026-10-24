// Image pipeline: every photo in media/ is resized into AVIF + WebP + JPEG
// at several widths, rotated upright, and stripped of all metadata
// (camera details and GPS location never reach the published site).
// Results are cached by file hash, so rebuilds only touch changed photos.
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { esc } from './text.mjs';

const RASTER = /\.(jpe?g|png|webp|avif|heic|heif|tiff?)$/i;

export class Media {
  constructor(root, out, report, { fast = false } = {}) {
    this.root = root; this.out = out; this.report = report; this.fast = fast;
    this.cacheDir = path.join(root, '.cache', 'media');
    fs.mkdirSync(this.cacheDir, { recursive: true });
    this.done = new Map();
    this.gpsRemoved = 0;
  }

  exists(src) { return !!src && fs.existsSync(path.join(this.root, src)); }

  /** Process one image. Returns null when the file is missing. */
  async get(src, widths = [480, 960, 1600]) {
    if (!this.exists(src)) return null;
    const key = `${src}|${widths.join(',')}`;
    if (this.done.has(key)) return this.done.get(key);
    const job = this.#process(src, widths);
    this.done.set(key, job);
    return job;
  }

  async #process(src, widths) {
    const abs = path.join(this.root, src);
    const buf = fs.readFileSync(abs);
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
    const base = src.replace(/^media\//, '').replace(/\.[^.]+$/, '');
    const outRel = (w, ext) => `media/${base}-${w}.${hash}.${ext}`;

    if (/\.svg$/i.test(src)) {
      const rel = `media/${base}.${hash}.svg`;
      this.#write(rel, buf);
      const m = /viewBox="[\d.\s-]+?\s([\d.]+)\s([\d.]+)"/.exec(buf.toString());
      return { svg: rel, w: m ? Number(m[1]) : 100, h: m ? Number(m[2]) : 100 };
    }
    if (!RASTER.test(src)) { this.report.warn(src, 'unsupported image type'); return null; }

    const meta = await sharp(buf).metadata();
    if (meta.exif && /GPS/.test(meta.exif.toString('latin1'))) this.gpsRemoved++;
    const upright = sharp(buf).rotate();
    const { width: W0, height: H0 } = await upright.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
    const ws = [...new Set(widths.map((w) => Math.min(w, W0)))].sort((a, b) => a - b);
    const formats = this.fast ? ['webp', 'jpg'] : ['avif', 'webp', 'jpg'];
    const result = { w: W0, h: H0, sources: {}, fallback: null };
    for (const f of formats) {
      result.sources[f] = [];
      for (const w of ws) {
        const rel = outRel(w, f);
        const cached = path.join(this.cacheDir, path.basename(rel));
        if (!fs.existsSync(cached)) {
          let p = sharp(buf).rotate().resize({ width: w, withoutEnlargement: true });
          if (f === 'avif') p = p.avif({ quality: 52, effort: 4 });
          else if (f === 'webp') p = p.webp({ quality: 74 });
          else p = p.flatten({ background: '#0b1220' }).jpeg({ quality: 80, mozjpeg: true });
          fs.writeFileSync(cached, await p.toBuffer()); // metadata is dropped by default
        }
        this.#write(rel, fs.readFileSync(cached));
        result.sources[f].push({ w, rel });
      }
    }
    result.fallback = result.sources.jpg.at(-1).rel;
    const { dominant } = await sharp(buf).stats();
    result.tint = `rgb(${dominant.r} ${dominant.g} ${dominant.b})`;
    return result;
  }

  #write(rel, data) {
    const dest = path.join(this.out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  }
}

/** <picture> markup for a processed image. prefix = relative path to site root. */
export function picture(img, prefix, { alt = '', sizes = '100vw', cls = '', eager = false, attrs = '' } = {}) {
  if (!img) return '';
  const u = (rel) => prefix + rel;
  if (img.svg) return `<img class="${esc(cls)}" src="${u(img.svg)}" alt="${esc(alt)}" width="${img.w}" height="${img.h}" ${attrs}>`;
  const srcset = (list) => list.map((s) => `${u(s.rel)} ${s.w}w`).join(', ');
  const types = { avif: 'image/avif', webp: 'image/webp' };
  const sources = Object.entries(img.sources)
    .filter(([f]) => f !== 'jpg')
    .map(([f, list]) => `<source type="${types[f]}" srcset="${srcset(list)}" sizes="${esc(sizes)}">`).join('');
  const load = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<picture>${sources}<img class="${esc(cls)}" src="${u(img.fallback)}" srcset="${srcset(img.sources.jpg)}" sizes="${esc(sizes)}" alt="${esc(alt)}" width="${img.w}" height="${img.h}" decoding="async" ${load} style="--tint:${img.tint}" ${attrs}></picture>`;
}
