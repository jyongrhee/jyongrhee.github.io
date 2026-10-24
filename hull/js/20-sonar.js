/* Sonar line: each sentence is "decoded" left to right. Latin letters
   resolve out of noise; Hangul syllables are assembled from their jamo
   (ㅎ → 해, ㅇ → 야 → 양). Pauses when off screen or in a background tab. */
(function () {
  'use strict';
  var JR = window.JR;
  var el = document.querySelector('.sonar');
  if (!el) return;
  var root = document.documentElement;
  if (JR.calm.matches) { root.classList.add('calm'); return; }
  var lines = [];
  try { lines = JSON.parse(el.getAttribute('data-lines') || '[]'); } catch (e) { return; }
  if (!lines.length) return;
  var out = el.querySelector('.sonar__text');

  var NOISE = 'ABCDEFGHJKLMNPQRSTUVWXYZabdefghkmnpqrstuvwxyz0123456789<>/\\_=+*#▒▓░';
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  var STEP = 26, SCRAMBLE = 240, STAGE = 70, HOLD = 3400, ERASE = 14;

  var isHangul = function (c) { var p = c.charCodeAt(0); return p >= 0xac00 && p <= 0xd7a3; };
  /* intermediate forms a syllable passes through, ending with the syllable itself */
  var stages = function (c) {
    if (!isHangul(c)) return [c];
    var p = c.charCodeAt(0) - 0xac00, L = Math.floor(p / 588), V = Math.floor((p % 588) / 28), T = p % 28;
    var s = [CHO[L], String.fromCharCode(0xac00 + L * 588 + V * 28)];
    if (T) s.push(c);
    return s;
  };
  var noise = function (c, seed) {
    if (isHangul(c)) { var j = CHO + JUNG; return j[(seed * 7919) % j.length]; }
    return NOISE[(seed * 7919) % NOISE.length];
  };
  var escape = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  var raf = 0, timer = 0, idx = 0, running = false, visible = true;

  function decode(text, done) {
    var chars = Array.from(text);
    var plan = chars.map(function (c, i) { return { c: c, start: i * STEP, st: stages(c) }; });
    var total = plan.length ? plan[plan.length - 1].start + SCRAMBLE + 3 * STAGE : 0;
    var t0 = performance.now();
    var frame = function (now) {
      var t = now - t0, html = '', tick = Math.floor(t / 50);
      for (var i = 0; i < plan.length; i++) {
        var p = plan[i], dt = t - p.start;
        if (dt < 0) break;
        if (p.c === ' ') { html += ' '; continue; }
        if (dt < SCRAMBLE) { html += '<i>' + escape(noise(p.c, tick + i * 13)) + '</i>'; continue; }
        var k = Math.min(p.st.length - 1, Math.floor((dt - SCRAMBLE) / STAGE));
        html += k < p.st.length - 1 ? '<i>' + escape(p.st[k]) + '</i>' : escape(p.c);
      }
      out.innerHTML = html;
      if (t < total) raf = requestAnimationFrame(frame); else { out.textContent = text; done(); }
    };
    raf = requestAnimationFrame(frame);
  }

  function erase(done) {
    var chars = Array.from(out.textContent), t0 = performance.now();
    var frame = function (now) {
      var n = Math.max(0, chars.length - Math.floor((now - t0) / ERASE));
      out.textContent = chars.slice(0, n).join('');
      if (n > 0) raf = requestAnimationFrame(frame); else done();
    };
    raf = requestAnimationFrame(frame);
  }

  function cycle() {
    if (!running) return;
    decode(lines[idx], function () {
      if (lines.length < 2) { running = false; return; }
      timer = setTimeout(function () {
        if (!running) return;
        erase(function () { idx = (idx + 1) % lines.length; timer = setTimeout(cycle, 220); });
      }, HOLD);
    });
  }
  function start() { if (running || !visible || document.hidden) return; running = true; out.textContent = ''; cycle(); }
  function stop() { running = false; cancelAnimationFrame(raf); clearTimeout(timer); out.textContent = lines[idx]; }

  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(el);
  }
  setTimeout(start, 520);
})();
