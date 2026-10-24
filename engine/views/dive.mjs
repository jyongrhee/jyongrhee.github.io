// Research page ("dive"): one page per study, with chapter contents,
// reading progress, a sticky figure stage that follows the chapters,
// linked papers/awards, and previous/next navigation.
// © 2026 Jaeyong Rhee. All rights reserved.

import { esc, pick, fmtDate } from '../lib/text.mjs';
import { UI } from '../lib/strings.mjs';
import { g } from '../lib/glyphs.mjs';
import { picture } from '../lib/media.mjs';
import { studyCover, paperRow } from './home.mjs';

function figure(ctx, fig, prefix, i, cls) {
  const { lang } = ctx; const t = UI[lang];
  const img = ctx.img(fig?.src);
  const cap = pick(fig?.caption, lang);
  const inner = img
    ? `<button class="fig__frame" type="button" data-loupe="${prefix}${img.fallback || img.svg}" data-cap="${esc(cap)}">${picture(img, prefix, { alt: cap, sizes: '(max-width: 1180px) 100vw, 40vw' })}</button>`
    : `<span class="fig__frame fig__frame--slot">${g('image')}<span>${esc(t.dive.figureSoon)}</span></span>`;
  return `<figure class="fig ${cls}" data-fig="${i}">${inner}<figcaption><span class="mono">${esc(t.dive.figure)} ${i + 1}</span>${esc(cap)}</figcaption></figure>`;
}

export function diveBody(ctx, r, prefix, { prev, next, homeHref }) {
  const { lang } = ctx; const t = UI[lang];
  const chapters = r.chapters || [];
  const total = chapters.length;
  const awards = r.honors.filter((h) => h.type === 'award');

  const toc = chapters.map((ch, i) => `<li><a href="#ch-${i + 1}" data-toc="${i}"><span class="mono">${i + 1}</span>${esc(pick(ch.title, lang))}</a></li>`).join('');
  const body = chapters.map((ch, i) => {
    const text = ch.text ? `<p>${esc(pick(ch.text, lang))}</p>` : '';
    const steps = ch.steps ? `<ol class="steps">${ch.steps.map((s) => `<li>${esc(pick(s, lang))}</li>`).join('')}</ol>` : '';
    return `<section class="chapter" id="ch-${i + 1}" data-chapter="${i}">
      <h2 class="chapter__title"><span class="chapter__no mono">${i + 1}/${total}</span>${esc(pick(ch.title, lang))}</h2>
      ${text}${steps}
      ${ch.figure ? figure(ctx, ch.figure, prefix, i, 'fig--inline') : ''}
    </section>`;
  }).join('');
  const stage = chapters.map((ch, i) => (ch.figure ? figure(ctx, ch.figure, prefix, i, 'fig--stage') : '')).join('');

  const recognition = awards.length ? `<section class="chapter chapter--extra" id="recognition">
      <h2 class="chapter__title">${esc(t.dive.awards)}</h2>
      <ul class="honor-list">${awards.map((h) => `<li>${g('laurel')}<div><p class="honor-list__t">${esc(pick(h.title, lang))}</p><p class="honor-list__o">${esc(pick(h.org, lang))} · ${esc(fmtDate(h.date, lang))}</p></div></li>`).join('')}</ul>
    </section>` : '';
  const papers = r.pubs.length ? `<section class="chapter chapter--extra" id="papers">
      <h2 class="chapter__title">${esc(t.dive.related)}</h2>
      <ol class="papers">${r.pubs.map((p) => paperRow(ctx, p, prefix, { studyLink: false })).join('')}</ol>
    </section>` : '';

  const methods = (r.methods || []).map((m) => `<li class="tag">${esc(m)}</li>`).join('');
  const h = r.honors.find((x) => x.type === 'award' && ['grand', 'top'].includes(x.tier)) || r.honors[0];
  const nav = (item, dir) => item ? `<a class="hop hop--${dir}" href="${ctx.studyHref(item.id)}" rel="${dir}" data-hop="${dir}">
      <span class="hop__dir mono">${dir === 'prev' ? g('left') : ''}${esc(dir === 'prev' ? t.dive.prev : t.dive.next)}${dir === 'next' ? g('right') : ''}</span>
      <span class="hop__title">${esc(pick(item.title, lang))}</span></a>` : '<span></span>';

  return `<article class="dive" data-study="${esc(r.id)}">
  <div class="progress" role="progressbar" aria-label="${esc(t.dive.progress)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
  <div class="beam">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref}#research" data-back>${g('left')}${esc(t.dive.back)}</a></nav>
  </div>
  <header class="beam dive__head">
    <div class="dive__cover" style="view-transition-name:cover-${esc(r.id)}">${studyCover(ctx, r, prefix, '(max-width: 900px) 100vw, 50vw')}${h ? `<span class="ribbon">${g('laurel')}${esc(pick(h.title, lang))}</span>` : ''}</div>
    <div class="dive__intro">
      <p class="dive__meta mono"><span>${esc(pick(r.kind, lang))}</span><time datetime="${esc(r.date)}">${esc(fmtDate(r.date, lang))}</time>${r.advisor ? `<span>${esc(t.advisor)} · ${esc(pick(r.advisor, lang))}</span>` : ''}</p>
      <h1 class="dive__title" style="view-transition-name:title-${esc(r.id)}">${esc(pick(r.title, lang))}</h1>
      ${r.full_title ? `<p class="dive__full">${esc(pick(r.full_title, lang))}</p>` : ''}
      <p class="dive__sum">${esc(pick(r.summary, lang))}</p>
      ${methods ? `<div class="dive__methods"><p class="mono">${esc(t.dive.methods)}</p><ul class="tags">${methods}</ul></div>` : ''}
      <p class="dive__acts"><button class="act" type="button" data-share>${g('link')}${esc(t.dive.share)}</button>${r.pubs.length ? `<a class="act" href="#papers">${g('paper')}${esc(t.dive.related)}</a>` : ''}</p>
    </div>
  </header>
  <div class="beam dive__grid${stage ? ' has-stage' : ''}">
    <nav class="dive__toc" aria-label="${esc(t.dive.contents)}">
      <p class="mono">${esc(t.dive.contents)}</p>
      <ol>${toc}${awards.length ? `<li><a href="#recognition" data-toc="x1">${g('laurel')}${esc(t.dive.awards)}</a></li>` : ''}${r.pubs.length ? `<li><a href="#papers" data-toc="x2">${g('paper')}${esc(t.dive.related)}</a></li>` : ''}</ol>
    </nav>
    <div class="dive__text">${body}${recognition}${papers}</div>
    ${stage ? `<aside class="dive__stage" aria-hidden="true"><div class="dive__stage-in">${stage}</div></aside>` : ''}
  </div>
  ${prev || next ? `<nav class="beam hops" aria-label="More research">${nav(prev, 'prev')}${nav(next, 'next')}</nav>` : ''}
</article>`;
}
