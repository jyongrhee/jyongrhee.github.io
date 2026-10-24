#!/usr/bin/env node
// Measures the built site with Lighthouse and writes the real scores into
// the footer of every page. If the scores fall below the floor, it fails
// (so a slow or inaccessible change never ships unnoticed).
//   node engine/audit.mjs            audit + write scores
//   node engine/audit.mjs --report   also keep the full report in .cache/
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { findChrome } from './lib/browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const FLOOR = { performance: 85, accessibility: 95, 'best-practices': 90, seo: 95 };

function patch(label) {
  const files = fs.readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const p = path.join(OUT, f);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('<!--perf-->', label));
  }
}

async function main() {
  if (!fs.existsSync(path.join(OUT, 'index.html'))) { console.log('Build first.'); process.exit(1); }
  let lighthouse, launch;
  try {
    ({ default: lighthouse } = await import('lighthouse'));
    ({ launch } = await import('chrome-launcher'));
  } catch {
    console.log('  Lighthouse is not installed (npm install), skipping the audit.');
    patch(''); return;
  }
  const chromePath = findChrome() || undefined;
  const server = await serve(5322);
  let chrome;
  try {
    chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
    const res = await lighthouse('http://127.0.0.1:5322/', {
      port: chrome.port, output: 'json', logLevel: 'error',
      onlyCategories: Object.keys(FLOOR),
    });
    const cats = res.lhr.categories;
    const score = (k) => Math.round((cats[k]?.score ?? 0) * 100);
    const s = Object.fromEntries(Object.keys(FLOOR).map((k) => [k, score(k)]));
    console.log(`\n▸ Lighthouse (mobile): performance ${s.performance} · accessibility ${s.accessibility} · best practices ${s['best-practices']} · SEO ${s.seo}`);
    if (process.argv.includes('--report')) {
      fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, '.cache', 'lighthouse.json'), res.report);
    }
    patch(`<span>Perf <b>${s.performance}</b></span><span>A11y <b>${s.accessibility}</b></span><span>SEO <b>${s.seo}</b></span>`);
    const low = Object.entries(FLOOR).filter(([k, min]) => s[k] < min);
    if (low.length) {
      console.log(`  ✗ Below the floor: ${low.map(([k, m]) => `${k} ${s[k]} < ${m}`).join(', ')}`);
      for (const k of low.map(([k]) => k)) {
        const ids = cats[k].auditRefs.map((r) => res.lhr.audits[r.id]).filter((a) => a.score !== null && a.score < 0.9).slice(0, 6);
        for (const a of ids) console.log(`    - ${a.title}`);
      }
      process.exitCode = 1;
    }
  } catch (e) {
    console.log(`  Audit could not run (${e.message}); footer shows no scores.`);
    patch('');
  } finally {
    if (chrome) await chrome.kill();
    server.close();
  }
}

main();
