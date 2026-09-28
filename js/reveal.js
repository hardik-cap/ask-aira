/* ==========================================================================
   aiRA — reveal on scroll.

   The base export shipped a .reveal-on-scroll hook that was a no-op: no
   base opacity rule and no observer, so it did nothing and every element
   carrying it was noise. This is the real implementation.

   Contract:
     - .reveal            starts hidden, gains .is-in when it enters view
     - .reveal-stagger    children stagger via a --i custom property
     - No JS, no observer, or reduced motion: everything is shown at once.

   Runs once at parse, then again on 'aira:components-ready', because the
   navbar and footer are injected after this script's first pass.
   ========================================================================== */

(function () {
  'use strict';

  var reduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supported = 'IntersectionObserver' in window;

  var io = supported ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }) : null;

  function process() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('.reveal:not([data-reveal-bound])'));
    if (!nodes.length) return;

    nodes.forEach(function (el) { el.setAttribute('data-reveal-bound', ''); });

    if (reduced || !supported) {
      nodes.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // Index children of stagger groups so CSS can offset transition-delay.
    nodes.forEach(function (el) {
      if (!el.classList.contains('reveal-stagger')) return;
      Array.prototype.slice.call(el.children).forEach(function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    nodes.forEach(function (el) { io.observe(el); });

    // Anything already in view should not wait for a scroll event.
    requestAnimationFrame(function () {
      nodes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    });
  }

  process();
  document.addEventListener('aira:components-ready', process);
})();
