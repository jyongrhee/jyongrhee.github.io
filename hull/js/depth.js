/* Hero photo depth (loaded only when profile.hero.depth is true and
   media/hero-depth.png exists). The photo is drawn with WebGL and shifted
   by its depth map, so it moves in 3D with the pointer or device tilt.
   © Jaeyong Rhee. All rights reserved. */
(function () {
  'use strict';
  var host = document.querySelector('[data-depth]');
  var photo = host && host.querySelector('img[data-depth-photo]');
  if (!host || !photo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var depthSrc = (window.JR && JR.boot.prefix || './') + 'media/hero-depth.png';
  var cv = document.createElement('canvas');
  var gl = cv.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return;

  var VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
  var FS = 'precision mediump float;uniform sampler2D img,dep;uniform vec2 m,scale;varying vec2 v;'
    + 'void main(){vec2 uv=(v-.5)*scale+.5;float d=texture2D(dep,uv).r;vec2 o=m*(d-.45)*.035;'
    + 'gl_FragColor=texture2D(img,uv+o);}';
  var sh = function (t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var tex = function (unit, image) {
    var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  };
  var load = function (src) { return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); };
  var uM = gl.getUniformLocation(pr, 'm'), uS = gl.getUniformLocation(pr, 'scale');
  var tx = 0, ty = 0, mx = 0, my = 0, iw = 1, ih = 1, raf = 0, on = true;

  var size = function () {
    var r = host.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    gl.viewport(0, 0, cv.width, cv.height);
    var ca = r.width / r.height, ia = iw / ih;                 // cover-fit
    gl.uniform2f(uS, ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1);
  };
  var draw = function () {
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (on) raf = requestAnimationFrame(draw);
  };
  Promise.all([load(photo.currentSrc || photo.src), load(depthSrc)]).then(function (imgs) {
    iw = imgs[0].naturalWidth; ih = imgs[0].naturalHeight;
    gl.uniform1i(gl.getUniformLocation(pr, 'img'), 0); gl.uniform1i(gl.getUniformLocation(pr, 'dep'), 1);
    tex(0, imgs[0]); tex(1, imgs[1]);
    host.appendChild(cv); size(); draw();
    addEventListener('resize', size);
    addEventListener('pointermove', function (e) { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
    addEventListener('deviceorientation', function (e) { if (e.gamma != null) { tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); } });
    new IntersectionObserver(function (es) { on = es[0].isIntersecting; cancelAnimationFrame(raf); if (on) draw(); }).observe(host);
  }).catch(function () { /* keep the flat photo */ });
})();
