/* ============================================================
   LumiLearn — prototype interaction layer
   Renders the Lumi companion, drives navigation, learning
   interactions, theme + reading preferences.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Authored line-icon family ─────────────────────────── */
  var ICONS = {
    home: '<path d="M4 10.5 12 3.5l8 7"/><path d="M6 9.5V20h12V9.5"/>',
    book: '<path d="M4 6a2 2 0 0 1 2-2h12v16H6a2 2 0 0 1-2-2Z"/><path d="M8 4v16"/>',
    chart: '<path d="M4 20V9"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M22 20H2"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/>',
    speaker: '<path d="M11 5 6.5 9H4v6h2.5L11 19Z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    'arrow-right': '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H5"/><path d="m11 18-6-6 6-6"/>',
    play: '<path d="M7 4.5v15l12-7.5Z"/>',
    pause: '<path d="M8 5v14"/><path d="M16 5v14"/>',
    replay: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/>',
    star: '<path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.5 6.6 20.4l1-6.1L3.2 10l6.1-.9Z"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 3.6 10.8c-.6.5-1 1.2-1 2V18h-5.2v-2.2c0-.8-.4-1.5-1-2A6 6 0 0 1 12 3Z"/>',
    heart: '<path d="M12 20.5S4 15.6 4 9.9A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.9c0 5.7-8 10.6-8 10.6Z"/>',
    headphones: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/>',
    flag: '<path d="M6 3v18"/><path d="M6 4h11l-2.4 4L17 12H6Z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    message: '<path d="M4 5h16v11H8l-4 4Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2.5 20h19Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    puzzle: '<path d="M10 4a2 2 0 1 1 4 0v1h3a1 1 0 0 1 1 1v3h-1a2 2 0 1 1 0 4h1v3a1 1 0 0 1-1 1h-3v-1a2 2 0 1 0-4 0v1H7a1 1 0 0 1-1-1v-3H5a2 2 0 1 1 0-4h1V6a1 1 0 0 1 1-1h3Z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/>',
    car: '<path d="M3 14l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 9l2 5v4h-3"/><path d="M6 18H3v-4"/><circle cx="7" cy="18" r="1.7"/><circle cx="16.5" cy="18" r="1.7"/>',
    fish: '<path d="M2.5 12c2.5-4.5 7.5-6.5 12-4l4.5-2-1 4 1 4-4.5-2c-4.5 2.5-9.5.5-12-4Z"/><circle cx="8.5" cy="10.5" r="1"/>',
    tree: '<path d="M12 3 6 12h4l-4 6h12l-4-6h4Z"/><path d="M12 18v3"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c3 3 3 14 0 17M3.5 12c3-3 14-3 17 0"/>',
    apple: '<path d="M12 7c-1-2-4-2.5-5.5-.5C4.5 9 5 14 8 17c1.5 1.5 3 1 4 0 1 1 2.5 1.5 4 0 3-3 3.5-8 1.5-10.5C16 4.5 13 5 12 7Z"/><path d="M12 7c0-2 1-3.5 3-4"/>'
  };

  function iconSVG(name) {
    var d = ICONS[name];
    if (!d) return '';
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + '</svg>';
  }

  function hydrateIcons(root) {
    $$('[data-ic]', root).forEach(function (el) {
      if (el.getAttribute('data-ic-done')) return;
      el.innerHTML = iconSVG(el.getAttribute('data-ic'));
      el.classList.add('ic-host');
      el.setAttribute('data-ic-done', '');
    });
  }
  hydrateIcons(document);

  var gallery = $('#icon-grid');
  if (gallery) {
    Object.keys(ICONS).forEach(function (name) {
      var cell = document.createElement('div');
      cell.className = 'icon-cell';
      cell.innerHTML = iconSVG(name) + '<span>' + name + '</span>';
      gallery.appendChild(cell);
    });
  }

  /* ── Lumi character — celestial "Starling" (Concept B) ──── */
  var LUMI_CAPTIONS = {
    idle: 'Resting light: a slow float and a soft glow.',
    listening: 'Tilts toward the voice with wide, attentive eyes.',
    thinking: 'Looks up and ponders while the child works, then settles.',
    helping: 'A warm star lifts up — Lumi steps in to guide.',
    encouraging: 'A gentle cheer with happy, closed eyes.',
    celebrating: 'A brief sparkle burst for milestones, then back to calm.'
  };

  function star4path(cx, cy, R, w) {
    return 'M' + cx + ' ' + (cy - R) +
      ' L' + (cx + w) + ' ' + (cy - w) + ' L' + (cx + R) + ' ' + cy +
      ' L' + (cx + w) + ' ' + (cy + w) + ' L' + cx + ' ' + (cy + R) +
      ' L' + (cx - w) + ' ' + (cy + w) + ' L' + (cx - R) + ' ' + cy +
      ' L' + (cx - w) + ' ' + (cy - w) + ' Z';
  }
  function star4(cx, cy, R, w, cls) {
    return '<path class="' + (cls || 'lumi-spark') + '" d="' + star4path(cx, cy, R, w) + '"/>';
  }

  function lumiExpressions(fx, fy) {
    var t = ' transform="translate(' + fx + ',' + fy + ')"';
    return '' +
      '<g class="lumi-exp lumi-exp--idle"' + t + '>' +
        '<circle class="lumi-eye" cx="-11" cy="-2" r="9.5"/><circle class="lumi-eye" cx="11" cy="-2" r="9.5"/>' +
        '<circle class="lumi-pupil" cx="-10" cy="-1" r="4.6"/><circle class="lumi-pupil" cx="12" cy="-1" r="4.6"/>' +
        '<circle class="lumi-glint" cx="-8.4" cy="-3.4" r="1.7"/><circle class="lumi-glint" cx="13.6" cy="-3.4" r="1.7"/>' +
        '<path class="lumi-mouth" d="M-7 12 Q0 18 7 12"/>' +
      '</g>' +
      '<g class="lumi-exp lumi-exp--listening"' + t + '>' +
        '<circle class="lumi-eye" cx="-11" cy="-2" r="10.4"/><circle class="lumi-eye" cx="11" cy="-2" r="10.4"/>' +
        '<circle class="lumi-pupil" cx="-11" cy="-2" r="4.8"/><circle class="lumi-pupil" cx="11" cy="-2" r="4.8"/>' +
        '<circle class="lumi-glint" cx="-9" cy="-4.4" r="1.9"/><circle class="lumi-glint" cx="13" cy="-4.4" r="1.9"/>' +
        '<circle class="lumi-mouth" cx="0" cy="14" r="3.6"/>' +
      '</g>' +
      '<g class="lumi-exp lumi-exp--thinking"' + t + '>' +
        '<path class="lumi-mouth" d="M-19 -4 Q-11 -11 -3 -4"/><path class="lumi-mouth" d="M3 -4 Q11 -11 19 -4"/>' +
        '<path class="lumi-mouth" d="M-5 14 H5"/>' +
      '</g>' +
      '<g class="lumi-exp lumi-exp--helping"' + t + '>' +
        '<circle class="lumi-eye" cx="-11" cy="-2" r="9.5"/><circle class="lumi-eye" cx="11" cy="-2" r="9.5"/>' +
        '<circle class="lumi-pupil" cx="-10" cy="-1" r="4.6"/><circle class="lumi-pupil" cx="12" cy="-1" r="4.6"/>' +
        '<circle class="lumi-glint" cx="-8.4" cy="-3.4" r="1.7"/><circle class="lumi-glint" cx="13.6" cy="-3.4" r="1.7"/>' +
        '<path class="lumi-mouth" d="M-8 11 Q0 20 8 11"/>' +
      '</g>' +
      '<g class="lumi-exp lumi-exp--encouraging"' + t + '>' +
        '<path class="lumi-mouth" d="M-19 -3 Q-11 -11 -3 -3"/><path class="lumi-mouth" d="M3 -3 Q11 -11 19 -3"/>' +
        '<path class="lumi-mouth lumi-mouth--open" d="M-8 11 Q0 21 8 11 Z"/>' +
      '</g>' +
      '<g class="lumi-exp lumi-exp--celebrating"' + t + '>' +
        '<path class="lumi-mouth" d="M-19 -4 Q-11 -12 -3 -4"/><path class="lumi-mouth" d="M3 -4 Q11 -12 19 -4"/>' +
        '<path class="lumi-mouth lumi-mouth--open" d="M-9 10 Q0 23 9 10 Z"/>' +
      '</g>';
  }

  function lumiAccessories(state) {
    if (state === 'thinking') {
      return '<g class="lumi-think"><circle cx="97" cy="30" r="4"/><circle cx="106" cy="20" r="3"/><circle cx="114" cy="12" r="2"/></g>';
    }
    if (state === 'listening') {
      return '<g class="lumi-arcs"><path class="lumi-arc" d="M18 46 A9 9 0 0 0 18 60"/><path class="lumi-arc" d="M11 42 A15 15 0 0 0 11 64"/></g>';
    }
    if (state === 'helping') {
      return '<g class="lumi-helpstar">' + star4(101, 32, 15, 4.5, 'lumi-helpstar-path') + '</g>';
    }
    if (state === 'celebrating') {
      return '<g class="lumi-sparkles">' + star4(20, 30, 11, 3) + star4(102, 26, 13, 3.5) + star4(105, 72, 9, 2.5) + star4(24, 106, 9, 2.5) + '</g>';
    }
    if (state === 'encouraging') {
      return '<g class="lumi-sparkles">' + star4(99, 34, 8, 2.5) + star4(20, 98, 7, 2) + '</g>';
    }
    return '';
  }

  var LUMI_STAR_BODY = 'M60 24 L71.8 51.8 L101.8 54.4 L79 74.2 L85.9 103.6 L60 88 L34.1 103.6 L41 74.2 L18.2 54.4 L48.2 51.8 Z';

  function lumiSVG(state, size) {
    return '<svg class="lumi lumi--' + state + '" viewBox="0 0 120 140" role="img" aria-label="Lumi, your celestial learning companion" style="--lumi-size:' + size + 'px">' +
      '<ellipse class="lumi-shadow" cx="60" cy="130" rx="32" ry="6"/>' +
      '<g class="lumi-glow"><circle cx="60" cy="70" r="56" fill="var(--lum-accent)" opacity=".10"/><circle cx="60" cy="70" r="44" fill="var(--lum-accent)" opacity=".10"/></g>' +
      '<g class="lumi-body">' +
        '<path class="lumi-surface lumi-star-body" d="' + LUMI_STAR_BODY + '"/>' +
        '<path class="lumi-accent-star" d="' + star4path(60, 10, 10, 3) + '"/>' +
        lumiExpressions(60, 64) +
      '</g>' +
      lumiAccessories(state) +
    '</svg>';
  }

  function setLumi(host, state, size) {
    if (!host) return;
    if (!size) size = Number(host.getAttribute('data-size')) || 128;
    host.innerHTML = lumiSVG(state, size);
    host.setAttribute('data-lumi', state);
  }

  $$('[data-lumi]').forEach(function (el) {
    el.classList.add('lumi-host');
    setLumi(el, el.getAttribute('data-lumi') || 'idle', Number(el.getAttribute('data-size')) || 128);
  });

  function setDock(id, state, text) {
    var dock = document.getElementById(id);
    if (!dock) return;
    var mini = $('.dock__mini', dock);
    if (mini) setLumi(mini, state, 72);
    var bubble = $('.dock__bubble', dock);
    if (bubble) bubble.textContent = text;
  }

  function wirePreview(attr, hostSel, captionSel) {
    var host = $(hostSel), cap = $(captionSel);
    if (!host) return;
    var btns = $$('[' + attr + ']');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var state = btn.getAttribute(attr);
        setLumi(host, state, Number(host.getAttribute('data-size')) || 128);
        if (cap) cap.textContent = LUMI_CAPTIONS[state] || '';
        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      });
    });
  }
  wirePreview('data-preview-state', '#lumi-preview', '#lumi-caption');
  wirePreview('data-companion-state', '#companion-preview', '#companion-caption');

  /* ── Theme axes ────────────────────────────────────────── */
  var root = document.documentElement;

  function setTint(v) {
    if (v === 'paper') root.removeAttribute('data-tint'); else root.setAttribute('data-tint', v);
    $$('[data-set-tint]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-tint') === v)); });
  }
  function setContrast(v) {
    if (v === 'standard') root.removeAttribute('data-contrast'); else root.setAttribute('data-contrast', v);
    $$('[data-set-contrast]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-contrast') === v)); });
  }
  $$('[data-set-tint]').forEach(function (b) { b.addEventListener('click', function () { setTint(b.getAttribute('data-set-tint')); }); });
  $$('[data-set-contrast]').forEach(function (b) { b.addEventListener('click', function () { setContrast(b.getAttribute('data-set-contrast')); }); });
  setTint('paper');
  setContrast('standard');

  function wireFont(sel) {
    var s = $(sel);
    if (s) s.addEventListener('change', function () { root.style.setProperty('--font-read', s.value); });
  }
  wireFont('#read-font');
  wireFont('#pref-font');

  var SIZE_MAP = { s: '1.05rem', m: '1.125rem', l: '1.25rem', xl: '1.4rem' };
  function setTextSize(v) {
    root.style.setProperty('--fs-base', SIZE_MAP[v] || SIZE_MAP.m);
    $$('[data-font-size]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-font-size') === v)); });
  }
  $$('[data-font-size]').forEach(function (b) { b.addEventListener('click', function () { setTextSize(b.getAttribute('data-font-size')); }); });

  var LS_MAP = { cozy: '1.6', roomy: '1.75', extra: '1.95' };
  function setLineSpace(v) {
    root.style.setProperty('--lh-read', LS_MAP[v] || LS_MAP.roomy);
    $$('[data-line-space]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-line-space') === v)); });
  }
  $$('[data-line-space]').forEach(function (b) { b.addEventListener('click', function () { setLineSpace(b.getAttribute('data-line-space')); }); });

  /* ── Navigation ────────────────────────────────────────── */
  function showView(v) {
    $$('[data-view-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-view-panel') !== v; });
  }
  function go(view, target) {
    showView(view);
    $$('.navlink').forEach(function (l) { l.removeAttribute('aria-current'); });
    var link = $('.navlink[data-view="' + view + '"][data-target="' + target + '"]');
    if (link) link.setAttribute('aria-current', 'true');
    var el = target && document.getElementById(target);
    if (el) el.scrollIntoView({ block: 'start' }); else window.scrollTo({ top: 0 });
  }
  $$('.navlink').forEach(function (link) {
    link.addEventListener('click', function () { go(link.getAttribute('data-view'), link.getAttribute('data-target')); });
  });
  $$('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () { go(btn.getAttribute('data-goto'), btn.getAttribute('data-target')); });
  });

  /* ── Buddy picking ─────────────────────────────────────── */
  $$('#buddies, #ob-buddies').forEach(function (group) {
    $$('.buddy', group).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.buddy', group).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  });

  /* ── Child onboarding steps ────────────────────────────── */
  var ob = $('#onboard');
  if (ob) {
    var obStep = 1, obTotal = 3;
    function paintOb() {
      $$('[data-ob-step]', ob).forEach(function (p) { p.hidden = Number(p.getAttribute('data-ob-step')) !== obStep; });
      var lbl = $('#onboard-step-label');
      if (lbl) lbl.textContent = 'Step ' + obStep + ' of ' + obTotal;
      $$('#onboard-dots .dot').forEach(function (d, i) {
        d.className = 'dot' + (i < obStep - 1 ? ' is-done' : i === obStep - 1 ? ' is-now' : '');
      });
      $('#onboard-back').disabled = obStep === 1;
      $('#onboard-next-label').textContent = obStep === obTotal ? 'All set' : 'Next';
    }
    $('#onboard-back').addEventListener('click', function () { if (obStep > 1) { obStep--; paintOb(); } });
    $('#onboard-next').addEventListener('click', function () {
      if (obStep < obTotal) { obStep++; paintOb(); }
      else { $('#onboard-next-label').textContent = 'Ready!'; }
    });
    paintOb();
  }

  /* ── Initial screening ─────────────────────────────────── */
  (function () {
    var tiles = $$('#screening-tiles .tile');
    if (!tiles.length) return;
    var next = $('#screening-next');
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        tiles.forEach(function (x) { x.classList.remove('is-selected'); });
        t.classList.add('is-selected');
        var fb = $('#sc-feedback');
        if (fb) fb.textContent = 'Thanks — that helps me learn how you like to read.';
        if (next) next.hidden = false;
        setDock('dock-screening', 'listening', 'Take your time. There is no wrong answer here.');
      });
    });
    if (next) next.addEventListener('click', function () {
      tiles.forEach(function (x) { x.classList.remove('is-selected', 'is-correct', 'is-tryagain'); });
      var fb = $('#sc-feedback');
      if (fb) fb.textContent = '';
      next.hidden = true;
      setDock('dock-screening', 'encouraging', 'You are doing great. Just a few more, then we are done.');
    });
  })();

  /* ── Adaptive learning activity ────────────────────────── */
  (function () {
    var tiles = $$('#tiles .tile');
    if (!tiles.length) return;
    var selected = null;
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        tiles.forEach(function (x) { x.classList.remove('is-selected'); });
        t.classList.add('is-selected');
        selected = t;
        setDock('dock-mission', 'listening', '"' + t.getAttribute('data-word') + '" — got it. Tap Check when you are ready.');
      });
    });
    var check = $('#check-btn');
    if (check) check.addEventListener('click', function () {
      var fb = $('#feedback');
      if (!selected) { if (fb) fb.textContent = 'Pick a word first.'; return; }
      if (selected.getAttribute('data-correct') === 'true') {
        selected.classList.add('is-correct');
        if (fb) fb.textContent = 'Yes! "light" and "' + selected.getAttribute('data-word') + '" rhyme.';
        setDock('dock-mission', 'encouraging', 'You found the rhyme. That was good listening.');
        tiles.forEach(function (x) { x.disabled = true; });
      } else {
        selected.classList.add('is-tryagain');
        if (fb) fb.textContent = 'Not quite — but that is a helpful try. Listen to the ending sound and try again.';
        setDock('dock-mission', 'helping', 'Let us listen to the ends of the words together.');
        selected.classList.remove('is-selected');
        selected = null;
      }
    });
    $$('[data-support]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-support');
        if (k === 'read') setDock('dock-mission', 'listening', 'Which word rhymes with "light"? I will say it again, slowly.');
        else if (k === 'show') { setDock('dock-mission', 'helping', 'Let me show you the ending they share.'); go('screens', 'scr-showme'); }
        else setDock('dock-mission', 'idle', 'That is okay. We will pause here — your place is saved.');
      });
    });
  })();

  /* ── "I don't understand" help flow ────────────────────── */
  (function () {
    var options = $$('#help-options [data-help]');
    if (!options.length) return;
    var map = {
      again: ['listening', 'Lumi reads it again, a little slower, and highlights each word as it is spoken.'],
      show: ['helping', 'Opens the "Show me" explanation: a picture plus a step-by-step you control.'],
      sounds: ['thinking', 'Breaks the word into sounds — n · igh · t — then blends them back together.'],
      simpler: ['helping', 'Swaps in an easier word that ends with the same sound.'],
      break: ['idle', 'Pauses the activity and offers a quiet moment. Nothing is lost.']
    };
    options.forEach(function (b) {
      b.addEventListener('click', function () {
        var pick = map[b.getAttribute('data-help')];
        if (!pick) return;
        var res = $('#help-response');
        if (res) res.textContent = pick[1];
        setDock('dock-help', pick[0], pick[1]);
      });
    });
  })();

  /* ── "Show me" visual explanation ──────────────────────── */
  (function () {
    var scope = $('#scr-showme');
    if (!scope) return;
    var els = $$('.vis-el', scope);
    var caption = $('#vis-caption');
    var count = $('#vis-count');
    var steps = [
      { cap: 'This is the word "light".', on: ['light'] },
      { cap: 'And this is "night".', on: ['night'] },
      { cap: 'They both end with the same sound: "-ight".', on: ['ight'] },
      { cap: 'Words that end the same way rhyme. So "light" rhymes with "night"!', on: ['light', 'night', 'ight'] }
    ];
    var i = 0;
    function paint() {
      els.forEach(function (el) {
        var active = steps[i].on.indexOf(el.getAttribute('data-hl')) !== -1;
        el.classList.toggle('is-on', active);
        el.classList.toggle('is-dim', !active);
      });
      if (caption) caption.textContent = steps[i].cap;
      if (count) count.textContent = (i + 1) + ' of ' + steps.length;
    }
    $('#vis-next').addEventListener('click', function () { i = (i + 1) % steps.length; paint(); });
    $('#vis-prev').addEventListener('click', function () { i = (i - 1 + steps.length) % steps.length; paint(); });
    $('#vis-replay').addEventListener('click', function () { i = 0; paint(); });
    paint();
  })();

  /* ── Parent onboarding ─────────────────────────────────── */
  (function () {
    var form = $('#setup-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var banner = $('#setup-banner');
      if (banner) { banner.hidden = false; banner.scrollIntoView({ block: 'center' }); }
    });
  })();

  /* ── Dialog (replaces native confirm/alert) ────────────── */
  (function () {
    var scrim = $('#dialog-scrim');
    if (!scrim) return;
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      scrim.hidden = false;
      var confirmBtn = $('#dialog-confirm');
      if (confirmBtn) confirmBtn.focus();
    }
    function close() {
      scrim.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$('[data-open-dialog]').forEach(function (b) { b.addEventListener('click', open); });
    $('#dialog-close').addEventListener('click', close);
    $('#dialog-cancel').addEventListener('click', close);
    $('#dialog-confirm').addEventListener('click', close);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !scrim.hidden) close(); });
  })();

  /* ── Reduced-motion preference (manual override) ───────── */
  (function () {
    var toggle = $('#pref-motion');
    if (!toggle) return;
    toggle.addEventListener('change', function () {
      root.setAttribute('data-motion', toggle.checked ? 'reduce' : 'full');
    });
  })();

  /* Default nav highlight */
  var first = $('.navlink[data-view="foundations"][data-target="brand"]');
  if (first) first.setAttribute('aria-current', 'true');
})();
