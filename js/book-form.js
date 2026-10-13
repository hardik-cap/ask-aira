/* ==========================================================================
   aiRA — /book form (9 Oct). The form posts to Formspark, which emails
   each submission; it works with this script off. This only:
     1. points Formspark's _redirect at THIS origin's /book/thanks, so a
        preview or local build does not bounce to production;
     2. fills the hidden source fields from the first-touch record that
        js/components.js keeps for the visit.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.querySelector('[data-book-form]');
  if (!form) return;

  function set(name, value) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el && value) el.value = value;
  }

  if (/^https?:$/.test(location.protocol)) {
    set('_redirect', location.origin + '/book/thanks');
  }
  set('source_page', location.pathname);

  /* ---- 3. The work email rule now lives in js/work-email.js (13 Oct),
     shared with the /events city-request form; book.html loads it first. */
  var emailProblem = window.airaEmailProblem || function () { return ''; };

  var email = form.querySelector('#bk-email');
  var err = form.querySelector('#bk-email-err');
  function check(show) {
    var p = emailProblem(email.value);
    email.setCustomValidity(p);
    if (show && err) {
      err.textContent = p;
      err.hidden = !p;
      if (p) email.setAttribute('aria-invalid', 'true'); else email.removeAttribute('aria-invalid');
    }
    return !p;
  }
  if (email) {
    email.addEventListener('blur', function () { check(true); });
    email.addEventListener('input', function () { if (email.getAttribute('aria-invalid')) check(true); else check(false); });
    form.addEventListener('submit', function (e) {
      if (!check(true)) { e.preventDefault(); email.focus(); return; }
      /* Turnstile's token lands in a hidden field a moment after load (or
         after its one click). Submitting before it does would be refused by
         Formspark, so the form waits, but ONLY while the check is genuinely
         under way. It never traps a visitor: if Cloudflare reports an error
         (blocked script, a hostname not on the widget's list, a network
         failure) or no token has arrived 8 seconds after load, the form goes
         through and Formspark's own check decides. */
      var ts = form.querySelector('input[name="cf-turnstile-response"]');
      var waiting = ts && !ts.value && tsState === 'pending' && (Date.now() - loadedAt) < 8000;
      if (waiting) {
        e.preventDefault();
        showTs('Almost ready. Give it a second, then press the button again.');
        return;
      }
      /* Send only the source fields that carry something: a disabled input
         is not submitted, so the email shows no rows of "Empty". */
      SOURCE.forEach(function (n) {
        var el = form.querySelector('input[name="' + n + '"]');
        if (el && !el.value) el.disabled = true;
      });
      setBusy(true);
    });
  }

  var loadedAt = Date.now();
  var tsState = 'pending';
  function showTs(msg) {
    var el = form.querySelector('#bk-ts-err');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  window.airaTurnstileOk = function () { tsState = 'ok'; showTs(''); };
  window.airaTurnstileExpired = function () { tsState = 'pending'; loadedAt = Date.now(); };
  window.airaTurnstileErr = function (code) {
    tsState = 'failed';
    showTs('');
    if (window.console) console.warn('Turnstile error ' + code + ' (110200 means this hostname is not on the widget\'s list)');
    return true;
  };

  var SOURCE = ['source_page', 'landing_page', 'referrer', 'utm_source', 'utm_medium',
                'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id'];
  /* THE PRESSED STATE (9 Oct, user): once the form is actually on its way,
     the button keeps its size and label for screen readers but shows three
     pulsing dots, and stops taking clicks so a lead is not sent twice. */
  var btn = form.querySelector('.book__submit');
  function setBusy(on) {
    if (!btn) return;
    if (on && !btn.querySelector('.book__dots')) {
      btn.insertAdjacentHTML('beforeend',
        '<span class="book__dots" aria-hidden="true"><i></i><i></i><i></i></span>');
    }
    btn.classList.toggle('is-busy', on);
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    btn.disabled = on;
  }

  /* If the browser restores this page from its back/forward cache, fields
     disabled on the way out would come back disabled, and the button busy;
     reset both. */
  window.addEventListener('pageshow', function () {
    setBusy(false);
    SOURCE.forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"]');
      if (el) el.disabled = false;
    });
  });

  var src = {};
  try { src = JSON.parse(sessionStorage.getItem('aira_src') || '{}'); } catch (e) {}
  Object.keys(src).forEach(function (k) { set(k, src[k]); });
})();
