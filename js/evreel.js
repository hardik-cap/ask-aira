/* Photo reel driver (.evreel, /events and both event pages). The CSS
   keyframe loop cannot change speed without the belt jumping, and cannot be
   grabbed, so this drives the same translateX by hand (user, 10 Oct: "only
   slow down on hover, dont stop, also make it draggable ... but again start
   moving"):
   - at rest the belt travels one set per 90s, the CSS pace;
   - under a mouse (or KEYBOARD focus) it eases down to a quarter of that,
     never to a stop;
   - a horizontal drag moves it directly, either way; let go and it carries
     the throw for a moment, then eases back to its FULL pace, even with the
     pointer still over it (the hover slow-down re-arms only once the
     pointer leaves and comes back);
   TRAP, hit 10 Oct: the region is tabindex=0, so a click to drag FOCUSES
   it, and a plain focusin flag then held the belt at quarter speed until
   the visitor clicked elsewhere. Only :focus-visible (keyboard) focus
   counts.
   - arrow keys nudge it, for the focusable region.
   Velocity always EASES toward its target (~450ms), so every change of
   state reads as a deceleration, not a snap. The loop wraps on one set's
   width, the same -50% the CSS uses. With this off the CSS animation runs
   as before (paused on hover); under reduced motion the script stands down
   and the reel stays the CSS's sideways-scrolling row. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DURATION = 90;        /* s per set, the CSS pace */
  var HOVER_FACTOR = 0.25;  /* quarter speed under the pointer */
  var EASE = 2.2;           /* 1/s, ~450ms time constant */
  var MAX_FLING = 2400;     /* px/s cap on a throw */
  var NUDGE = 160;          /* px per arrow key */

  document.querySelectorAll('.evreel').forEach(function (reel) {
    var belt = reel.querySelector('.evreel__belt');
    var set = belt && belt.querySelector('.evreel__set');
    if (!set) return;

    reel.classList.add('is-js');

    var W = 0, speed = 0;
    function measure() {
      W = set.getBoundingClientRect().width;
      speed = W / DURATION;
    }
    measure();
    window.addEventListener('resize', measure);

    var x = 0;
    var v = speed;          /* px/s, positive = belt moving left */
    var hover = false, focus = false, dragging = false, dragged = false;
    var lastX = 0, lastT = 0, dragV = 0;

    function wrap() {
      if (!W) return;
      while (x <= -W) x += W;
      while (x > 0) x -= W;
    }
    function paint() {
      belt.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
    }

    reel.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') hover = true;
    });
    reel.addEventListener('pointerleave', function () {
      hover = false;
      dragged = false;
    });
    reel.addEventListener('focusin', function () {
      /* Focus that lands mid-press came from the click, never the keyboard. */
      focus = !dragging && reel.matches(':focus-visible');
    });
    reel.addEventListener('focusout', function () { focus = false; });

    reel.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      dragV = 0;
      lastX = e.clientX;
      lastT = performance.now();
      reel.classList.add('is-dragging');
      try { reel.setPointerCapture(e.pointerId); } catch (err) {}
    });
    reel.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now();
      var dx = e.clientX - lastX;
      var dt = Math.max((now - lastT) / 1000, 0.001);
      x += dx;
      wrap();
      paint();
      /* Smoothed release velocity, in the belt's sign (left = positive). */
      dragV = dragV * 0.6 + (-dx / dt) * 0.4;
      lastX = e.clientX;
      lastT = now;
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      dragged = true;
      reel.classList.remove('is-dragging');
      /* A pointer held still before letting go throws nothing. */
      if (performance.now() - lastT > 80) dragV = 0;
      v = Math.max(-MAX_FLING, Math.min(MAX_FLING, dragV));
    }
    reel.addEventListener('pointerup', release);
    reel.addEventListener('pointercancel', release);
    reel.addEventListener('lostpointercapture', release);

    reel.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      x += e.key === 'ArrowLeft' ? NUDGE : -NUDGE;
      wrap();
      paint();
    });

    /* Asleep off screen. Starts awake, so a missing observer never
       leaves the belt still. */
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { last = performance.now(); requestAnimationFrame(tick); }
      }).observe(reel);
    }

    var last = performance.now();
    function tick(now) {
      if (!visible) return;
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!dragging) {
        var slow = (hover && !dragged) || focus;
        var target = speed * (slow ? HOVER_FACTOR : 1);
        v += (target - v) * Math.min(1, dt * EASE);
        x -= v * dt;
        wrap();
        paint();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
