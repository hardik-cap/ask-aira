/* Glyph matrix (22 Sep): a canvas field of small mono glyphs on a fixed
   pitch, a few of which change every tick. Ported by hand from the
   sv-animations GlyphMatrix the user supplied, which is a Svelte component
   with a runed dependency and no CDN build: nothing of it could be used, but
   its four knobs (glyph set, cell size, mutation rate, tick interval) are the
   right four and are kept as data-* attributes.

   It is progressive enhancement on an EMPTY, aria-hidden host: with the
   script off the host stays empty and the page is exactly as it was. The
   host owns placement, masking and colour; this file owns the field.

     <div class="..." data-glyph-matrix aria-hidden="true"></div>

   Attributes, all optional:
     data-glyph-matrix="·+<>"   the characters to pick from (repeat a
                                character to weight it: the default is half
                                middots so the field reads as texture rather
                                than as writing)
     data-glyph-cell="16"       pitch AND the box the glyph is drawn in. It
                                must divide --cell (--section-pad, 80px) or
                                the field meets the page frame's band lines
                                at a different place on every column, which
                                is what made the hero lattice look broken on
                                20 Sep. 16 goes into 80 five times.
     data-glyph-rate="0.03"     fraction of cells that mutate per tick
     data-glyph-interval="150"  ms between ticks

   The colour is NOT a parameter: it is read from the host's computed
   `color`, so it stays a token like every other colour on the site. Only the
   per-cell alpha jitter lives here, and that is texture, not colour.

   Motion: no timer at all under prefers-reduced-motion (the field is drawn
   once and left), none while the host is off-screen, and none while the tab
   is hidden. */
