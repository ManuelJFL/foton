(function () {
  var body = document.body;
  var lamp = document.getElementById('lamp');
  var down = document.getElementById('bajar');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('scroll', function () {
    if (body.classList.contains('locked') && window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }, { passive: true });

  var pregunta = document.getElementById('pregunta');
  var gracias = document.getElementById('gracias');
  var pulsa = document.getElementById('pulsa');

  function setLight(on) {
    body.classList.toggle('lit', on);
    body.classList.toggle('locked', !on);
    lamp.setAttribute('aria-pressed', on ? 'true' : 'false');
    lamp.setAttribute('aria-label', on ? 'Apagar la bombilla' : 'Encender la bombilla');
    pregunta.toggleAttribute('aria-hidden', on);
    gracias.toggleAttribute('aria-hidden', !on);
    pulsa.toggleAttribute('aria-hidden', on);
    if (on) down.removeAttribute('tabindex'); else down.setAttribute('tabindex', '-1');
    if (themeColor) themeColor.setAttribute('content', on ? '#f4f4fa' : '#0b0d24');
    if (!on) window.scrollTo({ top: 0, behavior: 'instant' });
    document.dispatchEvent(new CustomEvent('foton:light', { detail: on }));
  }

  var sfxBtn = document.getElementById('sfx');
  var sfxOn = true, audio = null;
  try { sfxOn = window.localStorage.getItem('foton-sfx') !== 'off'; } catch (e) {}

  function paintSfx() {
    sfxBtn.setAttribute('aria-pressed', sfxOn ? 'true' : 'false');
    sfxBtn.classList.toggle('off', !sfxOn);
  }

  sfxBtn.addEventListener('click', function () {
    sfxOn = !sfxOn;
    paintSfx();
    if (sfxOn) ensureAudio();
    try { window.localStorage.setItem('foton-sfx', sfxOn ? 'on' : 'off'); } catch (e) {}
  });
  paintSfx();

  var lastPlayed = {};

  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audio = audio || new AC();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) { audio = null; }
    return audio;
  }

  function tone(type, f0, f1, start, dur, peak, out, attack) {
    var o = audio.createOscillator(), g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(f1, start + dur);
    g.gain.setValueAtTime(.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + (attack || .02));
    g.gain.exponentialRampToValueAtTime(.0001, start + dur);
    o.connect(g);
    g.connect(out);
    o.start(start);
    o.stop(start + dur + .03);
  }

  function noise(start, dur, peak, freq, out) {
    var len = Math.floor(audio.sampleRate * dur), buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 2.5;
    g.gain.setValueAtTime(.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + dur * .4);
    g.gain.exponentialRampToValueAtTime(.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(start);
  }

  var SOUNDS = {
    wrong: function (t, out) {
      var lp = audio.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      lp.connect(out);
      tone('triangle', 330, 300, t, .16, .09, lp, .015);
      tone('triangle', 262, 240, t + .12, .22, .08, lp, .015);
    },
    right: function (t, out) {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone('sine', f, f * 1.005, t + i * .075, .32, .07, out, .012); });
      var bp = audio.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 1.2;
      bp.connect(out);
      tone('sawtooth', 220, 660, t, .35, .03, bp, .05);
    }
  };

  function playSound(name) {
    if (!sfxOn || !SOUNDS[name]) return;
    var now = Date.now();
    if (now - (lastPlayed[name] || 0) < 350) return;
    lastPlayed[name] = now;
    if (!ensureAudio()) return;
    try {
      var out = audio.createGain();
      out.gain.value = .6;
      out.connect(audio.destination);
      SOUNDS[name](audio.currentTime + .01, out);
    } catch (e) {}
  }

  ['pointerdown', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (sfxOn && audio && audio.state === 'suspended') audio.resume(); }, { passive: true });
  });
  document.addEventListener('foton:sound', function (e) { playSound(e.detail); });

  lamp.addEventListener('click', function () {
    var turnOn = !body.classList.contains('lit');
    setLight(turnOn);
  });

  var targets = document.querySelectorAll('.ref, .video, .finale, .section-title');
  if ('IntersectionObserver' in window && !reduced) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('visible'); });
  }

  document.querySelectorAll('.video-frame video').forEach(function (v) {
    var frame = v.parentNode;
    function missing() { frame.classList.add('missing'); }
    v.addEventListener('error', missing);
    v.addEventListener('loadeddata', function () { frame.classList.remove('missing'); });
    if (v.error) missing();
    var start = frame.querySelector('.video-start');
    function nativeFull() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || v.webkitDisplayingFullscreen);
    }
    function isFull() { return nativeFull() || frame.classList.contains('pseudo-full'); }
    var bar = document.createElement('div');
    bar.className = 'video-bar';
    bar.innerHTML =
      '<button type="button" class="vb-btn vb-play" aria-label="Reproducir o pausar"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path class="vb-i-play" d="M8 5v14l11-7z"/><path class="vb-i-pause" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button>' +
      '<span class="vb-time">0:00 / 0:00</span>' +
      '<input class="vb-seek" type="range" min="0" max="1000" value="0" aria-label="Progreso del vídeo">' +
      '<button type="button" class="vb-btn vb-mute" aria-label="Silenciar o activar el sonido"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path class="vb-i-on" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="vb-i-off" d="M17 9l5 6M22 9l-5 6"/></svg></button>' +
      '<button type="button" class="vb-btn vb-full" aria-label="Salir de la pantalla completa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg></button>';
    frame.appendChild(bar);
    var vbTime = bar.querySelector('.vb-time'), vbSeek = bar.querySelector('.vb-seek');
    function clock(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
    function paintBar() {
      bar.classList.toggle('playing', !v.paused);
      bar.classList.toggle('muted', v.muted || v.volume === 0);
      vbTime.textContent = clock(v.currentTime) + ' / ' + clock(v.duration);
      if (v.duration && document.activeElement !== vbSeek) vbSeek.value = Math.round(v.currentTime / v.duration * 1000);
    }
    ['play', 'pause', 'timeupdate', 'volumechange', 'loadedmetadata', 'durationchange'].forEach(function (n) { v.addEventListener(n, paintBar); });
    bar.querySelector('.vb-play').addEventListener('click', function () {
      if (v.paused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause();
    });
    bar.querySelector('.vb-mute').addEventListener('click', function () { v.muted = !v.muted; });
    vbSeek.addEventListener('input', function () { if (v.duration) v.currentTime = vbSeek.value / 1000 * v.duration; });
    bar.querySelector('.vb-full').addEventListener('click', function () { leaveFull(); });
    function pseudoFull(on) {
      frame.classList.toggle('pseudo-full', on);
      document.documentElement.classList.toggle('video-open', on);
      v.controls = on ? false : frame.classList.contains('started');
      paintBar();
    }
    function legacyFull() {
      if (isFull()) return;
      if (!v.webkitEnterFullscreen) { pseudoFull(true); return; }
      v.controls = true;
      try { v.webkitEnterFullscreen(); } catch (e) { v.controls = frame.classList.contains('started'); pseudoFull(true); }
      setTimeout(function () { if (!isFull()) pseudoFull(true); }, 400);
    }
    function goFull() {
      if (isFull()) return;
      var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (!req) { legacyFull(); return; }
      try {
        var p = req.call(frame);
        if (p && p.catch) p.catch(function () { pseudoFull(true); });
        setTimeout(function () { if (!isFull()) pseudoFull(true); }, 700);
      } catch (e) { pseudoFull(true); }
    }
    function leaveFull() {
      if (frame.classList.contains('pseudo-full')) { pseudoFull(false); return; }
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) { try { var q = ex.call(document); if (q && q.catch) q.catch(function () {}); } catch (e) {} }
      else if (v.webkitExitFullscreen) { try { v.webkitExitFullscreen(); } catch (e) {} }
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && frame.classList.contains('pseudo-full')) pseudoFull(false); });
    var frameWasFull = false, promoting = false, wantOut = false, lastFe = null;
    function leaveNative() {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      try { var q = ex.call(document); if (q && q.catch) q.catch(function () { wantOut = false; }); } catch (e) { wantOut = false; }
    }
    function promoteVideo() {
      var fe = document.fullscreenElement || document.webkitFullscreenElement;
      if (fe !== frame) return;
      var req = v.requestFullscreen || v.webkitRequestFullscreen;
      if (!req) return;
      promoting = true;
      try {
        var q = req.call(v);
        if (q && q.catch) q.catch(function () { promoting = false; });
      } catch (e) { promoting = false; }
      setTimeout(function () { promoting = false; }, 1500);
    }
    function nativeChange() {
      var fe = document.fullscreenElement || document.webkitFullscreenElement;
      if (wantOut) {
        if (fe) leaveNative(); else wantOut = false;
        frameWasFull = false; lastFe = fe;
        return;
      }
      if (fe === v) {
        if (promoting) { promoting = false; frameWasFull = false; lastFe = fe; return; }
        if (frameWasFull || frame.classList.contains('pseudo-full')) {
          pseudoFull(false);
          wantOut = true;
          leaveNative();
          lastFe = fe;
          return;
        }
      } else if (fe === frame && lastFe === v) {
        wantOut = true;
        leaveNative();
        lastFe = fe;
        return;
      }
      if (fe && frame.classList.contains('pseudo-full')) pseudoFull(false);
      frameWasFull = fe === frame;
      lastFe = fe;
    }
    function nativeError(e) {
      if (e.target !== v) return;
      if (frame.classList.contains('pseudo-full')) pseudoFull(false);
      else if (!isFull()) pseudoFull(true);
    }
    document.addEventListener('fullscreenchange', nativeChange);
    document.addEventListener('webkitfullscreenchange', nativeChange);
    document.addEventListener('fullscreenerror', nativeError);
    document.addEventListener('webkitfullscreenerror', nativeError);
    v.addEventListener('play', function () {
      frame.classList.add('started');
      v.controls = !frame.classList.contains('pseudo-full');
      goFull();
      promoteVideo();
    });
    if (start) {
      var label = start.querySelector('.video-start-text');
      var armed = function (on) {
        frame.classList.toggle('armed', on);
        label.textContent = on ? 'Empezar el vídeo' : 'Ver en pantalla completa';
        start.setAttribute('aria-label', on ? 'Empezar el vídeo' : 'Ver el vídeo en pantalla completa');
      };
      var fsChange = function () {
        if (!isFull() && !frame.classList.contains('started')) { armed(false); v.controls = false; }
      };
      document.addEventListener('fullscreenchange', fsChange);
      document.addEventListener('webkitfullscreenchange', fsChange);
      v.addEventListener('webkitendfullscreen', fsChange);
      v.controls = false;
      start.addEventListener('click', function () {
        if (!frame.classList.contains('armed')) {
          armed(true);
          goFull();
          return;
        }
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    }
  });
})();

