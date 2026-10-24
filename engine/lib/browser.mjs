// Headless browser used at build time for share images and the CV PDF.
// Uses whatever Chromium-family browser is available; the build still
// succeeds without one (share images fall back, the PDF is skipped).
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';

const CANDIDATES = [
  process.env.CHROMIUM_PATH, process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

export function findChrome() {
  return CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

export async function launch() {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch { return null; }
  const exe = findChrome();
  const tries = exe ? [{ executablePath: exe }] : [{ channel: 'chrome' }, { channel: 'msedge' }, {}];
  for (const opt of tries) {
    try { return await chromium.launch({ ...opt, args: ['--font-render-hinting=none'] }); } catch { /* next */ }
  }
  return null;
}
