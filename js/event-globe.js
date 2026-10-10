/* ==========================================================================
   aiRA — the globe in /events' hero band (10 Oct, sv-animations' Globe by
   way of theproductfolks.com: a dome rising into the band's foot, clipped by
   its container so only the top shows).

   Same vendored cobe as js/globe.js (no build step, no npm), dark-tuned for
   the band. NO MARKERS since 10 Oct (user: "remove showing location in
   globe"); it carried one per workshop city for an hour, and that version is
   in git. Unlike the closing-card globe this one is
   INTERACTIVE: a horizontal drag spins it (touch-action: pan-y in the CSS is
   what keeps vertical scroll working over it). Autorotation parks under
   reduced motion; the drag still works there, being user-initiated.
   ========================================================================== */

import createGlobe from '/js/vendor/cobe.js';

(function () {
  'use strict';

  var canvas = document.querySelector('.evhub__globe canvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* cobe requires a markerColor even with no markers; kept in case they
     return (a WebGL uniform cannot read a custom property, the js/globe.js
     note). */
  var MARKER = [0.45, 0.5, 1];

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var globe = null;
  var phi = 4.3; /* opens on the three US cities */
  var dragPhi = 0;
  var dragging = null;

  canvas.addEventListener('pointerdown', function (e) {
    dragging = { x: e.clientX, phi: dragPhi };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragging) dragPhi = dragging.phi + (e.clientX - dragging.x) * 0.006;
  });
  canvas.addEventListener('pointerup', function () { dragging = null; });
  canvas.addEventListener('pointercancel', function () { dragging = null; });

  function mount() {
    if (globe) { globe.toggle(true); return; }
    globe = createGlobe(canvas, {
      devicePixelRatio: DPR,
      width: canvas.clientWidth * DPR,
      height: canvas.clientHeight * DPR,
      phi: phi,
      theta: 0.12,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 13000,
      mapBrightness: 6.5,
      baseColor: [0.16, 0.17, 0.27],
      markerColor: MARKER,
      glowColor: [0.08, 0.09, 0.16],
      markers: [],
      /* Width and height fed back every frame: phenomenon owns the backing
         store and cobe bakes the option into a uniform once; see the long
         note in js/globe.js. */
      onRender: function (state) {
        if (!reduce.matches && !dragging) phi += 0.0032;
        state.phi = phi + dragPhi;
        state.width = canvas.width;
        state.height = canvas.height;
        return state;
      }
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) mount();
      else if (globe) globe.toggle(false);
    }, { threshold: 0.1 }).observe(canvas);
  } else {
    mount();
  }
})();
