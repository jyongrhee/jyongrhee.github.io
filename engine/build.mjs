#!/usr/bin/env node
// Builds the whole site into _site/ from content/, media/ and hull/.
//   node engine/build.mjs           full build (what GitHub Actions runs)
//   node engine/build.mjs --fast    quick local build: no AVIF, no share images, no PDF
//   node engine/build.mjs --preview=12   pull request preview served from /preview/pr-12/:
//                                   noindex, no sitemap/robots, no service worker, no share images or PDF
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import subsetFont from 'subset-font';

import { loadContent, Report } from './lib/content.mjs';
import { Media } from './lib/media.mjs';
import { pick } from './lib/text.mjs';
import { UI } from './lib/strings.mjs';
import { coverSvg } from './lib/cover.mjs';
import { launch } from './lib/browser.mjs';
import { sitemap, robots, feed, searchIndex, manifest, bibFile, personLd, studyLd } from './lib/extras.mjs';
import { shell } from './views/shell.mjs';
import { homeBody } from './views/home.mjs';
import { diveBody } from './views/dive.mjs';
import { notFoundBody, offlineBody, cvHtml, ogHtml } from './views/misc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const FAST = process.argv.includes('--fast');
const PREVIEW = (() => {
  const i = process.argv.findIndex((a) => a === '--preview' || a.startsWith('--preview='));
  if (i < 0) return null;
  const n = (process.argv[i].split('=')[1] ?? process.argv[i + 1] ?? '').trim();
  if (!/^\d+$/.test(n)) { console.log('  ✗ --preview needs a pull request number, e.g. --preview=12'); process.exit(1); }
  return Number(n);
})();
const t0 = Date.now();
const log = (...a) => console.log(...a);

/* ---------- helpers ---------- */
const sha = (buf, n = 10) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, n);
function write(rel, data) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
}
function fingerprint(rel, buf) {
  const ext = path.extname(rel);
  const out = rel.slice(0, -ext.length) + '.' + sha(buf) + ext;
  write(out, buf);
  return out;
}
const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

function buildInfo() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600e3);
  const p2 = (n) => String(n).padStart(2, '0');
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth() + 1, d = kst.getUTCDate();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    number: process.env.GITHUB_RUN_NUMBER ? `#${process.env.GITHUB_RUN_NUMBER}` : 'local',
    sha: (process.env.GITHUB_SHA || 'dev').slice(0, 7),
    iso: now.toISOString(),
    year: y,
    stamp: `${y}-${p2(m)}-${p2(d)} ${p2(kst.getUTCHours())}:${p2(kst.getUTCMinutes())} KST`,
    dateLabel: { en: `${MONTHS[m - 1]} ${d}, ${y}`, ko: `${y}.${p2(m)}.${p2(d)}` },
    weight: '__WEIGHT__',
  };
}

/* Crossref citation counts (cached; skipped when offline). */
async function citations(c, report) {
  const cacheFile = path.join(ROOT, '.cache', 'citations.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* none yet */ }
  const dois = c.publications.map((p) => p.doi).filter(Boolean);
  if (!dois.length || FAST) return cache;
  let fetched = 0;
  await Promise.all(dois.map(async (doi) => {
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
        headers: { 'User-Agent': `jyongrhee-site (mailto:${c.profile.email})` }, signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      cache[doi] = j.message['is-referenced-by-count'] ?? 0; fetched++;
    } catch (e) { report.warn(`doi ${doi}`, `citation count not updated (${e.message})`); }
  }));
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  if (fetched) report.note(`citation counts updated for ${fetched} paper(s)`);
  return cache;
}

/* ICO container around a PNG (valid for all current browsers). */
function ico(png) {
  const h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h.writeUInt8(32, 6); h.writeUInt8(32, 7); h.writeUInt8(0, 8); h.writeUInt8(0, 9);
  h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18);
  return Buffer.concat([h, png]);
}

/* Characters the decode effect can show while assembling Hangul. */
function sonarGlyphs(lines) {
  const out = new Set('▒▓░<>/\\_=+*#·…–—’“”→←↑↓⌘°×✓');
  for (let cp = 0x3131; cp <= 0x3163; cp++) out.add(String.fromCodePoint(cp));
  for (const ch of lines.join('')) {
    const cp = ch.codePointAt(0) - 0xac00;
    if (cp >= 0 && cp < 11172) out.add(String.fromCodePoint(0xac00 + Math.floor(cp / 28) * 28));
  }
  return [...out].join('');
}

