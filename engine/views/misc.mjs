// Small pages and print templates: 404, offline, CV (for PDF), share cards.
// © 2026 Jaeyong Rhee. All rights reserved.

import { esc, pick, fmtDate } from '../lib/text.mjs';
import { UI } from '../lib/strings.mjs';
import { g } from '../lib/glyphs.mjs';
import { coverSvg } from '../lib/cover.mjs';
import { emphasizeMe } from './home.mjs';

export function notFoundBody(ctx) {
  const t = UI[ctx.lang].notFound;
  return `<section class="void beam">
  <div class="void__art" aria-hidden="true">${coverSvg('404-depth', { w: 800, h: 450 })}</div>
  <p class="mono void__code">404 · −404 m</p>
  <h1>${esc(t.title)}</h1>
  <p>${esc(t.text)}</p>
  <p class="void__acts"><a class="act act--solid" href="/">${g('left')}${esc(t.home)}</a><a class="act" href="/ko/">${g('lang')}한국어</a></p>
</section>`;
}

export function offlineBody(ctx) {
  const t = UI[ctx.lang].offline;
  return `<section class="void beam">
  <p class="mono void__code">OFFLINE</p>
  <h1>${esc(t.title)}</h1>
  <p>${esc(t.text)}</p>
  <p class="void__acts"><a class="act act--solid" href="./">${g('left')}${esc(t.home)}</a></p>
</section>`;
}

/* ---------- CV (printed to PDF by the build) ---------- */
const CV_L = {
  en: { edu: 'Education', research: 'Research', pubs: 'Presentations & Publications', projects: 'Research Projects', awards: 'Awards', schol: 'Scholarships', acts: 'Activities', certs: 'Certificates', thesis: 'Thesis', advisor: 'Advisor', updated: 'Updated' },
  ko: { edu: '학력', research: '연구', pubs: '발표 및 논문', projects: '참여 과제', awards: '수상', schol: '장학', acts: '활동', certs: '자격·수료', thesis: '졸업논문', advisor: '지도교수', updated: '업데이트' },
};

