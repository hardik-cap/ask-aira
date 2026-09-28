/* ==========================================================================
   aiRA — the difference figure's loop (20 Sep, user ask).

   The pane plays the product's loop as a story: the question types into an
   ask bar, the bar gives way and the same words land as the chat bubble,
   then the tool rows, the answer and the move card arrive one by one, the
   stack easing upward as it grows (no labels: the product surfaces ARE the
   telling, 20 Sep user call). It holds on the pending pill, then starts
   over.

   Everything is layered ON TOP of the static diagram: .is-live gates every
   animated style, so with this script off, with reduced motion, or before
   the section is on screen, the pane is simply the finished stack. The
   question is read FROM the markup (the .chat__q is the source of truth),
   so editing the copy never means editing this file. Off screen the timers
   stop; back on screen the story starts from the top.
   ========================================================================== */

(function () {
  'use strict';

  var fig = document.querySelector('[data-diff-loop]');
  if (!fig) return;
  var thread = fig.querySelector('.diff__chat');
  var steps = Array.prototype.slice.call(fig.querySelectorAll('.diff__chat > *'));
  var ask = fig.querySelector('.diff__ask');
  var askText = fig.querySelector('.diff__ask-t');
  var q = fig.querySelector('.chat__q');
  if (!thread || steps.length < 2 || !ask || !askText || !q) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  var QUESTION = (q.textContent || '').trim();
  var timers = [];
  var running = false;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  /* Ease the trace up so the newest step sits in the pane's lower third.
     offsetTop is measured against the fig (the nearest positioned
     ancestor), so the transform itself never skews the measurement. */
  function settle(i) {
    var s = steps[i];
    var anchor = fig.clientHeight * 0.72;
    var t = Math.min(0, anchor - (s.offsetTop + s.offsetHeight));
    thread.style.transform = 'translateY(' + Math.round(t) + 'px)';
  }

  function reset() {
    fig.classList.remove('is-told');
    steps.forEach(function (s) { s.classList.remove('is-on'); });
    thread.style.transform = 'translateY(0px)';
    askText.textContent = '';
  }

  function run() {
    clearAll();
    fig.classList.add('is-live');
    reset();
    ask.classList.add('is-on');

    /* Typing: whole-word bursts read fake; two speeds and the odd double
       character are enough to read as a person. */
    var i = 0;
    later(function type() {
      if (!running) return;
      i += Math.random() < 0.24 ? 2 : 1;
      if (i > QUESTION.length) i = QUESTION.length;
      askText.textContent = QUESTION.slice(0, i);
      if (i < QUESTION.length) { later(type, 32); return; }
      later(sent, 750);
    }, 500);

    function sent() {
      ask.classList.remove('is-on');
      fig.classList.add('is-told');
      var delays = [400, 1300, 2100, 1900];
      var at = 0;
      steps.forEach(function (s, k) {
        at += delays[k] || 1700;
        later(function () { s.classList.add('is-on'); settle(k); }, at);
      });
      /* Hold on the decision, then go again. */
      later(function () { if (running) run(); }, at + 4500);
    }
  }

  function start() {
    if (running || reduce.matches) return;
    running = true;
    run();
  }
  function stop() {
    running = false;
    clearAll();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start();
      else stop();
    }, { threshold: 0.3 }).observe(fig);
  } else {
    start();
  }

  /* Flipping reduced motion on mid-session parks the pane as the static
     diagram; the .is-live styles come off with the class. */
  function onReduce() {
    if (!reduce.matches) return;
    stop();
    fig.classList.remove('is-live');
    reset();
    ask.classList.remove('is-on');
    thread.style.transform = '';
  }
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce);
})();