/* ---------- main ---------- */
async function main() {
  log(`\n▸ Building site${FAST ? ' (fast)' : ''}${PREVIEW ? ` (preview of pull request #${PREVIEW})` : ''}`);
  const report = new Report();
  const { content: c } = loadContent(ROOT, report);
  if (report.errors.length) { report.print(); log('\n✗ Fix the errors above, then build again.\n'); process.exit(1); }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const build = buildInfo();
  const P = c.profile;
  /* a preview lives in a sub-folder: every absolute address points there */
  const base = PREVIEW ? `/preview/pr-${PREVIEW}/` : '/';
  const liveUrl = P.site.url.replace(/\/$/, '');
  if (PREVIEW) P.site.url = liveUrl + base.slice(0, -1);
  const siteUrl = P.site.url.replace(/\/$/, '');
  const preview = PREVIEW ? {
    number: PREVIEW, live: liveUrl + '/',
    url: `https://github.com/${process.env.GITHUB_REPOSITORY || `${new URL(liveUrl).hostname.split('.')[0]}/${new URL(liveUrl).hostname}`}/pull/${PREVIEW}`,
  } : null;

  /* images */
  const media = new Media(ROOT, OUT, report, { fast: FAST });
  const jobs = [];
  const want = (src, widths) => { if (src) jobs.push([src, widths]); };
  want(P.portrait, [360, 720]);
  want(P.hero?.image, [960, 1600, 2400]);
  if (P.hero?.depth) want('media/hero-depth.png', [1600]);
  for (const r of c.research) { want(r.cover, [640, 1200, 1800]); for (const ch of r.chapters || []) want(ch.figure?.src, [640, 1200, 1800]); }
  for (const h of c.honors) want(h.image, [480, 960, 1600]);
  for (const a of c.activities) want(a.image, [480, 960]);
  for (const n of c.news) want(n.image, [480, 960]);
  const imgMap = {};
  for (const [src, w] of jobs) imgMap[src] = await media.get(src, w);
  if (media.gpsRemoved) report.note(`removed GPS location data from ${media.gpsRemoved} photo(s)`);

  /* brand files */
  const brandFile = (f) => fingerprint(`media/brand/${f}`, fs.readFileSync(path.join(ROOT, 'media/brand', f)));
  const brand = { kaistColor: brandFile('kaist-color.png'), kaistWhite: brandFile('kaist-white.png'), bslColor: brandFile('bsl-color.png'), bslWhite: brandFile('bsl-white.png') };
  const marks = { pknu: fs.readFileSync(path.join(ROOT, 'media/brand/pknu.svg'), 'utf8'), oe: fs.readFileSync(path.join(ROOT, 'media/brand/oe.svg'), 'utf8') };

  const cites = await citations(c, report);
  const baseCtx = { root: ROOT, c, build, media, brand, marks, citations: cites, img: (src) => (src && imgMap[src]) || null, base, preview,
    assets: { css: '__CSS__', js: '__JS__', fontSans: '__FONT_SANS__', fontMono: '__FONT_MONO__' } };

  /* pages */
  const pages = [];   // { rel, html, lang, path, alt, kind }
  const depthJs = P.hero?.depth && media.exists('media/hero-depth.png');
  for (const lang of ['en', 'ko']) {
    const other = lang === 'en' ? 'ko' : 'en';
    const lp = (l) => (l === 'ko' ? 'ko/' : '');
    const ctxHome = { ...baseCtx, lang, studyHref: (id) => `research/${id}/` };
    const prefix = lang === 'en' ? './' : '../';
    const t = UI[lang];
    pages.push({
      rel: `${lp(lang)}index.html`, lang, path: lp(lang), alt: lp(other), kind: 'home',
      html: shell(ctxHome, {
        kind: 'home', isHome: true, prefix, path: lp(lang), altPath: lp(other),
        title: `${pick(P.name, lang)} · ${pick(P.affiliation, lang)}`,
        ogTitle: pick(P.name, lang), description: pick(P.description, lang), og: `og/home-${lang}.png`,
        jsonld: personLd(c, lang, siteUrl),
        body: homeBody(ctxHome, prefix),
        extraScripts: depthJs ? `<script src="${prefix}__DEPTH__" defer></script>` : '',
      }),
    });
    c.research.forEach((r, i) => {
      const rp = `${lp(lang)}research/${r.id}/`;
      const pre = lang === 'en' ? '../../' : '../../../';
      const ctx = { ...baseCtx, lang, studyHref: (id) => `../${id}/` };
      pages.push({
        rel: `${rp}index.html`, lang, path: rp, alt: `${lp(other)}research/${r.id}/`, kind: 'study', study: r,
        html: shell(ctx, {
          kind: 'study', prefix: pre, path: rp, altPath: `${lp(other)}research/${r.id}/`,
          title: `${pick(r.title, lang)} · ${pick(P.name, lang)}`, ogTitle: pick(r.title, lang), ogType: 'article',
          description: pick(r.summary, lang), og: `og/research-${r.id}-${lang}.png`,
          jsonld: studyLd(c, r, lang, siteUrl),
          body: diveBody(ctx, r, pre, { prev: c.research[i - 1], next: c.research[i + 1], homeHref: lang === 'en' ? '../../' : '../../' }),
        }),
      });
    });
    void t;
  }
  const ctx404 = { ...baseCtx, lang: 'en', studyHref: (id) => `${base}research/${id}/` };
  pages.push({ rel: '404.html', lang: 'en', kind: 'void', noSitemap: true,
    html: shell(ctx404, { kind: 'void', prefix: base, path: '404.html', altPath: null, noindex: true, title: `404 · ${pick(P.name, 'en')}`, description: UI.en.notFound.text, body: notFoundBody(ctx404) }) });
  pages.push({ rel: 'offline.html', lang: 'en', kind: 'void', noSitemap: true,
    html: shell({ ...ctx404 }, { kind: 'void', prefix: base, path: 'offline.html', altPath: null, noindex: true, noSw: true, title: `Offline · ${pick(P.name, 'en')}`, description: UI.en.offline.text, body: offlineBody({ lang: 'en' }) }) });

  /* search indexes (needed before font subsetting) */
  const indexes = { en: searchIndex(c, 'en'), ko: searchIndex(c, 'ko') };

  /* fonts: keep only the characters this site uses */
  const text = pages.map((p) => p.html).join('') + indexes.en + indexes.ko
    + sonarGlyphs([...(P.tagline?.en || []), ...(P.tagline?.ko || [])])
    + Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const chars = [...new Set(text)].join('');
  const sansSrc = fs.readFileSync(path.join(ROOT, 'hull/fonts/SUIT-Variable.woff2'));
  const monoSrc = fs.readFileSync(path.join(ROOT, 'hull/fonts/GeistMono-Variable.woff2'));
  const sans = await subsetFont(sansSrc, chars, { targetFormat: 'woff2' });
  const mono = await subsetFont(monoSrc, chars, { targetFormat: 'woff2' });
  const fontSans = fingerprint('hull/suit.woff2', sans);
  const fontMono = fingerprint('hull/geist-mono.woff2', mono);
  for (const f of ['OFL-SUIT.txt', 'OFL-Geist.txt']) write(`hull/${f}`, fs.readFileSync(path.join(ROOT, 'hull/fonts', f)));
  report.note(`fonts subset to ${[...chars].length} characters: ${Math.round(sans.length / 1024)} KB + ${Math.round(mono.length / 1024)} KB (from ${Math.round((sansSrc.length + monoSrc.length) / 1024)} KB)`);

  /* styles and scripts */
  const cat = (dir, ext) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(ext) && /^\d/.test(f)).sort()
    .map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(ROOT, dir, f), 'utf8')).join('\n');
  const css = cat('hull/style', '.css').replace(/\/\*(?!!)[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n').replace(/^\s+/gm, '');
  const js = `/*! © ${build.year} Jaeyong Rhee. All rights reserved. */\n` + cat('hull/js', '.js');
  const cssRel = fingerprint('hull/hull.css', Buffer.from(css));
  const jsRel = fingerprint('hull/vessel.js', Buffer.from(js));
  const depthRel = depthJs ? fingerprint('hull/depth.js', fs.readFileSync(path.join(ROOT, 'hull/js/depth.js'))) : '';

  /* icons */
  const fav = fs.readFileSync(path.join(ROOT, 'media/brand/favicon.svg'));
  write('favicon.svg', fav);
  write('favicon.ico', ico(await sharp(fav).resize(32, 32).png().toBuffer()));
  write('icons/apple-touch-icon.png', await sharp(fav).resize(180, 180).flatten({ background: '#0B1220' }).png().toBuffer());
  write('icons/icon-192.png', await sharp(fav).resize(192, 192).png().toBuffer());
  write('icons/icon-512.png', await sharp(fav).resize(512, 512).png().toBuffer());
  write('icons/icon-maskable.png', await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0B1220' } })
    .composite([{ input: await sharp(fav).resize(360, 360).png().toBuffer(), gravity: 'center' }]).png().toBuffer());

  /* weight of the home page as first delivered (gzip): HTML + CSS + JS + fonts */
  const home = pages[0].html;
  const weight = gz(Buffer.from(home)) + gz(Buffer.from(css)) + gz(Buffer.from(js)) + sans.length + mono.length;
  const weightLabel = `${Math.round(weight / 1024)} KB`;

  /* write pages */
  for (const p of pages) {
    const html = p.html.replaceAll('__CSS__', cssRel).replaceAll('__JS__', jsRel)
      .replaceAll('__FONT_SANS__', fontSans).replaceAll('__FONT_MONO__', fontMono)
      .replaceAll('__DEPTH__', depthRel).replaceAll('__WEIGHT__', weightLabel);
    write(p.rel, html);
  }

  /* machine-readable extras */
  const listed = pages.filter((p) => !p.noSitemap);
  if (!PREVIEW) {
    write('sitemap.xml', sitemap(siteUrl, listed, build.iso));
    write('robots.txt', robots(siteUrl));
  }
  write('feed.xml', feed(c, 'en', siteUrl, build.iso));
  write('ko/feed.xml', feed(c, 'ko', siteUrl, build.iso));
  write('search.json', indexes.en);
  write('ko/search.json', indexes.ko);
  write('site.webmanifest', manifest(c, 'en', './'));
  write('ko/site.webmanifest', manifest(c, 'ko', '../'));
  if (c.publications.length) write('papers.bib', bibFile(c));
  write('.nojekyll', '');

  /* service worker: precache the shell, version = hash of everything it caches */
  const precache = ['./', 'ko/', 'offline.html', cssRel, jsRel, fontSans, fontMono, 'favicon.svg', 'search.json', 'ko/search.json'];
  const version = sha(Buffer.from(precache.join('|') + home + css + js), 12);
  if (!PREVIEW) write('anchor.js', fs.readFileSync(path.join(ROOT, 'hull/js/anchor.js'), 'utf8')
    .replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));

  /* share images + CV PDF (headless browser) */
  const ogTargets = [];
  for (const lang of ['en', 'ko']) {
    ogTargets.push({ file: `og/home-${lang}.png`, id: 'home-surface', kicker: pick(P.affiliation, lang), title: pick(P.name, lang), sub: (P.tagline?.[lang] || []).join(' ') });
    for (const r of c.research) ogTargets.push({ file: `og/research-${r.id}-${lang}.png`, id: r.id, kicker: `${pick(r.kind, lang)} · ${r.date.slice(0, 4)}`, title: pick(r.title, lang), sub: pick(r.full_title, lang) });
  }
  let browser = null;
  if (!FAST && !PREVIEW) browser = await launch();
  const fontsAbs = { sans: pathToFileURL(path.join(OUT, fontSans)).href, mono: pathToFileURL(path.join(OUT, fontMono)).href };
  const marksSvg = `${marks.pknu}<span class="rule"></span>${marks.oe}`;
  if (browser) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const o of ogTargets) {
      const f = path.join(OUT, '_print', path.basename(o.file).replace('.png', '.html'));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, ogHtml({ c }, { ...o, fonts: fontsAbs, marksSvg }));
      await page.goto(pathToFileURL(f).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      write(o.file, await page.screenshot({ type: 'png' }));
    }
    for (const lang of ['en', 'ko']) {
      const f = path.join(OUT, '_print', `cv-${lang}.html`);
      fs.writeFileSync(f, cvHtml({ c, lang, build }, fontsAbs));
      await page.goto(pathToFileURL(f).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      write(`${lang === 'ko' ? 'ko/' : ''}cv.pdf`, await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }));
    }
    await browser.close();
    report.note(`rendered ${ogTargets.length} share images and 2 CV PDFs`);
  } else if (PREVIEW) {
    report.note('preview build: share images and CV PDF skipped');
  } else {
    for (const o of ogTargets) {
      write(o.file, await sharp(Buffer.from(coverSvg(o.id, { w: 1200, h: 630 })
        .replace('<rect', '<style>.cv-bg{fill:#070B12}.cv-line{fill:none;stroke:#3D8BFF;stroke-opacity:.3}.cv-key{fill:none;stroke:#7FB2FF;stroke-width:1.6}.cv-tick path{stroke:#8B97A8}</style><rect'))).png().toBuffer());
    }
    report.note(FAST ? 'fast build: share images are plain covers, CV PDF skipped' : 'no headless browser found: share images are plain covers, CV PDF skipped');
  }
  fs.rmSync(path.join(OUT, '_print'), { recursive: true, force: true });

  report.print();
  const files = fs.readdirSync(OUT, { recursive: true }).filter((f) => fs.statSync(path.join(OUT, f)).isFile()).length;
  log(`\n✓ Built ${pages.length} pages, ${files} files in ${((Date.now() - t0) / 1000).toFixed(1)}s · home page ${weightLabel} gzipped\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
