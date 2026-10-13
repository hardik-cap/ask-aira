/* ==========================================================================
   aiRA — the question bar on the retail category pages (20 Sep, user
   reference).

   Progressive enhancement over .qledger__grid, which ships five question and
   capability pairs as plain markup and still reads as a list with this script
   off. When it runs, the five collapse into ONE prompt bar with a row of
   capability tabs under it, and choosing a tab retypes the bar.

   NOTHING MOVES INTO THE SCRIPT. The questions and their labels stay in the
   page's own HTML, which is what the eight category pages are edited through
   and what search engines read. The script only reads them, so a new question
   is still a markup change and never a JS change.

   The retype is a real typewriter rather than a crossfade because the bar is
   pretending to be an input: a caret sits at the end of the line, and text
   that appears all at once under a caret does not read as typing. Under
   prefers-reduced-motion it swaps instantly and the caret stops blinking.
   ========================================================================== */

(function () {
  'use strict';

  /* Phosphor DUOTONE, lifted from the capability pills so a label wears the
     same glyph everywhere on the site. Keyed by the label in the markup; an
     unknown label simply gets no icon rather than a wrong one. */
  var ICONS = {
    'Ad hoc analytics': ['M208,40V208H152V40Z',
      'M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z'],
    'Advanced analytics': ['M224,64V208H32V48H208A16,16,0,0,1,224,64Z',
      'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V200H224A8,8,0,0,1,232,208ZM132,160a12,12,0,1,0-12-12A12,12,0,0,0,132,160Zm-24-56A12,12,0,1,0,96,92,12,12,0,0,0,108,104ZM76,176a12,12,0,1,0-12-12A12,12,0,0,0,76,176Zm96-48a12,12,0,1,0-12-12A12,12,0,0,0,172,128Zm24-40a12,12,0,1,0-12-12A12,12,0,0,0,196,88Zm-20,76a12,12,0,1,0,12-12A12,12,0,0,0,176,164Z'],
    'Predictive models': ['M232,56v64L168,56Z',
      'M232,48H168a8,8,0,0,0-5.66,13.66L188.69,88,136,140.69l-34.34-34.35a8,8,0,0,0-11.32,0l-72,72a8,8,0,0,0,11.32,11.32L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0L200,99.31l26.34,26.35A8,8,0,0,0,240,120V56A8,8,0,0,0,232,48Zm-8,52.69L187.31,64H224Z'],
    'Audience builder': ['M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z',
      'M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z'],
    'Journey orchestration': ['M80,176a32,32,0,1,1-32-32A32,32,0,0,1,80,176Z',
      'M245.66,74.34l-32-32a8,8,0,0,0-11.32,11.32L220.69,72H208c-49.33,0-61.05,28.12-71.38,52.92-9.38,22.51-16.92,40.59-49.48,42.84a40,40,0,1,0,.1,16c43.26-2.65,54.34-29.15,64.14-52.69C161.41,107,169.33,88,208,88h12.69l-18.35,18.34a8,8,0,0,0,11.32,11.32l32-32A8,8,0,0,0,245.66,74.34ZM48,200a24,24,0,1,1,24-24A24,24,0,0,1,48,200Z'],
  };

  var reduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* The bar's own icons are Phosphor REGULAR, not duotone: it is a drawn
     product surface, same product-fidelity rule as the difference loop. */
  var ARROW = 'M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z';

  function icon(label) {
    var p = ICONS[label];
    if (!p) return '';
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
           '<path d="' + p[0] + '" opacity="0.2"/><path d="' + p[1] + '"/></svg>';
  }
  function plain(d) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  /* The drifting brand row above the bar (20 Sep, user reference and two
     corrections). It ran customer logos in uniform tiles, then subject icons;
     it is customer logos again, but at their OWN size in ONE row, and the set
     is the SUB-INDUSTRY's rather than retail's in general.

     The set is data, not code: each page carries data-qbar-logos on its
     .qledger__grid, so a category's brands are edited in the page they belong
     to. The default below only catches a page that forgets. Some categories
     have thin coverage in /assets/logos and are topped up with the nearest
     neighbours; see docs/context.md for the mapping and which ones need more
     marks from Capillary. */
  /* APPROVED BRANDS ONLY since 7 Oct (user): every row, and this fallback,
     carries only the twelve marks the logo sheet clears as aiRA users
     (context.md 15.4a, Optum removed 7 Oct, Metro Shoes 13 Oct). Each page puts its own
     category's cleared brands first, then the rest of the twelve. */
  var FALLBACK = ['asics', 'rack-room-shoes-color', 'arvind',
                  'indian-terrain', 'aditya-birla-lifestyle-brands', 'kanmo-group', 'redtag',
                  'shell', 'hertz-color', 'indigo', 'nascar-color', 'cochran-color'];

  function field(names) {
    var wrap = document.createElement('div');
    wrap.className = 'qbar__field';
    wrap.setAttribute('aria-hidden', 'true');   /* texture, not content */
    var row = document.createElement('div');
    row.className = 'qbar__row';
    var run = document.createElement('div');
    run.className = 'qbar__run';
    /* The run is written TWICE end to end. The CSS slides it by exactly half
       its width, so the second copy lands where the first began and the loop
       has no seam; one copy would snap back visibly. A short set is repeated
       until the run is long enough to cross any viewport before it wraps. */
    var reps = Math.max(2, Math.ceil(14 / names.length));
    for (var pass = 0; pass < 2; pass++) {
      for (var k = 0; k < reps; k++) {
        names.forEach(function (n) {
          var t = document.createElement('span');
          t.className = 'qbar__mark';
          t.innerHTML = '<img src="/assets/logos/' + n + '.svg" alt="" loading="lazy">';
          run.appendChild(t);
        });
      }
    }
    row.appendChild(run);
    wrap.appendChild(row);
    return wrap;
  }

  document.querySelectorAll('.qledger__grid').forEach(function (grid) {
    var items = Array.prototype.slice.call(grid.querySelectorAll('.qledger__item'));
    if (items.length < 2) return;

    var data = items.map(function (it) {
      var q = it.querySelector('.chat__q');
      var c = it.querySelector('.qledger__cap');
      return q && c ? { q: q.textContent.trim(), c: c.textContent.trim() } : null;
    }).filter(Boolean);
    if (data.length < 2) return;

    var bar = document.createElement('div');
    bar.className = 'qbar';
    bar.innerHTML =
      '<div class="qbar__box">' +
        /* The line is wrapped so the caret stays INLINE with the text: the
           text block is a flex container (it reserves three lines and centres
           whatever it uses), and a flex container would otherwise make the
           text run and the caret two separate items and push the caret onto
           a line of its own. */
        '<p class="qbar__text"><span class="qbar__line"><span class="qbar__typed"></span></span></p>' +
        '<span class="qbar__send" aria-hidden="true">' + plain(ARROW) + '</span>' +
      '</div>' +
      '<div class="qbar__tabs" role="tablist" aria-label="Question categories"></div>';

    var typed = bar.querySelector('.qbar__typed');
    var tabs  = bar.querySelector('.qbar__tabs');

    /* The live region is the TEXT, not the bar: a screen reader should hear
       the new question once it has landed, not every character of it. */
    typed.setAttribute('aria-live', 'polite');
    typed.setAttribute('aria-atomic', 'true');

    var btns = data.map(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qbar__tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.innerHTML = icon(d.c) + '<span>' + d.c + '</span>';
      b.addEventListener('click', function () { pick(i); });
      tabs.appendChild(b);
      return b;
    });

    var at = -1, typer = null;
    /* The cycle. HOLD matches the CSS fill's duration exactly; see arm(). */
    var HOLD = 6000, clock = null, onScreen = false, held = false;

    /* THE SAME LETTER ROLL AS THE HOMEPAGE CUE (9 Oct): the old question
       lifts out, the new one rises in. It replaced a backspace-and-retype
       behind a caret, so the two ask bars on the site no longer change
       their text two different ways. Markup and timing match
       js/prompt-cue.js; the CSS is .roll__* in components.css. */
    var OUT_MS = 340;
    function setChars(text) {
      typed.textContent = '';
      var words = text.split(' '), n = 0;
      words.forEach(function (word, w) {
        var ws = document.createElement('span');
        ws.className = 'roll__w';
        for (var k = 0; k < word.length; k++) {
          var c = document.createElement('span');
          c.className = 'roll__c';
          c.style.setProperty('--i', n++);
          c.textContent = word[k];
          ws.appendChild(c);
        }
        typed.appendChild(ws);
        if (w < words.length - 1) typed.appendChild(document.createTextNode(' '));
      });
    }
    function type(text) {
      if (typer) { clearTimeout(typer); typer = null; }
      if (reduce) { typed.textContent = text; return; }
      /* Nothing showing yet (the first pick): roll straight in. */
      if (!typed.textContent) { setChars(text); return; }
      typed.classList.add('roll-out');
      typer = setTimeout(function () {
        typer = null;
        typed.classList.remove('roll-out');
        setChars(text);
      }, OUT_MS);
    }

    /* THE BAR AND THE TIMEOUT ARE ONE CLOCK. .is-running is added here, in the
       same frame the setTimeout is set, and the CSS fill keys off that class,
       so the line can never be ahead of or behind the advance. Dropping the
       class and reading offsetWidth between the drop and the re-add forces the
       style flush that makes the animation start over, which is also what
       restarts the fill when the tab being chosen is the one already open.
       (The industry hubs' walkthrough learned this the hard way: with the fill
       on .is-active and the timeout on an observer, a section that had not yet
       scrolled in showed a full bar and then sat there for another six
       seconds.) */
    function arm() {
      if (clock) { clearTimeout(clock); clock = null; }
      bar.classList.remove('is-running');
      if (!onScreen || held || reduce) return;
      void bar.offsetWidth;
      bar.classList.add('is-running');
      clock = setTimeout(function () { pick((at + 1) % data.length); }, HOLD);
    }

    /* The tab row is one scrolling line on a phone, so the chosen tab has to
       bring itself into view or the selection lands off screen. This moves the
       ROW'S OWN scrollLeft and nothing else.

       It replaced scrollIntoView, which was wrong here in a way that only
       showed on the real page: that method scrolls every scrollable ancestor,
       the document included, and block:'nearest' on an element below the fold
       means "scroll the page until it is not". So the init pick(0) threw a
       visitor arriving on a category page 1496px down the page, into the
       question bar. A control that is off screen does not need revealing, it
       needs leaving alone. */
    function keepInRow(el) {
      if (!tabs || tabs.scrollWidth <= tabs.clientWidth + 1) return;
      var r = el.getBoundingClientRect(), c = tabs.getBoundingClientRect();
      /* Matches the CSS scroll-padding-inline, so a tab never lands flush
         against the edge it was scrolled away from. */
      var pad = 20, dx = 0;
      if (r.left < c.left + pad) dx = r.left - c.left - pad;
      else if (r.right > c.right - pad) dx = r.right - c.right + pad;
      if (!dx) return;
      var to = tabs.scrollLeft + dx;
      if (tabs.scrollTo) {
        try { tabs.scrollTo({ left: to, behavior: reduce ? 'auto' : 'smooth' }); return; }
        catch (err) {}
      }
      tabs.scrollLeft = to;
    }

    function pick(i) {
      if (i === at) { arm(); return; }
      at = i;
      btns.forEach(function (b, k) {
        b.classList.toggle('is-on', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      keepInRow(btns[i]);
      type(data[i].q);
      arm();
    }

    /* Clicking a tab is an explicit choice to watch it, so it always releases
       the hold, whatever focus did on the way in. */
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { held = false; });
    });

    /* KEYBOARD focus holds the cycle; a pointer does not. Clicking a button
       focuses it, so holding on every focusin would park the story on the
       first tab anyone pressed. :focus-visible is exactly that distinction,
       and it is guarded because a browser that does not know the selector
       throws out of matches(). */
    function keyboardFocused(el) {
      try { return !!(el && el.matches && el.matches(':focus-visible')); }
      catch (err) { return false; }
    }
    bar.addEventListener('focusin', function (e) {
      if (!keyboardFocused(e.target)) return;
      held = true; arm();
    });
    bar.addEventListener('focusout', function (e) {
      if (bar.contains(e.relatedTarget)) return;
      held = false; arm();
    });

    /* DRAGGING the tab row holds it too. On a phone the row is wider than the
       screen and has to be scrolled to reach the last tab, so an advance
       landing mid-drag would yank the row out from under the thumb. The
       release is delayed because momentum scrolling keeps running after the
       finger lifts. */
    var settle = null;
    tabs.addEventListener('pointerdown', function () {
      if (settle) { clearTimeout(settle); settle = null; }
      held = true; arm();
    });
    function release() {
      if (settle) clearTimeout(settle);
      settle = setTimeout(function () {
        settle = null;
        /* A TAP already released the hold in the click handler and re-armed on
           the tab it chose. Re-arming again here would clear that clock and
           restart the fill 1.2s in, so the tapped tab would run 7.2s and its
           bar would visibly snap back. Only a drag is still held by now. */
        if (!held) return;
        held = false; arm();
      }, 1200);
    }
    tabs.addEventListener('pointerup', release);
    tabs.addEventListener('pointercancel', release);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        arm();
      }, { threshold: 0.25 }).observe(bar);
    } else {
      onScreen = true;
    }

    var set = (grid.getAttribute('data-qbar-logos') || '').split(',')
                .map(function (x) { return x.trim(); }).filter(Boolean);
    bar.insertBefore(field(set.length ? set : FALLBACK), bar.firstChild);

    grid.parentNode.insertBefore(bar, grid);
    grid.classList.add('is-stowed');
    pick(0);
  });
})();
