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
  }

  lamp.addEventListener('click', function () {
    setLight(!body.classList.contains('lit'));
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
    if (v.error || v.networkState === 3) missing();
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
  var sprite = group('', meG);
  var body = group('me-body', sprite);
  var legA = group('leg-a', body);
  rect(-5, -15, 4, 14, 'room-jeans', legA);
  rect(-5.5, -2.5, 5, 2.5, 'room-dark', legA, 1);
  var legB = group('leg-b', body);
  rect(1, -15, 4, 14, 'room-jeans', legB);
  rect(.5, -2.5, 5, 2.5, 'room-dark', legB, 1);
  rect(-7, -31, 14, 17, 'indigo', body, 2);
  rect(-6, -44, 12, 13, 'room-skin', body, 3);
  var meFront = group('', body);
  rect(-6.5, -46, 13, 6, 'room-hair', meFront, 2.5);
  rect(-6.5, -44, 2.5, 6, 'room-hair', meFront, 1, '');
  rect(1, -38.5, 1.6, 2.2, 'room-dark', meFront, 0, '');
  rect(4, -38.5, 1.6, 2.2, 'room-dark', meFront, 0, '');
  rect(-9, -29, 3, 11, 'indigo', meFront, 1.5);
  rect(6, -29, 3, 11, 'indigo', meFront, 1.5).classList.add('arm-r');
  circle([0, -28], 10, 'room-glow', meFront, 'lit-part');
  rect(-2, -26.2, 4, 2.2, 'room-steel', meFront, .5);
  circle([0, -29], 3.6, 'room-glass', meFront);
  circle([0, -29], 3.6, 'light', meFront, 'o lit-part');
  rect(-8, -24, 16, 10, 'room-box', meFront, 1);
  rect(-8, -25.5, 16, 2.4, 'room-box-dark', meFront, 1);
  var point = group('point', meFront);
  make('path', { d: 'M7.5 -28L3 -33', fill: 'none', stroke: 'room-line', 'stroke-width': 4.6, 'stroke-linecap': 'round' }, point);
  make('path', { d: 'M7.5 -28L3 -33', fill: 'none', stroke: 'indigo', 'stroke-width': 3, 'stroke-linecap': 'round' }, point);
  circle([2, -34], 1.8, 'room-skin', point);
  var meBack = group('', body);
  rect(-6.5, -46, 13, 12, 'room-hair', meBack, 3);
  rect(-9.5, -24, 2.5, 8, 'room-box', meBack);
  rect(7, -24, 2.5, 8, 'room-box', meBack);
  rect(-9, -30, 3, 12, 'indigo', meBack, 1.5);
  rect(6, -30, 3, 12, 'indigo', meBack, 1.5);
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
  var revealNote = document.getElementById('room-reveal');
  var finaleTitle = document.getElementById('finale-title');

  function pick(key) {
    if (leaving || revealing || busy) return;
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
      lightUp();
    }, 1400);
  }

  function lightUp() {
    lit = true;
    revealing = true;
    room.classList.add('lit');
    meG.classList.add('burst');
    later(function () { meG.classList.remove('burst', 'pointing'); }, 1100);
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
      lightUp();
    }, 3400);
  }

  function finish() {
    meHit.hidden = true;
    say('');
    ending.hidden = false;
    revealNote.hidden = false;
    finaleTitle.hidden = false;
    if (!reduced) finaleTitle.classList.add('finale-in');
    later(function () {
      document.getElementById('cierre').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
      var contact = document.getElementById('hablamos');
      if (contact) contact.focus({ preventScroll: true });
    }, 3200);
  }

  function leave() {
    if (leaving) return;
    guitar.classList.remove('on');
    laptop.classList.remove('on');
    go([0, 0], 'bl', function () {
      door.classList.add('open');
      if (reduced) {
        meG.style.display = 'none';
        finish();
        return;
      }
      var start = performance.now();
      meG.classList.add('walking', 'gone');
      outRaf = requestAnimationFrame(function out(now) {
        var t = Math.min(1, (now - start) / 700);
        draw(.05 * t, -.8 * t);
        if (t < 1) outRaf = requestAnimationFrame(out);
        else { outRaf = 0; meG.classList.remove('walking'); finish(); }
      });
    });
    leaving = true;
  }

  var boxes = [];
  room.querySelectorAll('.room-hit').forEach(function (b) {
    var key = b.getAttribute('data-obj');
    if (key === 'yo') {
      b.style.width = (48 / VW * 100) + '%';
      b.style.height = (54 / VH * 100) + '%';
      b.addEventListener('click', function () {
        if (leaving || revealing || busy) return;
        busy = true;
        go(seg ? seg.b : pos, 'fr', function () {
          busy = false;
          reveal();
        });
      });
      return;
    }
    var bb = OBJECTS[key].hit.getBBox();
    var w = Math.max(bb.width + 8, 46), h = Math.max(bb.height + 8, 46);
    boxes.push({ b: b, x: bb.x + bb.width / 2 - w / 2, y: bb.y + bb.height / 2 - h / 2, w: w, h: h });
    b.addEventListener('click', function () { pick(key); });
  });
  boxes.forEach(function (p, n) {
    boxes.slice(n + 1).forEach(function (q) {
      var ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      var oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ox <= 0 || oy <= 0) return;
      var a = p, z = q;
      if (ox < oy) {
        if (p.x > q.x) { a = q; z = p; }
        a.w -= ox / 2; z.x += ox / 2; z.w -= ox / 2;
      } else {
        if (p.y > q.y) { a = q; z = p; }
        a.h -= oy / 2; z.y += oy / 2; z.h -= oy / 2;
      }
    });
  });
  boxes.forEach(function (p) {
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
    raf = outRaf = 0;
    seg = goal = pending = null;
    lastDir = '';
    lit = leaving = revealing = busy = false;
    room.classList.remove('lit');
    [chand, fan, iron, lamp, guitar, laptop, strip, charger, gameConsole].forEach(function (g) { g.classList.remove('on'); });
    door.classList.remove('shake', 'open');
    meG.classList.remove('walking', 'inspect', 'surprise', 'burst', 'gone', 'pointing');
    rejected = {};
    setTries(3);
    revealNote.hidden = true;
    finaleTitle.hidden = true;
    finaleTitle.classList.remove('finale-in');
    hint.textContent = '';
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
  window.addEventListener('resize', function () { if (bubble.textContent) say(bubble.textContent); });

  face('fr');
  draw(pos[0], pos[1]);
  depth(pos);
})();
