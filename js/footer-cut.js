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
     the Captivate audience, not a city (user, 13 Oct: the hub "can show
     something generic, it shows chicago atm"). */
  var FALLBACK = '/assets/events/captivate-2026/hands-up.jpg';
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
    var img = document.createElementNS(NS, 'image');
    img.setAttribute('href', heroPhoto());
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    img.setAttribute('width', '1476');
    img.setAttribute('height', '476');
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    g.appendChild(img);
    svg.appendChild(g);
    stack.appendChild(svg);
  }

  document.addEventListener('aira:components-ready', build);
  if (document.querySelector('.footer__wordmark-stack')) build();
})();
