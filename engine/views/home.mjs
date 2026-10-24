// Home page: surface (hero), education, research, honors, activities | news, contact.
// © 2026 Jaeyong Rhee. All rights reserved.

import { esc, pick, fmtDate } from '../lib/text.mjs';
import { UI } from '../lib/strings.mjs';
import { g } from '../lib/glyphs.mjs';
import { picture } from '../lib/media.mjs';
import { coverSvg } from '../lib/cover.mjs';

const FOLD = { activities: 6, news: 4, honors: 8 };

export function emphasizeMe(authors, names) {
  return authors.map((a) => (names.includes(a) ? `<b class="me">${esc(a)}</b>` : esc(a))).join(', ');
}

/* ---------- surface (hero) ---------- */
function surface(ctx, prefix) {
  const { c, lang } = ctx; const t = UI[lang]; const P = c.profile; const H = P.hero || {};
  const other = lang === 'en' ? 'ko' : 'en';
  const photo = ctx.img(H.image);
  const portrait = ctx.img(P.portrait);
  const lines = P.tagline?.[lang] || [];
  const depth = H.depth && ctx.media.exists('media/hero-depth.png');

  const bg = photo
    ? picture(photo, prefix, { alt: '', sizes: '100vw', cls: 'surface__img', eager: true, attrs: depth ? 'data-depth-photo' : '' })
    : `<div class="surface__blank" aria-hidden="true"><span>${esc(t.heroPlaceholder)}</span><code>media/hero.jpg</code></div>`;

  const links = [
    `<li><a class="chip chip--link" href="mailto:${esc(P.email)}">${g('mail')}<span>${esc(P.email)}</span></a><button class="chip chip--icon" type="button" data-copy="${esc(P.email)}" data-copy-msg="email" aria-label="${esc(t.copyEmail)}">${g('copy')}</button></li>`,
    P.links?.github ? `<li><a class="chip chip--link" href="${esc(P.links.github)}" rel="external me">${g('github')}<span>GitHub</span></a></li>` : '',
    P.links?.linkedin
      ? `<li><a class="chip chip--link" href="${esc(P.links.linkedin)}" rel="external me">${g('linkedin')}<span>LinkedIn</span></a></li>`
      : `<li><span class="chip chip--off" title="${esc(t.linkedinSoon)}" aria-label="${esc(t.linkedinSoon)}">${g('linkedin')}<span>LinkedIn</span></span></li>`,
    P.links?.scholar ? `<li><a class="chip chip--link" href="${esc(P.links.scholar)}" rel="external me">${g('scholar')}<span>Scholar</span></a></li>` : '',
    P.links?.orcid ? `<li><a class="chip chip--link" href="${esc(P.links.orcid)}" rel="external me">${g('orcid')}<span>ORCID</span></a></li>` : '',
  ].join('');

  return `<section class="surface${photo ? '' : ' surface--blank'}" aria-labelledby="who">
  <div class="surface__photo"${depth ? ' data-depth' : ''}>${bg}</div>
  <div class="surface__veil" aria-hidden="true"></div>
  <div class="beam surface__in">
    <div class="hud" aria-hidden="true">
      ${pick(H.caption, lang) ? `<span class="hud__c hud__c--tl">${esc(pick(H.caption, lang))}</span>` : ''}
      ${H.coords ? `<span class="hud__c hud__c--tr">${esc(H.coords)}</span>` : ''}
      <span class="hud__c hud__c--bl"><span class="hud__line"></span>${esc(lang === 'ko' ? '아래로' : 'Scroll')}</span>
      ${H.date ? `<span class="hud__c hud__c--br">${esc(H.date)}</span>` : ''}
    </div>
    <div class="surface__grid">
      <figure class="portrait">
        ${portrait ? picture(portrait, prefix, { alt: t.portraitAlt, sizes: '(max-width: 760px) 60vw, 300px', cls: 'portrait__img', eager: true }) : `<span class="portrait__blank" aria-hidden="true">JR</span>`}
        <span class="portrait__tick portrait__tick--a" aria-hidden="true"></span><span class="portrait__tick portrait__tick--b" aria-hidden="true"></span>
      </figure>
      <div class="ident">
        <h1 class="ident__name" id="who">${esc(pick(P.name, lang))}<span class="ident__alt" lang="${other}">${esc(pick(P.name, other))}</span></h1>
        <p class="ident__aff">${esc(pick(P.affiliation, lang))}</p>
        <div class="sonar" data-lines="${esc(JSON.stringify(lines))}" aria-hidden="true"><span class="sonar__text">${esc(lines[0] || '')}</span><span class="sonar__caret"></span></div>
        <ul class="sonar-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <ul class="ident__links">${links}</ul>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- section head ---------- */
const head = (id, title, meta = '') =>
  `<header class="hold__head"><h2 id="h-${id}">${esc(title)}</h2>${meta ? `<span class="hold__meta">${esc(meta)}</span>` : ''}</header>`;

/* ---------- education ---------- */
function education(ctx, prefix) {
  const { c, lang } = ctx; const t = UI[lang]; const P = c.profile;
  const items = P.education || [];
  const logo = (k) => {
    if (k === 'kaist') return `<span class="entry__logo entry__logo--kaist"><img class="for-light" src="${prefix}${ctx.brand.kaistColor}" alt="KAIST" width="800" height="229" loading="lazy"><img class="for-dark" src="${prefix}${ctx.brand.kaistWhite}" alt="" width="800" height="229" loading="lazy"></span>`;
    if (k === 'pknu') return `<span class="entry__logo entry__logo--pknu" role="img" aria-label="Pukyong National University">${ctx.marks.pknu}</span>`;
    return '';
  };
  const lab = P.marks === 'kaist' && P.lab?.name
    ? `<p class="entry__line"><span class="entry__k">${esc(t.lab)}</span><span>${P.lab.url ? `<a href="${esc(P.lab.url)}" rel="external">${esc(pick(P.lab.name, lang))}</a>` : esc(pick(P.lab.name, lang))}</span><span class="entry__lablogo"><img class="for-light" src="${prefix}${ctx.brand.bslColor}" alt="" width="800" height="292" loading="lazy"><img class="for-dark" src="${prefix}${ctx.brand.bslWhite}" alt="" width="800" height="292" loading="lazy"></span></p>` : '';
  const rows = items.map((e, i) => {
    const now = !!e.status && P.marks !== 'kaist';
    const badges = (e.badges || []).map((b) => `<li class="tag tag--${esc(b.icon || 'plain')}">${g(b.icon === 'fast' ? 'fast' : 'laurel')}${esc(pick(b, lang))}</li>`).join('');
    const thesis = e.thesis ? `<p class="entry__line"><span class="entry__k">${esc(t.thesis)}</span><span>${e.thesis.research ? `<a class="entry__thesis" href="research/${esc(e.thesis.research)}/">${esc(pick(e.thesis, lang))}${g('right')}</a>` : esc(pick(e.thesis, lang))}</span></p>` : '';
    const adv = e.advisor ? `<p class="entry__line"><span class="entry__k">${esc(t.advisor)}</span><span>${esc(pick(e.advisor, lang))}</span></p>` : '';
    return `<li class="entry${now ? ' entry--next' : ''}">
      <span class="entry__when">${esc(pick(e.period, lang))}</span>
      <span class="entry__rail" aria-hidden="true"><span class="entry__dot"></span></span>
      <div class="entry__body">
        <h3 class="entry__school">${esc(pick(e.school, lang))}${now ? `<span class="entry__status">${esc(pick(e.status, lang))}</span>` : ''}</h3>
        <p class="entry__degree">${esc(pick(e.degree, lang))}</p>
        ${badges ? `<ul class="tags">${badges}</ul>` : ''}
        ${e.lab ? lab : ''}${thesis}${adv}
      </div>
      ${logo(e.logo)}
    </li>`;
  }).join('');
  return `<section class="hold" id="education" aria-labelledby="h-education"><div class="beam">
  ${head('education', t.nav.education, t.entries(items.length))}
  <ol class="logbook">${rows}</ol>
</div></section>`;
}

/* ---------- research ---------- */
export function studyCover(ctx, r, prefix, sizes) {
  const img = ctx.img(r.cover);
  return img ? picture(img, prefix, { alt: '', sizes, cls: 'study__img' }) : coverSvg(r.id, { title: '' });
}

function ribbon(r, lang) {
  const h = r.honors.find((x) => x.type === 'award' && ['grand', 'top'].includes(x.tier)) || r.honors[0];
  return h ? `<span class="ribbon">${g('laurel')}${esc(pick(h.title, lang))}</span>` : '';
}

function study(ctx, r, prefix, lead) {
  const { lang } = ctx; const t = UI[lang];
  const pub = r.pubs[0];
  const related = pub ? `<p class="study__rel">${g('paper')}<span>${esc(pick(pub.venue, lang))}${pub.award ? ` · ${esc(pick(pub.award, lang))}` : ''}</span></p>` : '';
  return `<a class="study${lead ? ' study--lead' : ''}" href="research/${esc(r.id)}/" data-tags="${esc((r.tags || []).join('|'))}">
    <span class="study__cover" style="view-transition-name:cover-${esc(r.id)}">${studyCover(ctx, r, prefix, lead ? '(max-width: 900px) 100vw, 55vw' : '(max-width: 900px) 100vw, 33vw')}${ribbon(r, lang)}</span>
    <span class="study__body">
      <span class="study__meta"><span>${esc(pick(r.kind, lang))}</span><time datetime="${esc(r.date)}">${esc(fmtDate(r.date, lang))}</time></span>
      <span class="study__title" style="view-transition-name:title-${esc(r.id)}">${esc(pick(r.title, lang))}</span>
      <span class="study__sum">${esc(pick(r.summary, lang))}</span>
      ${r.tags?.length ? `<span class="tags">${r.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</span>` : ''}
      ${related}
      <span class="study__go">${esc(t.research.read)}${g('right')}</span>
    </span>
  </a>`;
}

export function bibtex(p, profileNames) {
  const key = `${(p.authors[0] || 'anon').split(' ').at(-1).toLowerCase()}${(p.date || '').slice(0, 4)}${p.id.split('-')[0]}`;
  const kind = p.type === 'journal' ? 'article' : 'inproceedings';
  const venueKey = p.type === 'journal' ? 'journal' : 'booktitle';
  const f = [
    `  title = {${p.title.en || p.title.ko}}`,
    `  author = {${p.authors.join(' and ')}}`,
    `  ${venueKey} = {${p.venue.en || p.venue.ko}}`,
    `  year = {${(p.date || '').slice(0, 4)}}`,
    p.doi ? `  doi = {${p.doi}}` : '',
    p.url ? `  url = {${p.url}}` : '',
  ].filter(Boolean);
  return `@${kind}{${key},\n${f.join(',\n')}\n}`;
}

export function paperRow(ctx, p, prefix, { studyLink = true } = {}) {
  const { c, lang } = ctx; const t = UI[lang];
  const names = c.profile.name_variants || [];
  const link = p.doi ? `https://doi.org/${p.doi}` : p.url;
  const title = esc(pick(p.title, lang));
  const res = (u) => (u.startsWith('media/') ? prefix + u : u);
  const acts = [
    p.doi ? `<a class="act" href="https://doi.org/${esc(p.doi)}" rel="external">${g('link')}DOI</a>` : '',
    p.pdf ? `<a class="act" href="${esc(res(p.pdf))}">${g('paper')}PDF</a>` : '',
    p.slides ? `<a class="act" href="${esc(res(p.slides))}">${g('file')}Slides</a>` : '',
    `<button class="act" type="button" data-copy="${esc(bibtex(p, names))}" data-copy-msg="bib">${g('quote')}${esc(t.bibtex)}</button>`,
    studyLink && p.research ? `<a class="act" href="${ctx.studyHref(p.research)}">${g('right')}${esc(pick(c.research.find((r) => r.id === p.research)?.title, lang))}</a>` : '',
  ].join('');
  const cites = ctx.citations[p.doi] != null ? `<span class="tag tag--data">${esc(t.citedBy(ctx.citations[p.doi]))}</span>` : '';
  return `<li class="paper" id="pub-${esc(p.id)}">
    <time class="paper__when" datetime="${esc(p.date)}">${esc(fmtDate(p.date, lang))}</time>
    <div class="paper__body">
      <p class="paper__title">${link ? `<a href="${esc(link)}" rel="external">${title}</a>` : title}</p>
      <p class="paper__authors">${emphasizeMe(p.authors, names)}</p>
      <p class="paper__venue">${esc(pick(p.venue, lang))}</p>
      <p class="paper__tags">${p.format ? `<span class="tag">${esc(pick(p.format, lang))}</span>` : ''}${p.award ? `<span class="tag tag--award">${g('laurel')}${esc(pick(p.award, lang))}</span>` : ''}${cites}</p>
      <p class="paper__acts">${acts}</p>
    </div>
  </li>`;
}