(function () {
  var room = document.getElementById('room');
  if (!room) return;
  var svg = room.querySelector('svg');
  var bubble = document.getElementById('room-bubble');
  var ending = document.getElementById('room-end');
  var meHit = room.querySelector('.room-me');
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VW = 332, VH = 292, OX = 130, OY = 118, TW = 24, TH = 12, WALL = 100;
  var COLS = 5, ROWS = 8, SPEED = 3.2;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var BLOCKED = { '3,0': 1, '0,1': 1, '0,2': 1, '0,3': 1, '0,4': 1, '0,5': 1, '0,6': 1, '1,7': 1, '2,7': 1, '3,7': 1, '4,5': 1, '4,2': 1 };
  var WOOD = ['room-wood-top', 'room-wood', 'room-wood-dark'];
  var WHITE = ['room-white', 'room-white-side', 'room-white-dark'];
  var DESK = ['room-desk', 'room-desk-side', 'room-desk-dark'];
  var NAVY = ['room-navy-top', 'room-navy', 'room-navy-dark'];
  var DARK = ['room-dark-top', 'room-dark', 'room-dark'];
  var RED = ['room-red', 'room-red', 'room-red'];

  function pt(i, j, h) { return [OX + (j - i) * TW, OY + (i + j) * TH - (h || 0)]; }

  function make(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) {
      if (k === 'fill' || k === 'stroke') node.style[k] = attrs[k] === 'none' ? 'none' : 'var(--' + attrs[k] + ')';
      else node.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }
  function poly(points, fill, parent, cls) {
    return make('polygon', {
      points: points.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '),
      fill: fill,
      class: cls === undefined ? 'o' : cls
    }, parent);
  }
  function quad(a, b, c, d, fill, parent, cls) { return poly([a, b, c, d], fill, parent, cls); }
  function box(i0, i1, j0, j1, h0, h1, colors, parent) {
    quad(pt(i1, j0, h0), pt(i1, j1, h0), pt(i1, j1, h1), pt(i1, j0, h1), colors[1], parent);
    quad(pt(i0, j1, h0), pt(i1, j1, h0), pt(i1, j1, h1), pt(i0, j1, h1), colors[2], parent);
    quad(pt(i0, j0, h1), pt(i0, j1, h1), pt(i1, j1, h1), pt(i1, j0, h1), colors[0], parent);
  }
  function line(a, b, color, w, parent) {
    return make('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, parent);
  }
  function rect(x, y, w, h, fill, parent, rx, cls) {
    return make('rect', { x: x, y: y, width: w, height: h, rx: rx || 0, fill: fill, class: cls === undefined ? 'o' : cls }, parent);
  }
  function circle(c, r, fill, parent, cls) {
    return make('circle', { cx: c[0], cy: c[1], r: r, fill: fill, class: cls === undefined ? 'o' : cls }, parent);
  }
  function ellipse(c, rx, ry, fill, parent, cls) {
    return make('ellipse', { cx: c[0], cy: c[1], rx: rx, ry: ry, fill: fill, class: cls === undefined ? 'o' : cls }, parent);
  }
  function group(cls, parent) { return make('g', cls ? { class: cls } : {}, parent); }

  var floor = group('', svg);
  quad(pt(5, 0), pt(5, 8), pt(5, 8, -7), pt(5, 0, -7), 'room-floor-side', floor);
  quad(pt(0, 8), pt(5, 8), pt(5, 8, -7), pt(0, 8, -7), 'room-floor-dark', floor);
  quad(pt(0, 0), pt(0, 8), pt(5, 8), pt(5, 0), 'room-floor', floor);
  for (var s = 1; s < 10; s++) line(pt(s / 2, 0), pt(s / 2, 8), 'room-floor-seam', .7, floor);
  [[0, 5.2], [.5, 1.3], [1, 4.1], [1, 6.9], [1.5, 2.4], [2, 6.2], [2, 2.7], [2.5, .9], [3, 3.6], [3, 7.1], [3.5, 5.4], [4, 1.9], [4, 4.6], [4.5, 6.8]].forEach(function (c) {
    line(pt(c[0], c[1]), pt(c[0] + .5, c[1]), 'room-floor-seam', .7, floor);
  });

  var T = .3;
  var walls = group('', svg);
  quad(pt(5, 0), pt(5, -T), pt(5, -T, WALL), pt(5, 0, WALL), 'room-wall-edge', walls);
  quad(pt(0, 8), pt(-T, 8), pt(-T, 8, WALL), pt(0, 8, WALL), 'room-wall-edge', walls);
  quad(pt(0, 0), pt(5, 0), pt(5, 0, WALL), pt(0, 0, WALL), 'room-wall-l', walls);
  quad(pt(0, 0), pt(0, 8), pt(0, 8, WALL), pt(0, 0, WALL), 'room-wall-r', walls);
  quad(pt(0, 0), pt(5, 0), pt(5, 0, 4), pt(0, 0, 4), 'room-white', walls);
  quad(pt(0, 0), pt(0, 8), pt(0, 8, 4), pt(0, 0, 4), 'room-white', walls);
  quad(pt(0, 0, WALL - 5), pt(5, 0, WALL - 5), pt(5, 0, WALL), pt(0, 0, WALL), 'room-white', walls);
  quad(pt(0, 0, WALL - 5), pt(0, 8, WALL - 5), pt(0, 8, WALL), pt(0, 0, WALL), 'room-white', walls);
  poly([pt(5, 0, WALL), pt(0, 0, WALL), pt(0, 8, WALL), pt(-T, 8, WALL), pt(-T, -T, WALL), pt(5, -T, WALL)], 'room-wall-top', walls);

  var back = group('', svg);
  var charLayer = group('', svg);
  var front = group('', svg);
  var top = group('', svg);

  var door = group('door', back);
  quad(pt(.08, 0, 0), pt(1, 0, 0), pt(1, 0, 82), pt(.08, 0, 82), 'room-white-dark', door);
  quad(pt(.16, 0, 0), pt(.92, 0, 0), pt(.92, 0, 78), pt(.16, 0, 78), 'room-gap', door, 'o door-open');
  var leaf = group('door-leaf', door);
  quad(pt(.16, 0, 0), pt(.92, 0, 0), pt(.92, 0, 78), pt(.16, 0, 78), 'room-white', leaf);
  for (var r = 0; r < 3; r++) {
    for (var c = 0; c < 2; c++) {
      var i0 = .24 + c * .33, h0 = 44 + r * 11;
      quad(pt(i0, 0, h0), pt(i0 + .27, 0, h0), pt(i0 + .27, 0, h0 + 9), pt(i0, 0, h0 + 9), 'room-glass', leaf);
    }
  }
  quad(pt(.26, 0, 8), pt(.82, 0, 8), pt(.82, 0, 34), pt(.26, 0, 34), 'room-white-side', leaf);
  circle(pt(.84, 0, 39), 1.6, 'room-steel', leaf);

  var shelves = group('', back);
  [[2, 2.9], [3.4, 4.3]].forEach(function (col) {
    [50, 63, 76].forEach(function (h) { box(col[0], col[1], 0, .3, h - 2, h, WHITE, shelves); });
  });
  box(2.1, 2.5, 0, .22, 76, 81, DARK, shelves);
  box(2.58, 2.82, 0, .2, 76, 79, DARK, shelves);
  box(2.15, 2.7, 0, .22, 63, 68, DARK, shelves);
  box(2.3, 2.4, .05, .15, 50, 57, RED, shelves);
  box(2.5, 2.6, .05, .15, 50, 57, RED, shelves);
  circle(pt(3.75, .15, 80.5), 3.5, 'room-white', shelves);
  circle(pt(3.75, .15, 80.5), 1.2, 'room-dark', shelves, '');
  box(3.5, 3.78, 0, .2, 63, 69, RED, shelves);
  box(3.88, 4.05, 0, .2, 63, 67, DARK, shelves);
  ['room-red', 'room-book-b', 'room-book-y', 'room-book-g', 'room-book-b', 'room-red', 'room-book-y'].forEach(function (col, k) {
    box(3.5 + k * .1, 3.58 + k * .1, 0, .22, 50, 57 + (k % 3), [col, col, col], shelves);
  });

  var flexo = group('', back);
  var fb = pt(3.15, .35, 0), fh = pt(3.15, .35, 58);
  ellipse(fb, 5, 2.2, 'room-steel', flexo);
  line(fb, fh, 'room-steel', 1.6, flexo);
  rect(fh[0] - 3, fh[1] - 3, 7, 5, 'room-steel', flexo, 1.5);

  var strip = group('strip', back);
  quad(pt(1.08, 0, 5), pt(1.22, 0, 5), pt(1.22, 0, 11), pt(1.08, 0, 11), 'room-white', strip);
  line(pt(1.15, .02, 7), pt(1.32, .16, 1.5), 'room-dark', 1.2, strip);
  var stripBody = group('', strip);
  box(1.3, 2.05, .05, .27, 0, 3, WHITE, stripBody);
  [1.46, 1.66, 1.86].forEach(function (i) { circle(pt(i, .16, 3), 1.7, 'room-dark', stripBody, ''); });
  circle(pt(1.98, .16, 3), 1.2, 'room-red', stripBody, '');
  circle(pt(1.98, .16, 3), 2.6, 'room-red', strip, 'lit-part');

  var charger = group('charger', back);
  quad(pt(4.42, 0, 9), pt(4.78, 0, 9), pt(4.78, 0, 19), pt(4.42, 0, 19), 'room-white', charger);
  var chargerBody = group('', charger);
  box(4.5, 4.7, 0, .14, 10.5, 17.5, WHITE, chargerBody);
  var cp = pt(4.6, .14, 11), ce = pt(4.25, .75, 0);
  make('path', { d: 'M' + cp[0] + ' ' + cp[1] + 'C' + (cp[0] + 2) + ' ' + (cp[1] + 12) + ' ' + (ce[0] - 6) + ' ' + (ce[1] - 2) + ' ' + ce[0] + ' ' + ce[1], fill: 'none', stroke: 'room-white-dark', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, chargerBody);
  rect(ce[0] - 1, ce[1] - 1.5, 4, 2.6, 'room-steel', chargerBody, .6);
  circle(pt(4.6, .14, 15.5), 1.6, 'light', charger, 'lit-part');

  var dresser = group('', back);
  box(0, .62, 1, 4.9, 0, 40, WOOD, dresser);
  [10, 20, 30].forEach(function (h) { line(pt(.62, 1, h), pt(.62, 4.9, h), 'room-wood-dark', .8, dresser); });
  [5, 15, 25, 35].forEach(function (h) {
    [2, 3.9].forEach(function (j) { circle(pt(.62, j, h), 1.2, 'room-gold', dresser, ''); });
  });
  var iron = group('iron', dresser);
  var ip = pt(.3, 3.75, 40);
  var heat = group('lit-part heat', iron);
  [-4, 0, 4].forEach(function (dx) {
    make('path', { d: 'M' + (ip[0] + dx) + ' ' + (ip[1] - 11) + 'q-2 -3 0 -6q2 -3 0 -6', fill: 'none', stroke: 'room-red', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, heat);
  });
  var ironBody = group('', iron);
  poly([[ip[0] - 8, ip[1] + 1], [ip[0] + 7, ip[1] + 1], [ip[0] + 9, ip[1] - 3], [ip[0] - 4, ip[1] - 4]], 'room-steel', ironBody);
  poly([[ip[0] - 6, ip[1] - 3], [ip[0] + 8, ip[1] - 3], [ip[0] + 6, ip[1] - 7], [ip[0] - 2, ip[1] - 8]], 'room-book-b', ironBody);
  make('path', { d: 'M' + (ip[0] - 2) + ' ' + (ip[1] - 8) + 'q4 -6 8 -1', fill: 'none', stroke: 'room-dark', 'stroke-width': 2, 'stroke-linecap': 'round' }, ironBody);

  var gameConsole = group('console', dresser);
  var consoleBody = group('', gameConsole);
  box(.14, .5, 1.12, 1.62, 40, 43.5, DARK, consoleBody);
  circle(pt(.5, 1.52, 41.8), .9, 'room-book-b', consoleBody, '');
  ellipse(pt(.32, 1.9, 40.6), 3.4, 1.7, 'room-dark', consoleBody);
  circle(pt(.5, 1.52, 41.8), 2.4, 'room-book-b', gameConsole, 'lit-part');

  var fan = group('fan', back);
  var fnb = pt(4.5, 2.5, 0), fnh = pt(4.5, 2.5, 46);
  ellipse(fnb, 8, 3.4, 'room-white', fan);
  line(fnb, fnh, 'room-line', 2.8, fan);
  line(fnb, fnh, 'room-white', 1.4, fan);
  circle(fnh, 10, 'room-white-side', fan);
  var blades = group('blades', fan);
  [0, 90, 180, 270].forEach(function (a) {
    make('ellipse', { cx: fnh[0], cy: fnh[1] - 4.5, rx: 2.4, ry: 4.5, fill: 'room-desk-dark', class: 'o', transform: 'rotate(' + a + ' ' + fnh[0] + ' ' + fnh[1] + ')' }, blades);
  });
  circle(fnh, 1.8, 'room-steel', fan);
  circle(fnh, 10, 'none', fan);

  var guitar = group('guitar', back);
  var gb = pt(.4, 5.5, 0);
  var gBody = group('', guitar);
  quad(pt(0, 4.98, 4), pt(0, 5.14, 4), pt(0, 5.14, 10), pt(0, 4.98, 10), 'room-white', gBody);
  line(pt(.66, 5.16, 3), pt(.02, 5.06, 6.5), 'room-dark', 1.2, gBody);
  box(.66, .98, 5, 5.32, 0, 12, DARK, gBody);
  quad(pt(.98, 5.05, 2), pt(.98, 5.27, 2), pt(.98, 5.27, 9), pt(.98, 5.05, 9), 'room-steel', gBody);
  [5.1, 5.2].forEach(function (j) { circle(pt(.82, j, 12), .9, 'room-gold', gBody, ''); });
  make('path', { d: 'M' + (gb[0] - 3) + ' ' + (gb[1] - 3) + 'Q' + (gb[0] - 8) + ' ' + (gb[1] + 4) + ' ' + pt(.9, 5.32, 5).join(' '), fill: 'none', stroke: 'room-dark', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, gBody);
  ellipse([gb[0], gb[1] - 11], 8, 9.5, 'room-guitar', gBody);
  ellipse([gb[0] + 2, gb[1] - 23], 6, 6.5, 'room-guitar', gBody);
  poly([[gb[0] + 3, gb[1] - 28], [gb[0] + 8, gb[1] - 28], [gb[0] + 12, gb[1] - 56], [gb[0] + 7, gb[1] - 56]], 'room-guitar', gBody);
  rect(gb[0] + 6, gb[1] - 63, 7, 8, 'room-guitar-dark', gBody, 2);
  rect(gb[0] - 4.5, gb[1] - 15, 7, 2.2, 'room-dark', gBody, .6);
  rect(gb[0] - 2.5, gb[1] - 20, 7, 2.2, 'room-dark', gBody, .6);
  [[3.5, -8], [5.5, -11]].forEach(function (k) { circle([gb[0] + k[0], gb[1] + k[1]], 1.1, 'room-gold', gBody, ''); });
  line([gb[0] - 4, gb[1] - 8], [gb[0] + 10, gb[1] - 52], 'room-guitar-dark', 1.6, gBody);
  var notes = group('lit-part notes', guitar);
  [[-14, -48], [-4, -62]].forEach(function (n) {
    ellipse([gb[0] + n[0], gb[1] + n[1]], 2.6, 2, 'indigo-deep', notes, '');
    line([gb[0] + n[0] + 2.3, gb[1] + n[1]], [gb[0] + n[0] + 2.3, gb[1] + n[1] - 9], 'indigo-deep', 1.2, notes);
    line([gb[0] + n[0] + 2.3, gb[1] + n[1] - 9], [gb[0] + n[0] + 6, gb[1] + n[1] - 6], 'indigo-deep', 1.2, notes);
  });

  var lamp = group('floorlamp', back);
  var lb = pt(.5, 6.5, 0), lt = pt(.5, 6.5, 80);
  poly([[lt[0] - 12, lt[1]], [lt[0] + 12, lt[1]], [lt[0] + 32, lb[1] + 4], [lt[0] - 32, lb[1] + 4]], 'room-glow', lamp, 'lit-part');
  ellipse(lb, 8, 3.4, 'room-white', lamp);
  line(lb, lt, 'room-line', 2.8, lamp);
  line(lb, lt, 'room-white', 1.4, lamp);
  ellipse([lt[0], lt[1] - 8], 26, 22, 'room-glow', lamp, 'lit-part');
  var shade = group('', lamp);
  var shadePts = [[lt[0] - 13, lt[1]], [lt[0] + 13, lt[1]], [lt[0] + 6, lt[1] - 19], [lt[0] - 6, lt[1] - 19]];
  poly(shadePts, 'room-shade', shade);
  poly(shadePts, 'room-shade-on', shade, 'o lit-part');

  var eames = group('', back);
  [[4.25, 5.25], [4.75, 5.25], [4.25, 5.75], [4.75, 5.75]].forEach(function (l) {
    line(pt(l[0], l[1], 0), pt(4.5 + (l[0] - 4.5) * .4, 5.5 + (l[1] - 5.5) * .4, 17), 'room-wood-top', 1.4, eames);
  });
  box(4.2, 4.8, 5.2, 5.8, 17, 21, WHITE, eames);
  box(4.72, 4.84, 5.2, 5.8, 21, 33, WHITE, eames);
  box(4.25, 4.82, 5.28, 5.72, 21, 24, NAVY, eames);
  box(4.68, 4.88, 5.3, 5.7, 24, 34, ['room-denim', 'room-denim', 'room-navy'], eames);

  var chair = group('', back);
  [[1.22, 7.22], [1.78, 7.22], [1.22, 7.78], [1.78, 7.78]].forEach(function (l) {
    box(l[0] - .03, l[0] + .03, l[1] - .03, l[1] + .03, 0, 17, WHITE, chair);
  });
  box(1.12, 1.22, 7.2, 7.8, 20, 38, WHITE, chair);
  box(1.06, 1.3, 7.25, 7.75, 22, 38, NAVY, chair);
  box(1.2, 1.8, 7.2, 7.8, 17, 20, WHITE, chair);

  var desk = group('', back);
  [[2.1, 7.2], [3.9, 7.2], [2.1, 7.86], [3.9, 7.86]].forEach(function (l) {
    box(l[0] - .04, l[0] + .04, l[1] - .04, l[1] + .04, 0, 32, WHITE, desk);
  });
  box(2.02, 3.98, 7.12, 7.95, 32, 35, DESK, desk);
  var dl = pt(3.7, 7.7, 35);
  ellipse(dl, 3, 1.3, 'room-gold', desk);
  line(dl, [dl[0], dl[1] - 9], 'room-gold', 1, desk);
  poly([[dl[0] - 4, dl[1] - 8], [dl[0] + 4, dl[1] - 8], [dl[0] + 2.5, dl[1] - 14], [dl[0] - 2.5, dl[1] - 14]], 'room-shade', desk);
  var laptop = group('laptop', desk);
  ellipse(pt(2.7, 7.6, 45), 22, 15, 'room-screen', laptop, 'lit-part');
  quad(pt(0, 7.38, 4), pt(0, 7.52, 4), pt(0, 7.52, 10), pt(0, 7.38, 10), 'room-white', laptop);
  make('path', { d: 'M' + pt(2.36, 7.45, 35.6).join(' ') + 'L' + pt(2.02, 7.45, 35).join(' ') + 'L' + pt(1.98, 7.45, 0).join(' ') + 'L' + pt(.02, 7.45, 0).join(' ') + 'L' + pt(.01, 7.45, 6.5).join(' '), fill: 'none', stroke: 'room-dark', 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, laptop);
  var lapBody = group('', laptop);
  box(2.35, 3.05, 7.3, 7.75, 35, 36.2, DARK, lapBody);
  quad(pt(2.35, 7.75, 36), pt(3.05, 7.75, 36), pt(3.05, 7.82, 52), pt(2.35, 7.82, 52), 'room-dark', lapBody);

  var chand = group('chandelier', top);
  var cc = pt(2.5, 4, 70);
  line([cc[0], 0], [cc[0], cc[1] - 8], 'room-dark', 1.2, chand);
  circle([cc[0], cc[1] + 4], 34, 'room-glow', chand, 'lit-part');
  var chandBody = group('', chand);
  rect(cc[0] - 1.5, cc[1] - 10, 3, 8, 'room-gold', chandBody, 1);
  [[-17, 4], [-9, 8], [0, 10], [9, 8], [17, 4]].forEach(function (o) {
    var x = cc[0] + o[0], y = cc[1] + o[1];
    make('path', { d: 'M' + cc[0] + ' ' + (cc[1] - 3) + 'Q' + (cc[0] + o[0] * .5) + ' ' + (cc[1] - 12) + ' ' + x + ' ' + (y - 4), fill: 'none', stroke: 'room-gold', 'stroke-width': 1.4 }, chandBody);
    var bell = 'M' + (x - 3.6) + ' ' + (y - 4) + 'Q' + (x - 3.6) + ' ' + (y + 3) + ' ' + x + ' ' + (y + 3) + 'Q' + (x + 3.6) + ' ' + (y + 3) + ' ' + (x + 3.6) + ' ' + (y - 4) + 'Z';
    make('path', { d: bell, fill: 'room-glass', class: 'o' }, chandBody);
    make('path', { d: bell, fill: 'room-shade-on', class: 'o lit-part' }, chandBody);
  });
  circle([cc[0], cc[1] - 3], 3, 'room-gold', chandBody);

  make('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'room-warm', class: 'warm' }, svg);
  make('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'room-dim', class: 'room-dim' }, svg);

  var ITEMS = [
    { g: door, i1: 0, j1: -1 },
    { g: shelves, i1: 4, j1: -1 },
    { g: flexo, i1: 3, j1: 0 },
    { g: strip, i1: 1, j1: -1 },
    { g: charger, i1: 4, j1: -1 },
    { g: dresser, i1: 0, j1: 4 },
    { g: fan, i1: 4, j1: 2 },
    { g: guitar, i1: 0, j1: 5 },
    { g: lamp, i1: 0, j1: 6 },
    { g: eames, i1: 4, j1: 5 },
    { g: chair, i1: 1, j1: 7 },
    { g: desk, i1: 3, j1: 7 }
  ];

  var meG = group('me', charLayer);
  ellipse([0, 0], 9, 3.6, 'room-shadow', meG, '');
  var sprite = group('me-sprite', meG);
  var body = group('me-body', sprite);
  var legA = group('leg-a', body);
  rect(-5, -15, 4, 14, 'room-jeans', legA);
  rect(-5.5, -2.5, 5, 2.5, 'room-dark', legA, 1);
  var legB = group('leg-b', body);
  rect(1, -15, 4, 14, 'room-jeans', legB);
  rect(.5, -2.5, 5, 2.5, 'room-dark', legB, 1);
  rect(-7, -31, 14, 17, 'indigo', body, 2);
  rect(-6, -44, 12, 13, 'room-skin', body, 3);
  var meFront = group('me-front', body);
  rect(-6.5, -46, 13, 6, 'room-hair', meFront, 2.5);
  rect(-6.5, -44, 2.5, 6, 'room-hair', meFront, 1, '');
  rect(1, -38.5, 1.6, 2.2, 'room-dark', meFront, 0, '');
  rect(4, -38.5, 1.6, 2.2, 'room-dark', meFront, 0, '');
  rect(-9, -29, 3, 11, 'indigo', meFront, 1.5);
  rect(6, -29, 3, 11, 'indigo', meFront, 1.5).classList.add('arm-r');
  var meBox = group('me-box', meFront);
  circle([0, -28], 10, 'room-glow', meBox, 'lit-part');
  rect(-2, -26.2, 4, 2.2, 'room-steel', meBox, .5);
  circle([0, -29], 3.6, 'room-glass', meBox);
  circle([0, -29], 3.6, 'light', meBox, 'o lit-part');
  rect(-8, -24, 16, 10, 'room-box', meBox, 1);
  rect(-8, -25.5, 16, 2.4, 'room-box-dark', meBox, 1);
  var point = group('point', meFront);
  make('path', { d: 'M7.5 -28L3 -33', fill: 'none', stroke: 'room-line', 'stroke-width': 4.6, 'stroke-linecap': 'round' }, point);
  make('path', { d: 'M7.5 -28L3 -33', fill: 'none', stroke: 'indigo', 'stroke-width': 3, 'stroke-linecap': 'round' }, point);
  circle([2, -34], 1.8, 'room-skin', point);
  var meBack = group('me-back', body);
  rect(-6.5, -46, 13, 12, 'room-hair', meBack, 3);
  rect(-9.5, -24, 2.5, 8, 'room-box', meBack, 0, 'o me-box');
  rect(7, -24, 2.5, 8, 'room-box', meBack, 0, 'o me-box');
  rect(-9, -30, 3, 12, 'indigo', meBack, 1.5);
  rect(6, -30, 3, 12, 'indigo', meBack, 1.5);
  [meFront, meBack].forEach(function (view, n) {
    var vest = make('g', { class: 'courier-part' });
    view.insertBefore(vest, view.firstChild);
    rect(-7, -30.5, 14, 13, 'light', vest, 2);
    rect(-7, -25, 14, 1.8, 'room-white', vest, 0, '');
    var cap = group('courier-part', view);
    rect(-6.8, -49.5, 13.6, 5.5, 'indigo-deep', cap, 2.5);
    if (!n) rect(3, -45.5, 7, 2.2, 'indigo-deep', cap, 1);
    rect(-6.8, -46, 13.6, 1.4, 'light', cap, 0, '');
  });
  var puff = group('puff', meG);
  [[-10, -30, 6], [10, -34, 7], [0, -48, 6], [-6, -14, 5], [8, -16, 5]].forEach(function (c) { circle([c[0], c[1]], c[2], 'room-white', puff, ''); });
  var rays = group('rays', meG);
  for (var a = 0; a < 8; a++) {
    var ang = a * Math.PI / 4;
    line([Math.cos(ang) * 8, -29 + Math.sin(ang) * 8], [Math.cos(ang) * 14, -29 + Math.sin(ang) * 14], 'light', 1.8, rays);
  }

  var pos = [2, 3], goal = null, pending = null, seg = null, raf = 0, last = 0, lastDir = '';
  var lit = false, leaving = false, timer = 0, outRaf = 0, timers = [], here = pt(2.5, 3.5);

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function free(t) { return t[0] >= 0 && t[0] < COLS && t[1] >= 0 && t[1] < ROWS && !BLOCKED[t]; }

  function draw(i, j) {
    here = pt(i + .5, j + .5);
    meG.setAttribute('transform', 'translate(' + here[0].toFixed(2) + ' ' + here[1].toFixed(2) + ')');
    meHit.style.left = ((here[0] - 24) / VW * 100) + '%';
    meHit.style.top = ((here[1] - 50) / VH * 100) + '%';
  }

  function face(dir) {
    meFront.style.display = dir.charAt(0) === 'f' ? '' : 'none';
    meBack.style.display = dir.charAt(0) === 'b' ? '' : 'none';
    sprite.setAttribute('transform', dir.charAt(1) === 'l' ? 'scale(-1 1)' : '');
  }

  function depth(t) {
    ITEMS.forEach(function (it) {
      (t[0] > it.i1 || t[1] > it.j1 ? back : front).appendChild(it.g);
    });
  }

  function stepToward(from, to) {
    if (from[0] === to[0] && from[1] === to[1]) return null;
    var dist = {}, queue = [to];
    dist[to] = 0;
    while (queue.length) {
      var cur = queue.shift();
      DIRS.forEach(function (d) {
        var n = [cur[0] + d[0], cur[1] + d[1]];
        if (free(n) && dist[n] === undefined) { dist[n] = dist[cur] + 1; queue.push(n); }
      });
    }
    var best = null, bestV = Infinity;
    DIRS.forEach(function (d) {
      var n = [from[0] + d[0], from[1] + d[1]], v = dist[n];
      if (v === undefined) return;
      if (v < bestV || (v === bestV && String(d) === lastDir)) { best = n; bestV = v; }
    });
    return bestV < dist[from] ? best : null;
  }

  function next() {
    var n = goal && stepToward(pos, goal);
    if (!n) {
      seg = null;
      meG.classList.remove('walking');
      arrive();
      return;
    }
    var d = [n[0] - pos[0], n[1] - pos[1]];
    lastDir = String(d);
    face(d[0] > 0 ? 'fl' : d[1] > 0 ? 'fr' : d[0] < 0 ? 'br' : 'bl');
    seg = { a: pos, b: n, t: 0, swapped: false };
    meG.classList.add('walking');
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function tick(now) {
    raf = 0;
    if (!seg) return;
    var dt = Math.min(.05, (now - last) / 1000);
    last = now;
    seg.t = Math.min(1, seg.t + dt * SPEED);
    if (seg.t >= .5 && !seg.swapped) { seg.swapped = true; depth(seg.b); }
    draw(seg.a[0] + (seg.b[0] - seg.a[0]) * seg.t, seg.a[1] + (seg.b[1] - seg.a[1]) * seg.t);
    if (seg.t >= 1) {
      pos = seg.b;
      seg = null;
      next();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function arrive() {
    var p = pending;
    pending = null;
    goal = null;
    if (!p) return;
    face(p.dir);
    if (reduced) { p.after(); return; }
    meG.classList.add('inspect');
    timer = later(function () {
      meG.classList.remove('inspect');
      p.after();
    }, 450);
  }

  function go(target, dir, after) {
    clearTimeout(timer);
    meG.classList.remove('inspect');
    say('');
    goal = target;
    pending = { dir: dir, after: after };
    if (reduced) {
      pos = target.slice();
      draw(pos[0], pos[1]);
      depth(pos);
      arrive();
      return;
    }
    if (!seg) next();
  }

  function say(text) {
    bubble.textContent = text;
    if (!text) return;
    hideLabel();
    var w = room.clientWidth, k = w / VW;
    var ax = here[0] * k;
    bubble.style.left = '0px';
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var left = Math.max(6, Math.min(w - bw - 6, ax - bw / 2));
    bubble.style.left = left + 'px';
    bubble.style.top = Math.max((here[1] - 50) * k, bh + 14) + 'px';
    bubble.style.setProperty('--tail', Math.max(14, Math.min(bw - 14, ax - left)) + 'px');
  }

  function react(o) {
    if (o.mode === 'shake') {
      door.classList.remove('shake');
      void door.getBoundingClientRect();
      door.classList.add('shake');
      return;
    }
    o.g.classList.remove('on');
    void o.g.getBoundingClientRect();
    o.g.classList.add('on');
    if (o.time) {
      clearTimeout(o.timer);
      o.timer = later(function () { o.g.classList.remove('on'); }, o.time);
    }
  }

  var OBJECTS = {
    techo: { tile: [2, 4], dir: 'fr', g: chand, hit: chandBody, time: 1400 },
    puerta: { tile: [0, 0], dir: 'bl', g: door, hit: door, mode: 'shake' },
    ventilador: { tile: [3, 2], dir: 'fl', g: fan, hit: fan, time: 1600 },
    plancha: { tile: [1, 3], dir: 'br', g: iron, hit: ironBody, time: 2500 },
    pie: { tile: [1, 6], dir: 'br', g: lamp, hit: shade },
    guitarra: { tile: [1, 5], dir: 'br', g: guitar, hit: gBody },
    portatil: { tile: [2, 6], dir: 'fr', g: laptop, hit: lapBody },
    regleta: { tile: [2, 1], dir: 'bl', g: strip, hit: stripBody, time: 1600 },
    cargador: { tile: [4, 1], dir: 'bl', g: charger, hit: chargerBody, time: 1600 },
    consola: { tile: [1, 1], dir: 'br', g: gameConsole, hit: consoleBody, time: 1600 }
  };
  var TEXT = {};
  room.querySelectorAll('.room-hit').forEach(function (b) { TEXT[b.getAttribute('data-obj')] = b.getAttribute('data-text') || ''; });
  var revealing = false, busy = false, tries = 3, rejected = {};
  var hint = document.getElementById('room-hint');
  var triesEl = document.getElementById('room-tries');
  var finaleTitle = document.getElementById('finale-title');

  function pick(key) {
    if (leaving || revealing || busy) return;
    markPicked(room.querySelector('.room-hit[data-obj="' + key + '"]'));
    if (key === 'puerta' && lit) { leave(); return; }
    var o = OBJECTS[key];
    var counts = !lit && key !== 'puerta' && !rejected[key];
    if (counts) rejected[key] = true;
    busy = true;
    guitar.classList.remove('on');
    laptop.classList.remove('on');
    go(o.tile, o.dir, function () {
      react(o);
      say(TEXT[key]);
      if (!counts) { busy = false; return; }
      later(function () { busy = false; }, 500);
      sound('wrong');
      setTries(tries - 1);
      if (!tries) {
        revealing = true;
        later(autoSolve, 1800);
      }
    });
  }

  function setTries(n) {
    tries = n;
    triesEl.querySelector('strong').textContent = n;
  }

  function reveal() {
    if (lit) { say(meHit.getAttribute('data-self')); return; }
    revealing = true;
    meG.classList.add('surprise');
    say(TEXT.yo);
    later(function () {
      meG.classList.remove('surprise');
      say(meHit.getAttribute('data-self'));
      lightUp(true);
    }, 1400);
  }

  function sound(name) { document.dispatchEvent(new CustomEvent('foton:sound', { detail: name })); }

  function lightUp(auto) {
    if (auto) sound('right');
    lit = true;
    revealing = true;
    room.classList.add('lit');
    meG.classList.add('burst');
    later(function () { meG.classList.remove('burst', 'pointing'); }, 1100);
    if (auto) room.classList.add('glow');
    later(leave, reduced ? 0 : 2600);
  }

  function autoSolve() {
    revealing = true;
    say('');
    hint.textContent = meHit.getAttribute('data-hint');
    later(function () {
      face('fr');
      meG.classList.add('pointing');
      say(meHit.getAttribute('data-self'));
    }, 1800);
    later(function () {
      hint.textContent = '';
      lightUp(false);
    }, 3400);
  }

  var main = document.getElementById('contenido');
  var scene = document.getElementById('delivery');
  var art = scene.querySelector('.delivery-art');
  var deliveryStatus = document.getElementById('delivery-status');
  var continueBtn = document.getElementById('room-continue');
  var SW = 0, SH = 118, DX = 0, DY = 26;
  var walker = document.createElement('div');
  walker.className = 'walker room-art';
  walker.hidden = true;
  walker.setAttribute('aria-hidden', 'true');
  var wsvg = make('svg', { viewBox: '-22 -62 44 70', focusable: 'false' });
  walker.appendChild(wsvg);
  main.appendChild(walker);
  var wMe = null, wPos = [0, 0], walkRaf = 0, following = false, handed = false;

  function scale() { return room.clientWidth / VW; }
  function dpt(i, j, h) { return [DX + (j - i) * TW, DY + (i + j) * TH - (h || 0) + 34]; }
  function deliverSpot() { return [DX - 21.6, DY + 32.8]; }
  function restSpot() { return [DX - 31.2, DY + 28]; }

  function buildScene() {
    var k = scale();
    var aw = art.getBoundingClientRect().width;
    if (!k || !aw) return;
    SW = aw / k;
    DX = SW / 2 - 21;
    art.setAttribute('viewBox', '0 0 ' + SW.toFixed(1) + ' ' + SH);
    while (art.firstChild) art.removeChild(art.firstChild);
    poly([dpt(-.7, -1.7, 0), dpt(-.7, 3.3, 0), dpt(1.7, 3.3, 0), dpt(1.7, -1.7, 0)], 'indigo-soft', art, '');
    quad(dpt(.8, 0, 0), dpt(.8, 2.6, 0), dpt(.8, 2.6, 30), dpt(.8, 0, 30), 'room-wood', art);
    quad(dpt(0, 2.6, 0), dpt(.8, 2.6, 0), dpt(.8, 2.6, 30), dpt(0, 2.6, 30), 'room-wood-dark', art);
    line(dpt(.8, .15, 15), dpt(.8, 2.45, 15), 'light', 2.2, art);
    quad(dpt(.86, -.06, 30), dpt(.86, 2.66, 30), dpt(.86, 2.66, 34), dpt(.86, -.06, 34), 'room-white-side', art);
    quad(dpt(-.06, 2.66, 30), dpt(.86, 2.66, 30), dpt(.86, 2.66, 34), dpt(-.06, 2.66, 34), 'room-white-dark', art);
    quad(dpt(-.06, -.06, 34), dpt(-.06, 2.66, 34), dpt(.86, 2.66, 34), dpt(.86, -.06, 34), 'room-white', art);
    var spot = dpt(.4, .45, 34);
    var parcel = make('g', { class: 'parcel', transform: 'translate(' + spot[0].toFixed(1) + ' ' + (spot[1] + 14).toFixed(1) + ')' }, art);
    parcel.appendChild(meBox.cloneNode(true));
    ellipse(dpt(.4, 1.3, 0), 120, 46, 'room-glow', art, 'warm-light');
    [.2, 1.3, 2.4].forEach(function (jj, n) {
      var b = dpt(.4, jj, 34);
      var by = b[1] - 22;
      var g = make('g', { class: 'pendant' + (lightsOn > n ? ' on' : '') }, art);
      line([b[0], 0], [b[0], by - 4], 'room-dark', 1, g);
      circle([b[0], by + 2], 12, 'room-glow', g, 'lamp-on');
      rect(b[0] - 2.5, by - 5, 5, 3, 'room-steel', g, .8);
      circle([b[0], by + 2], 3.8, 'room-glass', g);
      circle([b[0], by + 2], 3.8, 'room-shade-on', g, 'o lamp-on');
    });
  }
  var lightsOn = 0;
  function lightPendant(n) {
    lightsOn = Math.max(lightsOn, n + 1);
    var p = art.querySelectorAll('.pendant')[n];
    if (p) p.classList.add('on');
  }

  function docPoint(local) {
    var r = art.getBoundingClientRect(), m = main.getBoundingClientRect(), k = r.width / SW;
    return [r.left - m.left + local[0] * k, r.top - m.top + local[1] * k];
  }

  function placeWalker(x, y) {
    var k = scale();
    wPos = [x, y];
    walker.style.transform = 'translate(' + (x - 22 * k).toFixed(1) + 'px,' + (y - 62 * k).toFixed(1) + 'px)';
  }

  function sizeWalker() {
    var k = scale();
    wsvg.style.width = (44 * k) + 'px';
    wsvg.style.height = (70 * k) + 'px';
  }

  function wFace(dir) {
    wMe.querySelector('.me-front').style.display = dir.charAt(0) === 'f' ? '' : 'none';
    wMe.querySelector('.me-back').style.display = dir.charAt(0) === 'b' ? '' : 'none';
    wMe.querySelector('.me-sprite').setAttribute('transform', dir.charAt(1) === 'l' ? 'scale(-1 1)' : '');
  }

  function spawnWalker(x, y) {
    while (wsvg.firstChild) wsvg.removeChild(wsvg.firstChild);
    wMe = meG.cloneNode(true);
    wMe.removeAttribute('transform');
    wMe.removeAttribute('style');
    wMe.setAttribute('class', 'me');
    wsvg.appendChild(wMe);
    sizeWalker();
    placeWalker(x, y);
    wFace('fr');
    walker.hidden = false;
  }

  function stopFollow() { following = false; }

  function jump(y) {
    var h = document.documentElement, prev = h.style.scrollBehavior;
    h.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    h.style.scrollBehavior = prev;
  }

  function jumpTo(el) {
    jump(el.getBoundingClientRect().top + window.scrollY);
  }

  function follow() {
    if (!following) return;
    var target = main.getBoundingClientRect().top + window.scrollY + wPos[1] - window.innerHeight * .55;
    if (target > window.scrollY) jump(target);
  }

  ['wheel', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, stopFollow, { passive: true }); });
  window.addEventListener('keydown', function (e) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(e.key) !== -1) stopFollow();
  });

  function runSegments(list, done) {
    var n = 0, from = wPos.slice(), start = performance.now();
    wFace(list[0].dir);
    walkRaf = requestAnimationFrame(function step(now) {
      var s = list[n], t = Math.min(1, (now - start) / s.ms);
      placeWalker(from[0] + (s.to[0] - from[0]) * t, from[1] + (s.to[1] - from[1]) * t);
      follow();
      if (t >= 1) {
        n++;
        if (n >= list.length) { walkRaf = 0; done(); return; }
        from = s.to.slice();
        start = now;
        wFace(list[n].dir);
      }
      walkRaf = requestAnimationFrame(step);
    });
  }

  function startDelivery() {
    meHit.hidden = true;
    say('');
    meG.style.display = 'none';
    buildScene();
    if (reduced) {
      var rest = docPoint(restSpot());
      spawnWalker(rest[0], rest[1]);
      wMe.classList.add('courier');
      wMe.querySelectorAll('.me-box').forEach(function (b) { b.style.display = 'none'; });
      scene.classList.add('done', 'lit');
      [0, 1, 2].forEach(lightPendant);
      delivered();
      jumpTo(document.getElementById('cierre'));
      return;
    }
    var k = scale(), rr = room.getBoundingClientRect(), m = main.getBoundingClientRect();
    var lane = rr.left - m.left + 34 * k;
    var startY = rr.bottom - m.top - 16 * k;
    var drop = docPoint(deliverSpot());
    var corner = [lane, drop[1] + Math.abs(drop[0] - lane) / 2];
    var stopY = roomActions.getBoundingClientRect().bottom - m.top + 130 * Math.min(k, 1.2);
    if (stopY > corner[1] - 40) stopY = startY + (corner[1] - startY) * .35;
    var first = [];
    if (wMe && !walker.hidden) {
      if (walkRaf) cancelAnimationFrame(walkRaf);
      walkRaf = 0;
      sizeWalker();
      if (Math.abs(wPos[0] - lane) > 2) first.push({ to: [lane, wPos[1]], ms: walkMs(wPos[0] - lane), dir: wPos[0] > lane ? 'fl' : 'fr' });
      startY = wPos[1];
      if (stopY < startY + 40) stopY = startY + 40;
    } else {
      spawnWalker(lane, startY);
    }
    waiting = false;
    first.push({ to: [lane, stopY], ms: Math.max(700, Math.min(1500, (stopY - startY) / .26)), dir: 'fr' });
    wMe.classList.add('walking');
    following = true;
    runSegments(first, function () {
      wMe.classList.remove('walking');
      suitUp(function () {
        wMe.classList.add('walking');
        pulseSeg('s3', 2800);
        runSegments([
          { to: corner, ms: Math.max(1100, Math.min(2400, (corner[1] - stopY) / .26)), dir: 'fr' },
          { to: drop, ms: 900, dir: drop[0] >= lane ? 'br' : 'bl' }
        ], putDown);
      });
    });
  }

  var courierTag = document.createElement('p');
  courierTag.className = 'courier-tag';
  courierTag.hidden = true;
  courierTag.setAttribute('aria-hidden', 'true');
  courierTag.textContent = 'Modo repartidor activado';
  main.appendChild(courierTag);

  function suitUp(done) {
    wFace('fr');
    wMe.classList.add('changing');
    later(function () { wMe.classList.add('courier'); }, 260);
    later(function () {
      wMe.classList.remove('changing');
      var k = scale();
      courierTag.style.left = (wPos[0] - 20 * k) + 'px';
      courierTag.style.top = (wPos[1] - 62 * k) + 'px';
      courierTag.hidden = false;
      deliveryStatus.textContent = courierTag.textContent;
    }, 600);
    later(function () { courierTag.hidden = true; done(); }, 2100);
  }

  function putDown() {
    wMe.classList.remove('walking');
    wFace('fr');
    wMe.classList.add('deliver');
    later(function () {
      wMe.querySelectorAll('.me-box').forEach(function (b) { b.style.display = 'none'; });
      scene.classList.add('done');
    }, 380);
    [0, 1, 2].forEach(function (n) { later(function () { lightPendant(n); }, 560 + n * 230); });
    later(function () { scene.classList.add('lit'); }, 1250);
    later(function () {
      wMe.classList.remove('deliver');
      wMe.classList.add('walking');
      runSegments([{ to: docPoint(restSpot()), ms: 450, dir: 'fr' }], function () {
        wMe.classList.remove('walking');
        delivered();
      });
    }, 1650);
  }

  function delivered() {
    following = false;
    handed = true;
    var before = art.getBoundingClientRect().top;
    ending.hidden = false;
    var shift = art.getBoundingClientRect().top - before;
    if (shift && !reduced) jump(window.scrollY + shift);
    var rest = docPoint(restSpot());
    placeWalker(rest[0], rest[1]);
    finaleTitle.hidden = false;
    if (!reduced) finaleTitle.classList.add('finale-in');
    gift.hidden = false;
    armPulse();
    deliveryStatus.textContent = finaleTitle.textContent;
    giftBtn.focus({ preventScroll: true });
    if (reduced) {
      atButton = true;
      var spot = buttonSpot();
      placeWalker(spot[0], spot[1]);
      return;
    }
    later(dance, 700);
  }

  var danced = false, atButton = false, SPINS = 10;

  function buttonSpot() {
    var r = giftBtn.getBoundingClientRect(), m = main.getBoundingClientRect(), k = scale();
    return [r.left - m.left - 24 * k, r.bottom - m.top];
  }

  function hop(to, ms, peak, done) {
    var from = wPos.slice(), start = performance.now();
    walkRaf = requestAnimationFrame(function step(now) {
      var t = Math.min(1, (now - start) / ms);
      placeWalker(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - peak * 4 * t * (1 - t));
      if (t < 1) { walkRaf = requestAnimationFrame(step); return; }
      walkRaf = 0;
      done();
    });
  }

  function spin(done) {
    var order = ['fr', 'br', 'bl', 'fl'], steps = SPINS * order.length, n = 0;
    wMe.classList.add('spinning');
    (function next() {
      if (!wMe) return;
      wFace(order[n % order.length]);
      n++;
      if (n > steps) {
        wMe.classList.remove('spinning');
        wFace('fr');
        done();
        return;
      }
      later(next, 90);
    })();
  }

  function dance() {
    if (danced || !wMe) return;
    danced = true;
    var k = scale();
    hop(docPoint(dpt(.4, 1.3, 34)), 520, 28 * k, function () {
      spin(function () {
        hop(docPoint(restSpot()), 480, 18 * k, function () {
          var lane = laneDoc() - mainOrigin()[0], end = buttonSpot(), p = wPos.slice();
          wMe.classList.add('walking');
          following = true;
          runSegments([
            { to: [lane, p[1]], ms: walkMs(p[0] - lane), dir: 'fl' },
            { to: [lane, end[1]], ms: walkMs(end[1] - p[1]), dir: 'fr' },
            { to: end, ms: walkMs(end[0] - lane), dir: 'fr' }
          ], function () {
            following = false;
            wMe.classList.remove('walking');
            wFace('fr');
            atButton = true;
          });
        });
      });
    });
  }

  var gift = document.getElementById('gift');
  var giftBtn = document.getElementById('gift-btn');

  function armPulse() {
    if (!reduced) giftBtn.classList.add('pulse');
  }

  function resetGift() {
    gift.hidden = true;
    giftBtn.classList.remove('pulse');
  }

  var refs = document.getElementById('referencias');
  giftBtn.addEventListener('click', function () {
    giftBtn.classList.remove('pulse');
    if (refs) refs.hidden = false;
  });

  function leave() {
    if (leaving) return;
    leaving = true;
    room.classList.add('glow');
    if (cableOn) showSeg('s2');
    continueBtn.hidden = true;
    guitar.classList.remove('on');
    laptop.classList.remove('on');
    go([0, 0], 'bl', function () {
      door.classList.add('open');
      if (reduced) {
        exited();
        return;
      }
      var start = performance.now();
      meG.classList.add('walking', 'gone');
      outRaf = requestAnimationFrame(function out(now) {
        var t = Math.min(1, (now - start) / 600);
        draw(.05 * t, -.8 * t);
        if (t < 1) outRaf = requestAnimationFrame(out);
        else { outRaf = 0; meG.classList.remove('walking'); exited(); }
      });
    });
  }

  var isOut = false;

  function exited() {
    isOut = true;
    meHit.hidden = true;
    meG.style.display = 'none';
    say('');
    var inside = room.contains(document.activeElement) || document.activeElement === document.body;
    continueBtn.hidden = false;
    if (inside) continueBtn.focus({ preventScroll: true });
    if (!reduced) walkToContinue();
  }

  var waiting = false;

  function continueSpot() {
    var r = continueBtn.getBoundingClientRect(), m = main.getBoundingClientRect(), k = scale();
    var lane = laneDoc() - mainOrigin()[0];
    return [Math.max(lane, r.left - m.left - 24 * k), r.bottom - m.top];
  }

  function walkToContinue() {
    var k = scale(), m = main.getBoundingClientRect(), R = room.getBoundingClientRect();
    var lane = laneDoc() - mainOrigin()[0], Rt = R.top - m.top, Rl = R.left - m.left;
    var end = continueSpot(), list = [], start, y;
    if (lane < Rl) {
      y = Rt + R.height * .35;
      start = [Rl + 30 * k, y];
      list.push({ to: [lane, y], ms: walkMs(start[0] - lane), dir: 'fl' });
    } else {
      y = Rt + 66 * k;
      start = [lane, y];
    }
    list.push({ to: [lane, end[1]], ms: walkMs(end[1] - y), dir: 'fr' });
    if (end[0] - lane > 2) list.push({ to: end, ms: walkMs(end[0] - lane), dir: 'fr' });
    spawnWalker(start[0], start[1]);
    wMe.classList.add('walking');
    following = true;
    runSegments(list, function () {
      following = false;
      wMe.classList.remove('walking');
      wFace('fr');
      waiting = true;
    });
  }

  continueBtn.addEventListener('click', function () {
    if (!isOut) return;
    isOut = false;
    continueBtn.hidden = true;
    setStage('open');
    buildScene();
    layoutCable();
    if (cableOn) showSeg('s3');
    requestAnimationFrame(startDelivery);
  });


  var coverLamp = document.getElementById('lamp');
  var video = document.querySelector('.video-frame video');
  var frame = video ? video.parentNode : null;
  var bridgeBtn = document.querySelector('.btn-search');
  var bridgeNext = document.getElementById('bridge-next');
  var cable = make('svg', { class: 'cable', 'aria-hidden': 'true', focusable: 'false' });
  document.body.insertBefore(cable, document.body.firstChild);
  var SEGS = {};
  ['s1', 's2', 's3'].forEach(function (n) {
    var g = make('g', { class: 'cable-seg' }, cable);
    SEGS[n] = {
      g: g,
      line: make('path', { class: 'cable-line', fill: 'none' }, g),
      pulse: make('path', { class: 'cable-pulse', fill: 'none' }, g),
      dots: make('g', { class: 'cable-dots' }, g),
      len: 0,
      shown: false
    };
  });
  var cableOn = false, videoDone = false, parked = false, entering = false, layoutQueued = false;

  function docBox(el) {
    var r = el.getBoundingClientRect();
    return { l: r.left + window.scrollX, t: r.top + window.scrollY, r: r.right + window.scrollX, b: r.bottom + window.scrollY, w: r.width, h: r.height };
  }
  function mainOrigin() { var m = docBox(main); return [m.l, m.t]; }
  function laneDoc() {
    var b = docBox(document.getElementById('videos'));
    return window.innerWidth < 720 ? b.l + 20 : b.l - 30;
  }
  function exitLaneDoc() { return docBox(room).l + 34 * scale(); }

  function segPoints(n) {
    var lane = laneDoc(), L = docBox(coverLamp), V = docBox(frame), R = docBox(room);
    if (n === 's1') {
      var y1 = L.t + L.h * .34, y2 = V.t + 30;
      return [[L.l + L.w * .1, y1], [lane, y1], [lane, y2], [V.l, y2]];
    }
    if (n === 's2') {
      var y3 = V.b - 24;
      if (lane < R.l) {
        var y4 = R.t + R.h * .35;
        return [[V.l, y3], [lane, y3], [lane, y4], [R.l, y4]];
      }
      return [[V.l, y3], [lane, y3], [lane, R.t]];
    }
    var o = mainOrigin(), x3 = exitLaneDoc();
    if (!SW || document.getElementById('cierre').hidden) return [[x3, R.b], [x3, R.b]];
    var drop = docPoint(deliverSpot()), foot = docPoint(dpt(.8, 0, 0));
    drop = [drop[0] + o[0], drop[1] + o[1]];
    foot = [foot[0] + o[0], foot[1] + o[1]];
    var cy = drop[1] + Math.abs(drop[0] - x3) / 2;
    return [[x3, R.b], [x3, cy], [foot[0] - 6, cy - (foot[0] - 6 - x3) / 2]];
  }

  function polyLen(p) {
    var s = 0;
    for (var i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return s;
  }

  function drawSeg(n) {
    var s = SEGS[n], p = segPoints(n);
    var d = 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L');
    s.line.setAttribute('d', d);
    s.pulse.setAttribute('d', d);
    s.len = polyLen(p);
    while (s.dots.firstChild) s.dots.removeChild(s.dots.firstChild);
    var step = 90, acc = 0, next = 45;
    for (var i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (next <= acc + l) {
        var t = (next - acc) / l;
        make('circle', { class: 'cable-dot', cx: (a[0] + (b[0] - a[0]) * t).toFixed(1), cy: (a[1] + (b[1] - a[1]) * t).toFixed(1), r: 3.2 }, s.dots);
        next += step;
      }
      acc += l;
    }
  }

  function layoutCable() {
    layoutQueued = false;
    if (!frame) return;
    cable.style.height = '0px';
    var h = document.documentElement.scrollHeight, w = document.documentElement.clientWidth;
    cable.style.width = w + 'px';
    cable.style.height = h + 'px';
    cable.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    Object.keys(SEGS).forEach(drawSeg);
    if (parked && !entering) { var ps = parkSpot(); placeWalker(ps[0], ps[1]); }
  }
  function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(layoutCable);
  }

  function showSeg(n) {
    var s = SEGS[n];
    if (s.shown) return;
    s.shown = true;
    drawSeg(n);
    s.g.classList.add('shown', 'on');
    if (reduced || !s.line.animate) return;
    s.line.animate([{ strokeDasharray: s.len + ' ' + s.len, strokeDashoffset: s.len }, { strokeDasharray: s.len + ' ' + s.len, strokeDashoffset: 0 }], { duration: 1200, easing: 'ease-out' });
  }
  function pulseSeg(n, ms, delay) {
    var s = SEGS[n];
    if (reduced || !s.pulse.animate || !s.len) return;
    s.pulse.animate([
      { strokeDasharray: '36 ' + (s.len + 40), strokeDashoffset: 36, opacity: 0 },
      { opacity: 1, offset: .15 },
      { opacity: 1, offset: .85 },
      { strokeDasharray: '36 ' + (s.len + 40), strokeDashoffset: -s.len, opacity: 0 }
    ], { duration: ms, delay: delay || 0, easing: 'ease-in-out' });
  }
  function hideSegs() {
    Object.keys(SEGS).forEach(function (n) {
      var s = SEGS[n];
      s.shown = false;
      s.g.classList.remove('shown', 'on');
      s.line.getAnimations && s.line.getAnimations().forEach(function (a) { a.cancel(); });
      s.pulse.getAnimations && s.pulse.getAnimations().forEach(function (a) { a.cancel(); });
    });
  }

  function pristine() { return !lit && !leaving && !revealing && !busy && !seg && tries === 3 && !entering; }

  function parkSpot() {
    var V = frame.getBoundingClientRect(), m = main.getBoundingClientRect(), k = scale();
    return [Math.max(V.left - m.left - 26 * k, 14 * k), V.bottom - m.top];
  }

  function park() {
    parked = true;
    meG.style.display = 'none';
    meHit.hidden = true;
    var p = parkSpot();
    spawnWalker(p[0], p[1]);
    walker.classList.add('parked');
  }

  function clearWalker() {
    walker.hidden = true;
    walker.classList.remove('parked');
    while (wsvg.firstChild) wsvg.removeChild(wsvg.firstChild);
    wMe = null;
  }

  function unpark() {
    if (!parked || entering) return;
    parked = false;
    clearWalker();
    meG.style.display = '';
    meHit.hidden = false;
  }

  function completeVideo() {
    if (videoDone || !cableOn) return;
    videoDone = true;
    paintBridge();
    frame.classList.add('done');
    bridgeBtn.classList.add('glow');
    bridgeNext.hidden = false;
    showSeg('s2');
    if (pristine()) park();
  }

  if (video) {
    var lastT = 0;
    video.addEventListener('timeupdate', function () {
      var d = video.duration, t = video.currentTime;
      if (d && (t >= d - .35 || (lastT > d - 1.5 && t < lastT - 1))) completeVideo();
      lastT = t;
    });
    video.addEventListener('ended', completeVideo);
  }

  function walkMs(dist) { return Math.max(500, Math.min(2600, Math.abs(dist) / .3)); }

  function walkInDoor() {
    door.classList.add('open');
    pos = [0, 0];
    face('fr');
    depth(pos);
    meG.style.display = '';
    meG.classList.add('walking');
    var start = performance.now();
    outRaf = requestAnimationFrame(function inn(now) {
      var t = Math.min(1, (now - start) / 500);
      draw(.05 * (1 - t), -.8 * (1 - t));
      if (t < 1) { outRaf = requestAnimationFrame(inn); return; }
      outRaf = 0;
      meG.classList.remove('walking');
      go([2, 3], 'fr', function () {
        door.classList.remove('open');
        meHit.hidden = false;
        busy = false;
        entering = false;
      });
    });
  }

  function enterRoom() {
    if (!parked || entering) return;
    entering = true;
    walker.classList.remove('parked');
    busy = true;
    var k = scale(), m = main.getBoundingClientRect(), R = room.getBoundingClientRect();
    var lane = laneDoc() - mainOrigin()[0], p0 = wPos.slice(), list = [];
    var Rt = R.top - m.top, Rl = R.left - m.left;
    if (Math.abs(p0[0] - lane) > 2) list.push({ to: [lane, p0[1]], ms: walkMs(p0[0] - lane), dir: 'fl' });
    if (lane < Rl) {
      var y = Rt + R.height * .35;
      list.push({ to: [lane, y], ms: walkMs(y - p0[1]), dir: 'fr' });
      list.push({ to: [Rl + 30 * k, y], ms: walkMs(Rl + 30 * k - lane), dir: 'fr' });
    } else {
      var y2 = Rt + 66 * k;
      list.push({ to: [lane, y2], ms: walkMs(y2 - p0[1]), dir: 'fr' });
    }
    var total = list.reduce(function (a, s) { return a + s.ms; }, 0);
    pulseSeg('s2', total);
    wMe.classList.add('walking');
    following = true;
    runSegments(list, function () {
      following = false;
      parked = false;
      clearWalker();
      walkInDoor();
    });
  }

  var stage = 'none';
  var cierre = document.getElementById('cierre');
  var roomActions = document.querySelector('.room-actions');
  var lowerParts = ['juego', 'cierre', 'referencias'].map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function clampGate() {
    var el = stage === 'bridge' ? bridgeBtn : stage === 'game' ? roomActions : null;
    if (!el) return;
    var limit = Math.max(0, el.getBoundingClientRect().bottom + window.scrollY + 32 - window.innerHeight);
    if (window.scrollY > limit) jump(limit);
  }

  function setStage(s) {
    stage = s;
    var locked = s === 'bridge' ? ['juego', 'cierre', 'referencias'] : s === 'game' ? ['cierre', 'referencias'] : [];
    lowerParts.forEach(function (el) { el.toggleAttribute('inert', locked.indexOf(el.id) !== -1); });
    cierre.hidden = s !== 'open';
    paintBridge();
    clampGate();
    queueLayout();
  }

  setStage('none');
  window.addEventListener('scroll', clampGate, { passive: true });
  window.addEventListener('resize', clampGate);

  function bridgeOpen() { return videoDone || !video || !!video.error || frame.classList.contains('missing'); }

  function paintBridge() {
    if (!bridgeBtn) return;
    var open = bridgeOpen();
    bridgeBtn.setAttribute('aria-disabled', open ? 'false' : 'true');
    bridgeBtn.classList.toggle('locked', !open);
    bridgeBtn.classList.toggle('blink', open && stage === 'bridge' && !reduced);
  }

  if (video) video.addEventListener('error', paintBridge);

  if (bridgeBtn) bridgeBtn.addEventListener('click', function (e) {
    if (!bridgeOpen()) { e.preventDefault(); return; }
    if (stage === 'bridge') setStage('game');
    if (!parked && !entering) return;
    e.preventDefault();
    if (entering) return;
    if (reduced) {
      unpark();
      jumpTo(document.getElementById('juego'));
      return;
    }
    enterRoom();
  });

  room.addEventListener('click', function () {
    if (parked && !entering) unpark();
    if (cableOn) showSeg('s2');
  }, true);

  walker.addEventListener('click', function () {
    if (!parked || entering) return;
    if (stage === 'bridge') setStage('game');
    if (reduced) {
      unpark();
      jumpTo(document.getElementById('juego'));
      return;
    }
    enterRoom();
  });

  function lightOn() {
    cableOn = true;
    queueLayout();
    if (bridgeBtn) setStage('bridge');
    if (frame) frame.classList.add('ready');
    later(function () {
      showSeg('s1');
      pulseSeg('s1', 1400, 900);
    }, reduced ? 0 : 500);
  }

  function lightOff() {
    restart();
    cableOn = false;
    if (bridgeBtn) setStage('none');
    videoDone = false;
    parked = false;
    entering = false;
    hideSegs();
    if (frame) frame.classList.remove('ready', 'done');
    if (bridgeBtn) bridgeBtn.classList.remove('glow');
    paintBridge();
    bridgeNext.hidden = true;
    if (video) { video.pause(); try { video.currentTime = 0; } catch (e) {} }
  }

  document.addEventListener('foton:light', function (e) { if (e.detail) lightOn(); else lightOff(); });
  if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(document.body);


  var boxes = [], HIT = 46;
  var label = document.getElementById('room-label');
  var labelTimer = 0, labelFor = null;

  function nameOf(b) { return b.getAttribute('data-obj') === 'yo' ? 'Manuel' : b.getAttribute('aria-label'); }

  function showLabel(b) {
    clearTimeout(labelTimer);
    labelFor = b;
    label.textContent = nameOf(b);
    label.hidden = false;
    var r = b.getBoundingClientRect(), R = room.getBoundingClientRect();
    var lw = label.offsetWidth, lh = label.offsetHeight;
    var x = Math.max(4, Math.min(R.width - lw - 4, r.left - R.left + r.width / 2 - lw / 2));
    var y = r.top - R.top - lh - 4;
    if (y < 4) y = r.bottom - R.top + 4;
    label.style.left = x + 'px';
    label.style.top = y + 'px';
  }

  function hideLabel(b) {
    if (b && b !== labelFor) return;
    clearTimeout(labelTimer);
    labelFor = null;
    label.hidden = true;
  }

  function markPicked(b) {
    if (!b) return;
    b.classList.remove('picked');
    void b.offsetWidth;
    b.classList.add('picked');
    later(function () { b.classList.remove('picked'); }, 700);
    showLabel(b);
    labelTimer = setTimeout(function () { hideLabel(b); }, 1300);
  }

  room.querySelectorAll('.room-hit').forEach(function (b) {
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') showLabel(b); });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hideLabel(b); });
    b.addEventListener('focus', function () { if (b.matches(':focus-visible')) showLabel(b); });
    b.addEventListener('blur', function () { hideLabel(b); });
  });
  room.querySelectorAll('.room-hit').forEach(function (b) {
    var key = b.getAttribute('data-obj');
    if (key === 'yo') {
      b.style.width = (48 / VW * 100) + '%';
      b.style.height = (54 / VH * 100) + '%';
      b.addEventListener('click', function () {
        if (leaving || revealing || busy) return;
        markPicked(b);
        busy = true;
        go(seg ? seg.b : pos, 'fr', function () {
          busy = false;
          reveal();
        });
      });
      return;
    }
    var bb = OBJECTS[key].hit.getBBox();
    var w = Math.max(bb.width + 8, HIT), h = Math.max(bb.height + 8, HIT);
    var cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    boxes.push({ b: b, cx: cx, cy: cy, x: cx - w / 2, y: cy - h / 2, w: w, h: h });
    b.addEventListener('click', function () { pick(key); });
  });

  function clash(p, q) {
    return Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > .01 && Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > .01;
  }

  function split(p, q) {
    if (!clash(p, q)) return;
    if (p.fixed || q.fixed) {
      var f = p.fixed ? p : q, o = f === p ? q : p;
      var cut = [
        { k: 'x', v: f.x + f.w - o.x },
        { k: 'w', v: o.x + o.w - f.x },
        { k: 'y', v: f.y + f.h - o.y },
        { k: 'h', v: o.y + o.h - f.y }
      ].filter(function (c) { return c.v > 0; }).sort(function (a, b) { return a.v - b.v; })[0];
      if (cut.k === 'x') { o.x += cut.v; o.w -= cut.v; }
      else if (cut.k === 'y') { o.y += cut.v; o.h -= cut.v; }
      else o[cut.k] -= cut.v;
      return;
    }
    var dx = Math.abs(p.cx - q.cx) / (p.w + q.w), dy = Math.abs(p.cy - q.cy) / (p.h + q.h);
    var horiz = dx >= dy, a, z, m;
    if (horiz) {
      a = p.cx <= q.cx ? p : q; z = a === p ? q : p;
      m = Math.max(Math.max(a.x, z.x), Math.min((a.cx + z.cx) / 2, Math.min(a.x + a.w, z.x + z.w)));
      a.w = m - a.x; z.w = z.x + z.w - m; z.x = m;
    } else {
      a = p.cy <= q.cy ? p : q; z = a === p ? q : p;
      m = Math.max(Math.max(a.y, z.y), Math.min((a.cy + z.cy) / 2, Math.min(a.y + a.h, z.y + z.h)));
      a.h = m - a.y; z.h = z.y + z.h - m; z.y = m;
    }
  }

  function fits(p, list) {
    if (p.x < 0 || p.y < 0 || p.x + p.w > VW || p.y + p.h > VH) return false;
    return list.every(function (q) { return q === p.ref || !clash(p, q); });
  }

  function regrow(p) {
    ['w', 'h'].forEach(function (dim) {
      var need = HIT - p[dim];
      if (need <= 0) return;
      var pos = dim === 'w' ? 'x' : 'y';
      [need, need * .75, need / 2, need / 4].some(function (d) {
        return [[-d, d], [0, d], [-d / 2, d]].some(function (mv) {
          var t = { x: p.x, y: p.y, w: p.w, h: p.h, ref: p };
          t[pos] += mv[0];
          t[dim] += mv[1];
          if (!fits(t, boxes)) {
            var moved = [];
            var ok = boxes.every(function (q) {
              if (q === p || !clash(t, q)) return true;
              if (q.fixed) return false;
              var lo = t[pos] + t[dim] - q[pos], hi = q[pos] + q[dim] - t[pos];
              var shift = q[pos] + q[dim] / 2 < t[pos] + t[dim] / 2 ? -hi : lo;
              var s = { x: q.x, y: q.y, w: q.w, h: q.h, ref: q };
              s[pos] += shift;
              var c = pos === 'x' ? q.cx : q.cy;
              if (c < s[pos] + 12 || c > s[pos] + s[dim] - 12) return false;
              moved.push([q, s]);
              return true;
            });
            if (!ok) return false;
            var others = boxes.map(function (q) { var m = moved.filter(function (e) { return e[0] === q; })[0]; return m ? m[1] : q === p ? t : q; });
            if (!moved.every(function (e) { return fits(e[1], others.map(function (o) { return o === e[1] ? e[0] : o; })) && !clash(e[1], t); })) return false;
            moved.forEach(function (e) { e[0][pos] = e[1][pos]; });
          }
          p[pos] = t[pos];
          p[dim] = t[dim];
          return true;
        });
      });
    });
  }

  var start = pt(2.5, 3.5);
  boxes.push({ fixed: true, x: start[0] - 24, y: start[1] - 50, w: 48, h: 54 });
  for (var pass = 0; pass < 3; pass++) {
    boxes.forEach(function (p, n) { boxes.slice(n + 1).forEach(function (q) { split(p, q); }); });
    boxes.forEach(function (p) { if (!p.fixed) regrow(p); });
  }
  boxes.forEach(function (p) {
    if (p.fixed) return;
    p.b.style.left = (p.x / VW * 100) + '%';
    p.b.style.top = (p.y / VH * 100) + '%';
    p.b.style.width = (p.w / VW * 100) + '%';
    p.b.style.height = (p.h / VH * 100) + '%';
  });

  function restart() {
    timers.forEach(clearTimeout);
    timers = [];
    if (raf) cancelAnimationFrame(raf);
    if (outRaf) cancelAnimationFrame(outRaf);
    if (walkRaf) cancelAnimationFrame(walkRaf);
    raf = outRaf = walkRaf = 0;
    following = handed = false;
    walker.hidden = true;
    walker.classList.remove('parked');
    while (wsvg.firstChild) wsvg.removeChild(wsvg.firstChild);
    wMe = null;
    scene.classList.remove('done', 'lit');
    lightsOn = 0;
    art.querySelectorAll('.pendant').forEach(function (p) { p.classList.remove('on'); });
    room.classList.remove('glow');
    SEGS.s3.shown = false;
    SEGS.s3.g.classList.remove('shown', 'on');
    entering = false;
    if (parked) { parked = false; }
    deliveryStatus.textContent = '';
    courierTag.hidden = true;
    danced = atButton = waiting = false;
    continueBtn.hidden = true;
    isOut = false;
    if (stage === 'open') setStage('game');
    seg = goal = pending = null;
    lastDir = '';
    lit = leaving = revealing = busy = false;
    room.classList.remove('lit');
    [chand, fan, iron, lamp, guitar, laptop, strip, charger, gameConsole].forEach(function (g) { g.classList.remove('on'); });
    door.classList.remove('shake', 'open');
    meG.classList.remove('walking', 'inspect', 'surprise', 'burst', 'gone', 'pointing');
    rejected = {};
    setTries(3);
    resetGift();
    finaleTitle.hidden = true;
    finaleTitle.classList.remove('finale-in');
    hint.textContent = '';
    hideLabel();
    meG.style.display = '';
    meHit.hidden = false;
    ending.hidden = true;
    say('');
    pos = [2, 3];
    face('fr');
    draw(pos[0], pos[1]);
    depth(pos);
  }

  document.getElementById('room-restart').addEventListener('click', restart);
  window.addEventListener('resize', function () {
    if (bubble.textContent) say(bubble.textContent);
    buildScene();
    queueLayout();
    if (wMe && waiting) {
      sizeWalker();
      var cs = continueSpot();
      placeWalker(cs[0], cs[1]);
    }
    if (wMe && handed && (atButton || !danced)) {
      sizeWalker();
      var rest = atButton ? buttonSpot() : docPoint(restSpot());
      placeWalker(rest[0], rest[1]);
    }
  });

  buildScene();

  face('fr');
  draw(pos[0], pos[1]);
  depth(pos);
})();
