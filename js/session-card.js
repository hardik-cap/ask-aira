/* One-time playback of the two session cards in the questions section
   (.feat__card--session and .feat__card--journey).

   The markup ships in its FINISHED state (struck tasks, checks, chips,
   drawn chart, built flow) so no-JS and reduced-motion readers see the
   real cards. With motion allowed, each card is armed hidden on load and,
   the first time it scrolls into view, replays its session:

   - Audience card: message -> task list (spinner, then strike plus check,
     one task at a time) -> the produced artifact chip -> the chart draws.
   - Journey card: message -> artifact chip -> canvas ground -> the flow
     builds top-down (entry node, connectors grow, then each level).

   State lives in classes; every visual rule is in home.css behind the
   .is-armed gate. */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  function at(ms, fn) { window.setTimeout(fn, ms); }

  function watch(card, play) {
    card.classList.add('is-armed');
    var played = false;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !played) {
          played = true;
          io.disconnect();
          play(card);
          break;
        }
      }
    }, {
      /* Fire as soon as the card meaningfully enters: on phones the card is
         taller than half the viewport, and a higher threshold leaves it
         sitting as a blank white box while the visitor scrolls into it. */
      threshold: 0.15,
      rootMargin: '0px 0px -10% 0px'
    });
    io.observe(card);
  }

  var session = document.querySelector('.feat__card--session');
  if (session) {
    watch(session, function (card) {
      var tasks = card.querySelectorAll('.feat__task');
      /* Compressed so both cards finish together when they play side by
         side; the journey card's ~2.6s total is the pace-setter. Relative
         lengths still follow the printed timings (1.2s / 0.9s / 1.4s). */
      var runFor = [350, 300, 400];

      at(0, function () { card.classList.add('s-msg'); });
      at(350, function () { card.classList.add('s-head'); });

      var t = 500;
      Array.prototype.forEach.call(tasks, function (task, i) {
        at(t, function () { task.classList.add('is-on'); });
        at(t + (runFor[i] || 350), function () { task.classList.add('is-done'); });
        t += (runFor[i] || 350) + 70;
      });

      at(t + 150, function () { card.classList.add('s-artifact'); });
      at(t + 300, function () { card.classList.add('s-chart'); });
    });
  }

  var journey = document.querySelector('.feat__card--journey');
  if (journey) {
    watch(journey, function (card) {
      var entry = card.querySelector('.feat__node--entry');
      var paths = card.querySelectorAll('.feat__path');

      at(0, function () { card.classList.add('s-msg'); });
      at(450, function () { card.classList.add('s-artifact'); });
      at(900, function () { card.classList.add('s-canvas'); });
      at(1150, function () { if (entry) entry.classList.add('is-in'); });
      at(1400, function () { card.classList.add('s-split'); });

      for (var row = 0; row < 3; row++) {
        (function (r) {
          at(1650 + r * 300, function () {
            Array.prototype.forEach.call(paths, function (path) {
              if (path.children[r]) path.children[r].classList.add('is-in');
            });
          });
        })(row);
      }
    });
  }
})();
