/* /pricing's plan cards, ported from sv-efferd's "Pricing Four" (3 Oct).
   Progressive enhancement over cards that already show monthly prices:
   - the toggle's pill is measured off the pressed button and slides to it;
   - each [data-monthly]/[data-yearly] price rolls to its new figure (a short
     tween standing in for NumberFlow), formatted as whole USD ($12,000);
   - each card's yearly discount badge is filled in and shown on Yearly.
   Under reduced motion the figures change in one step. */
(function () {
  var root = document.querySelector('.pfour');
  if (!root) return;
  var group = root.querySelector('.freq');
  var pill = root.querySelector('.freq__pill');
  var btns = root.querySelectorAll('.freq__btn');
  // Document-wide, not root-only: the comparison grid's sticky header
  // carries the same prices and rolls with the same toggle.
  var nums = document.querySelectorAll('.plan__num');
  var labels = document.querySelectorAll('[data-freq-label]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Full amounts ($12,000), not the block's compact $12K: for a B2B price
  // the whole figure reads as a quote rather than an app subscription.
  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function placePill(btn) {
    group.style.setProperty('--pill-x', btn.offsetLeft + 'px');
    group.style.setProperty('--pill-w', btn.offsetWidth + 'px');
  }

  function roll(el, to) {
    var from = parseFloat(el.dataset.now || el.dataset.monthly);
    el.dataset.now = to;
    if (reduce || from === to) { el.textContent = fmt.format(to); return; }
    var t0 = performance.now(), dur = 520;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      // Round to the format's own precision so the tween never shows a
      // figure the final format would not.
      el.textContent = fmt.format(Math.round((from + (to - from) * e) / 100) * 100);
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = fmt.format(to);
    })(t0);
  }

  function set(freq) {
    btns.forEach(function (b) {
      var on = b.dataset.freq === freq;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) placePill(b);
    });
    labels.forEach(function (l) { l.textContent = freq; });
    nums.forEach(function (n) {
      var mo = +n.dataset.monthly, yr = +n.dataset.yearly;
      roll(n, freq === 'yearly' ? yr : mo);
      var card = n.closest('.plan');
      var badge = card && card.querySelector('[data-off]');
      if (!badge) return;
      var off = Math.round((mo - yr) / mo * 100);
      if (freq === 'yearly' && off > 0) {
        badge.textContent = off + '% off';
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') !== 'true') set(b.dataset.freq);
    });
  });
  // The comparison grid's phone switcher: one plan column at a time below
  // 768 (the CSS keys off .is-tabbed and data-col). Same pill as above.
  var pick = document.querySelector('.pmx__pick');
  var table = document.querySelector('.pmx__table');
  if (pick && table) {
    var pickPill = function (b) {
      pick.style.setProperty('--pill-x', b.offsetLeft + 'px');
      pick.style.setProperty('--pill-w', b.offsetWidth + 'px');
    };
    pick.hidden = false;
    table.classList.add('is-tabbed');
    var pickBtns = pick.querySelectorAll('.freq__btn');
    var choose = function (b) {
      pickBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      table.dataset.col = b.dataset.col;
      pickPill(b);
    };
    pickBtns.forEach(function (b) { b.addEventListener('click', function () { choose(b); }); });
    choose(pick.querySelector('[aria-pressed="true"]'));
    pick.classList.add('is-live');
    window.addEventListener('resize', function () { pickPill(pick.querySelector('[aria-pressed="true"]')); });
  }

  var pressed = root.querySelector('.freq__btn[aria-pressed="true"]');
  placePill(pressed);
  group.classList.add('is-live');
  window.addEventListener('resize', function () {
    placePill(root.querySelector('.freq__btn[aria-pressed="true"]'));
  });
})();
