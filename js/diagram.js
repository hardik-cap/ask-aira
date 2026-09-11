/* ==========================================================================
   aiRA — mechanism diagram wires.

   Draws the dashed connectors and their traveling beam pulses between the
   real, measured positions of the source logos, the core node, and the
   channel logos (the Magic UI AnimatedBeam approach: measure fromRef/toRef,
   then draw). Static stretched SVGs cannot touch left-aligned logos of
   varying widths, so the wires are generated here and rebuilt on resize.

   Styling lives in style/pages/home.css under .mech__wires / .mech__beam;
   reduced-motion hides the beams there too.
   ========================================================================== */

(function () {
  'use strict';

  var raf = null;

  function build() {
    var diagram = document.querySelector('.mech__diagram');
    if (!diagram) return;

    var old = diagram.querySelector('.mech__wires');
    if (old) old.remove();

    var stacked = window.innerWidth <= 991;

    var node = diagram.querySelector('.mech__core-node');
    var sources = diagram.querySelectorAll('.mech__sources img');
    var dests = diagram.querySelectorAll('.mech__dest img');
    if (!node || (!sources.length && !dests.length)) return;

    var box = diagram.getBoundingClientRect();
    if (!box.width) return;

    var n = node.getBoundingClientRect();

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mech__wires');
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.setAttribute('aria-hidden', 'true');

    var count = 0;
    function wire(d) {
      var base = document.createElementNS(NS, 'path');
      base.setAttribute('d', d);
      svg.appendChild(base);

      var beam = document.createElementNS(NS, 'path');
      beam.setAttribute('d', d);
      beam.setAttribute('class', 'mech__beam');
      beam.setAttribute('pathLength', '100');
      beam.style.animationDelay = (-count * 1.1).toFixed(1) + 's';
      svg.appendChild(beam);
      count++;
    }
    /* Horizontal S-curve (desktop: columns side by side). */
    function wireH(x1, y1, x2, y2) {
      var mx = ((x1 + x2) / 2).toFixed(1);
      wire('M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
           ' C' + mx + ',' + y1.toFixed(1) +
           ' ' + mx + ',' + y2.toFixed(1) +
           ' ' + x2.toFixed(1) + ',' + y2.toFixed(1));
    }
    /* Vertical S-curve (stacked mobile: blocks above and below the node). */
    function wireV(x1, y1, x2, y2) {
      var my = ((y1 + y2) / 2).toFixed(1);
      wire('M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
           ' C' + x1.toFixed(1) + ',' + my +
           ' ' + x2.toFixed(1) + ',' + my +
           ' ' + x2.toFixed(1) + ',' + y2.toFixed(1));
    }

    if (stacked) {
      /* Wires leave from below the sources block (past its caption) at each
         logo's x, converge on the node top; then fan from below the core's
         captions back out to each channel logo's x at the channels block. */
      var srcBlock = diagram.querySelector('.mech__sources').getBoundingClientRect();
      var coreBlock = diagram.querySelector('.mech__core').getBoundingClientRect();
      var destBlock = diagram.querySelector('.mech__dest').getBoundingClientRect();
      var nodeX = n.left - box.left + n.width / 2;

      sources.forEach(function (el) {
        var r = el.getBoundingClientRect();
        wireV(r.left - box.left + r.width / 2, srcBlock.bottom - box.top + 4,
              nodeX, n.top - box.top - 4);
      });
      dests.forEach(function (el) {
        var r = el.getBoundingClientRect();
        wireV(nodeX, coreBlock.bottom - box.top + 4,
              r.left - box.left + r.width / 2, destBlock.top - box.top - 4);
      });
    } else {
      var midY = n.top - box.top + n.height / 2;
      var nodeLeft = n.left - box.left - 4;
      var nodeRight = n.right - box.left + 4;

      sources.forEach(function (el) {
        var r = el.getBoundingClientRect();
        wireH(r.right - box.left + 10, r.top - box.top + r.height / 2,
              nodeLeft, midY);
      });
      dests.forEach(function (el) {
        var r = el.getBoundingClientRect();
        wireH(nodeRight, midY,
              r.left - box.left - 10, r.top - box.top + r.height / 2);
      });
    }

    diagram.appendChild(svg);
  }

  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(build);
  }

  // Load waits for the logo images, whose final sizes move the endpoints.
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  schedule();
})();

/* The intelligence-layer claims under the core node, one at a time. */
(function () {
  'use strict';
  var sub = document.getElementById('mech-core-sub');
  if (!sub || sub.children.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lines = sub.children;
  var i = 0;
  setInterval(function () {
    lines[i].classList.remove('is-on');
    i = (i + 1) % lines.length;
    lines[i].classList.add('is-on');
  }, 2800);
})();

/* Dot-matrix loader (hex-3 sweep): 19 dots on a hex lattice; two diagonal
   bands sweep across with a centre flash, per the efferd loader's math. */
(function () {
  'use strict';
  var hosts = document.querySelectorAll('.dotspin');
  if (!hosts.length) return;

  var SIZE = 14, DOT = 2, SPEED = 1.45, CYCLE = 1850;
  var cells = [];
  Array.prototype.forEach.call(hosts, function (host) {
    for (var r = -2; r <= 2; r++) {
      var count = 5 - Math.abs(r);
      for (var i = 0; i < count; i++) {
        var x = (i - (count - 1) / 2) * 0.5;
        var y = r * 0.433;
        var el = document.createElement('i');
        el.style.left = (SIZE / 2 + x * 6 - DOT / 2).toFixed(1) + 'px';
        el.style.top = (SIZE / 2 + y * 6.9 - DOT / 2).toFixed(1) + 'px';
        host.appendChild(el);
        cells.push({ x: x, y: y, el: el });
      }
    }
  });

  function tri(v) {
    var w = ((v % 1) + 1) % 1;
    return 1 - Math.abs(w * 2 - 1);
  }
  function paint(phase) {
    var sweep = tri(phase) * 3.9 - 1.95;
    var flashGate = Math.max(0, 1 - Math.abs(sweep) / 0.68);
    for (var j = 0; j < cells.length; j++) {
      var c = cells[j];
      var gateA = Math.max(0, 1 - Math.abs(c.x * 0.86 + c.y * 0.5 - sweep) / 0.55);
      var gateB = Math.max(0, 1 - Math.abs(-c.x * 0.86 + c.y * 0.5 + sweep) / 0.55);
      var dist = Math.sqrt(c.x * c.x + c.y * c.y);
      var flash = flashGate * Math.max(0, 1 - dist / 1.9);
      var wake = 0.16 * Math.max(0, 1 - Math.abs(c.y - sweep * 0.22) / 1.2);
      c.el.style.opacity = Math.min(
        0.96, 0.08 + gateA * 0.7 + gateB * 0.7 + flash * 0.42 + wake
      ).toFixed(3);
    }
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(0.12);
    return;
  }
  function tick(now) {
    paint((now * SPEED / CYCLE) % 1);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
