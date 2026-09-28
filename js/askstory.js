/* ==========================================================================
   aiRA — the Analyse / Decide / Act walkthrough on the industry hubs
   (19 Sep, frigade.com reference).

   A left rail of three steps drives one framed stage: the open step fills a
   timer bar and the story advances when it completes; clicking a step jumps
   there and restarts the clock. Everything ships in the markup, so with this
   script off the three panels simply stack and read whole; the .is-live
   class is what collapses the stage to one panel at a time.

   The bar and the timeout are ONE clock (fixed 19 Sep). .is-running is added
   in arm(), in the same frame the setTimeout is set, and the CSS fill keys
   off that class, so the line can never be ahead of or behind the advance.
   Before this they were independent: the fill started whenever .is-active
   landed while the timeout waited on the observer, so a section that had not
   yet crossed the threshold showed a full bar and then sat there for another
   six seconds.

   Hover no longer holds the clock, which was the other half of that bug: you
   have to be pointing at the rail to click it, so every click left the story
   held and the bar paused at zero until the pointer wandered off. Keyboard
   focus still holds, since that is the case the pause was for. It only runs
   while on screen, and with prefers-reduced-motion it never advances on its
   own (the steps stay plain click-to-switch tabs, no bar animation).
   ========================================================================== */

(function () {
  'use strict';

  var HOLD = 6000;  /* ms per step; matches the bar's CSS animation */

  var root = document.querySelector('[data-askstory]');
  if (!root) return;
  var steps = Array.prototype.slice.call(root.querySelectorAll('.askstory__step'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('.askstory__panel'));
  if (steps.length < 2 || steps.length !== panels.length) return;

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  root.classList.add('is-live');

  var current = 0;
  var timer = null;
  var onScreen = false;
  var held = false;

  function select(i) {
    current = (i + steps.length) % steps.length;
    for (var k = 0; k < steps.length; k++) {
      var on = k === current;
      steps[k].classList.toggle('is-active', on);
      steps[k].setAttribute('aria-selected', on ? 'true' : 'false');
      panels[k].classList.toggle('is-active', on);
    }
    arm();
  }

  function arm() {
    if (timer) { clearTimeout(timer); timer = null; }
    /* Dropping .is-running parks the fill at zero. Reading offsetWidth
       between the drop and the re-add forces the style flush that makes the
       animation start over, which is also what restarts the bar when the
       step being selected is the one already open. */
    root.classList.remove('is-running');
    if (!onScreen || held || reduce.matches) return;
    void root.offsetWidth;
    root.classList.add('is-running');
    timer = setTimeout(function () { select(current + 1); }, HOLD);
  }

  steps.forEach(function (step, i) {
    step.addEventListener('click', function () {
      /* Clicking a step is an explicit choice to watch it, so it always
         releases the hold, whatever focus did on the way in. Without this
         the :focus-visible guard below is the only thing standing between a
         click and a dead timer, and it is a heuristic: it reports true for a
         programmatic focus, and browsers disagree about pointer cases. */
      held = false;
      root.classList.remove('is-held');
      select(i);
    });
  });

  /* KEYBOARD focus holds the clock; a pointer does not. Clicking a button
     focuses it, so holding on every focusin meant a click parked the story:
     step one ran because it opens before anything is focused, and steps two
     and three, which can only be reached by clicking, opened with their
     timer already dead. :focus-visible is exactly the distinction wanted.
     It is guarded because a browser that does not know the selector throws
     out of matches(), and a thrown error here would kill the whole script. */
  function keyboardFocused(el) {
    try { return !!(el && el.matches && el.matches(':focus-visible')); }
    catch (err) { return false; }
  }
  root.addEventListener('focusin', function (e) {
    if (!keyboardFocused(e.target)) return;
    held = true; root.classList.add('is-held'); arm();
  });
  root.addEventListener('focusout', function (e) {
    if (root.contains(e.relatedTarget)) return;
    held = false; root.classList.remove('is-held'); arm();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      arm();
    }, { threshold: 0.25 }).observe(root);
  } else {
    onScreen = true;
    arm();
  }

  function onReduceChange() { arm(); }
  if (reduce.addEventListener) reduce.addEventListener('change', onReduceChange);
})();
