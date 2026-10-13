/* The hub hero's US dot map as INTERACTIVE PARTICLES (user, 13 Oct:
   "make the usa map dot into an interactive particle effect", supplying
   Bencho's Particles component, MIT, bencho.dev/licence). Hand-ported from
   React to this page the way every sv-* reference is: the PHYSICS are the
   component's own (pointer push falling off as (1-d/R)^2, a 0.05 spring
   home, damping RAISED to dt so a dropped frame decays the same energy as
   the two it replaced, dots drawn long along their velocity so a burst
   reads as a splash, the loop PARKING itself the moment every dot has
   settled), but there is ONE shape, the tour map: homes are parsed out of
   /assets/events/us-dots.svg ("Mx yh0" segments, 960x600), so the map is
   never drawn twice. Press fires the component's shockwave and the map
   gathers itself back.
   PROGRESSIVE: the static masked span (.evh1__dots) stays in the markup as
   the ground; this script stands it down (.is-live on the poster) only
   when it can actually run. Under prefers-reduced-motion the span simply
   remains and no canvas, fetch or frame ever happens.
   PHONES GET IT TOO since 13 Oct (user: "can the effect work on mobile?
   fluid with scroll would be better"): a finger landing on the panel sends
   a small shockwave and a drag pushes dots like the mouse (touch events
   are PASSIVE, so the page still scrolls under the thumb); and on every
   device SCROLLING RIPPLES THE MAP: each scroll step gives every dot a
   kick along a travelling sine across the map, scaled by the step, so the
   map sloshes like a liquid and the spring settles it once the page stops.
   The ripple only runs while the hero is on screen. Pointer events are read on
   the PANEL, not the canvas, so dots move under the copy too (the
   hover-tiles lesson), and nothing here preventDefaults, so the CTA and
   date links click as before. */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-us-dots]');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var VW = 960, VH = 600;
  /* the component's knobs: push reach (css px), push strength, shock */
  var REACH = 80, FORCE = 60;

  var dots = [];
  var raf = 0;
  var hand = null;
  var k = 1, ox = 0, oy = 0, dpr = 1, rad = 2, lastW = 0, lastH = 0;
  var homes = null;

  function size() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    /* contain-fit, exactly where the mask painted the map */
    k = Math.min(r.width / VW, r.height / VH);
    ox = (r.width - VW * k) / 2;
    oy = (r.height - VH * k) / 2;
    rad = Math.max(1.1, 2.6 * k);
    lastW = Math.round(r.width); lastH = Math.round(r.height);
    return true;
  }

  function seat() {
    dots = homes.map(function (h) {
      var x = ox + h[0] * k, y = oy + h[1] * k;
      return { hx: x, hy: y, x: x, y: y, vx: 0, vy: 0 };
    });
  }

  function draw() {
    var x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, canvas.width, canvas.height);
    x.fillStyle = getComputedStyle(canvas).color;
    x.beginPath();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var sp = Math.hypot(d.vx, d.vy);
      if (sp < 0.3) {
        x.moveTo(d.x + rad, d.y);
        x.arc(d.x, d.y, rad, 0, Math.PI * 2);
      } else {
        /* long along its path, a little thin across it */
        var s = Math.min(2.6, 1 + sp * 0.12);
        var rot = Math.atan2(d.vy, d.vx);
        x.moveTo(d.x + Math.cos(rot) * rad * s, d.y + Math.sin(rot) * rad * s);
        x.ellipse(d.x, d.y, rad * s, rad / Math.sqrt(s), rot, 0, Math.PI * 2);
      }
    }
    x.fill();
  }

  function run() {
    if (raf) return;
    var prev = 0;
    var tick = function (t) {
      var dt = prev ? Math.min(2.5, Math.max(0, (t - prev) / 16.67)) : 1;
      prev = t;
      var S = (FORCE / 100) * 11;
      var busy = !!hand;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (hand) {
          var dx = d.x - hand.x, dy = d.y - hand.y;
          var dd = Math.hypot(dx, dy);
          if (dd < REACH && dd > 0.01) {
            var f = Math.pow(1 - dd / REACH, 2) * S;
            d.vx += (dx / dd) * f * dt;
            d.vy += (dy / dd) * f * dt;
          }
        }
        d.vx = (d.vx + (d.hx - d.x) * 0.05 * dt) * Math.pow(0.84, dt);
        d.vy = (d.vy + (d.hy - d.y) * 0.05 * dt) * Math.pow(0.84, dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (Math.abs(d.hx - d.x) < 0.05 && Math.abs(d.hy - d.y) < 0.05 &&
            Math.abs(d.vx) < 0.02 && Math.abs(d.vy) < 0.02) {
          d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0;
        } else busy = true;
      }
      draw();
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  function local(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  fetch('/assets/events/us-dots.svg')
    .then(function (r) { return r.text(); })
    .then(function (svg) {
      homes = [];
      var re = /M([\d.]+) ([\d.]+)h0/g, m;
      while ((m = re.exec(svg))) homes.push([+m[1], +m[2]]);
      if (!homes.length || !size()) return;
      seat();
      draw();
      canvas.closest('.evh1__poster').classList.add('is-live');

      var host = canvas.closest('.evhub__panel') || canvas.parentElement;
      host.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        hand = local(e);
        run();
      });
      host.addEventListener('pointerleave', function () { hand = null; run(); });
      host.addEventListener('pointerdown', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        /* the component's shockwave; the map gathers itself back */
        var p = local(e);
        var S = 0.4 + (FORCE / 100) * 1.2;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          var dx = d.x - p.x, dy = d.y - p.y;
          var dd = Math.hypot(dx, dy);
          if (dd > 200 || dd < 0.01) continue;
          var f = (1 - dd / 200) * 30 * S;
          d.vx += (dx / dd) * f;
          d.vy += (dy / dd) * f;
        }
        run();
      });

      /* Touch: land = a small shockwave, drag = the mouse's push. */
      function shock(p, reach, mult) {
        var S = (0.4 + (FORCE / 100) * 1.2) * mult;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          var dx = d.x - p.x, dy = d.y - p.y;
          var dd = Math.hypot(dx, dy);
          if (dd > reach || dd < 0.01) continue;
          var f = (1 - dd / reach) * 30 * S;
          d.vx += (dx / dd) * f;
          d.vy += (dy / dd) * f;
        }
        run();
      }
      function touchAt(e) {
        var t = e.touches && e.touches[0];
        return t ? local(t) : null;
      }
      host.addEventListener('touchstart', function (e) {
        var p = touchAt(e);
        if (p) { shock(p, 120, 0.3); hand = p; }
      }, { passive: true });
      host.addEventListener('touchmove', function (e) {
        var p = touchAt(e);
        if (p) { hand = p; run(); }
      }, { passive: true });
      host.addEventListener('touchend', function () { hand = null; run(); }, { passive: true });
      host.addEventListener('touchcancel', function () { hand = null; run(); }, { passive: true });

      /* Scroll: a travelling wave, kicked by each scroll step. */
      var onScreen = true, lastY = window.scrollY;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(canvas);
      }
      window.addEventListener('scroll', function () {
        var y = window.scrollY, step = y - lastY;
        lastY = y;
        if (!onScreen || !step) return;
        step = Math.max(-24, Math.min(24, step));
        var amp = (FINE ? 0.08 : 0.055) * step, ph = y * 0.018;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          d.vy += amp * Math.sin(d.hx * 0.022 + ph);
          d.vx += amp * 0.35 * Math.cos(d.hy * 0.03 + ph * 0.7);
        }
        run();
      }, { passive: true });

      var rt = 0;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        /* Re-seat only when the canvas really changed size: a phone fires
           resize every time the address bar slides during a scroll, and a
           re-seat there would freeze the ripple mid-wave. */
        rt = setTimeout(function () {
          var r = canvas.getBoundingClientRect();
          if (Math.round(r.width) === lastW && Math.round(r.height) === lastH) return;
          if (size()) { seat(); draw(); }
        }, 120);
      });
    })
    .catch(function () { /* the masked span is still the ground */ });
})();
