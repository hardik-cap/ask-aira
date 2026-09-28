/* Seat tabs: one seat on screen at a time, Attio platform-page style.

   Shared by /solutions (five industry groups) and /solutions/retail (one), so
   the behaviour lives here rather than in either page's script. It wires every
   .finder__group that ships a .seatbar and hands back a small API per group,
   keyed by data-industry, on window.aiRaSeatTabs.

   The script adds .is-tabbed, which is what reveals the bar and collapses the
   stack to the open seat, so a no-JS visitor keeps the panels stacked and
   never sees a control that cannot work. Roving tabindex per the ARIA tabs
   pattern: arrows move, one tab stop per bar. */
(function () {
  'use strict';

  var registry = {};

  function Tabs(group) {
    var bar = group.querySelector('.seatbar');
    if (!bar) return null;
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.seatbar__tab'));
    var seats = Array.prototype.slice.call(group.querySelectorAll('.seat'));
    var mark = bar.querySelector('.seatbar__mark');
    if (!tabs.length || !seats.length || !mark) return null;
    var current = 0;
    group.classList.add('is-tabbed');

    function place() {
      var t = tabs[current];
      /* A hidden group has no geometry; refresh() re-places it on arrival. */
      if (!t || !t.offsetWidth) return;
      mark.style.left = (t.offsetLeft + t.offsetWidth / 2 - 1) + 'px';
    }

    function select(i, focus) {
      current = i;
      tabs.forEach(function (t, n) {
        t.setAttribute('aria-selected', n === i ? 'true' : 'false');
        t.tabIndex = n === i ? 0 : -1;
      });
      seats.forEach(function (s, n) { s.classList.toggle('is-open', n === i); });
      place();
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });

    select(0);
    return {
      refresh: place,
      selectRole: function (role) {
        for (var i = 0; i < seats.length; i++) {
          if (seats[i].getAttribute('data-role') === role) {
            select(i);
            return true;
          }
        }
        return false;
      }
    };
  }

  var groups = document.querySelectorAll('.finder__group');
  for (var i = 0; i < groups.length; i++) {
    var made = Tabs(groups[i]);
    if (made) registry[groups[i].getAttribute('data-industry')] = made;
  }

  function refreshAll() {
    for (var k in registry) registry[k].refresh();
  }
  window.addEventListener('resize', refreshAll);
  /* Tab widths settle when the webfont does. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);

  /* A team arriving from the /solutions picker: ?role=crm opens that seat.
     The hubs tab their five seats, so there is no anchor to land on the way
     a category page has, and this is the equivalent. Scrolling waits for
     js/components.js to inject the header, or the landing sits short by the
     bar's height. */
  (function initFromUrl() {
    var role = new URLSearchParams(location.search).get('role');
    if (!role) return;
    var opened = null;
    for (var k in registry) {
      if (registry[k].selectRole(role)) opened = registry[k];
    }
    if (!opened) return;

    var bar = document.querySelector('.finder__group.is-tabbed .seatbar');
    if (!bar) return;
    function land() {
      refreshAll();
      /* A position, not a motion: 'instant' rather than 'auto', which would
         defer to html { scroll-behavior: smooth } and animate the whole way
         down the page on arrival. */
      bar.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    if (document.getElementById('navbar-placeholder') &&
        document.getElementById('navbar-placeholder').children.length) { land(); return; }
    document.addEventListener('aira:components-ready', land, { once: true });
    setTimeout(land, 1500);
  })();

  window.aiRaSeatTabs = registry;
})();
