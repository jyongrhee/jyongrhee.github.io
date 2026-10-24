#!/usr/bin/env node
// Serves _site/ locally (used by the preview script and the audit).
//   node engine/serve.mjs [port]
// © 2026 Jaeyong Rhee. All rights reserved.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.bib': 'text/plain; charset=utf-8',
};

export function serve(port = 5321) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403).end(); return; }
    let code = 200;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (fs.existsSync(path.join(file, 'index.html'))) { res.writeHead(301, { Location: p + '/' }).end(); return; }
      code = 404; file = path.join(ROOT, '404.html');
    }
    res.writeHead(code, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!fs.existsSync(ROOT)) { console.log('Nothing to serve yet — run the build first.'); process.exit(1); }
  const port = Number(process.argv[2]) || 5321;
  serve(port).then(() => console.log(`\n  Preview: http://localhost:${port}/   (Ctrl+C to stop)\n`));
}