function research(ctx, prefix) {
  const { c, lang } = ctx; const t = UI[lang];
  const list = c.research;
  const n = list.length;
  const mode = n <= 1 ? 'solo' : n === 2 ? 'duo' : 'fleet';
  const tags = [...new Set(list.flatMap((r) => r.tags || []))];
  const filters = mode === 'fleet' && tags.length > 1
    ? `<div class="filters" role="group" aria-label="Filter research"><button type="button" class="filter is-on" data-filter="" aria-pressed="true">${esc(t.research.all)}</button>${tags.map((x) => `<button type="button" class="filter" data-filter="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('')}</div>` : '';
  const cards = list.map((r, i) => study(ctx, r, prefix, i === 0 && mode !== 'duo')).join('');

  const groups = ['journal', 'international', 'domestic']
    .map((k) => [k, c.publications.filter((p) => p.type === k)])
    .filter(([, l]) => l.length)
    .map(([k, l]) => `<div class="papers__group"><h4 class="papers__kind">${esc(t.pubTypes[k])}<span>${l.length}</span></h4><ol class="papers">${l.map((p) => paperRow(ctx, p, prefix)).join('')}</ol></div>`).join('');
  const projects = c.projects.length ? `<div class="sub"><h3 class="sub__title">${esc(t.projects)}</h3><ol class="ledger">${c.projects.map((p) => `<li class="ledger__row"><span class="ledger__when">${esc(pick(p.period, lang) || fmtDate(p.date, lang))}</span><div><p class="ledger__title">${esc(pick(p.title, lang))}</p><p class="ledger__org">${esc(pick(p.funder, lang))}</p>${p.role ? `<p class="ledger__note">${esc(pick(p.role, lang))}</p>` : ''}</div></li>`).join('')}</ol></div>` : '';

  return `<section class="hold" id="research" aria-labelledby="h-research"><div class="beam">
  ${head('research', t.nav.research, t.research.studies(n))}
  ${filters}
  <div class="survey survey--${mode}">${cards}</div>
  <div class="hold__split">
    ${groups ? `<div class="sub"><h3 class="sub__title">${esc(t.papers)}</h3>${groups}</div>` : ''}
    ${projects}
  </div>
</div></section>`;
}

