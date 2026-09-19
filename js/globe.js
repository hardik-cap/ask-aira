/* ==========================================================================
   aiRA — globe in the closing CTA card (19 Sep).

   cobe, vendored in /js/vendor (this site has no build step), driving the
   canvas in .close-globe. It rotates slowly on its own and takes no pointer
   interaction; with prefers-reduced-motion it draws and holds still.

   cobe 0.6 has no update() method: rotation happens by advancing phi inside
   the onRender callback that cobe calls from its own render loop, and
   toggle(false) is what pauses that loop while the card is off screen.
   ========================================================================== */

import createGlobe from '/js/vendor/cobe.js';

(function () {
  'use strict';

  var canvas = document.querySelector('.close-globe__canvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  var SIZE = 600;          /* CSS pixels of the square canvas box */
  var BASE_THETA = 0.24;

  /* Primary/400 #526CF6 for the markers. */
  var MARKER = [82 / 255, 108 / 255, 246 / 255];

  var globe = null;
  var onScreen = false;
  var phi = 0;

  function mount() {
    if (globe) { globe.toggle(true); return; }
    globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: SIZE * 2,
      height: SIZE * 2,
      phi: 0,
      theta: BASE_THETA,
      dark: 0,
      diffuse: 1.7,
      mapSamples: 13000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: MARKER,
      glowColor: [1, 1, 1],
      /* Where the customer brands on this site actually live. */
      markers: [
        { location: [12.97, 77.59], size: 0.05 },   /* Bengaluru */
        { location: [25.20, 55.27], size: 0.04 },   /* Dubai */
        { location: [1.35, 103.82], size: 0.04 },   /* Singapore */
        { location: [-6.20, 106.85], size: 0.04 },  /* Jakarta */
        { location: [40.71, -74.01], size: 0.05 },  /* New York */
        { location: [51.51, -0.13], size: 0.03 }    /* London */
      ],
      onRender: function (state) {
        if (!reduce.matches) phi += 0.003;
        state.phi = phi;
      }
    });
  }

  /* Off screen it would render for nobody; the observer gates cobe's own
     loop the same way the logo grid's does. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) mount();
      else if (globe) globe.toggle(false);
    }, { threshold: 0.1 }).observe(canvas);
  } else {
    mount();
  }
})();
