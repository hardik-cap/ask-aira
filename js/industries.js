/* ==========================================================================
   aiRA — homepage industry tabs (18 Sep, the solution-first turn).

   The pills in #industries pick an industry and the stage below re-writes
   itself around it. (The separate questions section and its .askset panels
   folded into this section on 19 Sep; the machinery still accepts any extra
   [data-asksets] group if one ever returns. The section-closing route button
   came out the same day, and with it the data-url/data-cta wiring that kept
   it pointed at the open hub.)

   The cards ship as plain links into the hub pages and every panel ships in
   the markup, so with JS off the section still navigates and the four
   question sets stack below under their own names, finder-style. This script
   upgrades the pair into the ARIA tabs pattern: it adds the roles itself and
   adds .is-tabbed (which is what hides the per-panel names), so a no-JS
   visitor never sees a control that cannot work. Roving tabindex, arrows
   move, one tab stop for the whole strip.
   ========================================================================== */

(function () {
  'use strict';

  var grid = document.querySelector('.inds__grid');
  /* Any number of groups can answer to the same tabs: the stage today, and
     any [data-asksets] group that returns. Keyed by data-industry in each, so
     none has to match the bar's markup order, and adding a group is adding a
     selector here and nothing else. The section's subheading is deliberately
     NOT one of them: it is generic and stays put while the tabs change what
     is underneath it. */
  var groups = Array.prototype.slice.call(
    document.querySelectorAll('[data-asksets], [data-stage]'));
  /* .is-tabbed hides the per-panel headings that the no-JS stack needs, and
     only the askset group has those, so it must not be inferred from document
     order: the stage comes first in the DOM. */
  var wrap = document.querySelector('[data-asksets]');
  if (!grid || !groups.length) return;

  var tabs = Array.prototype.slice.call(grid.querySelectorAll('.inds__card'));

  /* Panels keyed by industry, so markup order never has to match the bar. */
  var panels = {};
  groups.forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (p) {
      var key = p.getAttribute && p.getAttribute('data-industry');
      if (!key) return;
      (panels[key] = panels[key] || []).push(p);
    });
  });
  tabs = tabs.filter(function (t) { return panels[t.getAttribute('data-industry')]; });
  if (tabs.length < 2) return;

  grid.setAttribute('role', 'tablist');
  if (wrap) wrap.classList.add('is-tabbed');

  var thumb = grid.querySelector('.inds__thumb');

  /* The selection pill is one element that travels, so it has to be measured
     against whichever tab is open. Measured rather than guessed, because the
     labels are different widths and the fonts load late. */
  function moveThumb(i) {
    if (!thumb) return;
    var t = tabs[i];
    /* Both reads before either write: reading offsetLeft after setting the
       width forced a second synchronous layout (PageSpeed, 4 Oct). */
    var w = t.offsetWidth, x = t.offsetLeft;
    thumb.style.width = w + 'px';
    thumb.style.transform = 'translateX(' + x + 'px)';
    thumb.classList.add('is-set');
  }

  /* The drawing lives in the section head now, so the shape attribute goes on
     the section itself: everything inside answers to it wherever it sits. */
  var shapeHost = document.getElementById('industries');

  function select(i, focus) {
    /* The drawing morphs with the tab: CSS keys the four figures off this. */
    if (shapeHost) {
      shapeHost.setAttribute('data-shape', tabs[i].getAttribute('data-industry'));
    }
    tabs.forEach(function (t, n) {
      var on = n === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[t.getAttribute('data-industry')].forEach(function (p) {
        p.hidden = !on;
        /* Anything inside a hidden panel never intersects, so js/reveal.js
           never marks it in and it opens at opacity 0. Opening the panel is
           the reveal for its contents. */
        if (on) {
          Array.prototype.forEach.call(p.querySelectorAll('.reveal'), function (el) {
            el.classList.add('is-in');
          });
        }
      });
    });
    moveThumb(i);
    if (focus) tabs[i].focus();
  }

  tabs.forEach(function (t, i) {
    var group = panels[t.getAttribute('data-industry')];
    t.setAttribute('role', 'tab');
    /* aria-controls takes a list, so one tab can own both its panels. */
    t.setAttribute('aria-controls', group.map(function (p) {
      if (!p.id) p.id = 'panel-' + t.getAttribute('data-industry') + '-' + group.indexOf(p);
      return p.id;
    }).join(' '));
    group.forEach(function (panel) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', t.id);
      panel.tabIndex = 0;
    });

    t.addEventListener('click', function (e) {
      /* The card is a link into the hub for no-JS visitors; with JS it
         selects instead, and the route button carries the navigation. */
      e.preventDefault();
      select(i);
    });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });
  });

  /* The prev/next arrow pair came off the deck on 19 Sep; the tablist's own
     arrow keys remain the keyboard path. */
  function currentIndex() {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].classList.contains('is-active')) return i;
    }
    return 0;
  }

  select(0);

  /* Widths settle after the display face loads, so the thumb is placed again
     once it has, and on resize. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { moveThumb(currentIndex()); });
  }
  window.addEventListener('resize', function () { moveThumb(currentIndex()); });
})();
