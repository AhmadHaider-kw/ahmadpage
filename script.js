/* ============================================================
   Ahmad Haidar — Sculptor
   script.js  ·  vanilla, no dependencies
   ============================================================ */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 01 · scroll progress + header behaviour ---------- */
  var hdr = $('#hdr');
  var bar = $('#progress');
  var last = 0, ticking = false;

  var maxScroll = 0;
  function measure() { maxScroll = document.documentElement.scrollHeight - innerHeight; }
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);

  function onScroll() {
    var y = window.scrollY;
    var max = maxScroll;
    bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

    hdr.classList.toggle('stuck', y > 20);
    // hide going down, reveal going up — but never over the hero
    if (y > 260 && y > last + 4) hdr.classList.add('hide');
    else if (y < last - 4 || y < 260) hdr.classList.remove('hide');
    last = y;

    $('#fab').classList.toggle('show', y > innerHeight * 0.6);
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- 02 · menu ---------- */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 03 · hero gradient follows the pointer ---------- */
  var hero = $('.hero');
  if (fine && !reduced && hero) {
    var hx = 50, hy = 30, tx = 50, ty = 30, raf = null;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(drift);
    });
    function drift() {
      hx += (tx - hx) * 0.06;
      hy += (ty - hy) * 0.06;
      hero.style.setProperty('--mx', hx.toFixed(2) + '%');
      hero.style.setProperty('--my', hy.toFixed(2) + '%');
      raf = (Math.abs(tx - hx) > 0.2 || Math.abs(ty - hy) > 0.2)
        ? requestAnimationFrame(drift) : null;
    }
  }

  /* ---------- 04 · scroll reveal ---------- */
  var targets = $$('.rv').filter(function(n){return !n.closest('.hero');});
  if (reduced || !('IntersectionObserver' in window)) {
    $$('.rv').forEach(function (n) { n.classList.add('in'); });
  } else {
    $$('.hero .rv').forEach(function (n, i) {
      setTimeout(function () { n.classList.add('in'); }, 80 + i * 90);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    targets.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 05 · magnetic buttons ---------- */
  if (fine && !reduced) {
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(2) + 'px');
        b.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(2) + 'px');
      });
      b.addEventListener('pointerleave', function () {
        b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ---------- 06 · plates tilt toward the pointer ---------- */
  if (fine && !reduced) {
    $$('.work').forEach(function (w) {
      var p = $('.plate', w);
      w.addEventListener('pointermove', function (e) {
        var r = w.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        p.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        p.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
      });
      w.addEventListener('pointerleave', function () {
        p.style.setProperty('--ry', '0deg'); p.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------- 07 · rails: drag to scroll, progress, active step ---------- */
  $$('.rail').forEach(function (rail) {
    var wrap = rail.closest('.rail-wrap');
    var fill = wrap ? $('.bar i', wrap) : null;
    var steps = $$('.step', rail);

    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      if (fill) {
        var ratio = rail.clientWidth / rail.scrollWidth;
        var pos = max > 0 ? rail.scrollLeft / max : 0;
        fill.style.setProperty('--w', Math.min(1, ratio).toFixed(3));
        fill.style.setProperty('--o', (pos * (1 / Math.max(ratio, .001) - 1) * 100).toFixed(2) + '%');
      }
      if (steps.length) {
        var mid = rail.getBoundingClientRect().left + rail.clientWidth / 2;
        var best = null, bestD = Infinity;
        steps.forEach(function (s) {
          var r = s.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - mid);
          if (d < bestD) { bestD = d; best = s; }
        });
        steps.forEach(function (s) { s.classList.toggle('active', s === best); });
      }
    }
    rail.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();

    // pointer drag, desktop only — touch already scrolls natively
    if (!fine) return;
    var down = false, startX = 0, startL = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startL = rail.scrollLeft;
      rail.classList.add('dragging');
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startL - dx;
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false; rail.classList.remove('dragging');
    });
  });

  /* ---------- 08 · copy the number ---------- */
  var copyBtn = $('#copyTel');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var n = copyBtn.getAttribute('data-tel');
      var done = function () {
        copyBtn.classList.add('show');
        setTimeout(function () { copyBtn.classList.remove('show'); }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(n).then(done, done);
      else done();
    });
  }

  /* ---------- 09b · theme toggle (manual override; automatic stays system-driven) ---------- */
  var themeBtn = $('#themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      if (current !== 'dark' && current !== 'light') {
        current = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- 09a · Arabic webfont, loaded on demand ---------- */
  function loadArabicFont() {
    if (document.getElementById('arFont')) return;
    var l = document.createElement('link');
    l.id = 'arFont'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- 09 · language ---------- */
  var lang = 'en';
  var langBtn = $('#lang'), langLabel = $('#langLabel');

  function paint() {
    if (lang === 'ar') loadArabicFont();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    langLabel.textContent = lang === 'ar' ? 'AR' : 'EN';
    $$('[data-en]').forEach(function (n) {
      var v = n.getAttribute('data-' + lang);
      if (v !== null) n.textContent = v;
    });
    $$('[data-en-html]').forEach(function (n) {
      var v = n.getAttribute('data-' + lang + '-html');
      if (v !== null) n.innerHTML = v;
    });
    $$('[data-en-href]').forEach(function (n) {
      var v = n.getAttribute('data-' + lang + '-href');
      if (v !== null) n.setAttribute('href', v);
    });
    var url = new URL(location);
    lang === 'ar' ? url.searchParams.set('lang', 'ar') : url.searchParams.delete('lang');
    history.replaceState(null, '', url);
  }

  langBtn.addEventListener('click', function () {
    lang = lang === 'en' ? 'ar' : 'en';
    if (reduced) { paint(); return; }
    langBtn.classList.add('flip');
    document.body.classList.add('swapping');
    setTimeout(function () {
      paint();
      document.body.classList.remove('swapping');
      langBtn.classList.remove('flip');
    }, 220);
  });

  if (new URLSearchParams(location.search).get('lang') === 'ar') { lang = 'ar'; paint(); }
})();
