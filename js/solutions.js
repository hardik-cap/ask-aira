/* Solutions finder.

   The control is the picker in the hero: two dropdowns plus a go button,
   flight-search style. Industry is required; team is optional and opens on a
   "Select your team" placeholder, and LEAVING IT ALONE is the normal case: an
   empty role means all five teams, because the contrast between the five
   seats is the argument the page makes.

   Every industry group and every seat already exists in the markup. Submitting
   only decides which group is on screen, which seat is marked, and what the
   URL says. Retail is active in the shipped markup, so the page is never empty
   at rest and a no-JS visitor sees all five groups. */
(function () {
  'use strict';

  var finder = document.getElementById('finder');
  var form = document.getElementById('pick');
  if (!finder || !form) return;

  /* ====================================================================
     Listbox: the ARIA select-only combobox pattern.

     Focus stays on the button the whole time and aria-activedescendant
     points at the option the keyboard is on, which is what lets one
     control carry an icon per option without losing the behaviour a
     native <select> would have given for free.
     ==================================================================== */

  function Listbox(field) {
    var button = field.querySelector('.pick__control');
    var list = field.querySelector('.pick__list');
    var valueEl = field.querySelector('.pick__value');
    var iconEl = field.querySelector('.pick__ic');
    var input = field.querySelector('input[type="hidden"]');
    var opts = Array.prototype.slice.call(field.querySelectorAll('.pick__opt'));

    var open = false;
    var activeIndex = Math.max(0, opts.findIndex(function (o) {
      return o.getAttribute('aria-selected') === 'true';
    }));

    var api = {
      field: field,
      get value() { return input.value; },
      onCommit: null
    };

    function setActive(i, scroll) {
      if (i < 0 || i >= opts.length) return;
      opts[activeIndex].classList.remove('is-active');
      activeIndex = i;
      var el = opts[activeIndex];
      el.classList.add('is-active');
      button.setAttribute('aria-activedescendant', el.id);
      if (scroll !== false) {
        /* Only nudge within the list, never scroll the page under it. */
        var lb = list.getBoundingClientRect();
        var ob = el.getBoundingClientRect();
        if (ob.top < lb.top) list.scrollTop -= (lb.top - ob.top);
        else if (ob.bottom > lb.bottom) list.scrollTop += (ob.bottom - lb.bottom);
      }
    }

    function setOpen(next) {
      open = next;
      list.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        setActive(indexOfSelected());
      } else {
        button.removeAttribute('aria-activedescendant');
        opts[activeIndex].classList.remove('is-active');
      }
    }

    function indexOfSelected() {
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].getAttribute('aria-selected') === 'true') return i;
      }
      return 0;
    }

    function commit(i) {
      opts.forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
      var el = opts[i];
      el.setAttribute('aria-selected', 'true');
      input.value = el.getAttribute('data-value');
      valueEl.textContent = el.querySelector('.pick__opt-t').textContent;
      /* The first field opens on a placeholder, so the first commit also
         drops the muted treatment. */
      valueEl.classList.remove('is-empty');
      /* Mirror the chosen option's glyph into the closed control. */
      var src = el.querySelector('.pick__opt-ic path');
      var dest = iconEl.querySelector('path');
      if (src && dest) dest.setAttribute('d', src.getAttribute('d'));
      if (api.onCommit) api.onCommit(input.value);
    }

    button.addEventListener('click', function (e) {
      e.stopPropagation();
      closeOthers(api);
      setOpen(!open);
    });

    /* Which input committed the value. The ring is a KEYBOARD affordance, and
       :focus-visible alone cannot be trusted here: the pattern deliberately
       returns focus to the button after a commit, and a programmatic focus()
       is judged by a browser heuristic rather than by what the user did. This
       flag says it outright, and CSS reads it. */
    function ringFor(mode) {
      if (mode === 'pointer') field.dataset.ring = 'off';
      else delete field.dataset.ring;
    }

    button.addEventListener('pointerdown', function () { ringFor('pointer'); });

    button.addEventListener('keydown', function (e) {
      var k = e.key;
      ringFor('key');

      if (!open) {
        if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
          e.preventDefault();
          closeOthers(api);
          setOpen(true);
        }
        return;
      }

      if (k === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (k === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, opts.length - 1));
      } else if (k === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
      } else if (k === 'Home') {
        e.preventDefault();
        setActive(0);
      } else if (k === 'End') {
        e.preventDefault();
        setActive(opts.length - 1);
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        commit(activeIndex);
        setOpen(false);
      } else if (k === 'Tab') {
        /* Tabbing away commits what is highlighted, like a native select. */
        commit(activeIndex);
        setOpen(false);
      } else if (k.length === 1 && /\S/.test(k)) {
        /* Type-ahead: jump to the next option starting with this letter. */
        var lower = k.toLowerCase();
        for (var n = 1; n <= opts.length; n++) {
          var i = (activeIndex + n) % opts.length;
          var t = opts[i].querySelector('.pick__opt-t').textContent.trim().toLowerCase();
          if (t.charAt(0) === lower) { setActive(i); break; }
        }
      }
    });

    opts.forEach(function (opt, i) {
      /* mousedown, not click: the button would otherwise lose focus first
         and the field's focus ring would flicker off mid-selection. */
      opt.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        ringFor('pointer');
        commit(i);
        setOpen(false);
        button.focus();
      });
      opt.addEventListener('mouseenter', function () { setActive(i, false); });
    });

    api.close = function () { if (open) setOpen(false); };
    api.set = function (value) {
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].getAttribute('data-value') === value) { commit(i); return true; }
      }
      return false;
    };
    return api;
  }

  var boxes = Array.prototype.slice.call(form.querySelectorAll('.pick__field'))
    .map(Listbox);

  function closeOthers(except) {
    boxes.forEach(function (b) { if (b !== except) b.close(); });
  }

  document.addEventListener('click', function (e) {
    boxes.forEach(function (b) {
      if (!b.field.contains(e.target)) b.close();
    });
  });

  var industryBox = boxes[0];
  var roleBox = boxes[1];

  /* The business cards are a second way to choose, for people who would
     rather scan twelve options than open a control. A card sets the picker,
     so the two never disagree, then submits it, so the page behaves exactly
     as if the go button had been pressed.

     Every business is an option in the dropdown, so a card selects itself.
     The card becomes a plain href once its page is written, and this handler
     goes with it. */
  var cards = document.querySelectorAll('.biz[data-biz]');
  for (var c = 0; c < cards.length; c++) {
    (function (card) {
      card.addEventListener('click', function () {
        if (!industryBox.set(card.getAttribute('data-biz'))) return;
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
    })(cards[c]);
  }

  /* ====================================================================
     The page under the picker
     ==================================================================== */

  var groups = finder.querySelectorAll('.finder__group');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Seat tabs live in js/seat-tabs.js, shared with /solutions/retail. It
     self-initialises and registers one API per group, keyed by industry. */
  var tabsOf = window.aiRaSeatTabs || {};


  /* The first dropdown names a BUSINESS. The page below is written per
     industry, so each option carries data-group: the content it can actually
     show today. For the four non-retail businesses the two are the same. For
     the eight retail categories the group is retail, because their own pages
     are not written yet, and the page says so rather than passing retail's
     questions off as apparel's. */
  var groupOf = {};
  var bizLabel = {};
  var industryOpts = document.querySelectorAll('#pick-industry-list .pick__opt');
  for (var o = 0; o < industryOpts.length; o++) {
    var opt = industryOpts[o];
    groupOf[opt.getAttribute('data-value')] = opt.getAttribute('data-group');
    bizLabel[opt.getAttribute('data-value')] =
      opt.querySelector('.pick__opt-t').textContent.trim();
  }

  var DEFAULT_INDUSTRY = 'retail';
  var state = { industry: '', role: '' };

  function render() {
    var want = groupOf[state.industry] || state.industry || DEFAULT_INDUSTRY;
    var active = null;
    for (var i = 0; i < groups.length; i++) {
      var hit = groups[i].getAttribute('data-industry') === want;
      groups[i].classList.toggle('is-active', hit);
      if (hit) active = groups[i];
    }

    /* When someone picks a business narrower than the content we have, say
       so on the page. Silently showing retail's questions under an apparel
       heading would be the exact failure this page argues against. */
    if (active) {
      var note = active.querySelector('.finder__pending');
      var narrower = state.industry && groupOf[state.industry] !== state.industry;
      if (note) {
        note.hidden = !narrower;
        if (narrower) {
          note.textContent = 'Written for ' + bizLabel[state.industry] +
            ' is still to come. These are the retail-wide questions in the meantime.';
        }
      }
    }

    /* The role opens that seat's tab in the visible group; without one the
       group keeps whichever tab it was on. Either way the mark re-measures,
       because the group may only just have become visible. */
    if (active) {
      var tb = tabsOf[active.getAttribute('data-industry')];
      if (tb) {
        if (state.role) tb.selectRole(state.role);
        tb.refresh();
      }
    }

    var seats = finder.querySelectorAll('.seat');
    for (var k = 0; k < seats.length; k++) {
      seats[k].classList.remove('is-target');
    }
    if (active && state.role) {
      var target = active.querySelector('.seat[data-role="' + state.role + '"]');
      if (target) target.classList.add('is-target');
    }
    return active;
  }

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.industry) params.set('industry', state.industry);
    if (state.role) params.set('role', state.role);
    var q = params.toString();
    try {
      history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
    } catch (e) {
      /* file:// and some sandboxes refuse; the picker still works. */
    }
  }

  /* Where the visitor should end up after pressing go: the named seat when
     they picked one, otherwise the top of the group they asked for. */
  function destination(active) {
    if (!active) return null;
    if (state.role) {
      var seat = active.querySelector('.seat[data-role="' + state.role + '"]');
      if (seat) return seat;
    }
    return active;
  }

  form.addEventListener('submit', function (e) {
    /* Never let the GET submit reload the page: everything needed is already
       in the document, and a reload would lose the visitor's scroll position
       for no gain. */
    e.preventDefault();
    closeOthers(null);

    state.industry = industryBox.value || '';
    state.role = roleBox.value || '';

    var active = render();
    syncUrl();

    var el = destination(active);
    if (el) {
      el.scrollIntoView({
        behavior: reduced.matches ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  });

  /* js/components.js injects the nav and footer from an async fetch, so the
     document grows by a header AFTER this script first runs. Scrolling before
     that lands the visitor short by the header's height, so the deep-link jump
     waits for the injection. The timeout is a safety net: if the fetch fails
     the page still works, and the deep link should not be stranded on it. */
  function whenLaidOut(fn) {
    var done = false;
    function once() {
      if (done) return;
      done = true;
      fn();
    }
    var placeholder = document.getElementById('navbar-placeholder');
    if (placeholder && placeholder.children.length) { once(); return; }
    document.addEventListener('aira:components-ready', once, { once: true });
    setTimeout(once, 1500);
  }

  /* Preselect from a shared link or a nav "By team" link, and put the picker
     in the same state so the control never disagrees with the page under it.
     Unknown values fall through to the default rather than emptying the page. */
  (function initFromUrl() {
    var params = new URLSearchParams(location.search);
    var ind = params.get('industry');
    var role = params.get('role');

    if (ind && industryBox.set(ind)) state.industry = ind;
    if (role && roleBox.set(role)) state.role = role;

    var active = render();
    if (!active || (!state.role && !ind)) return;

    /* Only a deep link moves the page on load, and it must land INSTANTLY:
       this is a position, not a motion. 'instant' is required rather than
       'auto', which defers to global.css's html { scroll-behavior: smooth }
       and would animate the whole way down the page on arrival. */
    whenLaidOut(function () {
      var el = destination(active);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  })();
})();
