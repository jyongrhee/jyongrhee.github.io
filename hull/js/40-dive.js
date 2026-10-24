/* Research page: reading progress, contents spy, the figure stage that
   follows the chapters, ←/→ between studies, and copy-link. */
(function () {
  'use strict';
  var JR = window.JR, $ = JR.$, $$ = JR.$$;
  var dive = $('.dive');
  if (!dive) return;

  /* reading progress */
  var bar = $('.progress', dive), fill = bar && $('span', bar), text = $('.dive__text', dive);
  var ticking = false;
  var measure = function () {
    ticking = false;
    var r = text.getBoundingClientRect();
    var span = r.height - innerHeight * 0.6;
    var p = Math.min(1, Math.max(0, (innerHeight * 0.25 - r.top) / (span > 0 ? span : 1)));
    fill.style.setProperty('--p', p.toFixed(4));
    bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  };
  if (bar && text) {
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(measure); } }, { passive: true });
    addEventListener('resize', measure);
    measure();
  }

  /* contents spy + figure stage */
  var links = $$('[data-toc]', dive);
  var stage = $$('.fig--stage', dive);
  var setOn = function (key) {
    links.forEach(function (a) { a.classList.toggle('is-on', a.dataset.toc === String(key)); });
    if (/^\d+$/.test(String(key))) {
      var f = stage.filter(function (s) { return s.dataset.fig === String(key); })[0];
      if (f) stage.forEach(function (s) { s.classList.toggle('is-on', s === f); });
    }
  };
  if (stage.length) stage[0].classList.add('is-on');
  var targets = $$('.chapter', dive), spyTick = false, current;
  var spy = function () {
    spyTick = false;
    var line = innerHeight * 0.4, on = targets[0];
    targets.forEach(function (t) { if (t.getBoundingClientRect().top <= line) on = t; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) on = targets[targets.length - 1];
    if (!on || on === current) return;
    current = on;
    setOn(on.dataset.chapter != null ? on.dataset.chapter : on.id === 'recognition' ? 'x1' : 'x2');
  };
  addEventListener('scroll', function () { if (!spyTick) { spyTick = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();

  /* previous / next study with the arrow keys */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || JR.typing(e)) return;
    var helm = $('#helm');
    if (helm && !helm.hidden) return;
    var dir = e.key === 'ArrowLeft' ? 'prev' : e.key === 'ArrowRight' ? 'next' : '';
    var a = dir && $('[data-hop="' + dir + '"]');
    if (a) { e.preventDefault(); location.href = a.href; }
  });

  /* copy a clean link to this study */
  $$('[data-share]', dive).forEach(function (b) {
    b.addEventListener('click', function () {
      JR.copy(location.href.split('#')[0]).then(function (ok) { if (ok) JR.signal(JR.boot.ui.linkCopied); });
    });
  });
})();
