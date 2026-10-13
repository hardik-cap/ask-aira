/* ==========================================================================
   aiRA — the floating "Request a seat" pill on event pages (10 Oct).
   Progressive enhancement: with the script off the bar stays hidden and the
   page still carries two "Request a seat" buttons, in the hero and the close.
   It shows the bar only while NEITHER of those is on screen: once the hero's
   buttons ([data-evbar-watch]) have scrolled above the viewport, and not while
   the closing card's button ([data-evbar-stop]) is in view, so two copies of
   the same ask are never visible at once.
   ========================================================================== */

(function () {
  'use strict';

  var bar = document.querySelector('[data-evbar]');
  var watch = document.querySelector('[data-evbar-watch]');
  if (!bar || !watch || !('IntersectionObserver' in window)) return;
  var stop = document.querySelector('[data-evbar-stop]');

  bar.hidden = false;
  var heroGone = false, closeShown = false;

  function sync() {
    var on = heroGone && !closeShown;
    bar.classList.toggle('is-on', on);
    /* Off screen it must not be reachable by Tab either. */
    var link = bar.querySelector('a');
    if (link) link.tabIndex = on ? 0 : -1;
    bar.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  new IntersectionObserver(function (entries) {
    var e = entries[0];
    /* Gone only once it has left through the TOP: before the visitor has
       scrolled to it, the hero is simply below the fold on a short screen. */
    heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
    sync();
  }).observe(watch);

  if (stop) {
    new IntersectionObserver(function (entries) {
      closeShown = entries[0].isIntersecting;
      sync();
    }).observe(stop);
  }

  sync();
})();
