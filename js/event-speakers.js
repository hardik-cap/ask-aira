/* The FDO pages' "Who's speaking" SHOW-MORE (user, 22 Oct: "whos speaking
   list is big, add a view more option"), the agenda table's own pattern
   (js/event-agenda.js). Progressive: the markup ships the FULL line-up and
   this script adds the collapsed state, so with it off nothing is hidden.
   Collapsed = the first eight (four rows of the two-column grid; .is-cut
   hides the rest in CSS); the button states the count, carries
   aria-expanded, and flips to "Show less". No animation, nothing to guard
   for reduced motion. */
(function () {
  'use strict';

  var MIN = 8;

  document.querySelectorAll('ul.evspk').forEach(function (list) {
    var rows = list.querySelectorAll('li');
    /* Not worth a button for one or two hidden rows. */
    if (rows.length <= MIN + 2) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--secondary btn--sm evspk__more';
    var openLabel = 'Show all speakers';
    btn.textContent = openLabel;
    btn.setAttribute('aria-expanded', 'false');

    list.classList.add('is-cut');
    list.insertAdjacentElement('afterend', btn);

    btn.addEventListener('click', function () {
      var cut = list.classList.toggle('is-cut');
      btn.setAttribute('aria-expanded', String(!cut));
      btn.textContent = cut ? openLabel : 'Show less';
    });
  });
})();
