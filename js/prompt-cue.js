/* ==========================================================================
   aiRA — prompt cue (18 Sep)

   The black frigade-style callout in each industry panel's head. It cycles
   the questions that industry actually asks: characters roll out, the next
   question's characters roll in (the hero rotator's trick at sentence
   length), and the box glides to the height and width the new question
   needs instead of holding a fixed two-line reservation.

   The markup ships as a complete, scrollable ordered list inside the box, so
   with JS off every question is present and readable. This script adds
   .is-cycling, which parks that list in the accessibility tree (the visual
   swap surface it builds, .cue__view, is aria-hidden), and it never invents
   a question: it only cycles what is in the page.
   ========================================================================== */

(function () {
  'use strict';

  var HOLD = 3600;    /* ms a question stays up */
  var OUT_MS = 340;   /* char roll-out: 120ms stagger cap + 200ms travel */
  var SIZE_MS = 420;  /* the box's size glide; matches .cue.is-sizing */

  var stage = document.querySelector('[data-stage]');
  if (!stage) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  var cues = Array.prototype.slice.call(stage.querySelectorAll('[data-cue]'))
    .map(function (el) {
      return {
        el: el,
        texts: Array.prototype.slice.call(el.querySelectorAll('.cue__item'))
          .map(function (li) { return li.textContent.trim(); }),
        view: null,
        i: 0
      };
    })
    .filter(function (c) { return c.texts.length > 1; });

  if (!cues.length) return;

  /* One span per word so wrapping stays at word boundaries, one span per
     character so each letter can carry its own delay (--i). */
  function setChars(view, text) {
    view.textContent = '';
    var words = text.split(' ');
    var n = 0;
    words.forEach(function (word, w) {
      var ws = document.createElement('span');
      ws.className = 'cue__word';
      for (var k = 0; k < word.length; k++) {
        var c = document.createElement('span');
        c.className = 'cue__ch';
        c.style.setProperty('--i', n++);
        c.textContent = word[k];
        ws.appendChild(c);
      }
      view.appendChild(ws);
      if (w < words.length - 1) view.appendChild(document.createTextNode(' '));
    });
  }

  /* Swap the text, then glide the box from its old size to the new one:
     measure both, pin the old, transition to the new, hand back to auto. */
  function place(cue, n, animateSize) {
    var el = cue.el;
    var oldW = el.offsetWidth;
    var oldH = el.offsetHeight;
    cue.view.classList.remove('is-out');
    setChars(cue.view, cue.texts[n]);
    cue.i = n;
    /* A hidden panel has no geometry to glide between. */
    if (!animateSize || !el.offsetParent) return;
    var newW = el.offsetWidth;
    var newH = el.offsetHeight;
    if (newW === oldW && newH === oldH) return;
    el.style.width = oldW + 'px';
    el.style.height = oldH + 'px';
    void el.offsetWidth;
    el.classList.add('is-sizing');
    el.style.width = newW + 'px';
    el.style.height = newH + 'px';
    window.setTimeout(function () {
      el.classList.remove('is-sizing');
      el.style.width = '';
      el.style.height = '';
    }, SIZE_MS + 40);
  }

  function show(cue, n) {
    cue.view.classList.add('is-out');
    window.setTimeout(function () {
      if (!cue.el.classList.contains('is-cycling')) return;
      place(cue, n, true);
    }, OUT_MS);
  }

  function enable(cue) {
    if (!cue.view) {
      cue.view = document.createElement('p');
      cue.view.className = 'cue__view';
      cue.view.setAttribute('aria-hidden', 'true');
      cue.el.appendChild(cue.view);
    }
    if (cue.el.classList.contains('is-cycling')) return;
    cue.el.classList.add('is-cycling');
    place(cue, 0, false);
  }

  function disable(cue) {
    cue.el.classList.remove('is-cycling', 'is-sizing');
    cue.el.style.width = '';
    cue.el.style.height = '';
    if (cue.view) cue.view.classList.remove('is-out');
  }

  /* The open panel is the one industries.js has left unhidden. Reading it
     from the DOM keeps the two scripts independent. */
  function openCue() {
    for (var i = 0; i < cues.length; i++) {
      if (cues[i].el.closest('.stage__panel') &&
          !cues[i].el.closest('.stage__panel').hidden) return cues[i];
    }
    return null;
  }

  var timer = null;
  var onScreen = false;

  function tick() {
    var cue = openCue();
    if (!cue) return;
    enable(cue);
    show(cue, (cue.i + 1) % cue.texts.length);
  }

  function run() {
    if (timer || !onScreen || reduce.matches) return;
    var cue = openCue();
    if (cue) enable(cue);
    timer = setInterval(tick, HOLD);
  }

  function halt() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  /* Off screen it is invisible and still costs a paint every few seconds, so
     it only runs while the stage is actually in view. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) run(); else halt();
    }, { threshold: 0.15 }).observe(stage);
  } else {
    onScreen = true;
    run();
  }

  /* A tab change opens a different panel: start its cue at the first question
     rather than resuming someone else's position. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    /* The arrows change the open panel too, so they have to reset the cue the
       same way a tab click does. */
    if (!e.target.closest('.inds__card, [data-ind-prev], [data-ind-next]')) return;
    setTimeout(function () {
      if (reduce.matches) return;
      var cue = openCue();
      if (!cue) return;
      enable(cue);
      place(cue, 0, false);
    }, 0);
  });

  /* Turning reduced motion on mid-visit gives the full list back rather than
     leaving a bar frozen on whichever question was up. */
  function onReduceChange() {
    if (reduce.matches) { halt(); cues.forEach(disable); }
    else { run(); }
  }
  if (reduce.addEventListener) reduce.addEventListener('change', onReduceChange);
  else if (reduce.addListener) reduce.addListener(onReduceChange);
})();