/* ---------- honors (bento) ---------- */
/* Bento widths for a 4-column grid that keep date order and leave no holes.
   Grand/top awards want 2 columns. When a wide tile does not fit in the row,
   the previous small tile grows instead (grand/top) or the tile shrinks. */
function spans(items) {
  const rank = { grand: 4, top: 3, excellence: 2, honor: 1 };
  const want = items.map((h) => (h.type === 'award' && rank[h.tier] >= 2 ? 2 : 1));
  const s = []; let row = [];
  const left = () => 4 - row.reduce((a, i) => a + s[i], 0);
  items.forEach((h, i) => {
    let w = want[i];
    if (w > left()) {
      const prev = row.filter((k) => s[k] === 1).at(-1);
      if (rank[h.tier] >= 3 && prev != null) { s[prev] += left(); row = []; }
      else w = left();
    }
    s[i] = w; row.push(i);
    if (left() === 0) row = [];
  });
  if (row.length && left() > 0) {
    const best = [...row].sort((a, b) => (rank[items[b].tier] || 0) - (rank[items[a].tier] || 0))[0];
    s[best] += left();
  }
  return s;
}

function medal(ctx, h, span, prefix) {
  const { lang } = ctx; const t = UI[lang];
  const img = ctx.img(h.image);
  const wide = span >= 2;
  const photo = img
    ? `<button class="medal__photo" type="button" data-loupe="${prefix}${img.fallback}" data-cap="${esc(pick(h.title, lang))}">${picture(img, prefix, { alt: pick(h.title, lang), sizes: wide ? '(max-width: 760px) 100vw, 40vw' : '(max-width: 760px) 100vw, 20vw' })}</button>`
    : wide ? `<span class="medal__photo medal__photo--slot" aria-hidden="true">${g('image')}<span>${esc(t.photoSlot)}</span></span>` : '';
  const tier = h.type === 'award'
    ? `<span class="medal__tier medal__tier--${esc(h.tier)}">${g('laurel')}${esc(t.tiers[h.tier])}</span>`
    : `<span class="medal__tier">${g('scroll')}${esc(t.scholarships)}</span>`;
  const forLine = h.for && pick(h.for, lang) ? `<p class="medal__for">${esc(pick(h.for, lang))}</p>` : '';
  const go = h.research ? `<a class="medal__go" href="research/${esc(h.research)}/">${g('right')}<span class="sr">${esc(pick(h.title, lang))}</span></a>`
    : h.pub ? `<a class="medal__go" href="#pub-${esc(h.pub.id)}">${g('right')}<span class="sr">${esc(pick(h.title, lang))}</span></a>` : '';
  return `<article class="medal${wide ? ' medal--wide' : ''}${span > 2 ? ` medal--w${span}` : ''}${img ? ' medal--photo' : ''}" data-tier="${esc(h.tier || 'scholarship')}">
    ${photo}
    <div class="medal__body">
      <p class="medal__meta"><time datetime="${esc(h.date)}">${esc(pick(h.period, lang) || fmtDate(h.date, lang))}</time>${tier}</p>
      <h3 class="medal__title">${esc(pick(h.title, lang))}</h3>
      <p class="medal__org">${esc(pick(h.org, lang))}</p>
      ${forLine}
    </div>
    ${go}
  </article>`;
}

