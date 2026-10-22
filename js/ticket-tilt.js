/* ==========================================================================
   aiRA: the closing ticket TILTS UNDER THE POINTER (21 Oct, user: "i need
   the hover moving effect", from an "admit one ticket" React component;
   hand-ported, no React here). Any [data-tilt] element leans away from
   wherever the mouse is, as a paper ticket does when you press on it, and
   eases back flat when the pointer leaves.
   It only writes two custom properties, --rx and --ry; event.css turns
   them into perspective(...) rotateX rotateY on the card, and only once
   .reveal is done with transform (.is-in), so the two never fight. (The
   individual `rotate` property cannot do this: it applies after
   `transform`, so a perspective there would not foreshorten it.)
   data-tilt-max = the largest lean in degrees (default 3; the card is wide,
   and a wide card at the usual 10 to 15 reads as seasick).
   Mouse only: off for touch, off under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduce.matches) return;

  Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
    var max = parseFloat(el.getAttribute('data-tilt-max')) || 3;
    var raf = null, px = 0, py = 0;

    function apply() {
      raf = null;
      var r = el.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, (px - r.left) / r.width * 2 - 1));
      var ny = Math.max(-1, Math.min(1, (py - r.top) / r.height * 2 - 1));
      // the edge under the pointer dips away: right of centre turns +Y,
      // below centre turns -X
      el.style.setProperty('--rx', (-ny * max).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (nx * max).toFixed(2) + 'deg');
    }

    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      el.classList.add('is-tilting');
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      if (raf === null) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', function () {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
})();
