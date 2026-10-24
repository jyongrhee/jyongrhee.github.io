// Loads content/*.json, checks it, and links items to each other.
// Every problem is reported with the file and the item it belongs to.
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { byDateDesc } from './text.mjs';

const FILES = ['profile', 'research', 'publications', 'projects', 'honors', 'activities', 'news'];
const DATE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
const TIERS = ['grand', 'top', 'excellence', 'honor'];
const PUB_TYPES = ['journal', 'international', 'domestic'];

/* Patterns that must never be published. Each has a name for the report. */
const PRIVATE = [
  ['phone number', /(?<!\d)(?:\+?82[-\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/],
  ['resident registration number', /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/],
  ['student / service ID', /(?<!\d)(?:19|20)\d{7}(?!\d)/],
  ['card or account number', /(?<!\d)\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{1,4}(?!\d)/],
  ['date of birth', /\b(born|date of birth|DOB)\b|생년월일|출생/i],
  ['scholarship amount', /(?:₩|KRW|\$)\s?\d|(?:\d[\d,]*)\s?(?:만\s?원|원\b|won\b)/i],
];

export class Report {
  constructor() { this.errors = []; this.warnings = []; this.notes = []; }
  error(where, msg) { this.errors.push(`${where}: ${msg}`); }
  warn(where, msg) { this.warnings.push(`${where}: ${msg}`); }
  note(msg) { this.notes.push(msg); }
  print(log = console.log) {
    for (const n of this.notes) log(`  · ${n}`);
    for (const w of this.warnings) log(`  ! ${w}`);
    for (const e of this.errors) log(`  ✗ ${e}`);
    log(`  ${this.errors.length} error(s), ${this.warnings.length} warning(s)`);
  }
}

function readJson(root, name, report) {
  const file = path.join(root, 'content', `${name}.json`);
  if (!fs.existsSync(file)) { report.error(`content/${name}.json`, 'file is missing'); return null; }
  const raw = fs.readFileSync(file, 'utf8');
  try { return JSON.parse(raw); } catch (e) {
    const m = /position (\d+)/.exec(e.message);
    let where = '';
    if (m) { const pos = Number(m[1]); const line = raw.slice(0, pos).split('\n').length; where = ` (line ${line})`; }
    report.error(`content/${name}.json${where}`, `not valid JSON — ${e.message}`);
    return null;
  }
}

/** Walk every string in a value, calling fn(string, pathLabel). */
function walkStrings(v, label, fn) {
  if (typeof v === 'string') fn(v, label);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, `${label}[${i}]`, fn));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, `${label}.${k}`, fn);
}