function honors(ctx, prefix) {
  const { c, lang } = ctx; const t = UI[lang];
  const panel = (key, items) => {
    const sp = spans(items);
    const tiles = items.map((h, i) => medal(ctx, h, sp[i], prefix));
    const shown = tiles.slice(0, FOLD.honors).join('');
    const rest = tiles.slice(FOLD.honors).join('');
    return `<div class="bento" id="panel-${key}" role="tabpanel" aria-labelledby="tab-${key}"${key === 'scholarships' ? ' data-later' : ''}>
      ${shown}${rest ? `<div class="fold" data-fold="${tiles.length}">${rest}</div>` : ''}
    </div>`;
  };
  const meta = `${t.awards} ${c.awards.length} · ${t.scholarships} ${c.scholarships.length}`;
  return `<section class="hold" id="honors" aria-labelledby="h-honors"><div class="beam">
  ${head('honors', t.nav.honors, meta)}
  <div class="tabs" role="tablist" aria-label="${esc(t.nav.honors)}">
    <button class="tab" role="tab" id="tab-awards" aria-controls="panel-awards" aria-selected="true">${g('medal')}${esc(t.awards)}<span>${c.awards.length}</span></button>
    <button class="tab" role="tab" id="tab-scholarships" aria-controls="panel-scholarships" aria-selected="false" tabindex="-1">${g('scroll')}${esc(t.scholarships)}<span>${c.scholarships.length}</span></button>
    <span class="tabs__ink" aria-hidden="true"></span>
  </div>
  ${panel('awards', c.awards)}
  ${panel('scholarships', c.scholarships)}
</div></section>`;
}

