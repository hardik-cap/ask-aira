/* V3 hero dot field (index-v3.html only).

   Replaces the hero's CSS dot grid with a canvas of the same dots, weighted
   to the empty right side of the left-aligned hero (denser right, fading
   left and toward the bottom), where each dot is displaced away from the
   pointer and springs back. The CSS grid in home-v3.css stays as the no-JS
   fallback; this script hides it only once the canvas is up. Reduced motion
   gets the static canvas with no displacement. */

(function () {
  'use strict';

  var hero = document.querySelector('.page-v3 .hero');
  if (!hero) return;
  var grad = hero.querySelector('.hero__grad');
  if (!grad || !window.HTMLCanvasElement) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero__dotfield';
  canvas.setAttribute('aria-hidden', 'true');
  grad.appendChild(canvas);
  hero.classList.add('hero--dotfield');

  var ctx = canvas.getContext('2d');
  var GAP = 22;      /* lattice pitch, matches the CSS grid */
  var RADIUS = 130;  /* pointer influence */
  var PUSH = 18;     /* max displacement in px */

  var W = 0, H = 0, dots = [];
  var base = { r: 11, g: 16, b: 32, a: 0.16 };
  var brand = { r: 82, g: 108, b: 246 };

  /* Base dots ride the frame-grid token (alpha lifted so the field reads);
     the hover glow ride the primary token. */
  function readTokens() {
    var raw = getComputedStyle(grad).getPropertyValue('--frame-grid').trim();
    var m = raw.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',').map(function (v) { return parseFloat(v); });
      base = { r: p[0], g: p[1], b: p[2],
               a: Math.min(0.2, (p[3] == null ? 1 : p[3]) * 2.2) };
    }
    var b = getComputedStyle(grad).getPropertyValue('--brand').trim();
    var hex = b.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      brand = {
        r: parseInt(hex[1].slice(0, 2), 16),
        g: parseInt(hex[1].slice(2, 4), 16),
        b: parseInt(hex[1].slice(4, 6), 16)
      };
    }
  }

  function build() {
    var r = grad.getBoundingClientRect();
    W = r.width;
    H = r.height;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readTokens();

    dots.length = 0;
    for (var y = GAP / 2; y < H; y += GAP) {
      for (var x = GAP / 2; x < W; x += GAP) {
        /* Right-weighted: nothing at the far left, full strength across
           the right side, easing out at the top and bottom edges. */
        var xr = Math.min(1, Math.max(0, (x / W - 0.22) / 0.5));
        var yr = Math.min(1, y / 150) * Math.min(1, (H - y) / 150);
        var a = xr * yr;
        if (a < 0.06) continue;
        dots.push({ x: x, y: y, ox: 0, oy: 0, g: 0, a: a });
      }
    }
    paint();
  }

  function paint() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      /* Blend toward the primary colour and brighten with the glow. */
      var t = Math.min(1, d.g * 1.2);
      var r = Math.round(base.r + (brand.r - base.r) * t);
      var g = Math.round(base.g + (brand.g - base.g) * t);
      var b = Math.round(base.b + (brand.b - base.b) * t);
      var a = d.a * (base.a + (0.9 - base.a) * d.g);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(d.x + d.ox, d.y + d.oy, 1.5 + d.g * 0.7, 0, 6.2832);
      ctx.fill();
    }
  }

  build();
  window.addEventListener('resize', build);

  if (reduced) return; /* static field only */

  var mx = -1e4, my = -1e4;
  var running = false;

  function tick() {
    var alive = false;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var dx = d.x - mx;
      var dy = d.y - my;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var tx = 0, ty = 0, tg = 0;
      if (dist < RADIUS && dist > 0.01) {
        var n = 1 - dist / RADIUS;
        tx = (dx / dist) * n * PUSH;
        ty = (dy / dist) * n * PUSH;
        tg = n;
      }
      d.ox += (tx - d.ox) * 0.16;
      d.oy += (ty - d.oy) * 0.16;
      d.g += (tg - d.g) * 0.16;
      if (Math.abs(d.ox) > 0.05 || Math.abs(d.oy) > 0.05 || d.g > 0.01) alive = true;
    }
    paint();
    if (alive) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function wake() {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  hero.addEventListener('mousemove', function (e) {
    var r = grad.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    wake();
  });
  hero.addEventListener('mouseleave', function () {
    mx = -1e4;
    my = -1e4;
    wake();
  });
})();