export function cvHtml(ctx, fonts) {
  const { c, lang, build } = ctx; const L = CV_L[lang]; const P = c.profile;
  const row = (when, main, sub = '', note = '') => `<div class="r"><div class="w">${esc(when)}</div><div><div class="m">${main}</div>${sub ? `<div class="s">${sub}</div>` : ''}${note ? `<div class="n">${note}</div>` : ''}</div></div>`;
  const sec = (title, rows) => (rows.length ? `<section><h2>${esc(title)}</h2>${rows.join('')}</section>` : '');
  const edu = (P.education || []).map((e) => row(pick(e.period, lang),
    `<b>${esc(pick(e.school, lang))}</b> — ${esc(pick(e.degree, lang))}${e.status ? ` (${esc(pick(e.status, lang))})` : ''}`,
    [(e.badges || []).map((b) => esc(pick(b, lang))).join(' · '), e.thesis ? `${L.thesis}: ${esc(pick(e.thesis, lang))}` : ''].filter(Boolean).join('<br>'),
    e.advisor ? `${L.advisor}: ${esc(pick(e.advisor, lang))}` : ''));
  const res = c.research.map((r) => row(fmtDate(r.date, lang), `<b>${esc(pick(r.full_title || r.title, lang))}</b>`, esc(pick(r.summary, lang))));
  const pubs = c.publications.map((p) => row(fmtDate(p.date, lang), esc(pick(p.title, lang)),
    `${emphasizeMe(p.authors, P.name_variants || [])}<br><i>${esc(pick(p.venue, lang))}</i>`,
    [pick(p.format, lang), pick(p.award, lang), p.doi ? `doi:${p.doi}` : ''].filter(Boolean).map(esc).join(' · ')));
  const proj = c.projects.map((p) => row(pick(p.period, lang) || fmtDate(p.date, lang), esc(pick(p.title, lang)), esc(pick(p.funder, lang)), esc(pick(p.role, lang))));
  const aw = c.awards.map((h) => row(fmtDate(h.date, lang), `<b>${esc(pick(h.title, lang))}</b>`, esc(pick(h.org, lang)), h.for ? esc(pick(h.for, lang)) : ''));
  const sc = c.scholarships.map((h) => row(pick(h.period, lang) || fmtDate(h.date, lang), esc(pick(h.title, lang)), esc(pick(h.org, lang))));
  const ac = c.activities.map((a) => row(pick(a.period, lang) || fmtDate(a.date, lang), esc(pick(a.title, lang)), esc(pick(a.org, lang))));
  const ce = c.certificates.map((a) => row(fmtDate(a.date, lang), esc(pick(a.title, lang)), esc(pick(a.org, lang))));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>CV — ${esc(pick(P.name, 'en'))}</title>
<style>
@font-face{font-family:S;src:url("${fonts.sans}") format("woff2");font-weight:100 900}
@font-face{font-family:M;src:url("${fonts.mono}") format("woff2");font-weight:100 900}
@page{size:A4;margin:16mm 16mm 18mm}
*{box-sizing:border-box}body{margin:0;font:9.4pt/1.5 S,system-ui,sans-serif;color:#0B1220;word-break:keep-all}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.2pt solid #0B1220;padding-bottom:9pt;margin-bottom:6pt}
h1{font-size:22pt;line-height:1.1;margin:0;font-weight:700;letter-spacing:-.01em}h1 span{font-size:12pt;font-weight:500;color:#5B6676;margin-left:8pt}
.aff{margin:5pt 0 0;color:#2a3546}.ct{text-align:right;font:8.4pt/1.6 M,monospace;color:#2a3546}
h2{font:600 7.8pt/1 M,monospace;letter-spacing:.14em;text-transform:uppercase;color:#1F5FD6;margin:14pt 0 5pt;padding-bottom:4pt;border-bottom:.5pt solid #D5DBE5}
.r{display:grid;grid-template-columns:35mm 1fr;gap:0 5mm;padding:3.2pt 0;break-inside:avoid}.w{font:8.2pt/1.55 M,monospace;color:#5B6676}
.m b{font-weight:650}.s{color:#2a3546}.n{color:#5B6676;font-size:8.6pt}.me{font-weight:700;text-decoration:underline;text-underline-offset:2pt}
footer{margin-top:16pt;font:7.6pt M,monospace;color:#8B97A8}
</style></head><body>
<header><div><h1>${esc(pick(P.name, lang))}<span>${esc(pick(P.name, lang === 'en' ? 'ko' : 'en'))}</span></h1><p class="aff">${esc(pick(P.affiliation, lang))}</p></div>
<div class="ct">${esc(P.email)}<br>${esc(P.site.url.replace('https://', ''))}${P.links?.github ? `<br>${esc(P.links.github.replace('https://', ''))}` : ''}${P.links?.linkedin ? `<br>${esc(P.links.linkedin.replace('https://', ''))}` : ''}</div></header>
${sec(L.edu, edu)}${sec(L.research, res)}${sec(L.pubs, pubs)}${sec(L.projects, proj)}${sec(L.awards, aw)}${sec(L.schol, sc)}${sec(L.acts, ac)}${sec(L.certs, ce)}
<footer>${esc(L.updated)} ${esc(build.dateLabel[lang])} · ${esc(P.site.url.replace('https://', ''))}</footer>
</body></html>`;
}

/* ---------- share card (1200×630), screenshotted by the build ---------- */
export function ogHtml(ctx, { id, kicker, title, sub, fonts, marksSvg }) {
  const P = ctx.c.profile;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:S;src:url("${fonts.sans}") format("woff2");font-weight:100 900}
@font-face{font-family:M;src:url("${fonts.mono}") format("woff2");font-weight:100 900}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#070B12;color:#EEF2F7;font-family:S,system-ui,sans-serif;word-break:keep-all}
.art{position:absolute;inset:0;opacity:.95}.art svg{width:100%;height:100%}
.cv-bg{fill:#070B12}.cv-line{fill:none;stroke:#3D8BFF;stroke-opacity:.28;stroke-width:1.2}.cv-key{fill:none;stroke:#7FB2FF;stroke-opacity:.75;stroke-width:1.6}.cv-tick path{stroke:#8B97A8;stroke-opacity:.5}
.veil{position:absolute;inset:0;background:linear-gradient(90deg,#070B12 0%,rgba(7,11,18,.92) 48%,rgba(7,11,18,.35) 100%)}
.in{position:absolute;inset:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:16px;font:500 18px M,monospace;letter-spacing:.12em;text-transform:uppercase;color:#8B97A8}
.marks{display:flex;align-items:center;gap:14px;--pk-navy:#E8EEF8;--oe:#E8EEF8}.marks svg{height:44px;width:auto}.rule{width:1px;height:34px;background:#2a3446}
h1{font-size:${title.length > 48 ? 54 : 66}px;line-height:1.08;letter-spacing:-.02em;margin:0;max-width:820px;font-weight:700}
.sub{font-size:26px;color:#B7C2D3;margin:18px 0 0;max-width:820px;line-height:1.35}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font:500 20px M,monospace;color:#8B97A8}
.foot b{color:#3D8BFF;font-weight:500}
</style></head><body>
<div class="art">${coverFor(id)}</div><div class="veil"></div>
<div class="in">
  <div class="top"><span class="marks">${marksSvg}</span><span>${esc(kicker)}</span></div>
  <div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
  <div class="foot"><span>${esc(pick(P.name, 'en'))} · ${esc(pick(P.name, 'ko'))}</span><b>${esc(P.site.url.replace('https://', ''))}</b></div>
</div></body></html>`;
}
const coverFor = (id) => coverSvg(id, { w: 1200, h: 630 });
