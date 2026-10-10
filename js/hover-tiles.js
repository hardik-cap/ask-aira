/* Hover tiles (.hovtiles, see components.css): lights the grid cell under
   the pointer and lets it fade when the pointer moves on, the way the
   "Hover Dark Tiles" reference does with a motion div per cell. Here the
   grid is a CSS background and a cell element exists only while it is lit
   or fading. The pointer is read on the host's PARENT, so cells light
   under the copy as well as around it. Fills any empty [data-hover-tiles]
   host; with this off the grid simply never lights. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FADE = reduced ? 0 : 2000;  /* ms, matches the CSS transition */

  document.querySelectorAll('[data-hover-tiles]').forEach(function (host) {
    var zone = host.parentElement;
    if (!zone) return;
    var cells = {};
    var cur = null;

    function pitch() {
      return parseFloat(getComputedStyle(host).getPropertyValue('--hov-pitch')) || 40;
    }

    function light(key, col, row, p) {
      var el = cells[key];
      if (!el) {
        el = document.createElement('i');
        el.className = 'hovtiles__c';
        el.style.transform = 'translate(' + col * p + 'px,' + row * p + 'px)';
        host.appendChild(el);
        cells[key] = el;
      }
      clearTimeout(el._t);
      el.classList.add('is-on');
    }

    function dim(key) {
      var el = cells[key];
      if (!el) return;
      el.classList.remove('is-on');
      el._t = setTimeout(function () {
        if (el.classList.contains('is-on')) return;
        el.remove();
        delete cells[key];
      }, FADE + 100);
    }

    function leave() {
      if (cur) { dim(cur); cur = null; }
    }

    zone.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      if (x < 0 || y < 0 || x >= r.width || y >= r.height) { leave(); return; }
      var p = pitch();
      var col = Math.floor(x / p);
      var row = Math.floor(y / p);
      var key = col + ',' + row;
      if (key === cur) return;
      leave();
      cur = key;
      light(key, col, row, p);
    });
    zone.addEventListener('pointerleave', leave);
  });
})();