/* ---------- activities | news ---------- */
function rowsWithFold(rows, limit) {
  if (rows.length <= limit) return rows.join('');
  return rows.slice(0, limit).join('') + `<li class="fold" data-fold="${rows.length}"><ol class="fold__list">${rows.slice(limit).join('')}</ol></li>`;
}

function crew(ctx) {
  const { c, lang } = ctx; const t = UI[lang];
  const acts = c.activities.map((a) => `<li class="ledger__row"><span class="ledger__when">${esc(pick(a.period, lang) || fmtDate(a.date, lang) || '—')}</span><div><p class="ledger__title">${esc(pick(a.title, lang))}</p><p class="ledger__org">${esc(pick(a.org, lang))}</p></div></li>`);
  const certs = c.certificates.map((a) => `<li class="ledger__row"><span class="ledger__when">${esc(fmtDate(a.date, lang))}</span><div><p class="ledger__title">${esc(pick(a.title, lang))}</p><p class="ledger__org">${esc(pick(a.org, lang))}</p></div></li>`);
  const news = c.newsFeed.map((n) => {
    const link = n.research ? ` <a class="ledger__go" href="research/${esc(n.research)}/">${g('right')}</a>` : '';
    return `<li class="ledger__row"><time class="ledger__when" datetime="${esc(n.date)}">${esc(fmtDate(n.date, lang))}</time><div><p class="ledger__title">${n.kind === 'honor' ? g('laurel', 'inline') : ''}${esc(pick(n.title, lang))}${link}</p>${n.text ? `<p class="ledger__org">${esc(pick(n.text, lang))}</p>` : ''}</div></li>`;
  });
  return `<div class="hold hold--pair"><div class="beam pair">
  <section id="activities" aria-labelledby="h-activities">
    ${head('activities', t.nav.activities, t.entries(acts.length))}
    <ol class="ledger">${rowsWithFold(acts, FOLD.activities)}</ol>
    ${certs.length ? `<div class="sub"><h3 class="sub__title">${esc(t.certificates)}</h3><ol class="ledger">${certs.join('')}</ol></div>` : ''}
  </section>
  <section id="news" aria-labelledby="h-news">
    ${head('news', t.nav.news, t.entries(news.length))}
    <ol class="ledger ledger--news">${rowsWithFold(news, FOLD.news)}</ol>
  </section>
</div></div>`;
}

