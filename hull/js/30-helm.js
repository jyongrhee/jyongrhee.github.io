/* Helm: command palette (⌘K / Ctrl K / "/") and keyboard shortcuts.
   Searches every item on the site, including Korean initial-consonant
   search (ㅂㅅㅅ finds 빈산소). */
(function () {
  'use strict';
  var JR = window.JR, boot = JR.boot, $ = JR.$, $$ = JR.$$;
  var helm = $('#helm'), input = $('#helm-input'), list = $('#helm-list'), empty = $('.helm__empty', helm);
  var keys = $('#keys');
  if (!helm) return;
  var ui = boot.ui || {}, cmd = ui.cmd || {};
  var index = null, items = [], sel = 0, lastFocus = null;

  var ICON = { section: 'hash', study: 'wave', paper: 'paper', award: 'medal', scholarship: 'scroll', activity: 'right', certificate: 'check', news: 'rss', action: 'cmd' };
  var GROUP = { section: cmd.sections, study: cmd.studies, action: cmd.actions };

  /* ---- Korean initial consonants ---- */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var initials = function (s) {
    var o = '';
    for (var i = 0; i < s.length; i++) { var p = s.charCodeAt(i) - 0xac00; o += p >= 0 && p < 11172 ? CHO[Math.floor(p / 588)] : s[i]; }
    return o;
  };
  var onlyJamo = /^[ㄱ-ㅎ\s]+$/;
  var norm = function (s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); };

  var actions = function () {
    var a = [
      { k: 'action', t: cmd.copyEmail, s: boot.email, run: function () { JR.copy(boot.email).then(function () { JR.signal(ui.emailCopied); }); } },
      { k: 'action', t: cmd.theme, s: 'T', run: function () { JR.toggleTheme(); } },
    ];
    if (boot.alt) a.push({ k: 'action', t: cmd.lang, s: 'L', run: JR.switchLang });
    a.push({ k: 'action', t: cmd.cv, s: 'PDF', run: function () { location.href = boot.cv; } });
    if (boot.github) a.push({ k: 'action', t: cmd.github, s: boot.github.replace('https://', ''), run: function () { window.open(boot.github, '_blank', 'noopener'); } });
    a.push({ k: 'action', t: cmd.feed, s: 'RSS', run: function () { location.href = boot.feed; } });
    a.push({ k: 'action', t: cmd.keys, s: '?', run: openKeys });
    return a;
  };

  var load = function () {
    if (index) return Promise.resolve(index);
    return fetch(boot.index).then(function (r) { return r.json(); }).catch(function () { return []; })
      .then(function (d) {
        index = d.concat(actions()).map(function (x) {
          x.n = norm(x.t); x.ns = norm(x.s); x.nx = norm(x.x); x.i = initials(x.n);
          return x;
        });
        return index;
      });
  };

  var score = function (x, q) {
    if (!q) return x.k === 'section' ? 3 : x.k === 'study' ? 2 : x.k === 'action' ? 1 : 0;
    var p = x.n.indexOf(q);
    if (p === 0) return 100;
    if (p > 0) return x.n[p - 1] === ' ' ? 80 : 60;
    if (onlyJamo.test(q) && x.i.replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) >= 0) return 50;
    if (x.ns.indexOf(q) >= 0) return 30;
    if (x.nx.indexOf(q) >= 0) return 20;
    var words = q.split(' ');
    if (words.length > 1 && words.every(function (w) { return (x.n + ' ' + x.ns + ' ' + x.nx).indexOf(w) >= 0; })) return 15;
    return 0;
  };

  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var mark = function (text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  };

  var render = function () {
    var q = norm(input.value);
    var ranked = index.map(function (x) { return { x: x, s: score(x, q) }; })
      .filter(function (r) { return q ? r.s > 0 : r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
    if (!q) ranked = ranked.filter(function (r) { return ['section', 'study', 'action'].indexOf(r.x.k) >= 0; })
      .sort(function (a, b) { return ['section', 'study', 'action'].indexOf(a.x.k) - ['section', 'study', 'action'].indexOf(b.x.k); });
    items = ranked.slice(0, 40).map(function (r) { return r.x; });
    var html = '', last = '';
    items.forEach(function (x, i) {
      var g = q ? '' : GROUP[x.k] || '';
      if (g && g !== last) { html += '<li class="helm__group" role="presentation">' + esc(g) + '</li>'; last = g; }
      html += '<li class="helm__item" role="option" id="helm-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">'
        + '<svg class="glyph" aria-hidden="true"><use href="#g-' + (ICON[x.k] || 'right') + '"/></svg>'
        + '<span><b>' + mark(x.t, q) + '</b>' + (x.s ? '<small>' + esc(x.s) + '</small>' : '') + '</span><kbd>↵</kbd></li>';
    });
    list.innerHTML = html;
    empty.hidden = items.length > 0;
    input.setAttribute('aria-activedescendant', items.length ? 'helm-' + sel : '');
  };

  var select = function (i) {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    $$('.helm__item', list).forEach(function (li) { li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel)); });
    var cur = $('#helm-' + sel);
    if (cur) cur.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'helm-' + sel);
  };

  var go = function (x) {
    close();
    if (x.run) { x.run(); return; }
    var u = x.u || '';
    if (u.charAt(0) === '#') {
      if (boot.page === 'home') {
        if (x.tab && JR.selectTab) JR.selectTab(x.tab);
        else if (x.k === 'award' && JR.selectTab) JR.selectTab('awards');
        var t = document.getElementById(u.slice(1));
        if (t) { t.scrollIntoView({ behavior: JR.calm.matches ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', u); }
        return;
      }
      location.href = (boot.home || './') + u;
      return;
    }
    location.href = (boot.home || '') + u;
  };

  function open() {
    if (!helm.hidden) return;
    lastFocus = document.activeElement;
    helm.hidden = false;
    input.value = ''; sel = 0;
    document.body.style.overflow = 'hidden';
    input.focus();
    load().then(function () { render(); });
  }
  function close() {
    if (helm.hidden) return;
    helm.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openKeys() { if (keys) { lastFocus = document.activeElement; keys.hidden = false; $('[data-keys-close].toggle', keys).focus(); } }
  function closeKeys() { if (keys && !keys.hidden) { keys.hidden = true; if (lastFocus) lastFocus.focus(); } }
  JR.openHelm = open; JR.closeHelm = close;

  input.addEventListener('input', function () { sel = 0; render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Home') { e.preventDefault(); select(0); }
    else if (e.key === 'End') { e.preventDefault(); select(items.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) go(items[sel]); }
    else if (e.key === 'Tab') { e.preventDefault(); select(sel + (e.shiftKey ? -1 : 1)); }
  });
  list.addEventListener('mousemove', function (e) { var li = e.target.closest('.helm__item'); if (li && Number(li.dataset.i) !== sel) select(Number(li.dataset.i)); });
  list.addEventListener('click', function (e) { var li = e.target.closest('.helm__item'); if (li) go(items[Number(li.dataset.i)]); });
  $$('[data-helm-open]').forEach(function (b) { b.addEventListener('click', open); });
  $$('[data-helm-close]').forEach(function (b) { b.addEventListener('click', close); });
  $$('[data-keys-open]').forEach(function (b) { b.addEventListener('click', openKeys); });
  $$('[data-keys-close]').forEach(function (b) { b.addEventListener('click', closeKeys); });

  /* ---- global shortcuts ---- */
  var SECTIONS = { e: 'education', r: 'research', h: 'honors', a: 'activities', n: 'news', c: 'contact' };
  var pendingG = 0;
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (helm.hidden) open(); else close(); return; }
    if (e.key === 'Escape') { close(); closeKeys(); if (JR.closeLoupe) JR.closeLoupe(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || JR.typing(e) || !helm.hidden) return;
    var k = e.key;
    if (pendingG && SECTIONS[k.toLowerCase()]) {
      e.preventDefault(); pendingG = 0;
      go({ u: '#' + SECTIONS[k.toLowerCase()] });
      return;
    }
    if (k === '/') { e.preventDefault(); open(); }
    else if (k === '?') { e.preventDefault(); if (keys.hidden) openKeys(); else closeKeys(); }
    else if (k === 't' || k === 'T') JR.toggleTheme();
    else if ((k === 'l' || k === 'L') && boot.alt) JR.switchLang();
    else if (k === 'g' || k === 'G') { pendingG = 1; setTimeout(function () { pendingG = 0; }, 1200); }
  });
})();
