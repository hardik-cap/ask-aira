/* Dot wave (28 Sep): a canvas halftone on a fixed pitch whose dots swell and
   fade along a travelling diagonal, so the field reads as a wave crossing the
   card rather than as a pattern sliding under it.

   It is progressive enhancement on an EMPTY, aria-hidden host: with the script
   off the host stays empty and the card keeps the static halftone its own
   stylesheet paints. The script adds `is-live` to the host when it takes over,
   which is what tells that stylesheet to stand its background down, so the two
   never draw at once.

     <div class="..." data-dot-wave aria-hidden="true"></div>

   Attributes, all optional:
     data-dot-pitch="10"    grid spacing. It must divide --cell (80px) like
                            every other decorative pitch on this site.
     data-dot-size="1.7"    dot radius at the crest, in CSS px
     data-dot-period="7000" ms for one full pass of the wave

   THE COLOUR IS NOT A PARAMETER. It is read from the host's computed `color`,
   the same rule js/glyph-matrix.js follows, so the field stays token-driven
   like everything else. Only the per-dot alpha, which is the wave itself,
   lives here.

   Motion: drawn ONCE and left under prefers-reduced-motion, paused while the
   host is off screen, and paused while the tab is hidden. */
(function () {
  'use strict';

  var hosts = document.querySelectorAll('[data-dot-wave]');
  if (!hosts.length) return;

  Array.prototype.forEach.call(hosts, function (host) { build(host); });

  function build(host) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    host.appendChild(canvas);
    host.classList.add('is-live');

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var pitch = +host.getAttribute('data-dot-pitch') || 10;
    var size = +host.getAttribute('data-dot-size') || 1.7;
    var period = +host.getAttribute('data-dot-period') || 7000;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var w = 0, h = 0, dpr = 1, ink = '255,255,255';
    var raf = 0, onScreen = true, start = 0;

    function measure() {
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      /* Capped at 2: a 3x backing store on a 736px card is four megapixels of
         dots for no visible gain. */
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* The host's own colour, converted once to the "r,g,b" the per-dot alpha
         needs. Any alpha on the token is ignored: the wave owns alpha here. */
      var c = getComputedStyle(host).color.match(/[\d.]+/g);
      if (c && c.length >= 3) ink = c[0] + ',' + c[1] + ',' + c[2];
      draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      /* One diagonal wave plus a slower second one at an angle to it. A single
         sine reads as a barber's pole; two that do not share a period never
         line up the same way twice, which is what makes it read as water. */
      var p1 = (t / period) * Math.PI * 2;
      var p2 = (t / (period * 1.6)) * Math.PI * 2;
      for (var y = pitch / 2; y < h; y += pitch) {
        for (var x = pitch / 2; x < w; x += pitch) {
          var s = Math.sin((x * 0.020) + (y * 0.012) - p1)
                + Math.sin((x * 0.011) - (y * 0.021) - p2);
          /* s runs -2..2; fold it to 0..1 and keep a floor so the troughs are
             still a field rather than blank paper. */
          var k = 0.30 + 0.70 * ((s + 2) / 4);
          ctx.fillStyle = 'rgba(' + ink + ',' + (0.30 * k).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(x, y, size * k, 0, 6.2832);
          ctx.fill();
        }
      }
    }

    function frame(now) {
      if (!start) start = now;
      draw(now - start);
      raf = requestAnimationFrame(frame);
    }

    function sync() {
      var run = onScreen && !document.hidden && !still.matches;
      if (run && !raf) raf = requestAnimationFrame(frame);
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(host);
    else window.addEventListener('resize', measure, { passive: true });

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener('visibilitychange', sync);
    if (still.addEventListener) still.addEventListener('change', sync);
    sync();
  }
})();