/* ---------- contact ---------- */
function contact(ctx) {
  const { c, lang } = ctx; const t = UI[lang]; const P = c.profile; const L = P.location || {};
  const q = encodeURIComponent(L.map_query || '');
  const links = [
    P.links?.github ? `<li><a href="${esc(P.links.github)}" rel="external me">${g('github')}GitHub<span>${esc(P.links.github.replace('https://', ''))}</span></a></li>` : '',
    P.links?.linkedin ? `<li><a href="${esc(P.links.linkedin)}" rel="external me">${g('linkedin')}LinkedIn</a></li>` : `<li><span class="is-off">${g('linkedin')}LinkedIn<span>${esc(t.linkedinSoon)}</span></span></li>`,
    P.links?.scholar ? `<li><a href="${esc(P.links.scholar)}" rel="external me">${g('scholar')}Google Scholar</a></li>` : '',
    P.links?.orcid ? `<li><a href="${esc(P.links.orcid)}" rel="external me">${g('orcid')}ORCID</a></li>` : '',
  ].join('');
  return `<section class="hold" id="contact" aria-labelledby="h-contact"><div class="beam berth">
  <div class="berth__info">
    ${head('contact', t.nav.contact)}
    <p class="berth__k">${esc(t.email)}</p>
    <p class="berth__mail"><a href="mailto:${esc(P.email)}">${esc(P.email)}</a><button class="chip chip--icon" type="button" data-copy="${esc(P.email)}" data-copy-msg="email" aria-label="${esc(t.copyEmail)}">${g('copy')}</button></p>
    <p class="berth__k">${esc(t.elsewhere)}</p>
    <ul class="berth__links">${links}</ul>
    <p class="berth__k">${esc(t.address)}</p>
    <address class="berth__addr"><strong>${esc(pick(L.name, lang))}</strong><br>${esc(pick(L.address, lang))}<br><span class="mono">${esc(L.coords || '')}</span></address>
  </div>
  <figure class="berth__map">
    <iframe title="${esc(t.mapTitle)}" src="https://maps.google.com/maps?q=${q}&amp;z=16&amp;hl=${lang}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    <figcaption><a href="https://www.google.com/maps/search/?api=1&amp;query=${q}" rel="external">${g('pin')}${esc(t.openMap)}${g('out')}</a></figcaption>
  </figure>
</div></section>`;
}

export function homeBody(ctx, prefix) {
  return [surface(ctx, prefix), education(ctx, prefix), research(ctx, prefix), honors(ctx, prefix), crew(ctx), contact(ctx)].join('\n');
}
