/* ==========================================================================
   aiRA — /events filter (10 Oct). One status toggle (All / Upcoming / Past)
   over the grid's [data-status] cards; aria-pressed carries the state and a
   polite live region reports the count. The search box came out on 10 Oct.
   THE ACTIVE STATE SLIDES: one .evfilter__pill is measured off the pressed
   button (offsetLeft / offsetWidth) and moved there; CSS animates it. The
   script adds .is-live, which is what hands the fill from the button to the
   pill, so with it off the pressed button simply wears the fill itself.
   Progressive enhancement: with the script off every card shows.
   ========================================================================== */

(function () {
  'use strict';

  var bar = document.querySelector('[data-evfilter]');
  var grid = document.querySelector('[data-evfilter-grid]');
  if (!bar || !grid) return;

  var pill = bar.querySelector('.evfilter__pill');
  var count = document.querySelector('[data-evfilter-count]');
  var picks = Array.prototype.slice.call(bar.querySelectorAll('[data-evfilter-pick]'));
  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-status]'));
  var want = 'all';

  function place() {
    if (!pill) return;
    var on = bar.querySelector('[aria-pressed="true"]');
    if (!on) return;
    pill.style.setProperty('--x', on.offsetLeft + 'px');
    pill.style.setProperty('--w', on.offsetWidth + 'px');
  }

  function apply() {
    var shown = 0;
    picks.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-evfilter-pick') === want ? 'true' : 'false');
    });
    cards.forEach(function (c) {
      var ok = want === 'all' || c.getAttribute('data-status') === want;
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (count) count.textContent = shown === 1 ? '1 event' : shown + ' events';
    place();
  }

  picks.forEach(function (b) {
    b.addEventListener('click', function () {
      want = b.getAttribute('data-evfilter-pick');
      apply();
    });
  });

  if (pill) {
    place();
    /* First placement without a slide, then hand over to the pill. */
    requestAnimationFrame(function () { bar.classList.add('is-live'); });
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }
})();
