/* Eyebrow scramble (28 Sep): every section eyebrow resolves out of random
   characters the first time it comes into view, in the same language as the
   glyph matrix on /product.

   It is progressive enhancement and it FAILS TOWARD THE TEXT. The markup is
   untouched and the label is correct before the script runs, correct if the
   script never runs, and correct if the observer never fires; the only thing
   the script adds is the few hundred milliseconds of scrambling in between.
   That is why the text is left alone at init rather than pre-scrambled: a
   pre-scrambled label that never gets its reveal is a broken page, and the
   cost of the safe order is a brief settled-then-scrambling flash on the
   eyebrows that are already on screen at load.

   IT RESTRUCTURES EACH EYEBROW FOR SCREEN READERS, because scrambled text is
   text. The label becomes an .sr-only span carrying the real string plus an
   aria-hidden span that does the scrambling, so the accessible name is stable
   at every frame of the animation. Doing it here rather than in the markup
   keeps fifteen pages' HTML clean and means the two halves cannot drift.

   THE "/" PREFIX IS UNTOUCHED. It is .eyebrow::before, so it sits outside both
   spans and stays put while the letters move, which is what keeps the mark
   reading as a mark rather than as part of the string.

   No layout shift at any frame: eyebrows are Geist Mono, so every substituted
   character is the width of the one it replaces.

   IT LOOPS EVERY 5 SECONDS (user, 28 Sep), but only while you can see it:
   each label re-runs on its own timer, and that timer exists only while the
   eyebrow is on screen and the tab is in front.
   THE PERIOD IS EXACT AND THE PHASE IS NOT, which is the whole trick. It ran
   at 9s plus up to 6 more for a few hours and the user read that as not
   looping at all, which it was: a repeat you have scrolled past before it
   arrives has not happened. But a flat period alone would lock two eyebrows
   that came into view together and fire them in unison forever, and several
   labels scrambling on one beat reads as the page glitching rather than as
   one thing catching your eye. So the period is a flat PERIOD for every
   repeat, and the only thing jittered is the FIRST wait after a label comes
   into view. Same 5s cadence for everyone, different beat.

   Motion: does not run at all under prefers-reduced-motion. */
(function () {
  'use strict';

  var els = document.querySelectorAll('.eyebrow');
  if (!els.length) return;
  if (!window.IntersectionObserver || !window.requestAnimationFrame) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) return;

  /* Mostly letters, with the handful of marks the glyph matrix already uses,
     so the noise looks like this site's own alphabet rather than like code
     rain. Uppercase because .eyebrow is uppercased in CSS anyway. */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/+<>=?*';

  /* Per character: how long after the start it locks, and how long the whole
     label takes at most. A short stagger reads as a sweep; a long one reads as
     a loading state, which an eyebrow is not. */
  var STAGGER = 34;
  var SETTLE = 240;

  /* How long a label rests between runs. Every repeat is exactly this. */
  var PERIOD = 5000;
  /* Added to the FIRST wait only, and drawn once per label, so two eyebrows
     that arrive in the same scroll do not then run in step. It is under a
     fifth of the period, which is enough to read as separate events without
     making any label noticeably slower than the rest. */
  var PHASE = 900;

  var live = [];
  var raf = 0;

  function noise() {
    return CHARS.charAt((Math.random() * CHARS.length) | 0);
  }

  function tick(now) {
    for (var i = live.length - 1; i >= 0; i--) {
      var it = live[i];
      var t = now - it.start;
      var out = '';
      var done = true;
      for (var c = 0; c < it.text.length; c++) {
        var ch = it.text.charAt(c);
        /* Whitespace never scrambles: it is what keeps the word shapes, so the
           label reads as the right label resolving rather than as a new one
           arriving. */
        if (ch === ' ') { out += ch; continue; }
        if (t >= c * STAGGER + SETTLE) { out += ch; continue; }
        out += noise();
        done = false;
      }
      it.vis.textContent = out;
      if (done) live.splice(i, 1);
    }
    raf = live.length ? requestAnimationFrame(tick) : 0;
  }

  /* Restructured ONCE per label, however many times it animates. */
  function prepare(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;

    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    vis.textContent = text;

    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(vis);
    return {
      vis: vis, text: text, timer: 0, net: 0, onScreen: true,
      phase: Math.random() * PHASE
    };
  }

  function run(rec) {
    if (live.indexOf(rec) > -1) return;
    rec.start = performance.now();
    live.push(rec);
    if (!raf) raf = requestAnimationFrame(tick);

    /* THE SAFETY NET, and it is not theoretical. The whole animation lives on
       rAF, so anything that stops rAF ticking or stops its clock advancing
       leaves the label frozen mid-scramble, and a frozen eyebrow is not a
       degraded effect, it is the wrong words on the page. This timer runs on a
       different clock and puts the real text back regardless, well after the
       animation should have finished on its own. */
    clearTimeout(rec.net);
    rec.net = setTimeout(function () {
      var i = live.indexOf(rec);
      if (i > -1) live.splice(i, 1);
      rec.vis.textContent = rec.text;
    }, rec.text.length * STAGGER + SETTLE + 900);
  }

  /* `first` is true when the label has just come into view or the tab has just
     come back, and false when the loop is rescheduling itself. Only that first
     wait carries the label's phase offset; every repeat after it is a flat
     PERIOD, so the cadence is exactly 5s and only the beat differs. */
  function schedule(rec, first) {
    clearTimeout(rec.timer);
    rec.timer = setTimeout(function () {
      run(rec);
      schedule(rec, false);
    }, PERIOD + (first ? rec.phase : 0));
  }

  function stop(rec) {
    clearTimeout(rec.timer);
    rec.timer = 0;
  }

  var records = [];

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].target;
      if (entries[i].isIntersecting) {
        if (!el.__eb) {
          el.__eb = prepare(el);
          if (!el.__eb) { io.unobserve(el); continue; }
          records.push(el.__eb);
          run(el.__eb);
        }
        el.__eb.onScreen = true;
        if (!document.hidden) schedule(el.__eb, true);
      } else if (el.__eb) {
        el.__eb.onScreen = false;
        stop(el.__eb);
      }
    }
  }, { threshold: 0.6, rootMargin: '0px 0px -8% 0px' });

  /* A backgrounded tab keeps its timers running at a throttled rate, which
     would spend the whole time you are away scrambling labels nobody is
     looking at. */
  document.addEventListener('visibilitychange', function () {
    for (var i = 0; i < records.length; i++) {
      if (document.hidden) stop(records[i]);
      else if (records[i].onScreen) schedule(records[i], true);
    }
  });

  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
