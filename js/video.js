/* ==========================================================================
   aiRA — video lightbox with its own controls (rebuilt 20 Sep, user
   reference).

   A [data-video] poster opens the film in a popup instead of playing inline,
   so no third-party iframe ever loads with the page. That part is unchanged.
   What changed is everything inside the popup: it is nearly full viewport
   now, and the player wears aiRA's own control bar over a gradient scrim
   rather than YouTube's red chrome.

   TWO ENGINES, ONE BAR. A data-video pointing at a file plays in a <video>;
   one pointing at YouTube plays in an iframe driven by YouTube's IFrame
   Player API, loaded on demand when the popup first opens. The control bar
   talks to whichever engine is behind it through a tiny adapter (play, pause,
   seek, mute, rate, duration, time), so the bar itself has no idea which it
   is driving.

   WHAT YOUTUBE CANNOT DO, and is therefore not drawn:
     - Picture in picture. The iframe never exposes its media element, so the
       button only appears for a real <video> on a browser that supports it.
       A button that cannot work is worse than no button.
     - Quality. setPlaybackQuality has been a no-op since 2019, so the gear
       offers playback SPEED, which the API does honour, and nothing else.

   Escape, the close button or a backdrop click closes it; focus returns to
   the poster. Keyboard: space and k toggle play, arrows seek five seconds,
   m mutes, f goes fullscreen.
   ========================================================================== */

