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

  /* ====================================================================
     Routing
     --------------------------------------------------------------------
     The picker NAVIGATES now (17 Sep). IA §15 wrote this exit condition
     when the control was built: "when phase 5 writes the category pages,
     this is the one place that changes: the submit starts navigating
     instead." Those pages exist, so /solutions went back to being what
     IA §14 calls it, a router rather than a destination, and the 25 seat
     panels it used to filter in place came out with this change.

     The business cards are plain links now for the same reason, so the
     handler that used to set the picker and submit it is gone too.
     ==================================================================== */

  /* Each option carries data-group: "retail" for the eight categories,
     which live under /solutions/retail/, and its own slug for the three
     industries, which have hubs one level up. data-value is the slug in
     both cases. */
  var groupOf = {};
  var industryOpts = document.querySelectorAll('#pick-industry-list .pick__opt');
  for (var o = 0; o < industryOpts.length; o++) {
    groupOf[industryOpts[o].getAttribute('data-value')] =
      industryOpts[o].getAttribute('data-group');
  }

  /* A team lands you on that team's section. The two page types reach it
     differently and each uses its own native mechanism: a category page
     stacks its five roles as anchors, so #crm needs no script at all; a
     hub tabs them, so ?role=crm is read by js/seat-tabs.js. */
  function urlFor(biz, role) {
    if (!biz) return null;
    var retail = groupOf[biz] === 'retail';
    var base = retail ? '/solutions/retail/' + biz : '/solutions/' + biz;
    if (!role) return base;
    return retail ? base + '#' + role : base + '?role=' + role;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    closeOthers(null);
    var url = urlFor(industryBox.value, roleBox.value);
    /* No business chosen: put the cursor back on the control that needs an
       answer rather than navigating nowhere. */
    if (!url) {
      var ctl = industryBox.field.querySelector('.pick__control');
      if (ctl) ctl.focus();
      return;
    }
    location.href = url;
  });

  /* A shared /solutions?industry=&role= link still restores the control,
     so the page a visitor arrives on matches the link they were sent.
     It no longer scrolls: there is nothing below to scroll to. */
  (function initFromUrl() {
    var params = new URLSearchParams(location.search);
    var ind = params.get('industry');
    var role = params.get('role');
    if (ind) industryBox.set(ind);
    if (role) roleBox.set(role);
  })();
})();
