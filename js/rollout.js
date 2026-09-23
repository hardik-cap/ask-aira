/* rollout.js -- the getting-started timeline on /product (23 Sep)
 *
 * Built from a tryplayground.com reference the user supplied: the phases are
 * boxes you click, and one big line graph under them grows to the phase you
 * chose. The reference draws its whole curve and only slides a marker along
 * it; here the curve itself is clipped back, which is what the user asked for
 * ("start from 0, then based on click it increases").
 *
 * PROGRESSIVE ENHANCEMENT, the same shape js/qbar.js uses. Everything this
 * script needs is already in the markup: the four phases are an <ol> and the
 * curve is a real <svg>. With the script off you get four readable phases and
 * a chart at full extent, and nothing is missing except the interaction. This
 * script only adds behaviour:
 *
 *   - it wraps each phase TITLE in a real <button>, stretched over its whole
 *     box with a pseudo-element, so the box is clickable without the markup
 *     having to put a <button> around an <h3> (which is invalid: a button
 *     takes phrasing content only), and gives each box a state mark: an empty
 *     ring ahead, a filled ring for the chosen phase, a check for the phases
 *     already behind it;
 *   - it lays four phase COLUMNS under the curve, each one a click target
 *     with its phase number in an axis strip, so the chart answers "where am
 *     I" on its own, and it marks the parity gate as the line between the
 *     third column and the fourth, which is where it falls;
 *   - it clips the curve back to the chosen phase by setting --p on the
 *     chart, which CSS turns into a clip-path inset;
 *   - it moves each phase's OUTPUT onto the graph, reading it out of that
 *     phase's own box so the two cannot drift, and sends the box's copy to
 *     .sr-only; and
 *   - it places the marker, its drop line, the phase nodes and the pill, all
 *     of which are plain HTML rather than SVG, because the chart is drawn with
 *     preserveAspectRatio="none" and a <circle> inside it would come out an
 *     ellipse at every width but one.
 *
 * Each phase ENDS at its point: the point is where its output lands, so the
 * four sit at the right edge of their columns. They are NOT derived from
 * durations: Capillary publishes two to four weeks in total and does not
 * publish a per-phase split, so the columns are equal.
 */
