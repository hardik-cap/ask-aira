/* Toggleable checklist rows: /product's "Your first week" card (3 Oct).
   Each row is a <button role="checkbox"> inside an <li>; a click flips
   .is-done on the li and aria-checked on the button. The CSS animates
   every part of the change. .is-pop replays the ring's pop on this click
   only, so rows that load already done never pop. With the script off the
   card simply shows its resting state. */
(function () {
  document.querySelectorAll('.odata__item[role="checkbox"]').forEach(function (btn) {
    var row = btn.closest('li');
    if (!row) return;
    btn.addEventListener('click', function () {
      var done = !row.classList.contains('is-done');
      row.classList.toggle('is-done', done);
      btn.setAttribute('aria-checked', done ? 'true' : 'false');
      row.classList.remove('is-pop');
      void row.offsetWidth;            // restart the pop if clicked twice fast
      row.classList.add('is-pop');
    });
    row.addEventListener('animationend', function () { row.classList.remove('is-pop'); });
  });
})();
