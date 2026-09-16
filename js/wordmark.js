/* Footer wordmark torch.

   The mark is drawn twice: an outline that is always visible, and a filled
   copy masked by a radial gradient. This moves that gradient to the pointer,
   so only the letters under the cursor light up.

   All it writes are two custom properties, --torch-x / --torch-y, in the
   element's own pixel space. The mask lives in global.css; nothing here knows
   what the effect looks like.

   The footer is injected asynchronously by js/components.js, so binding waits
   for aira:components-ready rather than DOMContentLoaded. */
(function () {
  'use strict';

  /* Coarse pointers have nothing to follow, and the CSS hides the layer
     there anyway; skip the listeners entirely rather than tracking taps. */
  if (!window.matchMedia('(hover: hover)').matches) return;

  function bind() {
    var wrap = document.querySelector('.footer__wordmark');
    var stack = wrap && wrap.querySelector('.footer__wordmark-stack');
    if (!stack || stack.dataset.torch) return;
    stack.dataset.torch = '1';

    var pending = null;
    var frame = 0;

    function paint() {
      frame = 0;
      if (!pending) return;
      wrap.style.setProperty('--torch-x', pending.x + 'px');
      wrap.style.setProperty('--torch-y', pending.y + 'px');
    }

    /* Listen on the stack, not the padded wrapper: the pointer should light
       the mark when it is over the artwork, not over the gap above it. */
    stack.addEventListener('pointermove', function (e) {
      var r = stack.getBoundingClientRect();
      pending = { x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) };
      /* One write per frame: pointermove fires far faster than the compositor
         can repaint a mask this large. */
      if (!frame) frame = requestAnimationFrame(paint);
    });

    stack.addEventListener('pointerenter', function () {
      wrap.classList.add('is-lit');
    });

    stack.addEventListener('pointerleave', function () {
      wrap.classList.remove('is-lit');
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      pending = null;
    });
  }

  if (document.querySelector('.footer__wordmark-stack')) bind();
  document.addEventListener('aira:components-ready', bind);
})();