(function () {
  'use strict';

  var STEP_T = [0.25, 0.50, 0.75, 1.00];
  /* The phase whose end is the parity gate: brand testing is where the
     parity report is signed off, and go live is what the gate holds back. */
  var GATE = 2;

  /* The same curve the markup's paths are sampled from, so the marker sits ON
     the line rather than near it. Keep the three numbers in step with the
     <path>s in product.html if either ever changes. */
  var TOP = 96, BOT = 284, VIEW_H = 300, EXP = 1.6;
  function curveY(t) { return BOT - (BOT - TOP) * Math.pow(t, EXP); }

  /* Phosphor CheckCircle, duotone. */
  var CHECK = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/>' +
    '<path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>';

  function reduced() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    n.className = cls;
    return n;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function init(root) {
    var steps = [].slice.call(root.querySelectorAll('[data-rollout-step]'));
    var chart = root.querySelector('[data-rollout-chart]');
    var track = root.querySelector('.rollout__track');
    if (!steps.length || !chart) return;

    var plot = chart.querySelector('.rollout__plot');
    var dot = chart.querySelector('.rollout__dot');
    var pill = chart.querySelector('.rollout__pill');
    var pillKey = chart.querySelector('.rollout__pill-k');
    var pillValue = chart.querySelector('.rollout__pill-v');
    var tab = root.querySelector('.rollout__tab');
    if (!plot || !dot || !pill || !pillValue) return;

    var buttons = [], cols = [], nodes = [];

    /* ---- The boxes ---- */
    steps.forEach(function (step, i) {
      var title = step.querySelector('.rollout__t');
      if (!title) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rollout__btn';
      btn.textContent = (title.textContent || '').trim();
      title.textContent = '';
      title.appendChild(btn);
      buttons[i] = btn;

      var mark = el('span', 'rollout__mark');
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = CHECK;
      step.appendChild(mark);

      btn.addEventListener('click', function () { go(i); });
      step.addEventListener('mouseenter', function () { hover(i, true); });
      step.addEventListener('mouseleave', function () { hover(i, false); });
      /* Left and right walk the phases, which is what a reader who has just
         tabbed into one will try. Home and End jump the ends. */
      btn.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = i + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = i - 1;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = steps.length - 1;
        if (n === null) return;
        e.preventDefault();
        n = (n + steps.length) % steps.length;
        go(n);
        if (buttons[n]) buttons[n].focus();
      });
    });

    /* ---- The columns and their axis strip ----
       Pointer targets only. The boxes are the real controls, so the columns
       stay out of the tab order and out of the accessibility tree. */
    var colWrap = el('div', 'rollout__cols');
    colWrap.setAttribute('aria-hidden', 'true');
    steps.forEach(function (step, i) {
      var col = el('div', 'rollout__col');
      if (i === GATE + 1) col.classList.add('rollout__col--gate');
      var n = el('span', 'rollout__col-n');
      n.innerHTML = '<span class="rollout__col-w">Phase </span>' + pad(i + 1);
      col.appendChild(n);
      col.addEventListener('click', function () { go(i); });
      col.addEventListener('mouseenter', function () { hover(i, true); });
      col.addEventListener('mouseleave', function () { hover(i, false); });
      colWrap.appendChild(col);
      cols[i] = col;
    });
    chart.insertBefore(colWrap, plot);

    /* ---- What rides the curve ---- */
    var drop = el('span', 'rollout__drop');
    drop.setAttribute('aria-hidden', 'true');
    plot.insertBefore(drop, dot);

    STEP_T.forEach(function (t, i) {
      var node = el('span', 'rollout__node');
      node.setAttribute('aria-hidden', 'true');
      node.style.left = (t * 100) + '%';
      node.style.top = (curveY(t) / VIEW_H * 100) + '%';
      plot.insertBefore(node, dot);
      nodes[i] = node;
    });

    /* The gate's figure is read out of the gate block below, so the tag on
       the chart and the claim under it cannot disagree. */
    var gateN = root.querySelector('.rollout__gate-n');
    var gateSeal = root.querySelector('.rollout__gate-k svg');
    var tag = el('span', 'rollout__gate-tag');
    tag.setAttribute('aria-hidden', 'true');
    tag.style.left = (STEP_T[GATE] * 100) + '%';
    if (gateSeal) tag.appendChild(gateSeal.cloneNode(true));
    tag.appendChild(document.createTextNode(
      ((gateN && gateN.textContent.trim()) || '99%') + ' parity gate'));
    plot.appendChild(tag);

    var current = -1;

    function hover(i, on) {
      if (steps[i]) steps[i].classList.toggle('is-hover', on);
      if (cols[i]) cols[i].classList.toggle('is-hover', on);
      if (nodes[i]) nodes[i].classList.toggle('is-hover', on);
    }

    function mark(list, i) {
      list.forEach(function (x, n) {
        if (!x) return;
        x.classList.toggle('is-on', n === i);
        x.classList.toggle('is-done', n < i);
      });
    }

    /* The point: which phase is marked, and where its marker sits. Separate
       from setP below, because on first paint the marker is placed while the
       curve is still at zero, so the line grows up to meet a dot that is
       already there. */
    function setPoint(i) {
      current = i;
      mark(steps, i);
      mark(cols, i);
      mark(nodes, i);
      buttons.forEach(function (b, n) {
        if (n === i) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      chart.classList.toggle('is-gated', i >= GATE);

      var t = STEP_T[i];
      var x = t * 100 + '%';
      var y = curveY(t) / VIEW_H * 100;

      [dot, drop, pill].forEach(function (n) {
        n.style.setProperty('--px', x);
        n.style.setProperty('--py', y + '%');
      });
      /* Keep the pill inside the chart at both ends rather than centring it
         on a marker that is already at the edge. On a narrow chart it never
         centres at all: the pill is most of the box's width there, so it is
         anchored to whichever side of the marker has the room. */
      var narrow = chart.clientWidth < 520;
      pill.style.setProperty('--pull', narrow
        ? (t < 0.5 ? '0%' : '-100%')
        : (t < 0.15 ? '0%' : t > 0.85 ? '-100%' : '-50%'));
      /* Always ABOVE the marker. The curve rises to the right, so the space
         above and to the left of any point on it is empty; below it, the
         line runs through the pill. The curve tops out at a third of the plot
         for exactly this reason: the last phase needs the same headroom. */
      pill.style.setProperty('--push', 'calc(-100% - 18px)');
      /* The phase's OWN number and output, read out of its box rather than
         restated here, so the two can never drift apart. */
      var num = steps[i].querySelector('.rollout__n');
      var out = steps[i].querySelector('.rollout__out-v');
      if (pillKey) pillKey.textContent = (num ? num.textContent.trim() + ' ' : '') + 'output';
      pillValue.textContent = out ? (out.textContent || '').trim() : '';

      placeTab();
    }

    /* The selected-phase rule, measured off the chosen step's OWN box rather
       than computed as a column fraction. That is what carries it across the
       4-up, the 2x2 below 1099 and the stack below 640 without this script
       knowing which of them is on, and it is why there is a --tab-y: in two
       rows the rule has to change row as well as column. */
    function placeTab() {
      if (!tab || current < 0) return;
      var step = steps[current];
      tab.style.setProperty('--tab-w', step.offsetWidth + 'px');
      tab.style.setProperty('--tab-x', step.offsetLeft + 'px');
      tab.style.setProperty('--tab-y', step.offsetTop + 'px');
    }

    function setP(v) { chart.style.setProperty('--p', String(v)); }

    function go(i) {
      if (i === current) return;
      setPoint(i);
      setP(STEP_T[i]);
    }

    /* Place the marker on phase one, collapse the curve, then let CSS
       transition it back out once the chart is actually on screen: the growth
       is the whole point and it is worth nothing if it happens above the
       fold of somebody's scroll. */
    setPoint(0);
    setP(0);
    chart.classList.add('is-live');
    /* Takes the output block out of the boxes, since the graph is showing it
       now (user, 23 Sep: "try to show the output on the graph, rather than on
       card"). It goes to .sr-only rather than display:none: the pill is
       aria-hidden decoration, so the text has to stay in the boxes for
       assistive tech and for anything reading the page as markup. */
    root.classList.add('is-live');

    function grow() { setP(STEP_T[0]); }

    /* The columns change at two breakpoints and the boxes reflow with the
       type, so the rule is re-measured whenever the track's box does. */
    if (tab) {
      if ('ResizeObserver' in window) {
        new ResizeObserver(placeTab).observe(track || root);
      } else {
        window.addEventListener('resize', placeTab);
      }
    }

    if (reduced() || !('IntersectionObserver' in window)) { grow(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        window.setTimeout(grow, 220);
      });
    }, { threshold: 0.3 });
    io.observe(chart);
  }

  function boot() {
    [].forEach.call(document.querySelectorAll('[data-rollout]'), init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
