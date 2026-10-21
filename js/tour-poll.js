/* ==========================================================================
   aiRA: "Bring the tour to your city", the /events city POLL (21 Oct,
   Hardik on the call: "I don't want any details. I don't want any
   company ... Add polling. Show the number ... one poll in one session").
   It replaced the 13-14 Oct Formspark request form (js/tour-city.js, in
   git). The backend is functions/api/tour-poll.js (scratch/serve.py
   stands in for it locally).
   The form works with this script off: it posts to /api/tour-poll and the
   function sends the visitor back to /events?poll=sent#tour-city. This
   adds:
     1. the live counts on the four default cities, fetched on load; each
        city is a ticket stub whose fill rises to its share of the leader;
     2. a pick-one choice: a city row or the typed "somewhere else", never
        both, with the button naming what it will count ("Vote for Atlanta");
     3. a background vote, the counts updating in place;
     4. ONE VOTE PER SESSION: sessionStorage here, the session cookie on the
        server; a voted visitor sees the results with their pick marked and
        the choices locked.
   If the backend is not open (no KV binding yet), the choices stay usable
   and the vote says so plainly rather than pretending to count.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-tour-poll]');
  if (!form) return;

  var KEY = 'aira_tour_vote';
  var API = form.getAttribute('action');
  var rows = Array.prototype.slice.call(form.querySelectorAll('[data-poll-opt]'));
  var radios = rows.map(function (r) { return r.querySelector('input'); });
  var other = form.querySelector('[data-poll-other]');
  var btn = form.querySelector('[data-poll-go]');
  var status = form.querySelector('[data-poll-status]');
  var counts = null;
  var voted = null;

  function stored() {
    try { return sessionStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(name) {
    try { sessionStorage.setItem(KEY, name); } catch (e) { /* cookie still holds */ }
  }
  function say(msg, bad) {
    status.textContent = msg;
    status.classList.toggle('is-bad', !!bad);
  }

  /* ---- 1: counts and bars --------------------------------------------- */
  function paint() {
    var max = 0;
    if (counts) rows.forEach(function (r) { max = Math.max(max, counts[r.dataset.pollOpt] || 0); });
    rows.forEach(function (r) {
      var n = counts ? counts[r.dataset.pollOpt] || 0 : null;
      // The stub's foot: the count large, its unit small beside it.
      r.querySelector('[data-poll-n]').textContent = n === null ? '\u2013' : n.toLocaleString('en-US');
      r.querySelector('[data-poll-u]').textContent = n === 1 ? 'vote' : 'votes';
      // Bars scale to the LEADER, not the total, so the race reads at a glance.
      r.style.setProperty('--share', max ? (n / max).toFixed(3) : 0);
      r.classList.toggle('is-mine', !!voted && r.dataset.name === voted);
    });
  }

  function lock() {
    form.classList.add('is-voted');
    radios.forEach(function (i) { i.disabled = true; });
    other.disabled = true;
    btn.hidden = true;
    var mine = rows.some(function (r) { return r.dataset.name === voted; });
    say(mine
      ? 'Your vote for ' + voted + ' is in. Thanks.'
      : 'Your vote for ' + voted + ' is in. Typed-in cities are counted by the team, not shown here.');
  }

  /* ---- 2: one choice -------------------------------------------------- */
  function choice() {
    var r = radios.filter(function (i) { return i.checked; })[0];
    if (r) return { city: r.value, label: r.closest('[data-poll-opt]').dataset.name };
    var typed = other.value.replace(/\s+/g, ' ').trim();
    return typed ? { other: typed, label: typed } : null;
  }
  function relabel() {
    var c = choice();
    btn.disabled = !c;
    btn.textContent = c ? 'Vote for ' + c.label : 'Vote';
  }
  radios.forEach(function (i) {
    i.addEventListener('change', function () { other.value = ''; relabel(); say(''); });
  });
  other.addEventListener('input', function () {
    if (other.value) radios.forEach(function (i) { i.checked = false; });
    relabel();
    say('');
  });

  /* ---- 3: the vote ---------------------------------------------------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var c = choice();
    if (!c || voted) return;
    if (c.other && !/^[\p{L} .'-]{2,40}$/u.test(c.other)) {
      say('Type a city name, letters only.', true);
      other.focus();
      return;
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
        paint();
        lock();
        return;
      }
      relabel();
      if (o.body.error === 'invalid') say('Type a city name, letters only.', true);
      else if (o.body.error === 'closed') say('The poll is not open yet. Check back soon.', true);
      else say('Your vote did not go through. Try again in a moment.', true);
    }).catch(function () {
      btn.classList.remove('is-busy');
      relabel();
      say('Your vote did not go through. Try again in a moment.', true);
    });
  });

  /* ---- 4: load -------------------------------------------------------- */
  voted = stored();
  relabel();
  paint();
  if (voted) lock();
  fetch(API, { credentials: 'same-origin', cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (body) {
      if (!body) return;
      counts = body.counts;
      if (body.voted && !voted) { voted = body.voted; store(voted); lock(); }
      form.classList.add('is-live');
      paint();
    })
    .catch(function () { /* counts stay blank; voting still reports plainly */ });

  // Back from a no-script vote.
  if (/[?&]poll=sent/.test(location.search)) say('Your vote is in. Thanks.');
})();