export function loadContent(root, report = new Report()) {
  const c = {};
  for (const f of FILES) c[f] = readJson(root, f, report) ?? (f === 'profile' ? {} : []);
  if (report.errors.length) return { content: c, report };

  const P = c.profile;
  const where = (file, i, item) => `${file}[${i}]${item?.id ? ` "${item.id}"` : item?.title?.en ? ` "${String(item.title.en).slice(0, 40)}"` : ''}`;

  const both = (w, field, name, required = true) => {
    if (field == null || (typeof field === 'object' && !field.en && !field.ko)) {
      if (required) report.error(w, `${name} is missing`);
      return;
    }
    if (typeof field !== 'object') { report.error(w, `${name} must be { "en": "...", "ko": "..." }`); return; }
    if (!field.en) report.warn(w, `${name}.en is empty (English page will show Korean)`);
    if (!field.ko) report.warn(w, `${name}.ko is empty (Korean page will show English)`);
  };
  const date = (w, d, required = true) => {
    if (!d) { if (required) report.error(w, 'date is missing'); else report.warn(w, 'date is empty (shown without a date)'); return; }
    if (!DATE.test(d)) report.error(w, `date "${d}" must be YYYY or YYYY-MM`);
  };
  const image = (w, src, required = false) => {
    if (!src) return;
    if (/^https?:/.test(src)) { report.error(w, `image "${src}" must be a file in media/, not a web link`); return; }
    if (!fs.existsSync(path.join(root, src))) {
      if (required) report.error(w, `image "${src}" does not exist`);
      else report.warn(w, `image "${src}" does not exist yet (a placeholder is shown)`);
    }
  };
  const url = (w, u, name) => { if (u && !/^https:\/\/[^\s]+$/.test(u)) report.error(w, `${name} "${u}" must start with https://`); };

  /* profile */
  both('profile', P.name, 'name');
  both('profile', P.affiliation, 'affiliation');
  if (!P.site?.url) report.error('profile', 'site.url is missing');
  if (!['pknu', 'kaist'].includes(P.marks)) report.error('profile', `marks must be "pknu" or "kaist" (got "${P.marks}")`);
  if (!Array.isArray(P.tagline?.en) || !Array.isArray(P.tagline?.ko)) report.error('profile', 'tagline must have en and ko lists');
  else if (P.tagline.en.length !== P.tagline.ko.length) report.warn('profile', 'tagline en and ko have a different number of lines');
  if (P.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(P.email)) report.error('profile', `email "${P.email}" looks wrong`);
  for (const [k, u] of Object.entries(P.links || {})) url('profile.links', u, k);
  image('profile', P.portrait); image('profile.hero', P.hero?.image);
  if (P.hero?.depth && !fs.existsSync(path.join(root, 'media/hero-depth.png'))) report.warn('profile.hero', 'depth is on but media/hero-depth.png is missing (the photo is shown flat)');
  (P.education || []).forEach((e, i) => {
    const w = `profile.education[${i}]`;
    both(w, e.school, 'school'); both(w, e.degree, 'degree'); both(w, e.period, 'period');
    if (e.thesis?.research && !c.research.some((r) => r.id === e.thesis.research)) report.error(w, `thesis.research "${e.thesis.research}" is not an id in research.json`);
  });

  /* research */
  const ids = new Set();
  c.research.forEach((r, i) => {
    const w = where('research', i, r);
    if (!r.id || !ID.test(r.id)) report.error(w, 'id is missing or not lowercase-with-dashes (it becomes the page address)');
    else if (ids.has(r.id)) report.error(w, `id "${r.id}" is used twice`); else ids.add(r.id);
    both(w, r.title, 'title'); both(w, r.summary, 'summary'); date(w, r.date);
    image(w, r.cover);
    (r.chapters || []).forEach((ch, j) => {
      both(`${w}.chapters[${j}]`, ch.title, 'title');
      if (!ch.text && !ch.steps) report.error(`${w}.chapters[${j}]`, 'needs text or steps');
      image(`${w}.chapters[${j}]`, ch.figure?.src);
    });
  });

  /* publications */
  const pubIds = new Set();
  c.publications.forEach((p, i) => {
    const w = where('publications', i, p);
    if (!p.id || !ID.test(p.id)) report.error(w, 'id is missing or not lowercase-with-dashes');
    else if (pubIds.has(p.id)) report.error(w, `id "${p.id}" is used twice`); else pubIds.add(p.id);
    if (!PUB_TYPES.includes(p.type)) report.error(w, `type must be one of ${PUB_TYPES.join(', ')}`);
    both(w, p.title, 'title'); both(w, p.venue, 'venue'); date(w, p.date);
    if (!Array.isArray(p.authors) || !p.authors.length) report.error(w, 'authors list is empty');
    if (p.doi && !/^10\.\d{4,9}\/\S+$/.test(p.doi)) report.error(w, `doi "${p.doi}" should look like 10.xxxx/xxxx (no https://doi.org/)`);
    for (const k of ['url', 'pdf', 'slides']) if (p[k] && !p[k].startsWith('media/')) url(w, p[k], k);
    if (p.research && !ids.has(p.research)) report.error(w, `research "${p.research}" is not an id in research.json`);
  });

  /* projects */
  c.projects.forEach((p, i) => { const w = where('projects', i, p); both(w, p.title, 'title'); date(w, p.date); });

  /* honors */
  c.honors.forEach((h, i) => {
    const w = where('honors', i, h);
    if (!['award', 'scholarship'].includes(h.type)) report.error(w, 'type must be "award" or "scholarship"');
    if (h.type === 'award' && !TIERS.includes(h.tier)) report.error(w, `tier must be one of ${TIERS.join(', ')}`);
    both(w, h.title, 'title'); both(w, h.org, 'org'); date(w, h.date); image(w, h.image);
    if (h.research && !ids.has(h.research)) report.error(w, `research "${h.research}" is not an id in research.json`);
    if (h.publication && !pubIds.has(h.publication)) report.error(w, `publication "${h.publication}" is not an id in publications.json`);
  });
  matchHonorPhotos(root, c.honors, report);

  /* activities */
  c.activities.forEach((a, i) => {
    const w = where('activities', i, a);
    if (!['activity', 'certificate'].includes(a.type)) report.error(w, 'type must be "activity" or "certificate"');
    both(w, a.title, 'title'); both(w, a.org, 'org'); date(w, a.date, a.type === 'certificate'); image(w, a.image);
  });

  /* news */
  c.news.forEach((n, i) => { const w = where('news', i, n); both(w, n.title, 'title'); date(w, n.date); image(w, n.image); });

  /* privacy scan over every string in every file */
  const allowedEmail = (P.email || '').toLowerCase();
  for (const f of FILES) {
    walkStrings(c[f], `content/${f}.json`, (s, label) => {
      if (/^(media\/|https:\/\/)/.test(s)) return;
      for (const [name, re] of PRIVATE) if (re.test(s)) report.error(label, `looks like a ${name} — remove it before publishing ("${s.slice(0, 60)}")`);
      for (const m of s.match(/[^@\s"']+@[^@\s"']+\.[a-z]{2,}/gi) || []) {
        if (m.toLowerCase() !== allowedEmail) report.error(label, `email address "${m}" is not the public one in profile.email`);
      }
    });
  }

  return { content: link(c), report };
}

/* Award and scholarship photos found by file name: media/honors/ (awards) and
   media/scholarships/ (scholarships), named <date>-<word>.<ext>, e.g.
   2026-07-thesis.jpg. The word picks the item when several share the date;
   it is compared with the words of title.en and org.en, acronyms in brackets
   and the initials of each name (Korea Leadership Development Foundation →
   kldf). An image path written in honors.json always wins. */
const PHOTO_DIRS = { award: 'media/honors', scholarship: 'media/scholarships' };
const PHOTO = /^(\d{4}(?:-(?:0[1-9]|1[0-2]))?)-([a-z0-9]+)\.(jpe?g|png|webp|avif|heic|heif|tiff?|svg)$/i;
const SMALL = new Set(['of', 'and', 'the', 'for', 'in', 'at', 'on', 'a', 'an']);

function honorWords(h) {
  const words = new Set();
  for (const s of [h.title?.en, h.org?.en].filter(Boolean)) {
    for (const w of s.toLowerCase().match(/[a-z0-9]+/g) || []) words.add(w);
    for (const part of [s, ...s.split(/[,()]/)]) {
      const caps = part.replace(/\([^)]*\)/g, ' ').split(/[^A-Za-z0-9.'’]+/).filter((w) => w && !SMALL.has(w.toLowerCase()) && /^[A-Z0-9]/.test(w));
      if (caps.length > 1) words.add(caps.map((w) => w[0]).join('').toLowerCase());
    }
  }
  return words;
}

function matchHonorPhotos(root, honors, report) {
  const label = (h) => `honors "${String(h.title?.en || h.date).slice(0, 50)}"`;
  const named = new Set(honors.map((h) => h.image).filter(Boolean));
  const found = new Map();   // item → photos
  for (const [type, dir] of Object.entries(PHOTO_DIRS)) {
    let files = [];
    try { files = fs.readdirSync(path.join(root, dir)).filter((f) => !f.startsWith('.')).sort(); } catch { continue; }
    for (const f of files) {
      const src = `${dir}/${f}`;
      if (named.has(src) || !fs.statSync(path.join(root, src)).isFile()) continue;
      const m = PHOTO.exec(f);
      if (!m) { report.warn(src, 'name must be <YYYY or YYYY-MM>-<word>.jpg (e.g. 2026-07-thesis.jpg); not linked'); continue; }
      const [, date, word] = m;
      const sameDate = honors.filter((h) => h.type === type && !h.image && h.date && (h.date === date || h.date.startsWith(`${date}-`)));
      const byWord = sameDate.filter((h) => honorWords(h).has(word.toLowerCase()));
      let hit = null;
      if (byWord.length === 1) hit = byWord[0];
      else if (byWord.length > 1) report.warn(src, `"${word}" fits ${byWord.length} ${type}s dated ${date} (${byWord.map(label).join(', ')}); use a word only one of them has. Not linked`);
      else if (sameDate.length === 1) { hit = sameDate[0]; report.warn(src, `"${word}" is not in the title or organisation, linked to the only ${type} dated ${date}`); }
      else if (sameDate.length > 1) report.warn(src, `no ${type} dated ${date} has the word "${word}"; not linked`);
      else report.warn(src, `no ${type} without an image is dated ${date}; not linked`);
      if (hit) found.set(hit, [...(found.get(hit) || []), src]);
    }
  }
  for (const [h, srcs] of found) {
    h.image = srcs[0];
    report.note(`photo ${srcs[0]} → ${label(h)}`);
    if (srcs.length > 1) report.warn(label(h), `several photos match (${srcs.join(', ')}); using ${srcs[0]}`);
  }
}

/* Derive cross-links so views never search for them again. */
function link(c) {
  const research = [...c.research].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || byDateDesc(a, b));
  for (const r of research) {
    r.pubs = c.publications.filter((p) => p.research === r.id).sort(byDateDesc);
    r.honors = c.honors.filter((h) => h.research === r.id || (h.publication && r.pubs.some((p) => p.id === h.publication))).sort(byDateDesc);
  }
  const pubById = Object.fromEntries(c.publications.map((p) => [p.id, p]));
  for (const h of c.honors) if (h.publication) h.pub = pubById[h.publication];
  const awards = c.honors.filter((h) => h.type === 'award').sort(byDateDesc);
  const scholarships = c.honors.filter((h) => h.type === 'scholarship').sort(byDateDesc);
  const activities = c.activities.filter((a) => a.type === 'activity');
  const certificates = c.activities.filter((a) => a.type === 'certificate').sort(byDateDesc);
  const news = [
    ...c.news.map((n) => ({ ...n, kind: 'news' })),
    ...c.honors.filter((h) => h.news).map((h) => ({ date: h.date, title: h.title, text: h.org, kind: 'honor', research: h.research })),
  ].sort(byDateDesc);
  const publications = [...c.publications].sort(byDateDesc);
  return { ...c, research, publications, awards, scholarships, activities, certificates, newsFeed: news };
}
