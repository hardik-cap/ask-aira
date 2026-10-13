/* ==========================================================================
   aiRA: the WORK EMAIL RULE, shared by every lead form (13 Oct). Moved out
   of js/book-form.js when the /events city-request form arrived, so the two
   forms cannot drift: one list of personal providers, one message. Exposes
   window.airaEmailProblem(value) -> '' when fine, else the message to show.
   Load it BEFORE the form script that uses it.
   ========================================================================== */
(function () {
  'use strict';

  /* The work email rule (9 Oct, user: "make sure people dont add
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

  window.airaEmailProblem = emailProblem;
})();
