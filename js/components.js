/* ==========================================================================
   aiRA — shared component loader and navbar behaviour.

   Responsibilities:
     1. Inject components/navbar.html and components/footer.html
     2. Desktop hover dropdowns, click toggles, outside-click close, Escape
     3. Mobile drawer with scroll lock
     4. Navbar theme sync over dark sections
     5. Mark the current page in the nav

   Loaded with `defer` so the DOM is parsed before it runs.
   ========================================================================== */

(function () {
  'use strict';

  var BASE = document.documentElement.getAttribute('data-base') || '';

  /* ---- 0. Remember where the visitor came from (9 Oct) ----------------
     First touch only: the landing page, referrer, UTM tags and ad click
     IDs are kept for the visit in sessionStorage, so a lead who lands on
     an ad page and books three pages later is still attributed to the ad.
     js/book-form.js copies them into the /book form's hidden fields.
     Storage can throw (private mode, blocked site data); then the form
     simply goes without them. */
  try {
    if (!sessionStorage.getItem('aira_src')) {
      var q = new URLSearchParams(location.search), src = {
        landing_page: location.pathname + location.search,
        /* Only a referrer from ANOTHER site says where a lead came from;
           our own pages (or a preview of them) are just navigation. */
        referrer: (document.referrer && new URL(document.referrer).host !== location.host) ? document.referrer : ''
      };
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id']
        .forEach(function (k) { if (q.get(k)) src[k] = q.get(k); });
      sessionStorage.setItem('aira_src', JSON.stringify(src));
    }
  } catch (e) {}
  var DESKTOP = 991; // px; above this, hover dropdowns and no drawer

  /* ---- 1. Inject shared components ------------------------------------ */

  /* THE HEADER NO LONGER WAITS ON THE NETWORK (13 Oct, user: "when any
     page loads, header loads late"). Each component's markup is kept in
     localStorage after its first fetch, so every later page injects it
     the moment this script runs, with no request in the way; a fresh copy
     is still fetched in the background and saved for the NEXT page, so a
     deploy reaches visitors one page view later. The first visit (or
     storage blocked) waits on the fetch as before. `ready` runs straight
     after the markup lands, in the same task, so the bar is set up before
     the browser can paint it. */
  function inject(id, file, ready) {
    var host = document.getElementById(id);
    if (!host) return Promise.resolve(null);

    // Escape hatch: a page that ships its own variant pre-fills the
    // placeholder, and we leave it alone.
    if (host.children.length) {
      if (ready) ready(host);
      return Promise.resolve(host);
    }

    var key = 'aira_c_' + file, cached = null;
    try { cached = localStorage.getItem(key); } catch (e) {}
    if (cached) {
      host.innerHTML = cached;
      if (ready) ready(host);
    }

    var fresh = fetch(BASE + '/components/' + file)
      .then(function (r) {
        if (!r.ok) throw new Error(file + ': HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        try { if (html !== cached) localStorage.setItem(key, html); } catch (e) {}
        if (!cached) {
          host.innerHTML = html;
          if (ready) ready(host);
        }
        return host;
      })
      .catch(function (err) {
        console.error('[aira] could not inject ' + file, err);
        return cached ? host : null;
      });

    return cached ? Promise.resolve(host) : fresh;
  }

  /* ---- 2 + 3. Navbar behaviour ---------------------------------------- */

  function initNav() {
    var nav = document.querySelector('[data-nav]');
    if (!nav) return;

    var dropdowns = Array.prototype.slice.call(nav.querySelectorAll('[data-dropdown]'));
    var burger = nav.querySelector('[data-nav-burger]');
    var menu = nav.querySelector('.nav__menu');

    var isDesktop = function () { return window.innerWidth > DESKTOP; };

    function setOpen(dd, open) {
      dd.setAttribute('data-open', open ? 'true' : 'false');
      var toggle = dd.querySelector('[data-dropdown-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closeAll(except) {
      dropdowns.forEach(function (dd) { if (dd !== except) setOpen(dd, false); });
    }

    dropdowns.forEach(function (dd) {
      var toggle = dd.querySelector('[data-dropdown-toggle]');

      // Hover, desktop only.
      dd.addEventListener('mouseenter', function () {
        if (isDesktop()) { closeAll(dd); setOpen(dd, true); }
      });
      dd.addEventListener('mouseleave', function () {
        if (isDesktop()) setOpen(dd, false);
      });

      // Click, both breakpoints. On mobile the panel is an inline accordion.
      //
      // The toggle is a <button> since 19 Sep, so the click is only ever the
      // disclosure: it opens on mobile, where there is no hover to open it,
      // and it closes an open panel on desktop. It used to be an <a> pointing
      // at /solutions and the navigation was suppressed here on mobile only;
      // a toggle that must never navigate is a button, not a link with a
      // preventDefault, which is also what keeps Enter and Space working
      // without any keyboard code of our own.
      if (toggle) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = dd.getAttribute('data-open') === 'true';
          closeAll(dd);
          setOpen(dd, !open);
        });
      }
    });

    document.addEventListener('click', function (e) {
      if (nav.contains(e.target)) return;
      closeAll();
      // A tap on the dimmed page closes the mobile sheet too.
      if (nav.classList.contains('is-open')) closeMobile();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAll();
      if (nav.classList.contains('is-open')) closeMobile();
    });

    /* Mobile drawer */

    function seatSheet() {
      // The sheet is viewport-fixed but the card it hangs from is not
      // always at the viewport top: the tour announcement bar pushes it
      // down at scroll top. Measured at open; the locked body cannot
      // scroll, so the number holds while the sheet shows.
      if (menu) menu.style.setProperty('--nav-bottom', Math.round(nav.getBoundingClientRect().bottom) + 'px');
    }

    function openMobile() {
      seatSheet();
      nav.classList.add('is-open');
      if (menu) menu.classList.add('is-open');
      if (burger) {
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Close menu');
      }
      document.body.classList.add('nav-locked');
    }

    function closeMobile() {
      nav.classList.remove('is-open');
      if (menu) menu.classList.remove('is-open');
      if (burger) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      }
      document.body.classList.remove('nav-locked');
      closeAll();
    }

    if (burger) {
      burger.addEventListener('click', function () {
        if (nav.classList.contains('is-open')) closeMobile(); else openMobile();
      });
    }

    // Crossing up into desktop must force the drawer shut and unlock scroll,
    // otherwise the body stays frozen at desktop width.
    var lastDesktop = isDesktop();
    window.addEventListener('resize', function () {
      var now = isDesktop();
      if (!now && nav.classList.contains('is-open')) seatSheet();
      if (now && !lastDesktop) closeMobile();
      if (now !== lastDesktop) closeAll();
      lastDesktop = now;
    });

    /* 5. Current page */

    // Cloudflare Pages serves /solutions from solutions.html, so the local
    // preview's path carries an extension the hrefs never do. Normalising it
    // away keeps the marking identical in both places.
    function tidy(path) {
      return path.split(/[?#]/)[0].replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    }

    var here = tidy(window.location.pathname);
    nav.querySelectorAll('.nav__link, .nav__toggle, .nav__item, .nav__mini')
      .forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href) return;
        if (tidy(href) === here) a.setAttribute('aria-current', 'page');
      });
  }

  /* ---- 3b. Pill condense on scroll ------------------------------------ */

  function initNavScroll() {
    var nav = document.querySelector('[data-nav]');
    if (!nav) return;

    // Hysteresis (header-three): engage past 50px, release below 25px, so
    // the surface never flickers while hovering around one threshold.
    var scrolled = false;
    function apply() {
      var y = window.scrollY;
      scrolled = scrolled ? y > 25 : y > 50;
      nav.classList.toggle('nav--scrolled', scrolled);
    }

    // Applied synchronously before first paint, so a page restored
    // mid-scroll does not animate the pill condensing.
    apply();
    window.addEventListener('scroll', apply, { passive: true });
  }

  /* ---- 4. Navbar theme sync ------------------------------------------- */

  function initNavDarkSync() {
    var nav = document.querySelector('[data-nav]');
    var darkSections = Array.prototype.slice.call(document.querySelectorAll('[data-nav-dark]'));
    if (!nav) return;

    // A page can pin the navbar dark for its whole length.
    if (document.body.hasAttribute('data-nav-dark')) {
      nav.classList.add('nav-dark');
      return;
    }
    // No early return on a page with no dark section: the FOOTER is dark
    // on every page (22 Oct) and carries data-nav-dark, but it is injected
    // separately and can land after this runs, so it is picked up below.

    var navH = nav.offsetHeight || 72;

    // Track a SET of intersecting dark sections. With a single boolean,
    // scrolling from one dark section straight into the next flips the
    // navbar light for a frame.
    var active = new Set();

    function apply() {
      nav.classList.toggle('nav-dark', active.size > 0);
    }

    // Prime synchronously before first paint. Without this the navbar
    // renders light, then snaps dark, and the transition shows a flash.
    function prime() {
      active.clear();
      darkSections.forEach(function (el) {
        var r = el.getBoundingClientRect();
        // height > 0 for the same reason as the observer below: a hidden
        // or collapsed section has no box and cannot be behind the bar.
        if (r.height > 0 && r.top <= navH && r.bottom > 0) active.add(el);
      });
      apply();
    }

    nav.classList.add('nav-no-init-transition');
    prime();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nav.classList.remove('nav-no-init-transition');
      });
    });

    // Late arrivals (the footer): watch any [data-nav-dark] not yet tracked
    // once both components are in, then re-prime for a page restored at
    // the foot.
    var io = null;
    document.addEventListener('aira:components-ready', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-nav-dark]'), function (el) {
        if (darkSections.indexOf(el) !== -1) return;
        darkSections.push(el);
        if (io) io.observe(el);
      });
      prime();
    });

    if (!('IntersectionObserver' in window)) {
      window.addEventListener('scroll', prime, { passive: true });
      return;
    }

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // Never trust an intersection from a section with no box. The
        // homepage keeps three parked dark sections `hidden` (display:
        // none, rect 0x0 at 0,0), and iOS Safari's initial callback can
        // report such a target as intersecting, which painted the bar
        // dark over the light hero at scroll top (user's iPhone, 22 Oct)
        // until the first scroll recomputed it. A section that is not
        // rendered is never behind the navbar.
        var on = e.isIntersecting && e.boundingClientRect.height > 0;
        if (on) active.add(e.target); else active.delete(e.target);
      });
      apply();
    }, {
      // A band the height of the navbar, pinned to the top of the viewport:
      // a section counts as "behind the navbar" only while it overlaps it.
      rootMargin: (-navH + 1) + 'px 0px ' + (-(window.innerHeight - navH) + 1) + 'px 0px',
      threshold: 0
    });

    darkSections.forEach(function (el) { io.observe(el); });
  }

  /* ---- Version switcher (review-only) ----------------------------------- */

  /* Marks the current homepage experiment in the nav's V1/V2/V3 switcher.
     PARKED 21 Sep with the markup, so this now no-ops on every page. It stays
     because the switcher may come back: V2 and V3 still ship, they are just
     unlinked. Delete it with the CSS in global.css if it is retired for
     good. */
  function initVersionTabs() {
    var wrap = document.querySelector('.nav__versions');
    if (!wrap) return;
    var path = window.location.pathname;
    var v = 'v1';
    if (path.indexOf('index-v2') !== -1) v = 'v2';
    else if (path.indexOf('index-v3') !== -1) v = 'v3';
    var current = wrap.querySelector('[data-version="' + v + '"]');
    if (current) {
      current.classList.add('is-current');
      current.setAttribute('aria-current', 'page');
    }
  }

  /* ---- Boot ----------------------------------------------------------- */

  /* The NAVBAR IS SET UP THE MOMENT ITS MARKUP LANDS, not once the footer
     has arrived too (13 Oct, user: the events header "flickers for a brief
     second when came from any light page"). Waiting on Promise.all left
     the bar painted in its LIGHT default for however long the footer
     fetch took, and only then did the dark sync turn it dark over the
     events band. */
  function navReady() {
    initTourBar();
    initNav();
    initNavScroll();
    initNavDarkSync();
    initVersionTabs();
  }

  /* ---- 3a. Tour announcement bar (22 Oct) ------------------------------
     The strip above the header advertising the events tour. It ships
     inside navbar.html (hidden) so one component edit covers every page,
     and is MOVED OUT of #navbar-placeholder here: the placeholder is the
     sticky element, so left inside it the strip would stay stuck to the
     viewport instead of scrolling away like an announcement bar should.
     Not shown on the events pages (they ARE the advertisement) or, for
     the rest of the session, once dismissed. Runs in the same task as the
     injection, so on cached loads nothing moves after first paint. */
  function initTourBar() {
    var bar = document.querySelector('[data-tourbar]');
    if (!bar) return;
    var off = false;
    try { off = sessionStorage.getItem('aira_tourbar') === 'off'; } catch (e) {}
    if (off || document.body.classList.contains('page-events') ||
        document.body.classList.contains('page-event')) {
      bar.remove();
      return;
    }
    var host = document.getElementById('navbar-placeholder');
    if (host && host.parentNode) host.parentNode.insertBefore(bar, host);
    bar.hidden = false;
    var x = bar.querySelector('[data-tourbar-x]');
    if (x) x.addEventListener('click', function () {
      bar.remove();
      try { sessionStorage.setItem('aira_tourbar', 'off'); } catch (e) {}
    });
  }

  /* 'aira:components-ready' waits for DOMContentLoaded as well: with the
     markup cached, both components can land before the later deferred
     scripts (reveal.js, footer-cut.js, seat-tabs.js) have run and added
     their listeners, and an event nobody hears leaves the footer's reveal
     wrappers invisible. Deferred scripts all run before DOMContentLoaded. */
  var domReady = new Promise(function (res) {
    if (document.readyState === 'complete') res();
    else document.addEventListener('DOMContentLoaded', res, { once: true });
  });

  Promise.all([
    inject('navbar-placeholder', 'navbar.html', navReady),
    inject('footer-placeholder', 'footer.html'),
    domReady
  ]).then(function () {
    document.dispatchEvent(new CustomEvent('aira:components-ready'));
  });
})();
