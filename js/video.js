/* ==========================================================================
   aiRA — video lightbox.

   A [data-video] poster opens the YouTube embed in a popup (.vmodal in
   components.css) instead of playing inline, so no third-party iframe ever
   loads with the page. autoplay=1 belongs in the data attribute URL so
   playback starts on the click that asked for it. Escape, the close button,
   or a backdrop click closes it, and focus returns to the poster.
   ========================================================================== */

(function () {
  'use strict';

  /* Official Phosphor "x" (regular). */
  var X = 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,' +
          '8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34' +
          'L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z';

  function open(box, opener) {
    var title = box.getAttribute('data-video-title') || 'Video player';

    var overlay = document.createElement('div');
    overlay.className = 'vmodal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    var frame = document.createElement('div');
    frame.className = 'vmodal__box';

    var iframe = document.createElement('iframe');
    iframe.src = box.getAttribute('data-video');
    iframe.title = title;
    iframe.setAttribute('allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.appendChild(iframe);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'vmodal__close';
    close.setAttribute('aria-label', 'Close video');
    close.innerHTML =
      '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + X + '"/></svg>';
    frame.appendChild(close);

    overlay.appendChild(frame);

    function shut() {
      overlay.remove();
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') shut();
    }

    close.addEventListener('click', shut);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) shut();
    });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    close.focus();
  }

  document.querySelectorAll('[data-video]').forEach(function (box) {
    var btn = box.querySelector('[data-video-play]');
    if (!btn) return;
    btn.addEventListener('click', function () { open(box, btn); });
  });
})();
