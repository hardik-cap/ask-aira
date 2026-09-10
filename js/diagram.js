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
    if (window.innerWidth <= 991) return;

    var node = diagram.querySelector('.mech__core-node');
    var sources = diagram.querySelectorAll('.mech__sources img');
    var dests = diagram.querySelectorAll('.mech__dest img');
    if (!node || (!sources.length && !dests.length)) return;

    var box = diagram.getBoundingClientRect();
    if (!box.width) return;

    var n = node.getBoundingClientRect();
    var midY = n.top - box.top + n.height / 2;
    var nodeLeft = n.left - box.left - 4;
    var nodeRight = n.right - box.left + 4;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mech__wires');
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.setAttribute('aria-hidden', 'true');

    var count = 0;
    function wire(x1, y1, x2, y2) {
      var mx = ((x1 + x2) / 2).toFixed(1);
      var d = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
              ' C' + mx + ',' + y1.toFixed(1) +
              ' ' + mx + ',' + y2.toFixed(1) +
              ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);

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

    sources.forEach(function (el) {
      var r = el.getBoundingClientRect();
      wire(r.right - box.left + 10, r.top - box.top + r.height / 2,
           nodeLeft, midY);
    });
    dests.forEach(function (el) {
      var r = el.getBoundingClientRect();
      wire(nodeRight, midY,
           r.left - box.left - 10, r.top - box.top + r.height / 2);
    });

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
