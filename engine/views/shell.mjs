// Page frame shared by every page: <head>, the bridge (top bar), the wake
// (footer), overlays and the mobile keel bar.
// © 2026 Jaeyong Rhee. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { esc, pick } from '../lib/text.mjs';
import { UI, SECTIONS } from '../lib/strings.mjs';
import { glyphSprite, g } from '../lib/glyphs.mjs';

let markCache = null;
function marks(root) {
  if (markCache) return markCache;
  const read = (f) => fs.readFileSync(path.join(root, 'media/brand', f), 'utf8')
    .replace(/<\?xml[^>]*>/, '').replace(/id="oe-/g, 'id="oe-').trim();
  markCache = { pknu: read('pknu.svg'), oe: read('oe.svg') };
  return markCache;
}

/** Brand marks for the bridge: PKNU | Ocean Engineering now, KAIST | BSL after enrolment. */
export function brandMarks(ctx, prefix) {
  const { c } = ctx;
  if (c.profile.marks === 'kaist') {
    const k = ctx.brand;
    return `<span class="mark mark--wide" title="KAIST"><img class="for-light" src="${prefix}${k.kaistColor}" alt="KAIST" width="800" height="229"><img class="for-dark" src="${prefix}${k.kaistWhite}" alt="" width="800" height="229"></span>`
      + `<span class="mark-rule" aria-hidden="true"></span>`
      + `<span class="mark mark--wide" title="${esc(pick(c.profile.lab?.name, 'en'))}"><img class="for-light" src="${prefix}${k.bslColor}" alt="BSL" width="800" height="292"><img class="for-dark" src="${prefix}${k.bslWhite}" alt="" width="800" height="292"></span>`;
  }
  const m = marks(ctx.root);
  return `<span class="mark" title="Pukyong National University" role="img" aria-label="Pukyong National University">${m.pknu}</span>`
    + `<span class="mark-rule" aria-hidden="true"></span>`
    + `<span class="mark" title="Department of Ocean Engineering" role="img" aria-label="Department of Ocean Engineering">${m.oe}</span>`;
}

/* Pull request previews only: a thin bar above the bridge. Inline, so the live site's CSS is untouched. */
const PREVIEW_CSS = ':root{--preview-h:32px}html{scroll-padding-top:calc(var(--bridge-h) + var(--preview-h) + 16px)}body{padding-top:var(--preview-h)}'
  + '.preview-bar{position:fixed;inset:0 0 auto;z-index:70;height:var(--preview-h);display:flex;align-items:center;gap:12px;padding:0 var(--gutter);'
  + 'background:var(--surface-2);border-bottom:1px solid var(--accent-line);color:var(--ink-2);font:500 var(--fs-xs)/1 var(--mono);letter-spacing:.04em}'
  + '.preview-bar::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);flex:none}'
  + '.preview-bar a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--accent-line);text-underline-offset:3px}.preview-bar a:hover{color:var(--accent-ink)}'
  + '.preview-bar__live{margin-left:auto}.bridge,.page-home .bridge{top:var(--preview-h)}';

function previewBar(preview, lang) {
  const ko = lang === 'ko';
  return `<div class="preview-bar" role="note"><span>${ko ? '미리보기' : 'Preview'} · <a href="${esc(preview.url)}" rel="external">PR #${preview.number}</a></span>`
    + `<a class="preview-bar__live" href="${esc(preview.live)}" rel="external">${ko ? '실제 사이트' : 'Live site'} →</a></div>`;
}

export function shell(ctx, page) {
  const { c, lang, build, assets } = ctx;
  const t = UI[lang];
  const P = c.profile;
  const prefix = page.prefix;                       // relative path to the site root
  const home = page.isHome ? '' : prefix + (lang === 'ko' ? 'ko/' : '');
  const siteUrl = P.site.url.replace(/\/$/, '');
  const canonical = `${siteUrl}/${page.path}`;
  const altUrl = `${siteUrl}/${page.altPath}`;
  const enUrl = lang === 'en' ? canonical : altUrl;
  const koUrl = lang === 'ko' ? canonical : altUrl;
  const og = page.og ? `${siteUrl}/${page.og}` : `${siteUrl}/og/home-${lang}.png`;
  const name = pick(P.name, lang);

  const nav = SECTIONS.map((s) =>
    `<a href="${page.isHome ? '' : home}#${s}" data-spy="${s}">${esc(t.nav[s])}</a>`).join('');

  const head = `<!doctype html>
<html lang="${lang}" data-theme="dark" class="${page.cls || ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="author" content="${esc(pick(P.name, 'en'))}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#070B12" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F7F8FA" media="(prefers-color-scheme: light)">
${page.noindex || ctx.preview ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${canonical}">
${page.altPath != null ? `<link rel="alternate" hreflang="en" href="${enUrl}"><link rel="alternate" hreflang="ko" href="${koUrl}"><link rel="alternate" hreflang="x-default" href="${enUrl}">` : ''}
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:site_name" content="${esc(pick(P.name, lang))}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang === 'ko' ? 'ko_KR' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${prefix}favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="${prefix}icons/apple-touch-icon.png">
<link rel="manifest" href="${prefix}${lang === 'ko' ? 'ko/' : ''}site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(name)}" href="${prefix}${lang === 'ko' ? 'ko/' : ''}feed.xml">
<link rel="preload" href="${prefix}${assets.fontSans}" as="font" type="font/woff2" crossorigin>
<style>@font-face{font-family:"SUIT JR";src:url("${prefix}${assets.fontSans}") format("woff2");font-weight:100 900;font-display:swap}@font-face{font-family:"Geist Mono JR";src:url("${prefix}${assets.fontMono}") format("woff2");font-weight:100 900;font-display:swap}</style>
<link rel="stylesheet" href="${prefix}${assets.css}">${ctx.preview ? `\n<style>${PREVIEW_CSS}</style>` : ''}
<script>(function(){var d=document.documentElement,t;d.classList.add('js');if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('calm');try{t=localStorage.getItem('jr-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t;${page.isHome && lang === 'en' ? `try{if(localStorage.getItem('jr-lang')==='ko'&&!/[?&]lang=en/.test(location.search))location.replace('ko/'+location.hash)}catch(e){}` : ''}})();</script>
<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/*.pdf"}},{"not":{"selector_matches":"[rel~=external],[download]"}}]},"eagerness":"moderate"}]}</script>
${page.jsonld ? `<script type="application/ld+json">${JSON.stringify(page.jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>`;

  const bridge = `<header class="bridge" id="top">
  <div class="beam bridge__in">
    <a class="bridge__home" href="${page.isHome ? '#top' : home || './'}" aria-label="${esc(name)} — home">
      <span class="bridge__marks">${brandMarks(ctx, prefix)}</span>
      <span class="bridge__name">${esc(name)}</span>
    </a>
    <nav class="bridge__nav" aria-label="Sections">${nav}<span class="bridge__ink" aria-hidden="true"></span></nav>
    <div class="bridge__tools">
      <button class="probe" type="button" data-helm-open aria-label="${esc(t.search)}" aria-keyshortcuts="Control+K Meta+K /">
        ${g('search')}<span class="probe__label">${esc(t.search)}</span><kbd class="probe__kbd" data-mod>Ctrl K</kbd>
      </button>
      <a class="toggle toggle--lang" href="${prefix}${page.altPath ?? ''}" hreflang="${lang === 'en' ? 'ko' : 'en'}" lang="${lang === 'en' ? 'ko' : 'en'}" data-lang-switch="${lang === 'en' ? 'ko' : 'en'}" aria-label="${esc(t.langSwitch)}">${esc(t.langLabel)}</a>
      <button class="toggle" type="button" data-theme-toggle aria-label="${esc(t.theme)}">${g('moon', 'for-dark')}${g('sun', 'for-light')}</button>
    </div>
  </div>
</header>`;

  const updated = build.dateLabel[lang];
  const wake = `<footer class="wake">
  <div class="beam wake__in">
    <div class="wake__id">
      <span>© ${c.profile.site.since}${build.year > c.profile.site.since ? `–${build.year}` : ''} ${esc(pick(P.name, 'en'))}. ${esc(t.rights)}</span>
      <span class="wake__updated">${esc(t.updated)} <time datetime="${build.iso}">${esc(updated)}</time></span>
    </div>
    <div class="wake__links">
      <a href="${prefix}${lang === 'ko' ? 'ko/' : ''}cv.pdf" data-cv>${g('file')}${esc(t.cv)}</a>
      <a href="${prefix}${lang === 'ko' ? 'ko/' : ''}feed.xml">${g('rss')}${esc(t.feed)}</a>
      <button type="button" class="wake__keys" data-keys-open>${g('keys')}<span>?</span></button>
    </div>
    <p class="telemetry" aria-label="Build information">
      <span class="telemetry__dot" aria-hidden="true"></span>
      <span>${esc(t.build)} ${esc(build.number)}</span><span>${esc(build.sha)}</span><span>${esc(build.stamp)}</span><span data-weight>${esc(build.weight)}</span><!--perf-->
    </p>
  </div>
</footer>`;

  const keel = `<nav class="keel" aria-label="Sections">${SECTIONS.map((s) =>
    `<a href="${page.isHome ? '' : home}#${s}" data-spy="${s}">${esc(t.nav[s])}</a>`).join('')}</nav>`;

  const overlays = `<div class="helm" id="helm" hidden>
  <div class="helm__scrim" data-helm-close></div>
  <div class="helm__panel" role="dialog" aria-modal="true" aria-label="${esc(t.searchHint)}">
    <div class="helm__bar">${g('search')}<input class="helm__input" id="helm-input" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(t.searchHint)}" aria-controls="helm-list" aria-activedescendant="" role="combobox" aria-expanded="true"><kbd>Esc</kbd></div>
    <ul class="helm__list" id="helm-list" role="listbox"></ul>
    <p class="helm__empty" hidden>${esc(t.noMatch)}</p>
  </div>
</div>
<div class="sheet" id="keys" hidden>
  <div class="helm__scrim" data-keys-close></div>
  <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="keys-title">
    <div class="sheet__head"><h2 id="keys-title">${esc(t.keys.title)}</h2><button class="toggle" type="button" data-keys-close aria-label="${esc(t.keys.close)}">${g('x')}</button></div>
    <dl class="keymap">
      <div><dt><kbd data-mod>Ctrl K</kbd> <kbd>/</kbd></dt><dd>${esc(t.keys.open)}</dd></div>
      <div><dt><kbd>G</kbd> <kbd>E R H A N C</kbd></dt><dd>${esc(t.keys.go)}</dd></div>
      <div><dt><kbd>T</kbd></dt><dd>${esc(t.keys.theme)}</dd></div>
      <div><dt><kbd>L</kbd></dt><dd>${esc(t.keys.lang)}</dd></div>
      <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>${esc(t.keys.prevNext)}</dd></div>
      <div><dt><kbd>?</kbd></dt><dd>${esc(t.keys.help)}</dd></div>
      <div><dt><kbd>Esc</kbd></dt><dd>${esc(t.keys.close)}</dd></div>
    </dl>
  </div>
</div>
<div class="loupe" id="loupe" hidden><button class="toggle loupe__close" type="button" data-loupe-close aria-label="${esc(t.keys.close)}">${g('x')}</button><img alt=""><p class="loupe__cap"></p></div>
<div class="signal" id="signal" role="status" aria-live="polite"></div>`;

  const boot = {
    lang, prefix, home: page.isHome ? '' : home, page: page.kind,
    index: `${prefix}${lang === 'ko' ? 'ko/' : ''}search.json`,
    sw: page.noSw || ctx.preview ? '' : `${prefix}anchor.js`,
    email: P.email, github: P.links?.github || '',
    alt: page.altPath != null ? `${prefix}${page.altPath}` : '',
    cv: `${prefix}${lang === 'ko' ? 'ko/' : ''}cv.pdf`,
    feed: `${prefix}${lang === 'ko' ? 'ko/' : ''}feed.xml`,
    ui: {
      copied: t.copied, emailCopied: t.emailCopied, bibCopied: t.bibCopied, linkCopied: t.dive.linkCopied,
      showAll: t.showAll(0).replace(/0/, '{n}'), showLess: t.showLess,
      cmd: t.cmd, sections: Object.fromEntries(SECTIONS.map((s) => [s, t.nav[s]])),
    },
  };

  return `${head}
<body class="page-${page.kind}">
<a class="skip" href="#main">${esc(t.skip)}</a>${ctx.preview ? `\n${previewBar(ctx.preview, lang)}` : ''}
${glyphSprite()}
${bridge}
<main id="main" tabindex="-1">
${page.body}
</main>
${wake}
${keel}
${overlays}
<script id="boot" type="application/json">${JSON.stringify(boot).replace(/</g, '\\u003c')}</script>
<script src="${prefix}${assets.js}" defer></script>
${page.extraScripts || ''}
</body>
</html>
`;
}
