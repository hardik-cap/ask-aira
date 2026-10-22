/* ==========================================================================
   aiRA: "Bring the tour to your city", the /events city POLL (21 Oct,
   Hardik on the call: "I don't want any details. I don't want any
   company ... Add polling. Show the number ... one poll in one session";
   rebuilt 22 Oct as horizontal bars, user: "we need to build a proper
   section"). The backend is functions/api/tour-poll.js (scratch/serve.py
   stands in for it locally).
   The form works with this script off: it posts to /api/tour-poll and the
   function sends the visitor back to /events?poll=sent#tour-city. This
   adds:
     1. a pick-one choice across five rows: a city, or the typed "somewhere
        else" row (typing picks it), the button naming what it will count;
     2. the NAME CHECKER on a typed city, the function's own rules, so a
        refused name says so before anything is sent (the function checks
        again: this one is only for speed);
     3. a background vote, then the RESULTS: every row a horizontal bar at
        its share of all votes, the visitor's row in the brand;
     4. ONE VOTE PER BROWSER SESSION: sessionStorage here, the session
        cookie on the server (a refresh, hard refresh or new tab keeps it);
        a voted visitor arriving later sees the results straight away.
   NO NUMBERS SHOW BEFORE A VOTE. If the backend is not open (no KV binding
   yet), the vote says so plainly rather than pretending to count.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-tour-poll]');
  if (!form) return;

  var KEY = 'aira_tour_vote';
  var API = form.getAttribute('action');
  var rows = Array.prototype.slice.call(form.querySelectorAll('[data-poll-opt]'));
  var radios = Array.prototype.slice.call(form.querySelectorAll('.evpoll__radio'));
  var otherRow = form.querySelector('.evpoll__opt--other');
  var otherRadio = form.querySelector('[data-poll-other-radio]');
  var other = form.querySelector('[data-poll-other]');
  var btn = form.querySelector('[data-poll-go]');
  var status = form.querySelector('[data-poll-status]');
  var help = form.querySelector('[data-poll-help]');
  var counts = null;
  var voted = null;

  /* ---- the name checker: functions/api/tour-poll.js, rule for rule ------ */
  var ROOTS = ['fuck', 'fck', 'shit', 'motherf', 'wank', 'bitch', 'whore', 'slut', 'porn', 'pusy', 'hitler', 'jiz', 'vagina', 'dildo'];
  var ROOTS_RAW = ['nigger', 'nigga', 'faggot'];
  var WORDS = ['ass', 'arse', 'asshole', 'cunt', 'dick', 'cock', 'twat', 'tits', 'boob', 'boobs', 'sex', 'piss', 'crap', 'damn', 'bastard', 'bollocks', 'prick', 'fag', 'fuk', 'cum', 'rape', 'nazi', 'kkk', 'penis', 'spic', 'chink', 'kike', 'retard', 'test', 'asdf', 'qwerty', 'none', 'nowhere', 'null', 'lol'];
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  function rude(raw) {
    var flat = raw.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[013457@$!]/g, function (c) { return LEET[c]; });
    var letters = flat.replace(/[^a-z]/g, '');
    var squashed = letters.replace(/(.)\1+/g, '$1');
    if (ROOTS.some(function (r) { return squashed.indexOf(r) !== -1; })) return true;
    if (ROOTS_RAW.some(function (r) { return letters.indexOf(r) !== -1; })) return true;
    return flat.split(/[^a-z]+/).some(function (w) { return w && WORDS.indexOf(w) !== -1; });
  }
  // Why a typed name fails, or '' if it passes.
  function problem(s) {
    if (s.length < 2) return 'Type a city name.';
    if (!/^[\p{L} .'-]+$/u.test(s)) return 'Letters only, please.';
    if (!/\p{L}{2}/u.test(s) || /(\p{L})\1{3,}/iu.test(s) || rude(s)) return 'That does not look like a city. Try another name.';
    return '';
  }

  function stored() {
    try { return sessionStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(name) {
    try { sessionStorage.setItem(KEY, name); } catch (e) { /* the cookie still holds */ }
  }
  function say(msg, bad) {
    status.textContent = msg;
    status.classList.toggle('is-bad', !!bad);
  }

  /* ---- 1: one choice -------------------------------------------------- */
  function typed() { return other.value.replace(/\s+/g, ' ').trim(); }
  function choice() {
    var r = radios.filter(function (i) { return i.checked; })[0];
    if (!r) return null;
    if (r === otherRadio) {
      var t = typed();
      return t ? { other: t, label: t } : null;
    }
    return { city: r.value, label: r.closest('[data-poll-opt]').dataset.name };
  }
  function relabel() {
    var c = choice();
    btn.disabled = !c;
    btn.textContent = c ? 'Vote for ' + c.label : 'Vote';
  }
  function clearBad() {
    otherRow.classList.remove('is-bad');
    other.removeAttribute('aria-invalid');
    say('');
  }
  radios.forEach(function (i) {
    i.addEventListener('change', function () {
      clearBad();
      if (i === otherRadio) other.focus();
      relabel();
    });
  });
  // Typing, or just focusing the field, picks the row.
  // Focus only picks; typing also clears a refusal (focus must not, or the
  // refusal's own focus() would wipe the message it just wrote).
  function pickOther() {
    if (!otherRadio.checked) otherRadio.checked = true;
    relabel();
  }
  other.addEventListener('focus', pickOther);
  other.addEventListener('input', function () { clearBad(); pickOther(); });

  /* ---- 3: results ----------------------------------------------------- */
  function paint() {
    if (!counts) return;
    var total = rows.reduce(function (t, r) { return t + (counts[r.dataset.pollOpt] || 0); }, 0);
    rows.forEach(function (r) {
      var n = counts[r.dataset.pollOpt] || 0;
      var pct = total ? n / total : 0;
      r.style.setProperty('--pct', pct.toFixed(4));
      r.querySelector('[data-poll-pct]').textContent = Math.round(pct * 100) + '%';
      r.querySelector('[data-poll-n]').textContent = n.toLocaleString('en-US') + (n === 1 ? ' vote' : ' votes');
      var mine = r.dataset.name === voted || (r === otherRow && voted && !rows.some(function (x) { return x !== otherRow && x.dataset.name === voted; }));
      r.classList.toggle('is-mine', !!voted && mine);
    });
    return total;
  }

  function showResults() {
    form.classList.add('is-voted');
    radios.forEach(function (i) { i.disabled = true; });
    other.disabled = true;
    btn.hidden = true;
    var total = paint();
    // Let the bars grow from zero on the frame after the rows change shape.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { form.classList.add('is-shown'); });
    });
    if (help) help.textContent = total ? total.toLocaleString('en-US') + (total === 1 ? ' vote so far.' : ' votes so far.') : 'Results';
    var typedVote = !rows.some(function (r) { return r !== otherRow && r.dataset.name === voted; });
    say(typedVote
      ? 'Thanks. Your vote for ' + voted + ' is in, counted under Other cities.'
      : 'Thanks. Your vote for ' + voted + ' is in.');
  }

  /* ---- 2 + 3: the vote ------------------------------------------------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (voted) return;
    var c = choice();
    if (!c) {
      say(otherRadio.checked ? 'Type a city name.' : 'Pick a city first.', true);
      return;
    }
    if (c.other) {
      var why = problem(c.other);
      if (why) {
        otherRow.classList.add('is-bad');
        other.setAttribute('aria-invalid', 'true');
        say(why, true);
        other.focus();
        return;
      }
    }
    btn.disabled = true;
    btn.classList.add('is-busy');
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c.city ? { city: c.city } : { other: c.other }),
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; });
    }).then(function (o) {
      btn.classList.remove('is-busy');
      if (o.body.counts) counts = o.body.counts;
      if (o.res.ok || o.body.error === 'voted') {
        voted = o.body.voted || c.label;
        store(voted);
        showResults();
        return;
      }
      relabel();
      if (o.body.error === 'invalid') {
        otherRow.classList.add('is-bad');
        say('That does not look like a city. Try another name.', true);
      } else if (o.body.error === 'limit') {
        say('This network has already voted a few times today. Thanks for the enthusiasm.', true);
      } else if (o.body.error === 'closed') {
        say('The poll is not open yet. Check back soon.', true);
      } else {
        say('Your vote did not go through. Try again in a moment.', true);
      }
    }).catch(function () {
      btn.classList.remove('is-busy');
      relabel();
      say('Your vote did not go through. Try again in a moment.', true);
    });
  });

  /* ---- 4: load -------------------------------------------------------- */
  relabel();
  voted = stored();
  fetch(API, { credentials: 'same-origin', cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (body) {
      if (!body) return;
      counts = body.counts;
      if (body.voted) voted = body.voted;
      if (voted) { store(voted); showResults(); }
    })
    .catch(function () { /* nothing shows until a vote; voting reports plainly */ });

  // Back from a no-script vote.
  var q = location.search;
  if (/[?&]poll=sent/.test(q)) say('Your vote is in. Thanks.');
  else if (/[?&]poll=invalid/.test(q)) say('That does not look like a city. Try another name.', true);
  else if (/[?&]poll=limit/.test(q)) say('This network has already voted a few times today.', true);
})();
