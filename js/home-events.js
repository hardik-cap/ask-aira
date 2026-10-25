/* ==========================================================================
   aiRA homepage: the events carousel (22 Oct, laravel.com's homepage
   events section; user: "make its carousal", then "put arrows like laravel
   on the image, also make it draggable").
   The track is a CSS scroll-snap scroller and works with this script off;
   this adds the two overlaid arrow buttons (shipped [hidden], un-hidden
   here) and a MOUSE drag. Touch needs nothing: the track is a native
   scroller under a thumb already.
   Drag lessons carried from js/evreel.js: a press only becomes a drag
   after 6px of travel, the click that ends a drag is swallowed on a
   capture listener, and the swallow flag clears on pointerdown so a
   cancelled drag cannot eat the next real click.
   ========================================================================== */
(function () {
  'use strict';

  var track = document.querySelector('[data-ecar]');
  var nav = document.querySelector('[data-ecar-nav]');
  if (!track || !nav) return;

  var prev = nav.querySelector('[data-ecar-prev]');
  var next = nav.querySelector('[data-ecar-next]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // One slide plus the track's gap: the scroll step and the snap pitch.
  function step() {
    var s = track.firstElementChild;
    return s ? s.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth;
  }

  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  function go(dir) {
    track.scrollBy({ left: dir * step(), behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  // Ends: a 40px tolerance so a snap that settles 1px short still counts.
  function sync() {
    prev.disabled = track.scrollLeft < 40;
    next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 40;
  }
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();

  /* Mouse drag. Snap is stood down while the pointer holds the belt
     (scroll-snap-type fights a scripted scrollLeft) and the release
     settles on the nearest slide. */
  var drag = null, swallow = false;

  track.addEventListener('pointerdown', function (e) {
    swallow = false;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, on: false, id: e.pointerId };
  });
  track.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.on) {
      if (Math.abs(dx) < 6) return;
      drag.on = true;
      track.classList.add('is-drag');
      try { track.setPointerCapture(drag.id); } catch (err) {}
    }
    track.scrollLeft = drag.left - dx;
  });
  function endDrag() {
    if (!drag) return;
    if (drag.on) {
      swallow = true;
      track.classList.remove('is-drag');
      var w = step();
      track.scrollTo({
        left: Math.round(track.scrollLeft / w) * w,
        behavior: reduce.matches ? 'auto' : 'smooth'
      });
    }
    drag = null;
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  // A drag that ends on a slide must not open it.
  track.addEventListener('click', function (e) {
    if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; }
  }, true);

  track.classList.add('is-js');
  nav.hidden = false;
})();
