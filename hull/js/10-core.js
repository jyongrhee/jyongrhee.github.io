/* Core runtime: theme, language, copy, toasts, section spy, folds, tabs,
   filters, image viewer, pointer glow, offline support. */
(function () {
  'use strict';
  var JR = (window.JR = window.JR || {});
  var root = document.documentElement;
  var boot = {};
  try { boot = JSON.parse(document.getElementById('boot').textContent); } catch (e) { /* static page */ }
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  JR.boot = boot; JR.$ = $; JR.$$ = $$; JR.calm = calm; JR.store = store;
  JR.typing = function (e) {
    var t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };

  /* modifier key label: ⌘ on Apple devices */
  var mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  $$('[data-mod]').forEach(function (k) { k.textContent = k.textContent.replace('Ctrl ', mac ? '⌘' : 'Ctrl '); });

  /* ---------- toast ---------- */
  var sig = $('#signal'), sigTimer = 0;
  JR.signal = function (msg) {
    if (!sig) return;
    sig.innerHTML = '<svg class="glyph" aria-hidden="true"><use href="#g-check"/></svg>';
    sig.appendChild(document.createTextNode(msg));
    sig.classList.add('is-on');
    clearTimeout(sigTimer);
    sigTimer = setTimeout(function () { sig.classList.remove('is-on'); }, 2200);
  };

  /* ---------- copy ---------- */
  JR.copy = function (text) {
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  };
  var MSG = { email: 'emailCopied', bib: 'bibCopied', link: 'linkCopied' };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    e.preventDefault();
    JR.copy(b.getAttribute('data-copy')).then(function (ok) {
      if (ok) JR.signal((boot.ui && boot.ui[MSG[b.dataset.copyMsg]]) || (boot.ui && boot.ui.copied) || 'Copied');
    });
  });

  /* ---------- theme (circular reveal from the button) ---------- */
  var metaThemes = $$('meta[name="theme-color"]');
  JR.setTheme = function (next, origin) {
    var apply = function () {
      root.dataset.theme = next;
      store.set('jr-theme', next);
      metaThemes.forEach(function (m) { m.setAttribute('content', next === 'dark' ? '#070B12' : '#F7F8FA'); });
      document.dispatchEvent(new CustomEvent('themechange'));
    };
    if (!document.startViewTransition || calm.matches) { apply(); return; }
    var r = origin ? origin.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theming');
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () { /* skipped */ });
    vt.finished.finally(function () { root.classList.remove('theming'); });
  };
  JR.toggleTheme = function (origin) { JR.setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', origin || $('[data-theme-toggle]')); };
  $$('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', function () { JR.toggleTheme(b); }); });
  /* follow the system setting until the visitor chooses */
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
    if (!store.get('jr-theme')) { root.dataset.theme = e.matches ? 'light' : 'dark'; document.dispatchEvent(new CustomEvent('themechange')); }
  });

  /* ---------- language ---------- */
  JR.switchLang = function () {
    var a = $('[data-lang-switch]');
    if (!a) return;
    store.set('jr-lang', a.dataset.langSwitch);
    location.href = a.getAttribute('href') + location.hash;
  };
  $$('[data-lang-switch]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); JR.switchLang();
    });
  });

  /* ---------- bridge: transparent over the hero, solid after; keel appears after the hero ---------- */
  var bridge = $('.bridge'), keel = $('.keel'), surface = $('.surface');
  if (surface && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var over = es[0].isIntersecting;
      bridge.classList.toggle('is-solid', !over);
      if (keel) keel.classList.toggle('is-up', !over);
    }, { rootMargin: '-' + (64 + 8) + 'px 0px 0px 0px', threshold: 0 }).observe($('.surface__grid') || surface);
  } else if (bridge) { bridge.classList.add('is-solid'); if (keel) keel.classList.add('is-up'); }

  /* ---------- section spy + sliding ink ---------- */
  var navLinks = $$('[data-spy]');
  var ink = $('.bridge__ink');
  var moveInk = function (a) {
    if (!ink) return;
    if (!a || !a.offsetParent) { ink.style.setProperty('--o', 0); return; }
    ink.style.setProperty('--x', a.offsetLeft + 12 + 'px');
    ink.style.setProperty('--w', a.offsetWidth - 24 + 'px');
    ink.style.setProperty('--o', 1);
  };
  JR.spy = function (id) {
    navLinks.forEach(function (a) { a.classList.toggle('is-on', a.dataset.spy === id); });
    moveInk($('.bridge__nav [data-spy="' + id + '"]'));
    var k = $('.keel [data-spy="' + id + '"]');
    if (k && k.parentNode.scrollWidth > k.parentNode.clientWidth) k.parentNode.scrollTo({ left: k.offsetLeft - 40, behavior: calm.matches ? 'auto' : 'smooth' });
  };
  if (boot.page === 'home') {
    var ids = navLinks.map(function (a) { return a.dataset.spy; }).filter(function (v, i, s) { return s.indexOf(v) === i; });
    var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var current, spyTick = false;
    var spyNow = function () {
      spyTick = false;
      var line = innerHeight * 0.38, on = null;
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= line) on = s.id; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) on = secs[secs.length - 1].id;
      if (on !== current) { current = on; JR.spy(on); }
    };
    addEventListener('scroll', function () { if (!spyTick) { spyTick = true; requestAnimationFrame(spyNow); } }, { passive: true });
    addEventListener('resize', function () { moveInk($('.bridge__nav .is-on')); });
    if (document.fonts) document.fonts.ready.then(spyNow); else spyNow();
  }

  /* ---------- folds ("show all") ---------- */
  $$('.fold[data-fold]').forEach(function (fold) {
    var n = fold.getAttribute('data-fold');
    fold.setAttribute('data-closed', '');
    var list = fold.closest('ol, ul, .bento');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'more'; btn.setAttribute('aria-expanded', 'false');
    var label = function (open) {
      btn.innerHTML = '';
      btn.appendChild(document.createTextNode(open ? boot.ui.showLess : boot.ui.showAll.replace('{n}', n)));
      btn.insertAdjacentHTML('beforeend', '<svg class="glyph" aria-hidden="true"><use href="#g-down"/></svg>');
    };
    label(false);
    btn.addEventListener('click', function () {
      var open = fold.hasAttribute('data-closed');
      if (open) fold.removeAttribute('data-closed'); else fold.setAttribute('data-closed', '');
      btn.setAttribute('aria-expanded', String(open));
      label(open);
      if (!open) list.scrollIntoView({ block: 'nearest' });
    });
    list.after(btn);
  });

  /* ---------- tabs (honors) ---------- */
  $$('[role="tablist"]').forEach(function (bar) {
    var tabs = $$('[role="tab"]', bar);
    var tInk = $('.tabs__ink', bar);
    var place = function (t) {
      if (!tInk) return;
      tInk.style.setProperty('--x', t.offsetLeft + 'px');
      tInk.style.setProperty('--w', t.offsetWidth + 'px');
    };
    var select = function (t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.removeAttribute('data-later'); p.hidden = !on; var more = p.nextElementSibling; if (more && more.classList.contains('more')) more.hidden = !on; }
      });
      place(t);
      if (focus) t.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
    addEventListener('resize', function () { place($('[aria-selected="true"]', bar)); });
    if (document.fonts) document.fonts.ready.then(function () { place($('[aria-selected="true"]', bar)); });
    JR.selectTab = function (id) { var t = document.getElementById('tab-' + id); if (t) select(t); };
  });

  /* ---------- research filters ---------- */
  $$('[data-filter]').forEach(function (f, _, all) {
    f.addEventListener('click', function () {
      var tag = f.dataset.filter;
      all.forEach(function (x) { var on = x === f; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      var run = function () {
        $$('.study').forEach(function (s) { s.classList.toggle('is-hidden', !!tag && (s.dataset.tags || '').split('|').indexOf(tag) < 0); });
      };
      if (document.startViewTransition && !calm.matches) document.startViewTransition(run); else run();
    });
  });

  /* ---------- loupe (image viewer) ---------- */
  var loupe = $('#loupe');
  JR.closeLoupe = function () { if (loupe && !loupe.hidden) { loupe.hidden = true; if (JR.lastFocus) JR.lastFocus.focus(); } };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-loupe]');
    if (b && loupe) {
      e.preventDefault();
      JR.lastFocus = b;
      $('img', loupe).src = b.dataset.loupe;
      $('img', loupe).alt = b.dataset.cap || '';
      $('.loupe__cap', loupe).textContent = b.dataset.cap || '';
      loupe.hidden = false;
      $('.loupe__close', loupe).focus();
      return;
    }
    if (loupe && !loupe.hidden && (e.target === loupe || e.target.closest('[data-loupe-close]') || e.target.tagName === 'IMG')) JR.closeLoupe();
  });

  /* ---------- pointer glow on panels ---------- */
  $$('.study, .medal, .logbook, .hop').forEach(function (el) { el.setAttribute('data-glow', ''); });
  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('[data-glow]');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- open the right tab when a link points into honors ---------- */
  if (location.hash === '#scholarships' && JR.selectTab) JR.selectTab('scholarships');

  /* ---------- offline support ---------- */
  if ('serviceWorker' in navigator && boot.sw && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addEventListener('load', function () { navigator.serviceWorker.register(boot.sw).catch(function () { /* not critical */ }); });
  }
})();
