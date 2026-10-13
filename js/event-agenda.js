/* The Captivate agenda table's SHOW-MORE (user, 13 Oct: "have a max
   height, and show more like button basically to expand the list").
   Progressive: the markup ships the FULL day and this script adds the
   collapsed state, so with it off nothing is hidden. Collapsed = the first
   six rows (.is-cut hides the rest in CSS); the button states the count,
   carries aria-expanded, and flips to "Show less". No animation, nothing
   to guard for reduced motion. */
(function () {
  'use strict';

  var MIN = 6;

  document.querySelectorAll('[data-agenda]').forEach(function (wrap) {
    var rows = wrap.querySelectorAll('tbody tr');
    /* Not worth a button for one or two hidden rows. */
    if (rows.length <= MIN + 2) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--secondary btn--sm evagenda__more';
    var openLabel = 'Show the full day · ' + rows.length + ' sessions';
    btn.textContent = openLabel;
    btn.setAttribute('aria-expanded', 'false');

    wrap.classList.add('is-cut');
    wrap.appendChild(btn);

    btn.addEventListener('click', function () {
      var cut = wrap.classList.toggle('is-cut');
      btn.setAttribute('aria-expanded', String(!cut));
      btn.textContent = cut ? openLabel : 'Show less';
    });
  });
})();
