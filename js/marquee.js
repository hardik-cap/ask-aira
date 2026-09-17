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
    /* Gentle ease toward the target speed (~450ms time constant), so the
       belt visibly decelerates into the hover state instead of snapping. */
    v += (speed * factor - v) * Math.min(1, dt * 2.2);
    x -= v * dt;
    if (width && x <= -width) x += width;
    var t = 'translateX(' + x.toFixed(2) + 'px)';
    for (var i = 0; i < tracks.length; i++) tracks[i].style.transform = t;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* Hero capability ticker: on phones the pill row scrolls as a belt (CSS
   animation in home.css). The seamless loop needs the list twice, so clone
   it here instead of duplicating the markup; the clone stays display:none
   at desktop widths and under reduced motion. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var belt = document.querySelector('.hero__askbelt');
  if (!belt) return;
  var list = belt.querySelector('.hero__asklist');
  if (!list || belt.children.length > 1) return;

  var clone = list.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  belt.appendChild(clone);

  /* Match the logo cloud's pace (17 Sep, user call): the proof belt travels
     one track width per 36s, so the ticker's duration is its own width at
     that same px/s. The CSS 26s stays as the no-proof fallback. */
  function pace() {
    var proof = document.querySelector('.proof__track');
    if (!proof) return;
    var pxPerSec = proof.getBoundingClientRect().width / 36;
    var w = list.getBoundingClientRect().width;
    if (!(pxPerSec > 0) || !(w > 0)) return;
    var d = (w / pxPerSec).toFixed(2) + 's';
    list.style.animationDuration = d;
    clone.style.animationDuration = d;
  }
  pace();
  window.addEventListener('resize', pace);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pace);
})();