(function () {
  'use strict';

  /* Official Phosphor, REGULAR weight. Player transport is the same case as
     the FAQ caret: a duotone backing fills a shape this small and the glyph
     stops reading as a control. */
  var I = {
    play:  'M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z',
    pause: 'M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z',
    loud:  'M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z',
    muted: 'M53.92,34.62A8,8,0,1,0,42.08,45.38L73.55,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V175.09l42.08,46.29a8,8,0,1,0,11.84-10.76ZM32,96H72v64H32ZM144,207.64,88,164.09V95.89l56,61.6Zm42-63.77a24,24,0,0,0,0-31.72,8,8,0,1,1,12-10.57,40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.59Zm-80.16-76a8,8,0,0,1,1.4-11.23l39.85-31A8,8,0,0,1,160,32v74.83a8,8,0,0,1-16,0V48.36l-26.94,21A8,8,0,0,1,105.84,67.91ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z',
    gear:  'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z',
    pip:   'M216,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,64H216v56H136a8,8,0,0,0-8,8v64H40ZM216,192H144V136h72v56Z',
    full:  'M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z',
    small: 'M152,96V48a8,8,0,0,1,16,0V88h40a8,8,0,0,1,0,16H160A8,8,0,0,1,152,96ZM96,152H48a8,8,0,0,0,0,16H88v40a8,8,0,0,0,16,0V160A8,8,0,0,0,96,152Zm112,0H160a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V168h40a8,8,0,0,0,0-16ZM96,40a8,8,0,0,0-8,8V88H48a8,8,0,0,0,0,16H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z',
    x:     'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'
  };
  var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function svg(d) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function btn(cls, label, icon) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vp__btn ' + cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = svg(icon);
    return b;
  }
  /* 0:07, 1:04, 12:30. Hours would need a third field and this film is one
     minute, so the format stays two. */
  function clock(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---- The YouTube API, loaded once and only on first open -------------- */
  var ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(function (resolve) {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return ytReady;
  }
  /* Accepts the /embed/ID form the markup already carries. */
  function ytId(url) {
    var m = /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/.exec(url) ||
            /[?&]v=([A-Za-z0-9_-]{6,})/.exec(url) ||
            /youtu\.be\/([A-Za-z0-9_-]{6,})/.exec(url);
    return m ? m[1] : null;
  }

  function open(box, opener) {
    var src   = box.getAttribute('data-video');
    var title = box.getAttribute('data-video-title') || 'Video player';
    var id    = ytId(src);

    var overlay = document.createElement('div');
    overlay.className = 'vmodal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    var frame = document.createElement('div');
    frame.className = 'vmodal__box vp';
    var stage = document.createElement('div');
    stage.className = 'vp__stage';
    frame.appendChild(stage);

    /* Scrims. Two gradients rather than one bar so the controls sit ON the
       film the way the reference does, with the picture reading through. */
    ['top', 'bot'].forEach(function (side) {
      var sc = document.createElement('div');
      sc.className = 'vp__scrim vp__scrim--' + side;
      sc.setAttribute('aria-hidden', 'true');
      frame.appendChild(sc);
    });

    var close = btn('vmodal__close', 'Close video', I.x);
    frame.appendChild(close);

    /* ---- the bar ---- */
    var bar = document.createElement('div');
    bar.className = 'vp__bar';

    var bPlay = btn('vp__play', 'Play', I.play);
    var bMute = btn('', 'Mute', I.loud);

    var time = document.createElement('span');
    time.className = 'vp__time';
    time.textContent = '0:00 / 0:00';

    var seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'vp__seek';
    seek.min = 0; seek.max = 1000; seek.value = 0; seek.step = 1;
    seek.setAttribute('aria-label', 'Seek');

    var rateWrap = document.createElement('div');
    rateWrap.className = 'vp__menu-wrap';
    var bRate = btn('', 'Playback speed', I.gear);
    bRate.setAttribute('aria-haspopup', 'true');
    bRate.setAttribute('aria-expanded', 'false');
    var menu = document.createElement('div');
    menu.className = 'vp__menu';
    menu.hidden = true;
    RATES.forEach(function (r) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'vp__rate';
      o.textContent = r === 1 ? 'Normal' : r + 'x';
      o.dataset.rate = r;
      menu.appendChild(o);
    });
    rateWrap.appendChild(bRate); rateWrap.appendChild(menu);

    var bPip  = btn('', 'Picture in picture', I.pip);
    var bFull = btn('', 'Full screen', I.full);

    bar.appendChild(bPlay); bar.appendChild(bMute); bar.appendChild(time);
    bar.appendChild(seek);  bar.appendChild(rateWrap);
    bar.appendChild(bPip);  bar.appendChild(bFull);
    frame.appendChild(bar);
    overlay.appendChild(frame);

    /* ---- the adapter ------------------------------------------------- */
    var api = null, poll = null, scrubbing = false;

    function paint() {
      if (!api) return;
      var d = api.duration(), t = api.time();
      time.textContent = clock(t) + ' / ' + clock(d);
      if (!scrubbing && d > 0) seek.value = Math.round((t / d) * 1000);
      seek.style.setProperty('--p', (d > 0 ? (t / d) * 100 : 0) + '%');
      var playing = api.playing();
      bPlay.innerHTML = svg(playing ? I.pause : I.play);
      bPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      var m = api.muted();
      bMute.innerHTML = svg(m ? I.muted : I.loud);
      bMute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    }

    function wire() {
      poll = setInterval(paint, 200);
      paint();
    }

    if (id) {
      var host = document.createElement('div');
      stage.appendChild(host);
      loadYT().then(function (YT) {
        if (!document.body.contains(overlay)) return;   /* closed while loading */
        var p = new YT.Player(host, {
          videoId: id,
          playerVars: {
            autoplay: 1, controls: 0, modestbranding: 1, rel: 0,
            playsinline: 1, disablekb: 1, iv_load_policy: 3
          },
          events: { onReady: function () { wire(); } }
        });
        api = {
          toggle:  function () { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); },
          pause:   function () { p.pauseVideo && p.pauseVideo(); },
          seekTo:  function (s) { p.seekTo(s, true); },
          mute:    function () { p.isMuted() ? p.unMute() : p.mute(); },
          muted:   function () { return p.isMuted && p.isMuted(); },
          playing: function () { return p.getPlayerState && p.getPlayerState() === 1; },
          time:    function () { return p.getCurrentTime ? p.getCurrentTime() : 0; },
          duration:function () { return p.getDuration ? p.getDuration() : 0; },
          rate:    function (r) { p.setPlaybackRate(r); },
          destroy: function () { p.destroy && p.destroy(); }
        };
      });
      /* No media element behind an iframe, so this can never work here. */
      bPip.remove();
    } else {
      var v = document.createElement('video');
      v.src = src;
      v.autoplay = true;
      v.playsInline = true;
      v.preload = 'auto';
      stage.appendChild(v);
      api = {
        toggle:  function () { v.paused ? v.play() : v.pause(); },
        pause:   function () { v.pause(); },
        seekTo:  function (s) { v.currentTime = s; },
        mute:    function () { v.muted = !v.muted; },
        muted:   function () { return v.muted; },
        playing: function () { return !v.paused && !v.ended; },
        time:    function () { return v.currentTime; },
        duration:function () { return v.duration; },
        rate:    function (r) { v.playbackRate = r; },
        destroy: function () { v.pause(); v.removeAttribute('src'); v.load(); }
      };
      if (!document.pictureInPictureEnabled || v.disablePictureInPicture) {
        bPip.remove();
      } else {
        bPip.addEventListener('click', function () {
          if (document.pictureInPictureElement) document.exitPictureInPicture();
          else v.requestPictureInPicture();
        });
      }
      wire();
    }

    /* ---- control wiring ---------------------------------------------- */
    bPlay.addEventListener('click', function () { api && api.toggle(); paint(); });
    bMute.addEventListener('click', function () { api && api.mute(); paint(); });

    function seekFromInput() {
      if (!api) return;
      var d = api.duration();
      if (d > 0) api.seekTo((seek.value / 1000) * d);
    }
    seek.addEventListener('pointerdown', function () { scrubbing = true; });
    seek.addEventListener('input', function () {
      seek.style.setProperty('--p', (seek.value / 10) + '%');
    });
    seek.addEventListener('change', function () { scrubbing = false; seekFromInput(); });
    seek.addEventListener('pointerup', function () { scrubbing = false; seekFromInput(); });

    function shutMenu() { menu.hidden = true; bRate.setAttribute('aria-expanded', 'false'); }
    bRate.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      bRate.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    });
    menu.addEventListener('click', function (e) {
      var o = e.target.closest('.vp__rate');
      if (!o || !api) return;
      api.rate(parseFloat(o.dataset.rate));
      menu.querySelectorAll('.vp__rate').forEach(function (x) { x.classList.remove('is-on'); });
      o.classList.add('is-on');
      shutMenu();
    });
    frame.addEventListener('click', function (e) {
      if (!rateWrap.contains(e.target)) shutMenu();
    });

    function isFull() { return document.fullscreenElement === frame; }
    function paintFull() {
      bFull.innerHTML = svg(isFull() ? I.small : I.full);
      bFull.setAttribute('aria-label', isFull() ? 'Exit full screen' : 'Full screen');
    }
    bFull.addEventListener('click', function () {
      if (isFull()) document.exitFullscreen();
      else if (frame.requestFullscreen) frame.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', paintFull);

    /* ---- shutdown ------------------------------------------------------ */
    function shut() {
      if (poll) clearInterval(poll);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', paintFull);
      if (isFull() && document.exitFullscreen) document.exitFullscreen();
      /* Stop the sound before the node goes, or a paused YouTube player can
         keep its audio running for a beat after the overlay is gone. */
      if (api && api.destroy) { try { api.destroy(); } catch (err) {} }
      overlay.remove();
      document.body.classList.remove('modal-open');
      if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { if (!menu.hidden) return shutMenu(); return shut(); }
      if (!api) return;
      var k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { e.preventDefault(); api.toggle(); paint(); }
      else if (k === 'm') { api.mute(); paint(); }
      else if (k === 'f') { bFull.click(); }
      else if (e.key === 'ArrowRight') { api.seekTo(Math.min(api.duration(), api.time() + 5)); paint(); }
      else if (e.key === 'ArrowLeft')  { api.seekTo(Math.max(0, api.time() - 5)); paint(); }
    }

    close.addEventListener('click', shut);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) shut(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    paintFull();
    close.focus();
  }

  document.querySelectorAll('[data-video]').forEach(function (box) {
    var b = box.querySelector('[data-video-play]');
    if (!b) return;
    b.addEventListener('click', function () { open(box, b); });
  });
})();
