/* ==========================================================================
   aiRA: "Bring the tour to your city", the /events city-request form
   (13 Oct). The form posts to its own Formspark form and works with this
   script off (every field showing, Formspark's _redirect bringing the
   visitor back to /events?city-request=sent). This adds:
     1. THE CITY DROPDOWN IS PICK-ONLY (14 Oct, user: "keep dropdown, pick
        only, no type"): the native <select> is hidden and a button opens a
        styled listbox (ARIA select-only combobox); the select stays the
        posted field and the submit names the city ("Request Atlanta");
     2. (retired 14 Oct: the typeable combobox and before it the "Somewhere
        else" chip; both in git);
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
  var sel = form.querySelector('#tc-city');
  var combo = form.querySelector('[data-city-combo]');
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

  /* ---- 1: the city dropdown -------------------------------------------
     PICK-ONLY: the native select is hidden (it stays the posted field and
     the no-script fallback) and a button opens the styled listbox, the APG
     select-only combobox. The list is an overlay on the field (position
     absolute), so opening it moves nothing. Options take mousedown
     preventDefault so the button keeps focus and the blur that closes the
     list never races the pick. */
  var PIN = '<svg class="evcity__opt-ic" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24a80,80,0,0,0-80,80c0,72,80,128,80,128s80-56,80-128A80,80,0,0,0,128,24Zm0,112a32,32,0,1,1,32-32A32,32,0,0,1,128,136Z" opacity="0.2"/><path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/></svg>';
  var PLACEHOLDER = 'Pick a city';
  var CITIES = [];
  [].forEach.call(sel.options, function (o) {
    if (!o.value) return;
    CITIES.push({ value: o.value, name: o.getAttribute('data-name') || o.value, st: o.getAttribute('data-st') || '' });
  });
  sel.hidden = true;
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'tc-city-btn';
  trigger.className = 'evcity__input evcity__combo-in evcity__combo-btn';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  combo.insertBefore(trigger, sel.nextSibling);
  /* The visible label now opens the button, not the hidden select. */
  var lab = form.querySelector('label[for="tc-city"]');
  if (lab) lab.htmlFor = trigger.id;
  var lb = document.createElement('ul');
  lb.id = 'tc-city-lb';
  lb.className = 'evcity__list';
  lb.setAttribute('role', 'listbox');
  lb.setAttribute('aria-label', 'Cities');
  lb.hidden = true;
  combo.appendChild(lb);
  trigger.setAttribute('aria-controls', lb.id);

  var rows = [];        /* the option elements on screen, in order */
  var active = -1;

  function cityName() {
    var o = sel.options[sel.selectedIndex];
    return o && o.value ? (o.getAttribute('data-name') || o.value) : '';
  }
  function face() {
    trigger.textContent = sel.value || PLACEHOLDER;
    trigger.classList.toggle('is-empty', !sel.value);
  }
  function group(text) {
    var g = document.createElement('li');
    g.className = 'evcity__group';
    g.setAttribute('role', 'presentation');
    g.textContent = text;
    lb.appendChild(g);
  }
  function row(value, html) {
    var li = document.createElement('li');
    li.className = 'evcity__opt';
    li.id = 'tc-city-opt-' + rows.length;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', value === sel.value ? 'true' : 'false');
    li.setAttribute('data-value', value);
    li.innerHTML = html;
    li.addEventListener('mousedown', function (e) { e.preventDefault(); });
    li.addEventListener('click', function () { pick(value); });
    li.addEventListener('mousemove', function () { setActive(rows.indexOf(li)); });
    lb.appendChild(li);
    rows.push(li);
  }
  function esc(t) {
    return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function render() {
    lb.innerHTML = '';
    rows = [];
    group('Planned for 2027');
    CITIES.forEach(function (c) {
      row(c.value, PIN + '<span class="evcity__opt-t">' + esc(c.name) + '</span><span class="evcity__opt-st">' + esc(c.st) + '</span>');
    });
    setActive(-1);
  }
  function setActive(i) {
    if (rows[active]) rows[active].classList.remove('is-active');
    active = i;
    if (rows[i]) {
      rows[i].classList.add('is-active');
      trigger.setAttribute('aria-activedescendant', rows[i].id);
      /* Scroll the list itself, never scrollIntoView (it scrolls the page). */
      var r = rows[i];
      if (r.offsetTop < lb.scrollTop) lb.scrollTop = r.offsetTop - 8;
      else if (r.offsetTop + r.offsetHeight > lb.scrollTop + lb.clientHeight) lb.scrollTop = r.offsetTop + r.offsetHeight - lb.clientHeight + 8;
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  }
  function open() {
    render();
    lb.hidden = false;
    combo.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    /* The chosen city is where the arrows start from. */
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-value') === sel.value) { setActive(i); break; }
    }
  }
  function close() {
    lb.hidden = true;
    combo.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }
  function pick(value) {
    sel.value = value;
    face();
    close();
    label();
    showErr(formErr, '');
    trigger.removeAttribute('aria-invalid');
  }

  /* The button has no focus-opens behaviour, so a click can simply toggle:
     the focus-then-click race the typeable version had is gone with it. */
  trigger.addEventListener('click', function () { if (lb.hidden) open(); else close(); });
  trigger.addEventListener('blur', close);
  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (lb.hidden) { open(); return; }
      if (!rows.length) return;
      var n = e.key === 'ArrowDown' ? active + 1 : active - 1;
      if (n < 0) n = rows.length - 1;
      if (n >= rows.length) n = 0;
      setActive(n);
    } else if (e.key === 'Home' && !lb.hidden) {
      e.preventDefault(); setActive(0);
    } else if (e.key === 'End' && !lb.hidden) {
      e.preventDefault(); setActive(rows.length - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && !lb.hidden) {
      /* Stop the button's own click, which would reopen the list. */
      e.preventDefault();
      if (rows[active]) pick(rows[active].getAttribute('data-value')); else close();
    } else if (e.key === 'Escape' && !lb.hidden) {
      e.preventDefault(); close();
    } else if (e.key === 'Tab') {
      close();
    }
  });
  function label() {
    var c = cityName();
    btn.textContent = c ? 'Request ' + c : 'Request this city';
  }
  face();
  label();

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
  /* The confirmation names the city as its headline ("New York" with the
     state set small) and never echoes the visitor's email back. */
  var again = done && done.querySelector('[data-city-again]');
  function thank() {
    var o = sel.options[sel.selectedIndex];
    var t = done.querySelector('[data-city-done-t]');
    if (o && o.value && t) {
      t.textContent = o.getAttribute('data-name') || o.value;
      var st = o.getAttribute('data-st');
      if (st) {
        var s = document.createElement('span');
        s.className = 'evcity__done-st';
        s.textContent = st;
        t.appendChild(s);
      }
    }
    var nm = done.querySelector('[data-city-done-name]');
    if (nm && o && o.value) nm.textContent = o.getAttribute('data-name') || o.value;
    if (again) again.hidden = false;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }
  /* "Request another city" puts a fresh form back in place: the city and
     button labels reset, the name and work email kept, so a second request
     is one pick and one press. Turnstile's token was spent on the first
     post, so the widget is reset for a new one. */
  if (again) again.addEventListener('click', function () {
    sel.value = '';
    face();
    label();
    busy(false);
    SOURCE.forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"]');
      if (el) el.disabled = false;
    });
    if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
    tsState = 'pending';
    loadedAt = Date.now();
    done.hidden = true;
    form.hidden = false;
    trigger.focus();
  });

  form.addEventListener('submit', function (e) {
    showErr(formErr, '');
    if (/FORM_ID/.test(form.getAttribute('action'))) {
      e.preventDefault();
      showErr(formErr, 'This form is not connected yet.');
      return;
    }
    if (!sel.value) {
      e.preventDefault();
      showErr(formErr, 'Pick a city.');
      trigger.setAttribute('aria-invalid', 'true');
      trigger.focus();
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
