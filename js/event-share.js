/* "Share this event": the copy-link button (13 Oct). The four network
   links are plain share URLs in the markup and need nothing from here;
   this only un-hides the copy button where the Clipboard API exists, so a
   browser without it never shows a button that cannot work. The button
   confirms in place (the link glyph swaps to a check, the label to
   "Link copied") and through a polite live region, then resets. */
(function () {
  'use strict';

  if (!navigator.clipboard || !window.isSecureContext) return;

  document.querySelectorAll('[data-share-copy]').forEach(function (btn) {
    var wrap = btn.closest('[data-share-copy-wrap]');
    var status = btn.closest('.evbody__aside') &&
      btn.closest('.evbody__aside').querySelector('[data-share-status]');
    var label = btn.querySelector('.evshare__label');
    var timer = 0;
    if (wrap) wrap.hidden = false;

    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(btn.getAttribute('data-share-copy')).then(function () {
        btn.classList.add('is-copied');
        if (label) label.textContent = 'Link copied';
        if (status) status.textContent = 'Link copied to the clipboard.';
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove('is-copied');
          if (label) label.textContent = 'Copy link';
          if (status) status.textContent = '';
        }, 2000);
      });
    });
  });
})();