(function () {
  'use strict';

  var hosts = document.querySelectorAll('[data-glyph-matrix]');
  if (!hosts.length) return;

  var DEFAULT_GLYPHS = '·········+*/<>=?';

  Array.prototype.forEach.call(hosts, function (host) { build(host); });

  function build(host) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    canvas.className = 'glyphs__canvas';
    host.appendChild(canvas);

    var glyphs = (host.getAttribute('data-glyph-matrix') || '').trim() || DEFAULT_GLYPHS;
    var cell = num(host.getAttribute('data-glyph-cell'), 16);
    var rate = num(host.getAttribute('data-glyph-rate'), 0.03);
    var wait = num(host.getAttribute('data-glyph-interval'), 150);

    /* Geist Mono, the drawn-illustration face. The glyph is drawn at three
       quarters of the pitch so it sits inside its own cell with air around
       it; at the 16px default that is 12px, the site's floor. */
    var font = '500 ' + Math.round(cell * 0.75) + 'px "Geist Mono", ui-monospace, monospace';
    /* Read, not hard-coded: the host sets `color` to a token and this picks
       it up. Canvas does not resolve `currentColor` reliably, so it is
       resolved here and re-read whenever the box changes. */
    var ink = window.getComputedStyle(host).color;
    /* Optional ACCENTS, read the same way: the host names them as custom
       properties holding tokens, so the palette still lives in tokens.css and
       this only reads what it is handed. A cell keeps its tint for as long as
       it keeps its box, so the field does not flicker colour on every tick.
       With none set the array is just the ink and nothing changes. */
    var inks = [ink];
    var tintShare = num(host.getAttribute('data-glyph-tint'), 0.28);
    var tints = [];

    var w = 0, h = 0, cols = 0, rows = 0, count = 0;
    var chars = [], alphas = [];
    var timer = null, visible = true;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    measure();
    if (window.ResizeObserver) {
      new ResizeObserver(measure).observe(host);
    } else {
      window.addEventListener('resize', measure);
    }

    /* Off-screen work is wasted work, and the hero leaves the viewport fast.
       It starts TRUE and the observer corrects it on its first callback,
       which fires immediately on observe: starting false would leave the
       field permanently static anywhere the observer does not report. */
    visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(host);
    }
    sync();

    document.addEventListener('visibilitychange', sync);
    if (still.addEventListener) still.addEventListener('change', function () { sync(); });

    /* The face is almost certainly not loaded yet on first paint, so the
       first field would be drawn in the fallback monospace and then never
       redrawn. Redraw once the real one is in. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (count) paintAll(); });
    }

    function measure() {
      /* The CONTENT box, not clientWidth, which counts padding. The canvas is
         laid out at the content box's origin, so sizing it to the padding box
         paints the whole field offset by the padding and pushes the mask's
         centre off with it, which is a real possibility since padding is the
         obvious way for a page to inset a field from its host's edges. */
      var cs = window.getComputedStyle(host);
      var cw = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var ch = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      /* Zero at any breakpoint that hides the host: drop the field and the
         timer rather than keeping a 0x0 canvas ticking. */
      if (!(cw > 0) || !(ch > 0)) { count = 0; stop(); return; }
      if (cw === w && ch === h) return;

      w = cw; h = ch;
      ink = cs.color;
      inks = [ink];
      for (var c = 1; c <= 3; c++) {
        var v = cs.getPropertyValue('--gm-c' + c).trim();
        if (v) inks.push(v);
      }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      count = cols * rows;
      chars = new Array(count);
      alphas = new Array(count);
      tints = new Array(count);
      for (var i = 0; i < count; i++) {
        chars[i] = pick();
        tints[i] = tint();
        alphas[i] = jitter(tints[i]);
      }

      paintAll();
      sync();
    }

    function paintAll() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = font;
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < count; i++) paint(i);
      ctx.globalAlpha = 1;
    }

    /* Most cells stay the ink. Only tintShare of them take an accent, evenly
       split between however many were given: at an even split across four
       colours the field reads as confetti rather than as texture with a few
       marks lit in it. */
    function tint() {
      if (inks.length < 2 || Math.random() >= tintShare) return 0;
      return 1 + ((Math.random() * (inks.length - 1)) | 0);
    }

    function paint(i) {
      var col = i % cols;
      var row = (i - col) / cols;
      ctx.fillStyle = inks[tints[i]] || ink;
      ctx.globalAlpha = alphas[i];
      ctx.fillText(chars[i], col * cell + cell / 2, row * cell + cell / 2);
    }

    /* One tick repaints only the cells it changed: a hero-sized field is a
       few thousand cells and a full repaint eight times a second is real
       work for decoration nobody is looking at. */
    function tick() {
      var n = Math.max(1, Math.round(count * rate));
      ctx.font = font;
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var k = 0; k < n; k++) {
        var i = (Math.random() * count) | 0;
        var col = i % cols;
        var row = (i - col) / cols;
        ctx.clearRect(col * cell, row * cell, cell, cell);
        chars[i] = pick();
        tints[i] = tint();
        alphas[i] = jitter(tints[i]);
        paint(i);
      }
      ctx.globalAlpha = 1;
    }

    function sync() {
      var run = count && visible && !document.hidden && !still.matches;
      if (run) start(); else stop();
    }
    function start() { if (!timer) timer = setInterval(tick, wait); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function pick() { return glyphs.charAt((Math.random() * glyphs.length) | 0); }
    /* A flat field reads as wallpaper; the spread is what makes it texture.
       The floor lifted from 0.25 on 23 Sep: the faintest quarter of the cells
       were not rendering as anything at all, so the field read as gaps. */
    /* A TINTED cell sits in the top of the range. The host composites this
       layer at well under full opacity, so an accent drawn at the bottom of
       the jitter arrives as a pale wash and reads as nothing: the colours
       have to be the lit cells to be colours at all. Same lesson as the
       field's own ink, which had to go dark rather than more opaque. */
    function jitter(tinted) {
      return tinted ? 0.78 + Math.random() * 0.22 : 0.45 + Math.random() * 0.55;
    }
  }

  function num(raw, fallback) {
    var n = parseFloat(raw);
    return isFinite(n) && n > 0 ? n : fallback;
  }
})();
