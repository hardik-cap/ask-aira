/* The tour city poll on /events#tour-city (21 Oct, Hardik on the call:
   "Just add a city... Add polling. Show the number ... one poll in one
   session"). A Cloudflare Pages Function, so it deploys with the site:
   no separate Worker, no build step.

   STORAGE IS A KV NAMESPACE BOUND AS TOUR_POLL (Pages project > Settings >
   Bindings). Without the binding every call answers 503 and the page says
   the poll is not open, so deploying this file alone breaks nothing.

   KEYS: c:<slug> holds a default city's count; x:<slug> a typed-in city's
   count, with the display name stored in its metadata. Only the four
   defaults are returned to the page: typed cities are free text from the
   public, so they are read in the KV dashboard and never shown on the site.

   ONE VOTE PER SESSION is a SESSION COOKIE (no Max-Age, so it dies with the
   browser) checked here, plus the page's own sessionStorage. It stops a
   casual second click, not a determined script: KV increments are
   read-then-write and not atomic, which is fine at this traffic and would
   want D1 if the poll ever had to be exact.

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

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// A typed city: letters, spaces and . ' - only, 2 to 40 characters.
function cleanCity(raw) {
  const s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 40 || !/^[\p{L} .'-]+$/u.test(s)) return null;
  return s.replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function votedFrom(request) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function counts(kv) {
  const out = {};
  await Promise.all(Object.keys(CITIES).map(async (slug) => {
    out[slug] = parseInt(await kv.get('c:' + slug), 10) || 0;
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

export async function onRequestPost({ request, env }) {
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

  let key, name;
  if (CITIES[city]) {
    key = 'c:' + city; name = CITIES[city];
  } else {
    const clean = cleanCity(other);
    if (!clean) return isForm ? back('invalid') : json({ error: 'invalid' }, 400);
    const slug = slugify(clean);
    const known = CITIES[slug] ? slug : ALIASES[slug];
    if (known) { key = 'c:' + known; name = CITIES[known]; }
    else { key = 'x:' + slug; name = clean; }
  }

  const n = (parseInt(await kv.get(key), 10) || 0) + 1;
  await kv.put(key, String(n), key.startsWith('x:') ? { metadata: { name } } : undefined);

  const cookie = COOKIE + '=' + encodeURIComponent(name) + '; Path=/; Secure; HttpOnly; SameSite=Lax';
  if (isForm) {
    const r = back('sent');
    return new Response(null, { status: 303, headers: { Location: r.headers.get('Location'), 'Set-Cookie': cookie } });
  }
  return json({ counts: await counts(kv), voted: name }, 200, { 'Set-Cookie': cookie });
}
