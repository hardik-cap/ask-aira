/* Accordion. Exactly one item open per [data-accordion] group; opening an
   item swaps the matching panel inside the sibling [data-acc-figs] well,
   which is how the differentiators section keeps its illustration in sync.
   Markup contract: .acc__item[data-acc-item] > h3 > button.acc__btn
   (aria-expanded) + .acc__panel.

   OPT-IN AUTO-ADVANCE (22 Sep): data-acc-cycle="6000"
   walks the list on a timer, with the open row's .acc__bar filling as it
   goes. Same clock discipline as js/qbar.js: .is-running is added in the
   SAME frame as the timeout, so the fill and the advance cannot drift.

   The cycle yields to the reader. It pauses while the pointer is inside the
   group or focus is within it, and a click stops it for good, because
   someone who has chosen a row is reading it and should not be moved off. */
(function () {
  'use strict';

  document.querySelectorAll('[data-accordion]').forEach(function (acc) {
    /* .is-live is what lets the CSS collapse closed panels: with the script
       off the class never lands and every answer reads open (same gate the
       askstory walkthrough uses). */
    acc.classList.add('is-live');
    var items = Array.prototype.slice.call(acc.querySelectorAll('[data-acc-item]'));
    var figsWrap = acc.parentElement.querySelector('[data-acc-figs]');
    var figs = figsWrap ? Array.prototype.slice.call(figsWrap.children) : [];

    function setOpen(idx) {
      items.forEach(function (item, i) {
        var open = i === idx;
        item.classList.toggle('is-open', open);
        item.querySelector('.acc__btn').setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      figs.forEach(function (fig, i) {
        fig.classList.toggle('is-active', i === idx);
      });
    }

    /* ---- Optional auto-advance ---------------------------------------- */
    var cycleMs = parseInt(acc.getAttribute('data-acc-cycle'), 10);
    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* No timer under reduced motion: the fill IS the animation, and a list
       that moves on its own is exactly what that setting asks us not to do. */
    var cycling = !!cycleMs && cycleMs > 0 && !reduce;
    var timer = null;
    var held = false;
    var current = 0;

    function clearBars() {
      items.forEach(function (item) {
        var bar = item.querySelector('.acc__bar');
        if (bar) bar.classList.remove('is-running');
      });
    }

    function arm() {
      if (timer) { clearTimeout(timer); timer = null; }
      clearBars();
      if (!cycling || held) return;
      var bar = items[current] && items[current].querySelector('.acc__bar');
      if (bar) {
        /* Restart the fill from zero: removing the class above and adding it
           back in the same task would be coalesced into no change at all, so
           the layout is read in between to force the reflow. */
        void bar.offsetWidth;
        bar.style.setProperty('--acc-dur', cycleMs + 'ms');
        bar.classList.add('is-running');
      }
      timer = setTimeout(function () {
        timer = null;
        open((current + 1) % items.length);
      }, cycleMs);
    }

    function open(idx) {
      current = idx;
      setOpen(idx);
      arm();
    }

    function stop() {
      cycling = false;
      if (timer) { clearTimeout(timer); timer = null; }
      clearBars();
    }

    items.forEach(function (item, i) {
      item.querySelector('.acc__btn').addEventListener('click', function () {
        /* A click is a choice, so the timer retires for the rest of the
           visit rather than moving the reader off what they just picked. */
        stop();
        /* The open item stays open: the figure well always has a subject. */
        if (!item.classList.contains('is-open')) setOpen(i);
        current = i;
      });
    });

    if (cycling) {
      /* Pause, not stop: a pointer resting over the list is reading it. */
      acc.addEventListener('pointerenter', function () { held = true; arm(); });
      acc.addEventListener('pointerleave', function () { held = false; arm(); });
      acc.addEventListener('focusin', function () { held = true; arm(); });
      acc.addEventListener('focusout', function () {
        if (!acc.contains(document.activeElement)) { held = false; arm(); }
      });
      /* Off-screen the timer would advance through the whole list unseen and
         land the reader mid-set. */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { held = !e.isIntersecting; arm(); });
        }, { threshold: 0.25 }).observe(acc);
      }
    }

    /* The side well is hidden below 992px, so each item carries a clone of
       its figure inside its own panel, revealed by the page CSS at phone
       widths. Cloned once at init, so a real <img> dropped into the well
       later travels with it. */
    figs.forEach(function (fig, i) {
      var body = items[i] && items[i].querySelector('.acc__body');
      if (!body) return;
      var clone = fig.cloneNode(true);
      clone.className = 'acc__fig';
      clone.setAttribute('aria-hidden', 'true');
      body.appendChild(clone);
    });

    open(0);
  });
})();
