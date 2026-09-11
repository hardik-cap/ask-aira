/* ==========================================================================
   aiRA — hero headline rotator.

   "Analytics agent for [icon] {team} teams": the team word and its Phosphor
   icon tile cycle every few seconds. Characters roll out and in with a
   stagger, and the word box width glides (FLIP) so the centred line shifts
   smoothly instead of jumping. The animated line is aria-hidden in the
   markup; an sr-only sibling carries the full claim. Under reduced motion
   the cycle never starts and the first team stays put.

   Icons are official Phosphor (regular, 256 viewBox), one path each.
   Styling lives in style/pages/home.css under .hero__rot-*.
   ========================================================================== */

(function () {
  'use strict';

  var icon = document.getElementById('hero-rot-icon');
  var word = document.getElementById('hero-rot-word');
  if (!icon || !word) return;

  var TEAMS = [
    { word: 'eCommerce', path: 'M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z' },
    { word: 'Growth', path: 'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z' },
    { word: 'Marketing', path: 'M248,120a48.05,48.05,0,0,0-48-48H160.2c-2.91-.17-53.62-3.74-101.91-44.24A16,16,0,0,0,32,40V200a16,16,0,0,0,26.29,12.25c37.77-31.68,77-40.76,93.71-43.3v31.72A16,16,0,0,0,159.12,214l11,7.33A16,16,0,0,0,194.5,212l11.77-44.36A48.07,48.07,0,0,0,248,120ZM48,199.93V40h0c42.81,35.91,86.63,45,104,47.24v65.48C134.65,155,90.84,164.07,48,199.93Zm131,8,0,.11-11-7.33V168h21.6ZM200,152H168V88h32a32,32,0,1,1,0,64Z' },
    { word: 'CRM', path: 'M83.19,174.4a8,8,0,0,0,11.21-1.6,52,52,0,0,1,83.2,0,8,8,0,1,0,12.8-9.6A67.88,67.88,0,0,0,163,141.51a40,40,0,1,0-53.94,0A67.88,67.88,0,0,0,81.6,163.2,8,8,0,0,0,83.19,174.4ZM112,112a24,24,0,1,1,24,24A24,24,0,0,1,112,112Zm96-88H64A16,16,0,0,0,48,40V64H32a8,8,0,0,0,0,16H48v40H32a8,8,0,0,0,0,16H48v40H32a8,8,0,0,0,0,16H48v24a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V40A16,16,0,0,0,208,24Zm0,192H64V40H208Z' },
    { word: 'Loyalty', path: 'M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z' },
    { word: 'Data/BI', path: 'M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z' }
  ];

  var STAGGER = 26;   /* ms between characters */
  var OUT = 220;      /* char roll-out duration, matches home.css */
  var HOLD = 3200;    /* time each team stays put */
  var index = 0;

  var NS = 'http://www.w3.org/2000/svg';

  function setChars(text, entering) {
    word.textContent = '';
    for (var k = 0; k < text.length; k++) {
      var s = document.createElement('span');
      s.className = 'hero__char' + (entering ? ' hero__char--in' : '');
      s.textContent = text[k];
      if (entering) s.style.animationDelay = (60 + k * STAGGER) + 'ms';
      word.appendChild(s);
    }
  }

  function setIcon(d) {
    var svg = icon.querySelector('svg');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.textContent = '';
    svg.appendChild(path);
  }

  /* Pin the box to a measured pixel width so a swap can glide to the next
     word's width. Re-measured on resize and once the web fonts land. */
  function fit() {
    var t = word.style.transition;
    word.style.transition = 'none';
    word.style.width = 'auto';
    word.style.width = word.offsetWidth + 'px';
    void word.offsetWidth;
    word.style.transition = t;
  }

  function swap() {
    index = (index + 1) % TEAMS.length;
    var next = TEAMS[index];

    var chars = word.children;
    for (var k = 0; k < chars.length; k++) {
      chars[k].style.animationDelay = (k * STAGGER) + 'ms';
      chars[k].className = 'hero__char hero__char--out';
    }
    icon.classList.add('hero__rot-icon--swap');

    setTimeout(function () {
      var oldW = word.offsetWidth;
      setChars(next.word, true);
      setIcon(next.path);
      icon.classList.remove('hero__rot-icon--swap');

      /* FLIP the width: measure the new word, then animate old -> new. */
      word.style.width = 'auto';
      var newW = word.offsetWidth;
      word.style.width = oldW + 'px';
      void word.offsetWidth;
      word.style.width = newW + 'px';
    }, OUT + chars.length * STAGGER);
  }

  setChars(TEAMS[0].word, false);
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  var raf = null;
  window.addEventListener('resize', function () {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fit);
  });

  /* No cycle under reduced motion: the first team stays put. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(swap, HOLD);
})();
