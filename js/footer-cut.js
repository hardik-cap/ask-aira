/* The footer wordmark's PHOTO FILL, events pages only (13 Oct, user, after
   sarvam.ai/events; revised twice the same day, finally: "use a single image
   only, the same logo which is being used in hero of that page, one only").
   The letters stay exactly where they are and hold ONE photograph: the same
   picture the page's own city hero paints, read out of the hero's inline
   --city-sm image-set (the 1440 encode, the right size for the footer and
   already in cache when the phone hero fetched it). The hub has no photo
   hero, so it takes a generic event photo, the Captivate audience, never
   one city's skyline. No timer, no transition, no transform: a transform on a masked
   group drags the mask with it and the letterforms themselves slide (the
   first build's bug).
   Built here rather than in components/footer.html so the photo is fetched
   on the SEVEN pages that load this script and nowhere else (an SVG <image>
   is fetched whatever its display). It must be a LUMINANCE MASK (the use
   drawn #fff), never a clipPath: the geometry is a <g> reached through
   <use>, which a clipPath's content model ignores, resolving to an empty
   clip that removes the whole layer. With this script off, or the photo
   undecodable, the footer shows the site's own gradient wordmark. */
(function () {
  'use strict';

  /* For /events itself, which has no photo hero: a GENERIC event photo,
     not a city (user, 13 Oct: the hub "can show something generic, it
     shows chicago atm"). The Captivate aiRA panel since 14 Oct (user: "use
     a different photo"): the audience shot is also the city-request card's
     photo right above the footer, and the panel's blue stage and aiRA
     banner read stronger through the letterforms. */
  var FALLBACK = '/assets/events/captivate-2026/aira-panel.jpg';
  var NS = 'http://www.w3.org/2000/svg';
  var done = false;

  function heroPhoto() {
    var hero = document.querySelector('.evhero--city');
    var style = hero && hero.getAttribute('style');
    if (!style) return FALLBACK;
    var m = style.match(/url\(([^()\s]+-1440\.avif)\)/) ||
            style.match(/url\(([^()\s]+\.(?:avif|jpg))\)/);
    return m ? m[1] : FALLBACK;
  }

  function build() {
    if (done) return;
    var stack = document.querySelector('.footer__wordmark-stack');
    if (!stack || !document.getElementById('aira-wordmark')) return;
    done = true;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1476 476');
    svg.setAttribute('class', 'footer__wordmark-svg footer__wordmark-photos');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    var mask = document.createElementNS(NS, 'mask');
    mask.setAttribute('id', 'aira-wordmark-cut');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#aira-wordmark');
    use.setAttribute('fill', '#fff');
    mask.appendChild(use);
    svg.appendChild(mask);

    var g = document.createElementNS(NS, 'g');
    g.setAttribute('mask', 'url(#aira-wordmark-cut)');
    svg.appendChild(g);
    stack.appendChild(svg);

    var hub = hubPhotos();
    if (hub.length > 1) slideshow(g, hub, svg);
    else layer(g, hub[0] || heroPhoto()).classList.add('is-on');
  }

  function layer(g, href) {
    var img = document.createElementNS(NS, 'image');
    img.setAttribute('href', href);
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    img.setAttribute('width', '1476');
    img.setAttribute('height', '476');
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    g.appendChild(img);
    return img;
  }

  /* THE HUB CYCLES ITS LOCATIONS (14 Oct, user: "slideshow of all the
     locations which are there in hub, changing every few seconds"): the
     1440 AVIF of every card photo in #series, in card order, read from the
     cards themselves so a new card joins the loop with no edit here.
     Each photo is its own stacked <image>; the visible one carries .is-on
     and the change is an OPACITY fade only (global.css), because nothing
     inside the masked group may ever transform. The loop starts only when
     the footer nears the screen (so the photos are not fetched for a
     visitor who never scrolls there), pauses off screen and on a hidden
     tab, never shows a photo before it has decoded, and is a single still
     under reduced motion. */
  function hubPhotos() {
    if (document.querySelector('.evhero--city')) return [];
    var out = [];
    [].forEach.call(document.querySelectorAll('#series .evcard__photo source[type="image/avif"]'), function (src) {
      var m = (src.getAttribute('srcset') || '').match(/(\S+-1440\.avif)/);
      if (m && out.indexOf(m[1]) < 0) out.push(m[1]);
    });
    return out;
  }

  function slideshow(g, list, svg) {
    var EVERY = 4000;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var layers = [];
    var at = 0;
    var timer = null;
    var seen = false;

    function show(i) {
      layers.forEach(function (l, j) { l.classList.toggle('is-on', j === i); });
      at = i;
    }
    function next() {
      var n = (at + 1) % list.length;
      if (!layers[n]) layers[n] = layer(g, list[n]);
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        show(n);
        schedule();
      };
      pre.src = list[n];
    }
    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (still || !seen || document.hidden) return;
      timer = setTimeout(next, EVERY);
    }
    /* The first photo always shows at once, as the single-photo version
       did, so the wordmark is never left empty if the observer is slow or
       absent; only the OTHER photos and the cycling wait for the footer. */
    layers[0] = layer(g, list[0]);
    show(0);

    if (!('IntersectionObserver' in window)) { seen = true; schedule(); return; }
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      schedule();
    }, { rootMargin: '400px 0px' }).observe(svg);
    document.addEventListener('visibilitychange', schedule);
  }

  document.addEventListener('aira:components-ready', build);
  if (document.querySelector('.footer__wordmark-stack')) build();
})();
