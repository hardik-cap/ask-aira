/* The tour city poll on /events#tour-city (21 Oct, Hardik on the call:
   "Just add a city... Add polling. Show the number ... one poll in one
   session"; rebuilt 22 Oct with a name checker and a network cap). A
   Cloudflare Pages Function, so it deploys with the site: no separate
   Worker, no build step.

   STORAGE IS A KV NAMESPACE BOUND AS TOUR_POLL (Pages project > Settings >
   Bindings). Without the binding every call answers 503 and the page says
   the poll is not open, so deploying this file alone breaks nothing.

   KEYS
     c:<slug>   a default city's count (the four on the page)
     t:other    how many votes went to typed-in cities, all together
     x:<slug>   one typed-in city's count, its display name in the metadata.
                Read in the KV dashboard; NEVER returned to the page, since
                it is free text from the public.
     ip:<hash>  votes from one network today: a SHA-256 of the visitor's IP
                and a salt, expiring after 24 hours. The IP itself is never
                stored.

   WHO CAN VOTE, AND HOW OFTEN
     - ONE VOTE PER BROWSER SESSION: a session cookie (no Max-Age, so it
       dies when the browser closes) checked here, plus the page's own
       sessionStorage. A refresh, a hard refresh or a new tab keeps it.
     - AT MOST IP_CAP VOTES PER NETWORK PER DAY: clearing cookies or opening
       a private window gets a new session, so the network cap is what stops
       one person voting over and over. It is not 1, because a whole office
       shares one address and colleagues should each get a vote.
     KV increments are read-then-write and not atomic, which is fine at this
     traffic and would want D1 if the poll ever had to be exact.

   TYPED CITIES ARE CHECKED (cleanCity): 2 to 40 characters, letters,
   spaces and . ' - only, no run of four identical letters, and no
   profanity. The word check normalises leetspeak and spacing first, matches
   a short list of unmistakable roots ANYWHERE in the string and the rest
   only as WHOLE WORDS, so real places that contain a rude substring
   (Scunthorpe, Middlesex, Essex) still pass. js/tour-poll.js runs the same
   check for instant feedback; this one is the one that counts.

   js/tour-poll.js posts JSON; with the script off the form posts
   urlencoded and is sent back to the section with a 303. scratch/serve.py
   mirrors this file for local runs: change both together. */

const CITIES = {
  'new-york': 'New York',
  'atlanta': 'Atlanta',
  'san-francisco': 'San Francisco',
  'los-angeles': 'Los Angeles',
};

// Typed spellings that mean a default city count for that city.
const ALIASES = {
  'ny': 'new-york', 'nyc': 'new-york', 'new-york-city': 'new-york', 'manhattan': 'new-york',
  'atl': 'atlanta',
  'sf': 'san-francisco', 'san-fran': 'san-francisco', 'bay-area': 'san-francisco',
  'la': 'los-angeles',
};

const COOKIE = 'aira_tour_vote';
const IP_CAP = 5;

// Refused ANYWHERE, even inside a word, after leetspeak, spacing and
// repeated letters are squashed ("f u u c k", "sh1t"). Chosen so no real
// place name contains them once squashed; anything that hides inside a
// place (Grapevine, Cumming, Fukuoka, Penistone, Niger) is in WORDS instead.
const ROOTS = ['fuck', 'fck', 'shit', 'motherf', 'wank', 'bitch', 'whore', 'slut', 'porn', 'pusy', 'hitler', 'jiz', 'vagina', 'dildo'];
// Refused anywhere WITHOUT squashing repeats (squashed, they read as Niger).
const ROOTS_RAW = ['nigger', 'nigga', 'faggot'];
// Refused only as a WHOLE WORD.
const WORDS = ['ass', 'arse', 'asshole', 'cunt', 'dick', 'cock', 'twat', 'tits', 'boob', 'boobs', 'sex', 'piss', 'crap', 'damn', 'bastard', 'bollocks', 'prick', 'fag', 'fuk', 'cum', 'rape', 'nazi', 'kkk', 'penis', 'spic', 'chink', 'kike', 'retard', 'test', 'asdf', 'qwerty', 'none', 'nowhere', 'null', 'lol'];
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function rude(raw) {
  const flat = String(raw).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$!]/g, (c) => LEET[c]);
  const letters = flat.replace(/[^a-z]/g, '');
  const squashed = letters.replace(/(.)\1+/g, '$1');
  if (ROOTS.some((r) => squashed.includes(r))) return true;
  if (ROOTS_RAW.some((r) => letters.includes(r))) return true;
  return flat.split(/[^a-z]+/).some((w) => WORDS.includes(w));
}

