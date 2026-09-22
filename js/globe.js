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

  var BASE_THETA = 0.24;

  /* Primary/600 #3338D2, the brand since the 20 Sep palette swap. It was
     hard-coded to the retired #526CF6, which tokens.css no longer contains.
     A WebGL uniform cannot read a custom property, so this is the one place
     outside tokens.css that carries a colour, and it has to be updated by
     hand when the brand moves. */
  var MARKER = [51 / 255, 56 / 255, 210 / 255];

  /* The same cap phenomenon is given below: it sizes the backing store as
     clientWidth * devicePixelRatio, so both have to agree. */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var globe = null;
  var onScreen = false;
  var phi = 0;

  function mount() {
    if (globe) { globe.toggle(true); return; }
    globe = createGlobe(canvas, {
      devicePixelRatio: DPR,
      /* Seeded from the real box so the first frame is already right; every
         frame after this is corrected in onRender. See the note there. */
      width: canvas.clientWidth * DPR,
      height: canvas.clientHeight * DPR,
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
      /* THE RESOLUTION HAS TO BE FED BACK EVERY FRAME.
         phenomenon owns the backing store: its resize() sets
         canvas.width = canvas.clientWidth * devicePixelRatio, and it rebinds
         that to window's resize event. cobe, though, bakes the `width` and
         `height` options into a shader uniform ONCE at setup. So the two only
         agree when the CSS box times the pixel ratio happens to equal what
         was passed, and any other combination draws the sphere at the wrong
         scale around the wrong centre: the shipped values (1200 square,
         against a 600px box) put a quarter of a giant globe in the corner on
         a 1x display, and missed again at the 420px box below 992px.
         Returning width and height here is cobe's own escape hatch for this
         (it updates the uniform when onRender supplies them), so reading the
         live buffer keeps the two locked together through every resize and
         breakpoint without a remount. */
      onRender: function (state) {
        if (!reduce.matches) phi += 0.003;
        state.phi = phi;
        state.width = canvas.width;
        state.height = canvas.height;
        return state;
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
