/* Hero dot field: a canvas of the same dots the CSS grid draws, where each
   dot is displaced away from the pointer and springs back.

   Two fields share this script because they are the same object with
   different geometry:

   - index.html (V1, shipping): the dots span rail to rail and fade top to
     bottom, so the canvas is positioned on exactly the ::after grid's box
     and the fade is a function of y alone. Interaction is bounded to where
     dots actually exist, per the 15 Sep call: outside the box, or below
     --dot-fade, the pointer is ignored entirely and the field relaxes.
   - index-v3.html: the field is weighted to the empty right side of that
     page's left-aligned hero, dissolving left and at the top and bottom.

   The CSS grid stays as the fallback and is hidden only once the canvas is
   actually up. Reduced motion gets the static canvas with no displacement. */

(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;
  var grad = hero.querySelector('.hero__grad');
  if (!grad || !window.HTMLCanvasElement) return;

  var isV3 = document.body.classList.contains('page-v3');

  var canvas = document.createElement('canvas');
  canvas.className = 'hero__dotfield';
  canvas.setAttribute('aria-hidden', 'true');
  grad.appendChild(canvas);
  hero.classList.add('hero--dotfield');

  var ctx = canvas.getContext('2d');
  if (!ctx) { hero.classList.remove('hero--dotfield'); return; }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RADIUS = 130;  /* pointer influence */
  var PUSH = 18;     /* max displacement in px */

  var GAP = 22;      /* lattice pitch; V1 reads it from CSS below */
  var SOLID = 120;   /* V1 only: full strength down to here */
  var FADE = 440;    /* V1 only: no dots at all below here */

  var W = 0, H = 0, dots = [];
  var base = { r: 11, g: 16, b: 32, a: 0.16 };
  var brand = { r: 82, g: 108, b: 246 };

  /* Base dots ride the frame-grid token; the hover glow rides the primary
     token. V1 also takes its lattice and fade stops from CSS so the canvas
     lands on the same geometry as the grid it replaces. */
  function readTokens() {
    var cs = getComputedStyle(grad);

    var raw = cs.getPropertyValue('--frame-grid').trim();
    var m = raw.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',').map(function (v) { return parseFloat(v); });
      var a = (p[3] == null ? 1 : p[3]);
      /* V3's field is heavily masked, so its dots are lifted to stay
         legible. V1's sit at full token strength in the solid zone, which
         is what makes the canvas indistinguishable from the CSS grid. */
      base = { r: p[0], g: p[1], b: p[2], a: isV3 ? Math.min(0.2, a * 2.2) : a };
    }

    var b = cs.getPropertyValue('--brand').trim();
    var hex = b.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      brand = {
        r: parseInt(hex[1].slice(0, 2), 16),
        g: parseInt(hex[1].slice(2, 4), 16),
        b: parseInt(hex[1].slice(4, 6), 16)
      };
    }

    if (isV3) return;
    var gap = parseFloat(cs.getPropertyValue('--dot-gap'));
    var solid = parseFloat(cs.getPropertyValue('--dot-solid'));
    var fade = parseFloat(cs.getPropertyValue('--dot-fade'));
    if (gap > 0) GAP = gap;
    if (solid >= 0) SOLID = solid;
    if (fade > SOLID) FADE = fade;
  }

  /* Per-dot strength, matching each page's mask so the swap is invisible. */
  function weightAt(x, y) {
    if (isV3) {
      var xr = Math.min(1, Math.max(0, (x / W - 0.22) / 0.5));
      var yr = Math.min(1, y / 150) * Math.min(1, (H - y) / 150);
      return xr * yr;
    }
    if (y <= SOLID) return 1;
    if (y >= FADE) return 0;
    return 1 - (y - SOLID) / (FADE - SOLID);
  }

  function build() {
    var r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    if (!W || !H) return;

    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readTokens();

    dots.length = 0;
    /* V1's lattice is anchored to the box's top-left corner, the same origin
       background-size uses, so the canvas dots land on the CSS dots exactly. */
    var start = isV3 ? GAP / 2 : 0;
    var stop = isV3 ? H : Math.min(H, FADE);
    for (var y = start; y < stop; y += GAP) {
      for (var x = start; x < W; x += GAP) {
        var a = weightAt(x, y);
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
  /* The hero's height moves when the display face swaps in, which changes
     where the field ends. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(build);
  }

  if (reduced) return; /* static field only */

  var OFF = -1e4;
  var mx = OFF, my = OFF;
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
        /* On V1 the throw is scaled by the dot's own strength, so a dot that
           is nearly faded out barely moves: without this the fade has a hard
           edge in motion that it does not have at rest. V3's field keeps its
           original uniform throw, since it is a reference to port FROM and
           should not drift. */
        var wgt = isV3 ? 1 : d.a;
        tx = (dx / dist) * n * PUSH * wgt;
        ty = (dy / dist) * n * PUSH * wgt;
        tg = n * wgt;
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

  /* The field is only live where dots are: inside the canvas box, and above
     the fade. Anywhere else the pointer reads as absent and the dots relax,
     so the interactive area and the visible area are the same shape. */
  function inField(px, py) {
    if (px < 0 || px > W || py < 0) return false;
    return py < (isV3 ? H : FADE);
  }

  hero.addEventListener('mousemove', function (e) {
    var r = canvas.getBoundingClientRect();
    var px = e.clientX - r.left;
    var py = e.clientY - r.top;
    if (inField(px, py)) {
      mx = px;
      my = py;
    } else {
      mx = OFF;
      my = OFF;
    }
    wake();
  });

  hero.addEventListener('mouseleave', function () {
    mx = OFF;
    my = OFF;
    wake();
  });
})();
