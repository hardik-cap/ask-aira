/* ==========================================================================
   aiRA — the proof figures count into place (19 Sep)

   Each .cproof__val animates once, the first time it is scrolled into view.
   The DIRECTION is declared, not guessed: a figure that argues an increase
   counts up from zero, and a figure that argues a reduction counts down from
   the value it started at, written on the element as data-from. Guessing
   from the number alone cannot work, because "50%" is a rise on one page and
   a cut on the next, and the sentence under it is the only thing that says
   which. data-from also lets a real starting point be used where the case
   study has one: the regional growth gap genuinely closed from 9.6 points,
   so that figure runs 9.6 -> 2.2 rather than from a made-up round number.

   Everything degrades: the final value is what ships in the markup, so with
   this script off, or with prefers-reduced-motion, the figure simply reads
   as written and nothing animates. A value with no digits in it ("Zero") is
   left alone.
   ========================================================================== */

(function () {
  'use strict';

  var DUR = 1100;                  /* ms per figure */
  var vals = Array.prototype.slice.call(document.querySelectorAll('.cproof__val'));
  if (!vals.length) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  if (reduce) return;              /* the markup already reads correctly */

  /* prefix · digits (optionally grouped, optionally decimal) · suffix */
  var PARSE = /^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

  function plan(el) {
    var m = PARSE.exec(el.textContent.trim());
    if (!m) return null;
    var digits = m[2];
    var to = parseFloat(digits.replace(/,/g, ''));
    if (!isFinite(to)) return null;

    /* No data-from means the figure argues an increase: start at zero. */
    var raw = el.getAttribute('data-from');
    var from = raw === null ? 0 : parseFloat(raw);
    if (!isFinite(from) || from === to) return null;

    var dot = digits.indexOf('.');
    return {
      el: el,
      pre: m[1],
      suf: m[3],
      from: from,
      to: to,
      dp: dot === -1 ? 0 : digits.length - dot - 1,
      grouped: digits.indexOf(',') !== -1,
      done: el.textContent
    };
  }

  function text(p, n) {
    var s = n.toFixed(p.dp);
    if (p.grouped) {
      var bits = s.split('.');
      bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = bits.join('.');
    }
    return p.pre + s + p.suf;
  }

  /* Counting 100 -> 50 loses a digit on the way, which would shrink the cell
     mid-flight. Reserve whichever of the two ends is wider up front. This
     writes the start string only to measure it and puts the authored one
     straight back, so nothing wrong is ever painted. */
  function reserve(p) {
    var el = p.el;
    el.style.display = 'inline-block';
    /* The cell is a column flex container, so a block child stretches to its
       full width. Without this the measurement returns the CELL width and
       min-width would pin the figure that wide, overflowing once the layout
       narrows. flex-start shrink-wraps it to the glyphs, which is also how
       it already renders. */
    el.style.alignSelf = 'flex-start';
    el.textContent = text(p, p.from);
    var a = el.getBoundingClientRect().width;
    el.textContent = p.done;
    var b = el.getBoundingClientRect().width;
    el.style.minWidth = Math.ceil(Math.max(a, b)) + 'px';
  }

  function land(p) {
    if (p.landed) return;
    p.landed = true;
    /* Land on the authored string, not on a re-formatted one. */
    p.el.textContent = p.done;
  }

  function run(p) {
    if (p.started) return;
    p.started = true;
    /* The start value is written HERE, not up front. rAF does not advance in
       a background tab and an observer can fail to fire at all; priming the
       figures early meant any of that left a wrong number on screen, and
       these are real client metrics. Off the happy path the authored value
       is simply never replaced. */
    p.el.textContent = text(p, p.from);
    var t0 = 0;
    function frame(now) {
      if (p.landed) return;
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / DUR);
      if (k < 1) {
        p.el.textContent = text(p, p.from + (p.to - p.from) * (1 - Math.pow(1 - k, 3)));
        requestAnimationFrame(frame);
      } else {
        land(p);
      }
    }
    requestAnimationFrame(frame);
    /* Belt and braces: if frames stop coming, the figure still arrives. */
    setTimeout(function () { land(p); }, DUR + 400);
  }

  var plans = [];
  vals.forEach(function (el) {
    var p = plan(el);
    if (!p) return;
    reserve(p);          /* measures both ends and restores the text */
    plans.push(p);
  });
  if (!plans.length) return;

  if (!('IntersectionObserver' in window)) {
    plans.forEach(run);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].el === entry.target) { run(plans[i]); return; }
      }
    });
  }, { threshold: 0.6 });

  plans.forEach(function (p) { io.observe(p.el); });
})();