// A typed city, cleaned and title-cased, or null if it fails the checks.
function cleanCity(raw) {
  const s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 40) return null;
  if (!/^[\p{L} .'-]+$/u.test(s)) return null;
  if (!/\p{L}{2}/u.test(s)) return null;
  if (/(\p{L})\1{3,}/iu.test(s)) return null;
  if (rude(s)) return null;
  return s.replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function votedFrom(request) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function ipKey(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!ip) return null;
  const data = new TextEncoder().encode((env.POLL_SALT || 'aira-tour-poll') + '|' + ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return 'ip:' + [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function counts(kv) {
  const out = {};
  await Promise.all(Object.keys(CITIES).concat('other').map(async (slug) => {
    out[slug] = parseInt(await kv.get((slug === 'other' ? 't:' : 'c:') + slug), 10) || 0;
  }));
  return out;
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
});

export async function onRequestGet({ request, env }) {
  if (!env.TOUR_POLL) return json({ error: 'closed' }, 503);
  return json({ counts: await counts(env.TOUR_POLL), voted: votedFrom(request) });
}

// THE VOTE LOG IN GOOGLE SHEETS (22 Oct, user: "automate the data ... to a
// sheet"). When POLL_SHEET_URL is set (a Google Apps Script web app's /exec
// URL, a Pages secret), every counted vote is also sent there as one row:
// time, the city it counted for, the typed name if any, and which site. No
// IP and nothing that identifies the voter. It goes out through waitUntil
// AFTER the response, so the voter never waits on Google, and a failure
// there loses only that row: KV stays the count of record. POLL_SHEET_TOKEN
// is a shared secret the script checks, so a leaked URL cannot be spammed.
// The script itself lives in scratch/poll-sheet.gs.
function logToSheet(env, waitUntil, request, row) {
  if (!env.POLL_SHEET_URL || !waitUntil) return;
  const host = new URL(request.url).hostname;
  const site = /(^|\.)askaira\.ai$/.test(host) || host.startsWith('ask-aira-production') ? 'live' : 'staging';
  waitUntil(fetch(env.POLL_SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: env.POLL_SHEET_TOKEN || '', time: new Date().toISOString(), site, ...row }),
    redirect: 'manual',
  }).catch(() => {}));
}

export async function onRequestPost({ request, env, waitUntil }) {
  const isForm = !(request.headers.get('Content-Type') || '').includes('application/json');
  const back = (status) => Response.redirect(new URL('/events?poll=' + status + '#tour-city', request.url), 303);
  if (!env.TOUR_POLL) return isForm ? back('closed') : json({ error: 'closed' }, 503);
  const kv = env.TOUR_POLL;

  if (votedFrom(request)) {
    return isForm ? back('voted') : json({ error: 'voted', counts: await counts(kv), voted: votedFrom(request) }, 409);
  }

  let city = '', other = '';
  try {
    if (isForm) {
      const f = await request.formData();
      city = f.get('city') || ''; other = f.get('other') || '';
    } else {
      const b = await request.json();
      city = b.city || ''; other = b.other || '';
    }
  } catch (e) { /* falls through to the invalid answer */ }

  let key, name, typed = '';
  if (CITIES[city]) {
    key = 'c:' + city; name = CITIES[city];
  } else {
    const clean = cleanCity(other);
    typed = clean || '';
    if (!clean) return isForm ? back('invalid') : json({ error: 'invalid' }, 400);
    const slug = slugify(clean);
    const known = CITIES[slug] ? slug : ALIASES[slug];
    if (known) { key = 'c:' + known; name = CITIES[known]; }
    else { key = 'x:' + slug; name = clean; }
  }

  // The network cap, checked only once the vote is otherwise valid.
  const ik = await ipKey(request, env);
  const used = ik ? parseInt(await kv.get(ik), 10) || 0 : 0;
  if (used >= IP_CAP) return isForm ? back('limit') : json({ error: 'limit', counts: await counts(kv) }, 429);

  const n = (parseInt(await kv.get(key), 10) || 0) + 1;
  const writes = [kv.put(key, String(n), key.startsWith('x:') ? { metadata: { name } } : undefined)];
  if (key.startsWith('x:')) writes.push(kv.get('t:other').then((v) => kv.put('t:other', String((parseInt(v, 10) || 0) + 1))));
  if (ik) writes.push(kv.put(ik, String(used + 1), { expirationTtl: 86400 }));
  await Promise.all(writes);
  logToSheet(env, waitUntil, request, { city: key.startsWith('x:') ? 'Other' : name, typed });

  const cookie = COOKIE + '=' + encodeURIComponent(name) + '; Path=/; Secure; HttpOnly; SameSite=Lax';
  if (isForm) {
    const r = back('sent');
    return new Response(null, { status: 303, headers: { Location: r.headers.get('Location'), 'Set-Cookie': cookie } });
  }
  return json({ counts: await counts(kv), voted: name }, 200, { 'Set-Cookie': cookie });
}
