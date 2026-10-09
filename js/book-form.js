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

  /* ---- 3. The work email rule (9 Oct, user: "make sure people dont add
     random and gibberish email") ------------------------------------------
     Checked on blur and on submit; the browser's own type=email check runs
     first. It refuses, with a plain reason each time:
       - a malformed address (one @, a real-looking domain and TLD);
       - throwaway inboxes (mailinator and friends) and placeholder domains;
       - personal providers (gmail, outlook...): WORK EMAILS ONLY, see below;
       - keyboard mash and junk: runs like "asdf"/"qwer" (not "erty" or "1234", which real names and brands contain: liberty, property), a character
         repeated four times, a domain name with no vowel at all, or a local
         part such as test/asdf/abc.
     This is a front-door check only. Formspark cannot run it, so a bot that
     skips the page skips it too; the honeypot is the guard there. */
  /* WORK EMAILS ONLY (user, 9 Oct: "we need to capture only work emails").
     Personal providers are refused in two ways: a FAMILY pattern that catches
     a provider under any country TLD (yahoo.co.in, hotmail.fr, outlook.de,
     gmail.co.uk), and a list of single-domain consumer providers by region. */
  var PERSONAL_FAMILY = /^(gmail|googlemail|yahoo|ymail|rocketmail|hotmail|outlook|live|msn|windowslive|aol|aim|icloud|me|mac|gmx|yandex|ya|mail|inbox|zoho|zohomail|proton|protonmail|pm|tutanota|tuta|rediffmail|rediff|lycos|excite)\.([a-z]{2,3})(\.[a-z]{2})?$/;
  var PERSONAL = ['hey.com', 'fastmail.com', 'fastmail.fm', 'duck.com', 'mailfence.com', 'hushmail.com',
    'posteo.de', 'web.de', 't-online.de', 'freenet.de', 'arcor.de', 'orange.fr', 'free.fr', 'sfr.fr',
    'laposte.net', 'wanadoo.fr', 'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'seznam.cz',
    'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'mail.ru', 'bk.ru', 'list.ru', 'rambler.ru',
    'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'ntlworld.com',
    'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'cox.net',
    'charter.net', 'earthlink.net', 'optonline.net', 'shaw.ca', 'rogers.com', 'sympatico.ca',
    'bigpond.com', 'optusnet.com.au', 'xtra.co.nz', 'uol.com.br', 'bol.com.br', 'terra.com.br',
    'naver.com', 'daum.net', 'hanmail.net', 'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com',
    'yeah.net', 'foxmail.com', 'docomo.ne.jp', 'ezweb.ne.jp', 'nifty.com', 'sify.com',
    'indiatimes.com', 'vsnl.net', 'myself.com', 'usa.com', 'email.cz'];
  var THROWAWAY = ['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com',
    'temp-mail.org', 'tempmail.com', 'tempmail.net', 'yopmail.com', 'trashmail.com',
    'getnada.com', 'sharklasers.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
    'fakeinbox.com', 'mohmal.com', 'emailondeck.com', 'mintemail.com', 'spamgourmet.com',
    'example.com', 'example.org', 'example.net', 'test.com', 'domain.com', 'email.com',
    'company.com', 'abc.com', 'xyz.com'];
  var JUNK_LOCAL = /^(test|testing|asdf|qwerty|abc|abcd|xyz|aaa|sample|demo|fake|none|null|na|no|noreply|no-reply|user|admin|email|mail|hello|hi)$/;
  var MASH = /(qwer|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|uiop)/;

  /* ONE MESSAGE for every refusal (user, 9 Oct: "lets have generic for
     each, lets not be too specific"). The checks stay separate; only the
     wording is shared, so a visitor is told what is wanted, not which rule
     tripped. */
  var MSG = 'Enter a valid work email, like name@yourcompany.com.';

  function emailProblem(v) {
    v = v.trim().toLowerCase();
    if (!v) return '';
    var m = v.match(/^([a-z0-9._%+-]+)@([a-z0-9-]+(\.[a-z0-9-]+)*\.([a-z]{2,24}))$/);
    if (!m || /\.\.|^\.|\.@|@-|-\./.test(v)) return MSG;
    var local = m[1], domain = m[2], name = domain.split('.').slice(-2)[0];
    if (THROWAWAY.indexOf(domain) > -1) return MSG;
    if (PERSONAL.indexOf(domain) > -1 || PERSONAL_FAMILY.test(domain)) return MSG;
    if (JUNK_LOCAL.test(local) || MASH.test(local) || MASH.test(name) ||
        /(.)\1{3,}/.test(local + '@' + domain) ||
        (name.length >= 5 && !/[aeiouy]/.test(name))) {
      return MSG;
    }
    return '';
  }

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
