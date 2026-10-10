/* ==========================================================================
   aiRA — the countdown on upcoming event pages (10 Oct). Reads the start and
   end from data-start / data-end (ISO with offset, the JSON-LD's own times)
   and ticks once a second:
   - before the start: "Starts in" with days, hours, minutes, seconds;
   - between start and end: "Happening now", the cells hidden;
   - after the end: "This event has ended", the cells hidden.
   The block is [hidden] in the markup and only shown here, so a page with
   the script off never shows a frozen 00. The digits are aria-hidden; the
   sr-only line is rewritten only when the MINUTE changes, and is not a live
   region, so a screen reader is never interrupted by a ticking clock.
   ========================================================================== */

(function () {
  'use strict';

  document.querySelectorAll('[data-evcount]').forEach(function (el) {
    var start = Date.parse(el.getAttribute('data-start'));
    var end = Date.parse(el.getAttribute('data-end'));
    if (isNaN(start)) return;
    if (isNaN(end)) end = start;

    var label = el.querySelector('[data-evcount-label]');
    var cells = el.querySelector('.evcount__cells');
    var sr = el.querySelector('[data-evcount-sr]');
    var unit = {};
    el.querySelectorAll('[data-evcount-unit]').forEach(function (b) {
      unit[b.getAttribute('data-evcount-unit')] = b;
    });
    var lastMinute = -1;
    var timer = null;

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

    function tick() {
      var now = Date.now();
      if (now >= start) {
        var live = now < end;
        label.textContent = live ? 'Happening now' : 'This event has ended';
        cells.hidden = true;
        if (sr) sr.textContent = '';
        el.classList.toggle('is-live', live);
        el.classList.toggle('is-over', !live);
        if (!live && timer) { clearInterval(timer); timer = null; }
        return;
      }
      var t = Math.floor((start - now) / 1000);
      var d = Math.floor(t / 86400);
      var h = Math.floor((t % 86400) / 3600);
      var m = Math.floor((t % 3600) / 60);
      var s = t % 60;
      unit.d.textContent = pad(d);
      unit.h.textContent = pad(h);
      unit.m.textContent = pad(m);
      unit.s.textContent = pad(s);
      var mins = Math.floor(t / 60);
      if (sr && mins !== lastMinute) {
        lastMinute = mins;
        sr.textContent = 'Starts in ' + plural(d, 'day') + ', ' + plural(h, 'hour') + ' and ' + plural(m, 'minute') + '.';
      }
    }

    el.hidden = false;
    tick();
    timer = setInterval(tick, 1000);
  });
})();
