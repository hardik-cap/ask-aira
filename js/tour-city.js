/* ==========================================================================
   aiRA: "Bring the tour to your city", the /events city-request form
   (13 Oct). The form posts to its own Formspark form and works with this
   script off (every field showing, Formspark's _redirect bringing the
   visitor back to /events?city-request=sent). This adds:
     1. THE POLL FEEL: the lead fields stay folded until a city is tapped,
        and the button names the city ("Request Atlanta");
     2. "Somewhere else" opening a free-text city field, required only then;
     3. the shared work-email rule (js/work-email.js, loaded first);
     4. the source fields from the visit's first-touch record, empties
        disabled on submit so the email shows no rows of "Empty";
     5. Turnstile's wait, as on /book: hold the submit only while the check
        is genuinely under way, never trap a lead;
     6. a background submit with the thank-you shown in place, falling back
        to a normal post if the background one fails.
   THE PLACEHOLDER GUARD: while the action still says FORM_ID, submitting is
   refused with a visible note, so a half-wired form can never swallow a
   lead silently or post one into the booking inbox.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-tour-city]');
  if (!form) return;

  /* The script runs its own checks with friendlier messages; with it off,
     the browser's required-field checks guard the form instead. */
  form.noValidate = true;
  var wrap = form.closest('.evcity');
  var otherInput = form.querySelector('[data-city-other-field]');
  var email = form.querySelector('#tc-email');
  var emailErr = form.querySelector('#tc-email-err');
  var formErr = form.querySelector('#tc-form-err');
  var btn = form.querySelector('[data-city-submit]');
  var done = wrap && wrap.querySelector('[data-city-done]');
  var emailProblem = window.airaEmailProblem || function () { return ''; };
  var SOURCE = ['source_page', 'landing_page', 'referrer', 'utm_source', 'utm_medium',
                'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id'];

  function set(name, value) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el && value) el.value = value;
  }
  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  /* ---- 1 and 2: the city pick. Nothing unfolds (user, 13 Oct: "height
     increasing is not great"): the fields always show, and "Somewhere
     else" swaps itself for the type-in pill in the same chips row (the
     :has() rule hides the chip; this un-hides the pill, focuses it, and
     disables it while a named city is picked so it never posts astray). */
  function picked() {
    var r = form.querySelector('input[name="city"]:checked');
    return r ? r.value : '';
  }
  function cityName() {
    var c = picked();
    if (c === 'Somewhere else') return (otherInput && otherInput.value.trim()) || '';
    return c;
  }
  form.addEventListener('change', function (e) {
    if (e.target.name !== 'city') return;
    var isOther = e.target.hasAttribute('data-city-other');
    if (otherInput) {
      otherInput.hidden = !isOther;
      otherInput.required = isOther;
      otherInput.disabled = !isOther;
    }
    label();
    if (isOther && otherInput) otherInput.focus();
  });
  if (otherInput) otherInput.disabled = true;
  if (otherInput) otherInput.addEventListener('input', label);
  function label() {
    var c = cityName();
    btn.textContent = c ? 'Request ' + c : 'Request this city';
  }

  /* ---- 3: the work email ---------------------------------------------- */
  function checkEmail(show) {
    var p = emailProblem(email.value);
    if (!p && !email.value.trim()) p = show ? 'Enter your work email.' : '';
    email.setCustomValidity(p);
    if (show) {
      showErr(emailErr, p);
      if (p) email.setAttribute('aria-invalid', 'true'); else email.removeAttribute('aria-invalid');
    }
    return !p;
  }
  email.addEventListener('blur', function () { if (email.value) checkEmail(true); });
  email.addEventListener('input', function () {
    if (email.getAttribute('aria-invalid')) checkEmail(true);
  });

  /* ---- 4: where the visitor came from ---------------------------------- */
  if (/^https?:$/.test(location.protocol)) {
    set('_redirect', location.origin + '/events?city-request=sent#tour-city');
  }
  set('source_page', location.pathname);
  var src = {};
  try { src = JSON.parse(sessionStorage.getItem('aira_src') || '{}'); } catch (e) {}
  Object.keys(src).forEach(function (k) { set(k, src[k]); });

  /* ---- 5: Turnstile ----------------------------------------------------- */
  var loadedAt = Date.now();
  var tsState = 'pending';
  window.airaCityTsOk = function () { tsState = 'ok'; showErr(formErr, ''); };
  window.airaCityTsExpired = function () { tsState = 'pending'; loadedAt = Date.now(); };
  window.airaCityTsErr = function (code) {
    tsState = 'failed';
    if (window.console) console.warn('Turnstile error ' + code);
    return true;
  };

  /* ---- 6: the submit ---------------------------------------------------- */
  function busy(on) {
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    btn.classList.toggle('is-busy', on);
  }
  function thank() {
    var c = cityName();
    var t = done.querySelector('[data-city-done-t]');
    var s = done.querySelector('[data-city-done-s]');
    if (c && t) t.textContent = 'You’re on the list for ' + c + '.';
    if (s && email.value) s.textContent = 'We’ll write to ' + email.value.trim() + ' when the tour heads there.';
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener('submit', function (e) {
    showErr(formErr, '');
    if (/FORM_ID/.test(form.getAttribute('action'))) {
      e.preventDefault();
      showErr(formErr, 'This form is not connected yet.');
      return;
    }
    if (!picked()) {
      e.preventDefault();
      showErr(formErr, 'Pick a city first.');
      var first = form.querySelector('input[name="city"]');
      if (first) first.focus();
      return;
    }
    if (picked() === 'Somewhere else' && otherInput && !otherInput.value.trim()) {
      e.preventDefault();
      showErr(formErr, 'Tell us which city.');
      otherInput.focus();
      return;
    }
    var name = form.querySelector('#tc-name');
    if (name && !name.value.trim()) {
      e.preventDefault();
      showErr(formErr, 'Add your name.');
      name.focus();
      return;
    }
    if (!checkEmail(true)) { e.preventDefault(); email.focus(); return; }

    var ts = form.querySelector('input[name="cf-turnstile-response"]');
    if (ts && !ts.value && tsState === 'pending' && (Date.now() - loadedAt) < 8000) {
      e.preventDefault();
      showErr(formErr, 'Almost ready. Give it a second, then press the button again.');
      return;
    }
    SOURCE.forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"]');
      if (el && !el.value) el.disabled = true;
    });

    if (!window.fetch || !window.FormData) { busy(true); return; }
    e.preventDefault();
    busy(true);
    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      thank();
    }).catch(function () {
      /* The background post failed; send it the ordinary way, which lands
         back on /events through Formspark's redirect. */
      HTMLFormElement.prototype.submit.call(form);
    });
  });

  /* Back from Formspark's redirect (the no-script or fallback path). */
  if (/[?&]city-request=sent\b/.test(location.search) && done) {
    form.hidden = true;
    done.hidden = false;
  }

  window.addEventListener('pageshow', function () {
    busy(false);
    SOURCE.forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"]');
      if (el) el.disabled = false;
    });
  });
})();
