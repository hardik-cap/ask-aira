/* Proof marquee driver. The CSS keyframe animation cannot change speed
   without the belt jumping (progress rescales with duration), so this
   drives the same translateX by hand and eases the velocity: full speed
   at rest, quarter speed while hovered. If it does not run, the CSS
   animation in home.css keeps the belt moving (with pause-on-hover). */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var wrap = document.querySelector('.proof__marquee');
  if (!wrap) return;
  var tracks = wrap.querySelectorAll('.proof__track');
  if (!tracks.length) return;

  /* Hand over from the CSS animation. */
  wrap.classList.add('proof__marquee--js');

  var DURATION = 36;          /* s per track width: same pace as the CSS */
  var HOVER_FACTOR = 0.25;    /* quarter speed under the pointer */

  var width = 0;
  var speed = 0;              /* px/s at rest */
  function measure() {
    width = tracks[0].getBoundingClientRect().width;
    speed = width / DURATION;
  }
  measure();
  window.addEventListener('resize', measure);

  var x = 0;
  var v = speed;
  var factor = 1;
  wrap.addEventListener('mouseenter', function () { factor = HOVER_FACTOR; });
  wrap.addEventListener('mouseleave', function () { factor = 1; });

  var last = performance.now();
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    v += (speed * factor - v) * Math.min(1, dt * 5);
    x -= v * dt;
    if (width && x <= -width) x += width;
    var t = 'translateX(' + x.toFixed(2) + 'px)';
    for (var i = 0; i < tracks.length; i++) tracks[i].style.transform = t;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
