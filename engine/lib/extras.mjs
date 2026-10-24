// Machine-readable files generated from the same content:
// sitemap, robots, RSS feeds, search index, web manifest, BibTeX, JSON-LD.
// © 2026 Jaeyong Rhee. All rights reserved.

import { esc, pick, fmtDate } from './text.mjs';
import { UI, SECTIONS } from './strings.mjs';
import { bibtex } from '../views/home.mjs';

export function sitemap(siteUrl, pages, iso) {
  const urls = pages.map((p) => `  <url><loc>${siteUrl}/${p.path}</loc><lastmod>${iso.slice(0, 10)}</lastmod>${p.alt != null ? `
    <xhtml:link rel="alternate" hreflang="${p.lang === 'en' ? 'ko' : 'en'}" href="${siteUrl}/${p.alt}"/>
    <xhtml:link rel="alternate" hreflang="${p.lang}" href="${siteUrl}/${p.path}"/>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export const robots = (siteUrl) => `User-agent: *\nAllow: /\nDisallow: /_print/\nDisallow: /preview/\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

export function feed(c, lang, siteUrl, iso) {
  const P = c.profile;
  const base = `${siteUrl}/${lang === 'ko' ? 'ko/' : ''}`;
  const toDate = (d) => new Date(`${d.length === 4 ? `${d}-01` : d}-01T00:00:00+09:00`).toUTCString();
  const items = c.newsFeed.slice(0, 30).map((n, i) => {
    const link = n.research ? `${base}research/${n.research}/` : `${base}#news`;
    return `  <item>
    <title>${esc(pick(n.title, lang))}</title>
    <link>${link}</link>
    <guid isPermaLink="false">${esc(`${n.date}-${(n.title.en || '').toLowerCase().replace(/\W+/g, '-')}`)}</guid>
    <pubDate>${toDate(n.date)}</pubDate>
    ${n.text ? `<description>${esc(pick(n.text, lang))}</description>` : ''}
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(pick(P.name, lang))}</title>
  <link>${base}</link>
  <atom:link href="${base}feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(pick(P.description, lang))}</description>
  <language>${lang === 'ko' ? 'ko-KR' : 'en-US'}</language>
  <lastBuildDate>${new Date(iso).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

/** Search index for the command palette. URLs are relative to the language home. */
export function searchIndex(c, lang) {
  const t = UI[lang];
  const out = [];
  for (const s of SECTIONS) out.push({ k: 'section', t: t.nav[s], u: `#${s}`, key: s });
  for (const r of c.research) out.push({ k: 'study', t: pick(r.title, lang), s: pick(r.full_title, lang), u: `research/${r.id}/`, x: (r.tags || []).concat(r.methods || []).join(' ') });
  for (const p of c.publications) out.push({ k: 'paper', t: pick(p.title, lang), s: pick(p.venue, lang), u: `#pub-${p.id}`, x: p.authors.join(' ') });
  for (const h of c.awards) out.push({ k: 'award', t: pick(h.title, lang), s: `${pick(h.org, lang)} · ${fmtDate(h.date, lang)}`, u: '#honors' });
  for (const h of c.scholarships) out.push({ k: 'scholarship', t: pick(h.title, lang), s: pick(h.org, lang), u: '#honors', tab: 'scholarships' });
  for (const a of c.activities) out.push({ k: 'activity', t: pick(a.title, lang), s: pick(a.org, lang), u: '#activities' });
  for (const a of c.certificates) out.push({ k: 'certificate', t: pick(a.title, lang), s: pick(a.org, lang), u: '#activities' });
  for (const n of c.newsFeed) out.push({ k: 'news', t: pick(n.title, lang), s: fmtDate(n.date, lang), u: '#news' });
  return JSON.stringify(out);
}

export function manifest(c, lang, prefix) {
  const P = c.profile;
  return JSON.stringify({
    name: pick(P.name, lang),
    short_name: lang === 'ko' ? '이재용' : 'J. Rhee',
    description: pick(P.description, lang),
    lang: lang === 'ko' ? 'ko-KR' : 'en-US',
    start_url: './',
    scope: prefix,
    display: 'standalone',
    background_color: '#070B12',
    theme_color: '#070B12',
    icons: [
      { src: `${prefix}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${prefix}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${prefix}icons/icon-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2);
}

export const bibFile = (c) => c.publications.map((p) => bibtex(p, c.profile.name_variants || [])).join('\n\n') + '\n';

export function personLd(c, lang, siteUrl) {
  const P = c.profile;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: pick(P.name, 'en'),
      alternateName: pick(P.name, 'ko'),
      url: siteUrl + '/',
      email: `mailto:${P.email}`,
      description: pick(P.description, lang),
      alumniOf: (P.education || []).filter((e) => !e.status).map((e) => ({ '@type': 'CollegeOrUniversity', name: pick(e.school, 'en') })),
      knowsAbout: ['Ocean engineering', 'Mechanics', 'Machine learning', 'Satellite remote sensing'],
      sameAs: Object.values(P.links || {}).filter(Boolean),
      award: c.awards.map((h) => pick(h.title, 'en')),
    },
  };
}

export function studyLd(c, r, lang, siteUrl) {
  const P = c.profile;
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: pick(r.title, lang),
    name: pick(r.full_title || r.title, lang),
    abstract: pick(r.summary, lang),
    inLanguage: lang,
    datePublished: r.date,
    keywords: (r.tags || []).concat(r.methods || []).join(', '),
    author: { '@type': 'Person', name: pick(P.name, 'en'), url: siteUrl + '/' },
    url: `${siteUrl}/${lang === 'ko' ? 'ko/' : ''}research/${r.id}/`,
  };
}
