/* ==========================================================================
   aiRA — proof logo grid (19 Sep, promptwatch book-a-demo reference).

   Hairline-gapped tiles under the hero; every few seconds one logo resettles
   into another seat. Two kinds of move: with spare logos on the bench, a
   benched mark replaces a seated one (the seated one goes to the bench);
   with no bench yet, a seated mark moves to an empty tile. Either way the
   grid never shows the same brand twice.

   Everything visible ships in the markup, so with JS off the grid is simply
   still. New logos are added to [data-logo-bench] as the same .lgrid__logo
   spans the tiles use, and this script folds them in with no other change.
   ========================================================================== */

(function () {
  'use strict';

  var HOLD = 2600;   /* ms between moves */
  var MOVE = 240;    /* ms for the out fade; matches the CSS transition */

  var grid = document.querySelector('[data-logo-grid]');
  if (!grid) return;
  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.lgrid__tile'));
  if (tiles.length < 2) return;
  var bench = document.querySelector('[data-logo-bench]');

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  function logoOf(tile) { return tile.querySelector('.lgrid__logo'); }
  function benched() {
    return bench
      ? Array.prototype.slice.call(bench.querySelectorAll('.lgrid__logo'))
      : [];
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* One logo leaves its seat, one arrives; the classes drive the fades. */
  function land(logo, tile) {
    tile.appendChild(logo);
    logo.classList.add('is-in');
    window.setTimeout(function () { logo.classList.remove('is-in'); }, MOVE + 60);
  }

  function tick() {
    var filled = tiles.filter(logoOf);
    var empty = tiles.filter(function (t) { return !logoOf(t); });
    var pool = benched();

    if (pool.length && filled.length) {
      /* Swap a benched brand in for a seated one. */
      var seatTile = pick(filled);
      var outgoing = logoOf(seatTile);
      var incoming = pick(pool);
      outgoing.classList.add('is-out');
      window.setTimeout(function () {
        outgoing.classList.remove('is-out');
        bench.appendChild(outgoing);
        land(incoming, seatTile);
      }, MOVE);
    } else if (filled.length && empty.length) {
      /* No bench yet: a seated brand resettles into an empty tile. */
      var from = pick(filled);
      var to = pick(empty);
      var logo = logoOf(from);
      logo.classList.add('is-out');
      window.setTimeout(function () {
        logo.classList.remove('is-out');
        land(logo, to);
      }, MOVE);
    }
  }

  var timer = null;
  var onScreen = false;

  function run() {
    if (timer || !onScreen || reduce.matches) return;
    timer = setInterval(tick, HOLD);
  }
  function halt() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  /* Off screen it is invisible and still costs a layout every few seconds,
     so it only runs while the grid is in view. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) run(); else halt();
    }, { threshold: 0.2 }).observe(grid);
  } else {
    onScreen = true;
    run();
  }

  function onReduceChange() {
    if (reduce.matches) halt(); else run();
  }
  if (reduce.addEventListener) reduce.addEventListener('change', onReduceChange);
  else if (reduce.addListener) reduce.addListener(onReduceChange);
})();
