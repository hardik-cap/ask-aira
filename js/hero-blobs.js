/* /about's hero blobs, treated as clouds (28 Sep, user: "can we treat them as
   clouds? so with mouse interaction they disband").

   Progressive enhancement over a field that is already complete in CSS: with
   this file absent the blobs still fade in and drift, and nothing on the page
   refers to it. All it adds is the parting.

   IT OWNS ONE PROPERTY, `translate`, and nothing else. The entrance animation
   owns `scale` and the drift owns `transform`, so the three compose in the
   order the spec fixes (translate, rotate, scale, transform) and never
   overwrite one another. Writing to `transform` here would have killed the
   drift outright.

   THE EASING IS IN THE STYLESHEET, not here. The script writes a target and
   the transition carries it, so a pointer that stops moving costs nothing and
   the settle back when it leaves costs nothing either. The alternative, easing
   a current value toward a target every frame, keeps a rAF loop alive for as
   long as the page is open for no visible gain. */
(function () {
  'use strict';

  var field = document.querySelector('[data-blob-field]');
  if (!field) return;

  /* A pointer is required, and reduced motion is respected. On a touch screen
     there is nothing to part the clouds with, and the listener would only cost
     a frame on every tap. */
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var blobs = Array.prototype.slice.call(field.querySelectorAll('.abhero__blob'));
  if (!blobs.length) return;

  /* How close the pointer has to be before a blob moves, and how far it goes
     at the very centre. The radius is generous because these are 200-400px
     soft forms: a tight one makes them flick rather than part. */
  var REACH = 320;
  var THROW = 110;

  var hero = field.parentElement;
  var centres = [];
  var awake = true;

  function measure() {
    var f = field.getBoundingClientRect();
    centres = blobs.map(function (b) {
      var r = b.getBoundingClientRect();
      /* Measured against the FIELD, not the viewport, so a scroll does not
         invalidate them: only a resize does. */
      return {
        x: r.left - f.left + r.width / 2,
        y: r.top - f.top + r.height / 2,
        drag: parseFloat(getComputedStyle(b).getPropertyValue('--drag')) || 1
      };
    });
  }

  function scatter(px, py) {
    for (var i = 0; i < blobs.length; i++) {
      var c = centres[i];
      if (!c) continue;
      var dx = c.x - px;
      var dy = c.y - py;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > REACH || d === 0) {
        blobs[i].style.translate = '';
        continue;
      }
      /* Squared falloff: the push is strong right under the pointer and fades
         to nothing at the edge of the reach, which is what reads as parting
         rather than as a shove. */
      var force = (1 - d / REACH);
      force *= force;
      var k = (THROW * force * c.drag) / d;
      blobs[i].style.translate = Math.round(dx * k) + 'px ' + Math.round(dy * k) + 'px';
    }
  }

  function settle() {
    for (var i = 0; i < blobs.length; i++) blobs[i].style.translate = '';
  }

  /* Throttled on a TIMESTAMP rather than deferred into rAF. pointermove fires
     far faster than the compositor can use either way, but a timestamp writes
     on the first move instead of a frame later, which is the difference
     between the clouds answering the pointer and lagging it. It also keeps the
     whole path synchronous, so the behaviour can actually be tested. */
  var lastWrite = 0;
  function onMove(e) {
    if (!awake) return;
    var now = e.timeStamp || Date.now();
    if (now - lastWrite < 16) return;
    lastWrite = now;
    var f = field.getBoundingClientRect();
    scatter(e.clientX - f.left, e.clientY - f.top);
  }

  measure();
  /* The pointer is tracked on the HERO, not the field: the field is the
     top-right corner the blobs live in, and a cloud should start moving as you
     approach it rather than only once you are inside it. */
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', settle, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    settle();
    resizeTimer = setTimeout(measure, 160);
  }, { passive: true });

  /* Nothing runs while the hero is off screen. Scrolled past, a pointermove
     over the page below would otherwise still be measured and written. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      awake = entries[0].isIntersecting;
      if (!awake) settle();
    }, { threshold: 0 }).observe(hero);
  }
})();
