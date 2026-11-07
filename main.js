/* Kopka's Canvas. The page works without this file; it adds the sky, scroll reveals, the video player and the CK-1 jump and run.
   The game reads its levels from the .chapter articles in index.html, so the story has one source. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = t => t * t * (3 - 2 * t);
  const now = () => performance.now();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const root = document.documentElement, body = document.body;

  /* ---------- chapters (single source) ---------- */
  const CH = $$('.chapter').map((el, i) => {
    const img = $('.media img', el);
    return {
      i, el, id: el.id, zone: el.dataset.zone, year: el.dataset.year, name: el.dataset.name,
      title: $('h3', el).textContent.trim(), short: el.dataset.short, skills: (el.dataset.skills || '').split('|').filter(Boolean),
      color: el.style.getPropertyValue('--zc').trim() || '#77a0ea', img: img ? img.getAttribute('src') : null, alt: img ? img.alt : ''
    };
  });

  /* ---------- sound ---------- */
  let AC = null, muted = false;
  try { muted = localStorage.getItem('ck1-muted') === '1'; } catch (e) {}
  const audio = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; };
  function tone(f, d, at = 0, type = 'square', vol = .04, slide) {
    if (muted) return; const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
  }
  function noise(d, at = 0, vol = .06, type = 'highpass', freq = 1200) {
    if (muted) return; const a = audio(); if (!a) return;
    const b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = type; f.frequency.value = freq; g.gain.value = vol;
    s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + at);
  }
  const SFX = {
    power: () => tone(140, .12, 0, 'triangle', .06, 90),
    boot: () => { [523, 659, 784].forEach((f, i) => tone(f, .1, i * .09, 'square', .03)); tone(1568, .55, .3, 'triangle', .05); },
    start: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .07, i * .06, 'square', .03)); },
    jump: () => tone(330, .14, 0, 'square', .028, 760),
    land: () => noise(.06, 0, .05, 'lowpass', 500),
    orb: () => { [988, 1319, 1760].forEach((f, i) => tone(f, .08, i * .05, 'square', .028)); },
    stomp: () => { tone(220, .09, 0, 'square', .04, 90); noise(.08, 0, .05, 'lowpass', 900); },
    hurt: () => { tone(196, .14, 0, 'sawtooth', .03, 98); },
    fall: () => tone(700, .4, 0, 'square', .025, 120),
    flag: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, .1, i * .08, 'square', .03)); tone(1319, .35, .34, 'triangle', .045); },
    open: () => { tone(784, .05); tone(1175, .08, .05); },
    back: () => { tone(880, .05); tone(587, .07, .05); },
    move: () => tone(1250, .03, 0, 'square', .02),
    warp: () => tone(260, .5, 0, 'sawtooth', .025, 1400),
    win: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? .5 : .1, i * .1, 'square', .03)); }
  };
  const soundBtn = $('#sound');
  function paintSound() {
    soundBtn.innerHTML = '<svg viewBox="0 0 10 8" aria-hidden="true"><path fill="currentColor" d="M0 3h2l2-2h1v6H4L2 5H0z"/>' +
      (muted ? '<path fill="currentColor" d="M6 2h1v1H6zM9 2h1v1H9zM7 3h2v2H7zM6 5h1v1H6zM9 5h1v1H9z"/>' : '<path fill="currentColor" d="M6 3h1v2H6zM8 2h1v4H8z"/>') + '</svg>';
    soundBtn.setAttribute('aria-label', muted ? 'Turn game sound on' : 'Mute game sound');
    soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('ck1-muted', muted ? '1' : '0'); } catch (e) {} paintSound(); if (!muted) SFX.move(); });
  paintSound();

  /* ---------- sky: stars + a slow pixel rainbow road ---------- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const sky = $('#sky'), sx = sky.getContext('2d'), SKY_SC = 3;
  let stars = [], roadPts = [], road, rx, mask, checker;
  const ROAD = ['#d9707a', '#df9b69', '#d8c66c', '#7fc07c', '#6f94d8', '#a97fd8'];
  function bez(P, t) {
    const u = 1 - t;
    return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
            u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]];
  }
  function sizeSky() {
    const w = Math.ceil(innerWidth / SKY_SC), h = Math.ceil(innerHeight / SKY_SC);
    if (sky.width === w && sky.height === h) return;
    sky.width = w; sky.height = h;
    stars = Array.from({ length: Math.round(w * h / 260) }, () => ({ x: Math.random() * w | 0, y: Math.random() * h | 0, p: Math.random() * 6.3, s: Math.random() }));
    const P = innerWidth > 960 ? [[-.25, 1.02], [.3, .78], [.62, 1.12], [1.25, .7]] : [[-.3, .5], [.4, .28], [.6, .8], [1.3, .42]];
    for (const p of P) { p[0] *= w; p[1] *= h; }
    roadPts = [];
    for (let i = 0, N = 220; i <= N; i++) {
      const t = i / N, a = bez(P, Math.max(0, t - .002)), b = bez(P, Math.min(1, t + .002)), p = bez(P, t);
      let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      roadPts.push({ x: p[0], y: p[1], nx: -dy, ny: dx, w: h * .024 * (.35 + Math.max(0, p[1] / h) * 1.5) });
    }
    road = document.createElement('canvas'); road.width = w; road.height = h; rx = road.getContext('2d');
    mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const mx = mask.getContext('2d'), md = mx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const f = clamp((y / h - .3) / .55, 0, 1);
      for (let x = 0; x < w; x++) if (f * .7 + .05 > (BAYER[y & 3][x & 3] + .5) / 16) md.data[(y * w + x) * 4 + 3] = 255;
    }
    mx.putImageData(md, 0, 0);
    const c = document.createElement('canvas'); c.width = c.height = 2; const cc = c.getContext('2d'); cc.fillStyle = 'rgba(0,0,0,.3)'; cc.fillRect(0, 0, 1, 1); cc.fillRect(1, 1, 1, 1);
    checker = sx.createPattern(c, 'repeat');
    drawSky(now());
  }
  function drawSky(t) {
    const w = sky.width, h = sky.height;
    sx.fillStyle = '#0d0f0e'; sx.fillRect(0, 0, w, h);
    for (const s of stars) {
      const a = reduce ? .6 : .25 + .75 * Math.abs(Math.sin(t / 1300 * (.4 + s.s) + s.p));
      sx.fillStyle = `rgba(230,235,255,${(a * (.2 + .7 * s.s)).toFixed(2)})`; sx.fillRect(s.x, s.y, 1, 1);
    }
    rx.globalCompositeOperation = 'source-over'; rx.clearRect(0, 0, w, h);
    const phase = reduce ? 0 : t / 160;
    for (let k = 0; k < 6; k++) for (let i = 0; i < roadPts.length - 1; i++) {
      const p = roadPts[i], q = roadPts[i + 1], o1 = (k - 3) * p.w, o2 = (k - 2) * p.w, o3 = (k - 3) * q.w, o4 = (k - 2) * q.w;
      rx.fillStyle = ROAD[k]; rx.beginPath();
      rx.moveTo(p.x + p.nx * o1, p.y + p.ny * o1); rx.lineTo(p.x + p.nx * o2, p.y + p.ny * o2);
      rx.lineTo(q.x + q.nx * o4 + .6, q.y + q.ny * o4 + .6); rx.lineTo(q.x + q.nx * o3 + .6, q.y + q.ny * o3 + .6); rx.closePath(); rx.fill();
      if (((i - phase) % 14 + 14) % 14 < 5) { rx.fillStyle = 'rgba(255,255,255,.12)'; rx.fill(); }
    }
    rx.globalCompositeOperation = 'source-atop'; rx.fillStyle = checker; rx.fillRect(0, 0, w, h);
    rx.globalCompositeOperation = 'destination-in'; rx.drawImage(mask, 0, 0);
    sx.globalAlpha = .75; sx.drawImage(road, 0, 0); sx.globalAlpha = 1;
  }

  /* ---------- page: nav, reveals, videos ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    $$('.rv').forEach(el => {
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
      const k = sibs.indexOf(el);
      if (el.matches('.stat, .tile')) el.style.transitionDelay = (k * 70) + 'ms';
      io.observe(el);
    });
  } else $$('.rv').forEach(el => el.classList.add('in'));

  const player = $('#player'), frameBox = $('#frame');
  function closePlayer() { if (player.open) player.close(); }
  player.addEventListener('close', () => { frameBox.innerHTML = ''; });
  player.addEventListener('click', e => { if (e.target === player) closePlayer(); });
  $('#close').addEventListener('click', closePlayer);
  $$('a.vid[data-yt]').forEach(a => {
    const img = $('img', a);
    const hide = () => { img.style.opacity = '0'; };
    if (img) { img.addEventListener('error', hide); if (img.complete && !img.naturalWidth) hide(); }
    a.addEventListener('click', e => {
      if (typeof player.showModal !== 'function' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const id = a.dataset.yt, st = a.dataset.start;
      const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1${st ? '&start=' + (+st) : ''}`;
      player.classList.toggle('vertical', a.hasAttribute('data-vertical'));
      const title = $('.cap b', a);
      frameBox.innerHTML = `<iframe src="${src}" title="${esc(title ? title.textContent : 'Video')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      player.showModal();
    });
  });

  /* ---------- pixel kit ---------- */
  const W = 160, H = 144, GY = 120, ZW = 320, SC = 3;
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
  function disc(g, cx, cy, r, c) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
  function ring(g, cx, cy, r, c) { g.fillStyle = c; const seen = new Set(); for (let a = 0; a < 360; a += 1.5) { const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r), k = x + ',' + y; if (!seen.has(k)) { seen.add(k); g.fillRect(x, y, 1, 1); } } }
  function line(g, x0, y0, x1, y1, c) { g.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) g.fillRect(Math.round(lerp(x0, x1, i / (n || 1))), Math.round(lerp(y0, y1, i / (n || 1))), 1, 1); }
  function mountain(g, cx, top, hw, col, shade, snow, snowShade, base = 120) {
    for (let x = cx - hw; x <= cx + hw; x++) {
      const y = Math.round(top + Math.abs(x - cx) / hw * (base - top));
      R(g, x > cx ? shade : col, x, y, 1, base - y);
      if (snow) { const sy = Math.round(top + (base - top) * .26 + ((x * 7) % 4)); if (y < sy) R(g, x > cx ? snowShade : snow, x, y, 1, sy - y); }
    }
  }
  function hills(g, w, base, amp, f, seed, col) { for (let x = 0; x < w; x++) { const y = Math.round(base - amp * (.55 + .3 * Math.sin(x * f + seed) + .15 * Math.sin(x * f * 2.7 + seed * 3))); R(g, col, x, y, 1, 120 - y); } }
  function pine(g, x, base, h, dark, light, trunk = '#4a3424') {
    R(g, trunk, x, base - 3, 2, 3);
    for (let r = 0; r < h; r++) { const hw = Math.floor(r * .42) - (r % 4 === 0 && r > 3 ? 1 : 0) + 1; R(g, dark, x + 1 - hw, base - 3 - h + r, hw * 2, 1); R(g, light, x + 1 - hw, base - 3 - h + r, 1, 1); }
  }
  function cloud(g, x, y, s, c, sh) { disc(g, x, y, 4 * s, c); disc(g, x + 6 * s, y - 2 * s, 5 * s, c); disc(g, x + 12 * s, y, 4 * s, c); R(g, c, x, y, 12 * s, 4 * s); if (sh) R(g, sh, x - 2 * s, y + 3 * s, 16 * s, 1); }
  function tower(g, x, w, top, col, win, lit, rnd, p = .35, base = 120) {
    R(g, col, x, top, w, base - top);
    for (let yy = top + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) R(g, rnd() < p ? lit : win, xx, yy, 1, 2);
  }
  function starfield(g, w, h, rnd, n, c = '#ffffff') { for (let i = 0; i < n; i++) { g.globalAlpha = .4 + rnd() * .6; R(g, c, rnd() * w | 0, rnd() * h | 0, 1, 1); } g.globalAlpha = 1; }
  function ferris(g, cx, cy, r, c, cab) {
    ring(g, cx, cy, r, c); ring(g, cx, cy, r - 2, c);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; line(g, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); R(g, cab, Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r), 3, 3); }
    line(g, cx, cy, cx - r * .7, 120, c); line(g, cx, cy, cx + r * .7, 120, c); line(g, cx + 1, cy, cx - r * .7 + 1, 120, c); line(g, cx - 1, cy, cx + r * .7 - 1, 120, c);
  }

  /* zone worlds: sky colours, a far layer (320 wide, slow) and a mid layer (420 wide), plus a ground style */
  const THEMES = {
    canada: { sky: ['#5aaeea', '#d4efff'], ground: ['#6cc957', '#4f9f40', '#8b5a3a', '#6e4529'], gs: 'grass',
      far(g, r) { disc(g, 252, 26, 9, '#fff6cf'); cloud(g, 30, 22, 1, '#ffffff', '#cfe6f7'); cloud(g, 170, 14, 1, '#ffffff', '#cfe6f7');
        mountain(g, 60, 34, 70, '#8aa6cc', '#6f8bb5', '#f6f9ff', '#d9e3f2'); mountain(g, 170, 22, 80, '#7d99c2', '#64809f', '#ffffff', '#dbe6f5'); mountain(g, 280, 40, 64, '#8aa6cc', '#6f8bb5', '#f6f9ff', '#d9e3f2');
        hills(g, 320, 104, 10, .05, 1, '#5d8f6d'); },
      mid(g, r) { for (let x = -4; x < 424; x += 9 + (r() * 6 | 0)) pine(g, x, 120, 26 + (r() * 16 | 0), '#2f6b45', '#4a8f5c'); for (let x = 2; x < 424; x += 13 + (r() * 8 | 0)) pine(g, x, 121, 16 + (r() * 10 | 0), '#24563a', '#3b7a4f'); } },
    vienna: { sky: ['#f39468', '#ffe2ab'], ground: ['#cdb796', '#a99273', '#8a7556', '#6f5c42'], gs: 'cobble',
      far(g, r) { disc(g, 236, 78, 18, '#ffd77d'); const c = '#bf6f5c';
        for (let x = 0; x < 320; x += 14 + (r() * 10 | 0)) R(g, c, x, 92 - (r() * 14 | 0), 16, 40);
        R(g, c, 84, 60, 14, 60); for (let y = 14; y < 60; y++) { const hw = Math.round((y - 14) / 46 * 7); R(g, c, 91 - hw, y, hw * 2 + 1, 1); } R(g, c, 90, 8, 2, 6);
        disc(g, 150, 74, 10, c); R(g, c, 140, 74, 21, 46); R(g, c, 149, 58, 3, 8); R(g, c, 134, 80, 4, 40); R(g, c, 163, 80, 4, 40);
        ferris(g, 270, 66, 24, '#a95c4c', '#a95c4c'); },
      mid(g, r) { const cols = [['#f3e2bd', '#d9c39a'], ['#ecc76a', '#cfa94f'], ['#eab7a3', '#cf9a86'], ['#e6dccb', '#c9bda8']];
        for (let x = 0; x < 420;) { const w = 34 + (r() * 18 | 0), top = 62 + (r() * 18 | 0), [a, b] = cols[r() * cols.length | 0];
          R(g, a, x, top, w, 120 - top); R(g, b, x, top, w, 3); R(g, '#7e4b3a', x - 1, top - 6, w + 2, 6); R(g, '#965a46', x - 1, top - 6, w + 2, 1);
          for (let yy = top + 8; yy < 110; yy += 12) for (let xx = x + 5; xx < x + w - 6; xx += 8) { R(g, '#ffffff', xx - 1, yy - 1, 5, 8); R(g, '#5c6e86', xx, yy, 3, 6); R(g, b, xx - 1, yy - 3, 5, 2); }
          R(g, '#6b4a33', x + (w >> 1) - 4, 106, 8, 14); x += w + 2; } } },
    startup: { sky: ['#161236', '#3a2370'], ground: ['#5a4d93', '#463b78', '#2c2552', '#221d40'], gs: 'tile',
      far(g, r) {  starfield(g, 320, 70, r, 60); disc(g, 60, 22, 6, '#f4f0d0'); disc(g, 63, 20, 5, '#161236');
        for (let x = 0; x < 320; x += 18 + (r() * 10 | 0)) tower(g, x, 16 + (r() * 10 | 0), 40 + (r() * 40 | 0), '#2a215c', '#352a70', '#ffd75e', r, .18); },
      mid(g, r) { for (let x = 0; x < 420; x += 70) { R(g, '#2e2658', x, 46, 66, 74); R(g, '#3c3275', x + 4, 52, 58, 40); R(g, '#241d48', x + 4, 72, 58, 2);
          for (let k = 0; k < 2; k++) { const mx = x + 10 + k * 26; R(g, '#0f1a2e', mx, 58, 18, 11); R(g, '#6ef0ff', mx + 1, 59, 16, 9); R(g, '#b6fbff', mx + 2, 60, 6, 1); R(g, '#3fb8d6', mx + 2, 63, 10, 1); R(g, '#3fb8d6', mx + 2, 65, 7, 1); R(g, '#0f1a2e', mx + 8, 69, 2, 3); }
          R(g, '#2a7a4a', x + 50, 98, 8, 10); disc(g, x + 54, 94, 5, '#3fbf6a'); R(g, '#1c1640', x + 6, 100, 30, 3); R(g, '#1c1640', x + 8, 103, 2, 17); R(g, '#1c1640', x + 32, 103, 2, 17); }
        const sx = 154; R(g, '#ff5fa2', sx, 20, 26, 18); R(g, '#2e2658', sx + 1, 21, 24, 16); g.fillStyle = '#ff9bd0';
        [[4, 3, 2, 11], [10, 3, 2, 11], [6, 3, 4, 2], [6, 8, 4, 2], [15, 3, 6, 2], [17, 5, 2, 7], [15, 12, 6, 2]].forEach(([a, b, c, d]) => g.fillRect(sx + a, 21 + b, c, d)); } },
    hongkong: { sky: ['#0b1a44', '#4c2f7c'], ground: ['#9a6a44', '#7a5234', '#5a3a24', '#432a1a'], gs: 'plank',
      far(g, r) {  starfield(g, 320, 50, r, 40); hills(g, 320, 86, 34, .022, 2, '#1d2352');
        const lit = ['#7ff0ff', '#ff9ad5', '#ffe07a'];
        for (let x = 0; x < 320; x += 9 + (r() * 6 | 0)) tower(g, x, 8 + (r() * 6 | 0), 52 + (r() * 36 | 0), '#262d66', '#2f3778', lit[r() * 3 | 0], r, .3, 104);
        R(g, '#2b3270', 150, 22, 14, 82); R(g, '#2b3270', 152, 16, 10, 6); R(g, '#2b3270', 155, 10, 4, 6); for (let y = 26; y < 100; y += 5) R(g, '#7ff0ff', 152, y, 10, 1); },
      mid(g, r) { R(g, '#18265e', 0, 98, 420, 22); for (let i = 0; i < 70; i++) R(g, ['#7ff0ff', '#ff9ad5', '#ffe07a'][i % 3], r() * 420 | 0, 100 + (r() * 18 | 0), 3 + (r() * 6 | 0), 1);
        for (const bx of [60, 260]) { R(g, '#3a1d12', bx, 94, 34, 5); R(g, '#3a1d12', bx + 4, 99, 26, 2); R(g, '#3a1d12', bx + 16, 62, 2, 32);
          for (let y = 0; y < 28; y++) { R(g, '#c43c2e', bx + 18, 64 + y, Math.round(4 + y * .5), 1); R(g, '#c43c2e', bx + 15 - Math.round(2 + y * .35), 70 + Math.min(y, 22), Math.round(2 + y * .35), 1); }
          for (let y = 68; y < 92; y += 5) R(g, '#8a2a20', bx + 18, y, 14, 1); } } },
    ethics: { sky: ['#2a7c86', '#c8efd8'], ground: ['#66c58f', '#4aa474', '#6b5a40', '#544632'], gs: 'grass',
      far(g, r) { disc(g, 200, 92, 16, '#fff2c0'); hills(g, 320, 98, 18, .03, 4, '#5fae8e'); hills(g, 320, 108, 10, .06, 1, '#4f9a7c'); },
      mid(g, r) { for (let x = 10; x < 420; x += 46 + (r() * 20 | 0)) { const h = 30 + (r() * 16 | 0), cy = 120 - h - 12;
          R(g, '#3d6b5a', x - 1, cy, 3, 120 - cy); disc(g, x, cy, 13, '#3fae7a'); disc(g, x - 3, cy - 3, 6, '#5cc890');
          const tr = '#a6f5cf'; line(g, x, cy + 8, x, cy - 6, tr); line(g, x, cy - 2, x - 7, cy - 2, tr); line(g, x - 7, cy - 2, x - 7, cy - 7, tr); line(g, x, cy + 2, x + 7, cy + 2, tr); line(g, x + 7, cy + 2, x + 7, cy - 5, tr);
          R(g, '#ffffff', x - 8, cy - 8, 3, 3); R(g, '#ffffff', x + 6, cy - 6, 3, 3); R(g, '#ffffff', x - 1, cy - 7, 3, 3); } } },
    sap: { sky: ['#3f86d8', '#d2e9ff'], ground: ['#d1d6df', '#b2b8c4', '#8d93a1', '#737a89'], gs: 'tile',
      far(g, r) { cloud(g, 40, 18, 1, '#ffffff', '#c8def5'); cloud(g, 220, 28, 1, '#ffffff', '#c8def5');
        for (let x = 0; x < 320; x += 22 + (r() * 14 | 0)) { const w = 16 + (r() * 10 | 0), top = 30 + (r() * 46 | 0); R(g, '#9ec4ea', x, top, w, 120 - top); R(g, '#b9d6f3', x, top, 3, 120 - top); for (let y = top + 3; y < 120; y += 5) R(g, '#86b0dc', x, y, w, 1); } },
      mid(g, r) { R(g, '#5f8fc4', 30, 44, 150, 76); for (let y = 48; y < 116; y += 8) for (let x = 34; x < 176; x += 10) { R(g, '#79a8db', x, y, 9, 7); } for (let k = 0; k < 6; k++) line(g, 40 + k * 22, 116, 70 + k * 22, 48, '#cfe6ff');
        R(g, '#456f9e', 30, 40, 150, 4); R(g, '#3a5f8a', 90, 98, 30, 22); R(g, '#b7d8f7', 92, 100, 12, 20); R(g, '#b7d8f7', 106, 100, 12, 20);
        for (const tx of [200, 250, 300, 360, 400]) { R(g, '#6b4a33', tx, 100, 3, 20); disc(g, tx + 1, 92, 10, '#4caf6a'); disc(g, tx - 2, 89, 5, '#6cc985'); }
        for (const fx of [190, 340]) { R(g, '#e9edf3', fx, 70, 2, 50); R(g, '#2f6fd0', fx + 2, 70, 12, 8); } } },
    postal: { sky: ['#f2b64a', '#fff0c4'], ground: ['#c95b3e', '#a8472f', '#7e3524', '#5e271b'], gs: 'brick',
      far(g, r) { for (let x = 0; x < 320; x += 60) { R(g, '#e3a346', x, 78, 56, 42); for (let k = 0; k < 4; k++) R(g, '#d18f35', x + k * 14, 70, 14, 8); R(g, '#c27e2a', x + 8, 96, 14, 24); R(g, '#c27e2a', x + 30, 96, 14, 24); }
        for (let i = 0; i < 7; i++) { const ex = 20 + i * 44 + (r() * 12 | 0), ey = 14 + (r() * 30 | 0); R(g, '#ffffff', ex, ey, 9, 6); line(g, ex, ey, ex + 4, ey + 3, '#d8c9a8'); line(g, ex + 8, ey, ex + 4, ey + 3, '#d8c9a8'); } },
      mid(g, r) { R(g, '#3a2a40', 40, 74, 70, 46); R(g, '#4c3a55', 40, 74, 70, 3); R(g, '#6b5a2a', 70, 88, 10, 32); R(g, '#8a7a3a', 69, 86, 12, 3);
        g.globalAlpha = .28; for (let y = 0; y < 60; y++) R(g, '#fff6d0', 60 - y * .3, 14 + y, 30 + y * .6, 1); g.globalAlpha = 1; R(g, '#2a1d30', 72, 6, 6, 8);
        for (const bx of [150, 330]) { R(g, '#f2c230', bx, 92, 14, 28); R(g, '#d9a51f', bx, 92, 14, 3); R(g, '#1a1410', bx + 3, 98, 8, 2); disc(g, bx + 7, 90, 7, '#f2c230'); R(g, '#c4372b', bx + 4, 108, 6, 3); }
        for (let i = 0; i < 6; i++) { const px = 190 + (i % 3) * 13, py = 108 - (i / 3 | 0) * 11; R(g, '#c08a52', px, py, 12, 11); R(g, '#a06e3c', px, py, 12, 1); R(g, '#e9d8b0', px + 5, py, 2, 11); }
        const vx = 250; R(g, '#f2c230', vx, 92, 54, 22); R(g, '#f2c230', vx + 54, 98, 14, 16); R(g, '#bfe4ff', vx + 56, 100, 9, 6); R(g, '#c4372b', vx, 104, 68, 3); disc(g, vx + 12, 116, 4, '#1a1410'); disc(g, vx + 52, 116, 4, '#1a1410'); disc(g, vx + 12, 116, 1, '#9a9a9a'); disc(g, vx + 52, 116, 1, '#9a9a9a'); } },
    cloud: { sky: ['#58a8f5', '#e4f3ff'], ground: ['#96d47e', '#74b55f', '#8d6a4a', '#6f523a'], gs: 'grass',
      far(g, r) { mountain(g, 200, 30, 96, '#7088c4', '#5f76ae', '#ffffff', '#dfe8f7'); cloud(g, 20, 30, 2, '#ffffff', '#d6e8fb'); cloud(g, 250, 18, 1, '#ffffff', '#d6e8fb'); cloud(g, 120, 66, 1, '#ffffff', '#d6e8fb'); hills(g, 320, 108, 8, .05, 3, '#79b86a'); },
      mid(g, r) { for (let x = 6; x < 420; x += 40 + (r() * 24 | 0)) { R(g, '#6b4a3a', x, 96, 3, 24); line(g, x + 1, 100, x - 6, 92, '#6b4a3a'); line(g, x + 1, 98, x + 8, 91, '#6b4a3a'); disc(g, x - 5, 88, 7, '#f7b9cb'); disc(g, x + 8, 88, 7, '#f7b9cb'); disc(g, x + 1, 82, 9, '#fbcad7'); for (let k = 0; k < 6; k++) R(g, '#ffe4ec', x - 8 + (r() * 18 | 0), 78 + (r() * 14 | 0), 1, 1); }
        const tx = 210; R(g, '#d8432f', tx, 80, 4, 40); R(g, '#d8432f', tx + 30, 80, 4, 40); R(g, '#d8432f', tx - 6, 76, 46, 4); R(g, '#1a1410', tx - 8, 72, 50, 4); R(g, '#d8432f', tx - 2, 86, 38, 3); } },
    security: { sky: ['#070b1f', '#1c2f5e'], ground: ['#3d4c6c', '#2c3852', '#222b40', '#181f30'], gs: 'grid',
      far(g, r) {  starfield(g, 320, 80, r, 70); for (let k = 0; k < 3; k++) { g.globalAlpha = .22 - k * .05; for (let x = 0; x < 320; x++) { const y = 26 + k * 7 + Math.sin(x * .03 + k) * 8; R(g, k === 1 ? '#7cf2c6' : '#6fd3ff', x, y | 0, 1, 8); } } g.globalAlpha = 1;
        const c = '#141f44'; for (let x = 0; x < 320; x += 14 + (r() * 8 | 0)) R(g, c, x, 92 - (r() * 12 | 0), 15, 40);
        R(g, c, 70, 64, 10, 56); for (let y = 24; y < 64; y++) { const hw = Math.round((y - 24) / 40 * 5); R(g, c, 75 - hw, y, hw * 2 + 1, 1); } ferris(g, 236, 70, 22, '#2a3a70', '#ffd75e'); },
      mid(g, r) { for (let x = 0; x < 420; x += 28) { if ((x / 28 | 0) % 5 === 2) continue; R(g, '#1c2742', x, 50, 24, 70); R(g, '#26324f', x, 50, 24, 2);
          for (let y = 56; y < 116; y += 6) { R(g, '#121a2e', x + 2, y, 20, 4); R(g, ['#5cf28c', '#5cc8ff', '#5cf28c', '#ff6b6b'][(r() * 4) | 0], x + 18, y + 1, 2, 2); R(g, '#5cc8ff', x + 4, y + 1, 1, 2); } }
        for (const sx of [56 + 14, 196 + 14, 336 + 14]) { const cx = sx; for (let y = 0; y < 30; y++) { const hw = y < 18 ? 12 : Math.round(12 - (y - 18) * 1); R(g, '#9b8cff', cx - hw, 62 + y, hw * 2, 1); R(g, '#b7acff', cx - hw, 62 + y, 3, 1); }
          R(g, '#f4f2ff', cx - 4, 74, 8, 7); R(g, '#9b8cff', cx - 2, 76, 4, 3); ring(g, cx, 73, 3, '#f4f2ff'); R(g, '#9b8cff', cx - 2, 73, 4, 1); } } },
    beyond: { sky: ['#ff7559', '#ffd39b'], ground: ['#cf5a42', '#b0462f', '#8a3a2a', '#6a2c20'], gs: 'track',
      far(g, r) { disc(g, 160, 70, 22, '#ffe7a8'); mountain(g, 60, 30, 80, '#9a5e7e', '#7f4b69', '#ffe9e3', '#f2cbc4'); mountain(g, 190, 18, 90, '#8a527a', '#6f4062', '#fff1ec', '#f2cbc4'); mountain(g, 300, 38, 70, '#9a5e7e', '#7f4b69', '#ffe9e3', '#f2cbc4'); hills(g, 320, 106, 8, .04, 2, '#7a3f5a'); },
      mid(g, r) { R(g, '#5a2f45', 0, 84, 420, 30); for (let y = 86; y < 112; y += 4) for (let x = 2 + (y % 8); x < 420; x += 5) R(g, ['#ffd39b', '#ff9b7a', '#ffffff', '#9ad0ff', '#ffe066'][(r() * 5) | 0], x, y, 2, 2);
        R(g, '#3f2032', 0, 112, 420, 8); for (let x = 0; x < 420; x += 10) R(g, '#e9e2dc', x, 112, 1, 8); R(g, '#e9e2dc', 0, 112, 420, 1);
        const fx = 300; R(g, '#e9e2dc', fx, 40, 3, 72); R(g, '#e9e2dc', fx + 60, 40, 3, 72); for (let x = 0; x < 60; x += 4) for (let y = 0; y < 12; y += 4) R(g, ((x + y) / 4) % 2 ? '#1a1410' : '#ffffff', fx + 3 + x, 40 + y, 4, 4);
        for (const bx of [60, 160, 230]) { disc(g, bx, 106, 4, '#e8413a'); R(g, '#ff8a80', bx - 2, 103, 2, 2); } } }
  };

  /* ground tiles, 16 x 24 */
  function groundTile(th) {
    const c = mkc(16, 24), g = c.getContext('2d'), [top, sh, dirt, dk] = th.ground;
    R(g, dirt, 0, 0, 16, 24);
    if (th.gs === 'grass') { R(g, top, 0, 0, 16, 4); R(g, sh, 0, 4, 16, 1); [1, 5, 9, 13].forEach(x => R(g, top, x, 4, 2, 1)); for (let i = 0; i < 9; i++) R(g, dk, (i * 7 + 3) % 16, 7 + (i * 5) % 16, 2, 1); R(g, '#ffffff22', 0, 0, 16, 1); }
    else if (th.gs === 'cobble') { R(g, top, 0, 0, 16, 3); for (let y = 3; y < 24; y += 5) for (let x = (y % 2) * 4; x < 16; x += 8) { R(g, sh, x, y, 7, 4); R(g, dk, x, y + 4, 7, 1); } }
    else if (th.gs === 'tile') { R(g, top, 0, 0, 16, 3); R(g, sh, 0, 3, 16, 1); R(g, dk, 15, 0, 1, 24); for (let y = 8; y < 24; y += 8) R(g, dk, 0, y, 16, 1); }
    else if (th.gs === 'plank') { R(g, top, 0, 0, 16, 3); for (let y = 3; y < 24; y += 4) { R(g, sh, 0, y, 16, 3); R(g, dk, (y * 3) % 16, y, 1, 3); } R(g, dk, 3, 4, 1, 1); R(g, dk, 12, 4, 1, 1); }
    else if (th.gs === 'brick') { R(g, top, 0, 0, 16, 3); R(g, '#e0d2b0', 0, 3, 16, 1); for (let y = 4; y < 24; y += 5) { R(g, dk, 0, y + 4, 16, 1); for (let x = (y % 2) * 8; x < 16; x += 8) R(g, dk, x, y, 1, 4); } }
    else if (th.gs === 'grid') { R(g, top, 0, 0, 16, 3); R(g, '#6fd3ff', 0, 0, 16, 1); for (let y = 6; y < 24; y += 6) R(g, sh, 0, y, 16, 1); for (let x = 0; x < 16; x += 6) R(g, sh, x, 3, 1, 21); R(g, '#5cf28c', 7, 9, 1, 1); }
    else if (th.gs === 'track') { R(g, top, 0, 0, 16, 5); R(g, '#f4ece6', 0, 2, 16, 1); R(g, sh, 0, 5, 16, 1); for (let i = 0; i < 8; i++) R(g, dk, (i * 7) % 16, 8 + (i * 3) % 14, 1, 1); }
    return c;
  }

  /* ---------- sprites (original pixel art) ---------- */
  const SPRITES = {"PAL":{"k":"#1a1410","H":"#2b1d15","h":"#5a3f2c","S":"#f2c6a2","s":"#d69c7a","g":"#3a3430","f":"#7a6c62","E":"#1a1410","w":"#ffffff","B":"#6e4c37","r":"#8a4a40","O":"#6b7141","o":"#4f5430","q":"#8d935a","P":"#28365a","p":"#1a2440","W":"#f4f4f4","x":"#b8b8c0","R":"#d9405b","Q":"#9c2340","L":"#ff8aa0","G":"#3a2a4a"},"SPR":{"IDLE":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...","...kOOOqSqOOk...","..kOOOOOqOOOOk..","..kOOOOOOOOOOk..","..kSkOOOOOOkSk..","...kkOOOOOOkk...","....kPPPPPPk....","....kPPkkPPk....","....kPPk.kPPk...","...kWWWk.kWWWk..","...kkkk...kkkk.."],"RUN0":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...","...kOOOqSqOOk...","..kOOOOOqOOOOk..","..kSOOOOOOOOOk..","..kSkOOOOOOkkSk.","...kkOOOOOOkSSk.","....kPPPPPPkk...","...kPPPkkPPPk...","..kPPk....kPPk..",".kWWWk....kWWWk.",".kkkk......kkkk."],"RUN1":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...","...kOOOqSqOOk...","..kOOOOOqOOOOk..","..kOOOOOOOOOOk..","...kOOOOOOOSk...","...kkOOOOOOkk...","....kPPPPPPk....",".....kPPPPk.....",".....kPPPk......","....kWWWWk......","....kkkkk......."],"RUN2":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...","...kOOOqSqOOk...","..kOOOOOqOOOOk..","..kOOOOOOOOOSk..",".kSkkOOOOOOkSk..",".kSSkOOOOOOkk...","...kkPPPPPPk....","...kPPPkkPPPk...","..kPPk....kPPk..",".kWWWk....kWWWk.",".kkkk......kkkk."],"JUMP":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...",".kSkOOqSqOOk.kSk",".kSkOOOqOOOOkSk.","..kkOOOOOOOOkk..","...kOOOOOOOOk...","...kkOOOOOOkk...","....kPPPPPPk....","...kPPPkkPPPk...","..kWWWk.kPPk....","..kkkk.kWWWk....",".......kkkk....."],"FALL":["....kkkkkkk.....","...kHHHHHHHkk...","..kHHHHHHHhHHk..",".kHHHHHHHHHhHHk.",".kHHHHHHHHHHHHk.",".kHHHSSSSSSSHHk.",".kHHSSSSSSSSSHk.",".kHsSfffSfffSSk.",".kHsSfEfSfEfSSk.",".kHSSSSSSSSSSSk.","..kBSSSSSSSSSBk.","..kBBBBrrBBBBk..","...kBBBBBBBBBk..","....kkSSSSSkk...","...kOOOqSqOOk...","..kOOOOOqOOOOk..",".kSOOOOOOOOOOSk.",".kSkOOOOOOOOkSk.","..kkOOOOOOOOkk..","....kPPPPPPk....","...kPPPkkPPPk...","...kPPk..kPPk...","..kWWWk..kWWWk..","..kkkk....kkkk.."],"BUG0":["....k......k....",".....k....k.....","......kkkk......","....kkRRRRkk....","...kRRRLRRRRk...","..kRRLLRRRRRRk..","..kRwkRRRRwkRk..",".kRRkkRRRRkkRRk.",".kQRRRRRRRRRRQk.",".kQQRRRGGRRRQQk.","..kQQRRRRRRQQk..","...kkQQQQQQkk...","..k..kkkkkk..k..",".k...k....k...k."],"BUG1":["....k......k....",".....k....k.....","......kkkk......","....kkRRRRkk....","...kRRRLRRRRk...","..kRRLLRRRRRRk..","..kRwkRRRRwkRk..",".kRRkkRRRRkkRRk.",".kQRRRRRRRRRRQk.",".kQQRRRGGRRRQQk.","..kQQRRRRRRQQk..","...kkQQQQQQkk...","...k.kkkkkk.k...","..k..k....k..k.."]}};
  function mkSprite(rows, flip) {
    const w = rows[0].length, h = rows.length, c = mkc(w, h), g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && SPRITES.PAL[ch]) R(g, SPRITES.PAL[ch], flip ? w - 1 - x : x, y, 1, 1); }));
    return c;
  }
  const SP = {}, SPL = {};
  for (const k in SPRITES.SPR) { SP[k] = mkSprite(SPRITES.SPR[k]); SPL[k] = mkSprite(SPRITES.SPR[k], true); }
  const RUN = ['RUN0', 'RUN1', 'RUN2', 'RUN1'];

  /* world layers, built on first use */
  const LAYERS = {};
  function layers(zone) {
    if (LAYERS[zone]) return LAYERS[zone];
    const th = THEMES[zone] || THEMES.canada, seed = [...zone].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1;
    const far = mkc(320, 120), mid = mkc(420, 120);
    th.far(far.getContext('2d'), rng(seed)); th.mid(mid.getContext('2d'), rng(seed + 99));
    return (LAYERS[zone] = { th, far, mid, tile: groundTile(th) });
  }

  /* a still pixel scene of a zone: used in the portfolio and on game cards */
  function paintScene(c, zone, color) {
    const g = c.getContext('2d'), w = c.width, h = c.height, L = layers(zone), gy = h - 16;
    g.imageSmoothingEnabled = false;
    const gr = g.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, L.th.sky[0]); gr.addColorStop(1, L.th.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.drawImage(L.far, -24, gy - 112); g.drawImage(L.mid, -60, gy - 120);
    for (let x = 0; x < w; x += 16) g.drawImage(L.tile, x, gy);
    g.drawImage(SP.IDLE, 44, gy - 24);
    const fx = w - 40; R(g, '#ececec', fx, gy - 40, 2, 40); disc(g, fx + 1, gy - 41, 2, '#ffd75e'); R(g, color, fx + 2, gy - 38, 14, 9); R(g, '#ffffff55', fx + 2, gy - 38, 14, 1);
    disc(g, 92, gy - 30, 3, color); R(g, '#ffffff', 91, gy - 32, 1, 1);
  }
  const sceneOf = c => { const ch = CH.find(x => x.zone === c.dataset.scene); paintScene(c, c.dataset.scene, ch ? ch.color : '#77a0ea'); };
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { so.unobserve(e.target); sceneOf(e.target); } }), { rootMargin: '600px 0px' });
    $$('canvas[data-scene]').forEach(c => so.observe(c));
  } else $$('canvas[data-scene]').forEach(sceneOf);

  /* ---------- level, built from the chapters ---------- */
  const N = CH.length, END = 200, WORLD = N * ZW + END;
  let plats = [], gaps = [], orbs = [], flags = [], bugs = [], parts = [];
  function buildLevel() {
    plats = []; gaps = []; orbs = []; flags = []; bugs = []; parts = [];
    CH.forEach((c, i) => {
      const x0 = i * ZW, odd = i % 2 === 1;
      if (!odd) {
        plats.push({ x: x0 + 92, y: 90, w: 52, z: i });
        orbs.push({ x: x0 + 118, y: 78, z: i, s: c.skills[0] || 'Skill' });
        if (i > 0) gaps.push({ x: x0 + 176, w: 32 });
        orbs.push({ x: x0 + 236, y: 86, z: i, s: c.skills[1] || 'Skill' });
        if (i >= 2) bugs.push({ x: x0 + 248, a: x0 + 216, b: x0 + 262, d: -1, dead: 0 });
      } else {
        orbs.push({ x: x0 + 96, y: 86, z: i, s: c.skills[0] || 'Skill' });
        gaps.push({ x: x0 + 144, w: 32 });
        plats.push({ x: x0 + 196, y: 88, w: 48, z: i });
        orbs.push({ x: x0 + 220, y: 76, z: i, s: c.skills[1] || 'Skill' });
        if (i >= 2) bugs.push({ x: x0 + 230, a: x0 + 184, b: x0 + 262, d: 1, dead: 0 });
      }
      flags.push({ x: x0 + 280, z: i, done: false, t: 0 });
    });
  }
  buildLevel();
  const TOTAL_SKILLS = () => orbs.length;
  const inGap = x => gaps.find(g => x - 3 >= g.x && x + 3 <= g.x + g.w);

  /* ---------- game state ---------- */
  const cv = $('#game'), cx = cv.getContext('2d'), ui = $('#ui'), screenEl = $('#screen'), dev = $('#device'), rigwrap = $('#rigwrap');
  cx.imageSmoothingEnabled = false;
  const st = { on: false, mode: 'off', sub: 'field', zone: -1, started: false, paused: false, menuSel: 0, cardAt: 0, hintT: 0 };
  const P = { x: 40, y: GY, px: 40, py: GY, vx: 0, vy: 0, ground: true, face: 1, coyote: 0, buffer: 0, inv: 0, lock: 0, sq: 0, phase: 0, safe: 40, moved: false };
  let cam = 0, pcam = 0, jumpQueued = false, shake = 0, tick = 0;
  const held = { left: false, right: false, up: false, down: false, a: false };

  function resetPlayer(x) { Object.assign(P, { x, y: GY, px: x, py: GY, vx: 0, vy: 0, ground: true, face: 1, inv: 0, lock: 0, sq: 0, safe: x }); cam = pcam = clamp(x - 70, 0, WORLD - W); }

  function puff(x, y, n, c, sp = 1) { if (reduce) n = Math.min(n, 3); for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 1.6 * sp, vy: -Math.random() * 1.4 * sp, l: 22 + Math.random() * 14, c, s: Math.random() < .5 ? 1 : 2 }); }

  function step() {
    tick++;
    P.px = P.x; P.py = P.y; pcam = cam;
    const field = st.sub === 'field' && P.lock <= 0;
    if (P.lock > 0) P.lock--;
    const dir = field ? (held.right ? 1 : 0) - (held.left ? 1 : 0) : 0;
    if (dir) { P.vx = clamp(P.vx + dir * (P.ground ? .17 : .11), -1.45, 1.45); P.face = dir; if (!P.moved) { P.moved = true; } }
    else { const f = P.ground ? .2 : .03; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
    P.coyote = P.ground ? 6 : P.coyote - 1;
    P.buffer = jumpQueued && field ? 7 : P.buffer - 1; jumpQueued = false;
    if (P.buffer > 0 && P.coyote > 0) { P.vy = -4.1; P.ground = false; P.coyote = 0; P.buffer = 0; P.sq = -6; SFX.jump(); puff(P.x, P.y, 4, '#ffffff', .6); }
    if (!(held.a || held.up) && P.vy < -1.5) P.vy = -1.5;
    P.vy = Math.min(P.vy + (P.vy < 0 ? .2 : .27), 4.4);

    const wasGround = P.ground, by = P.y, vyIn = P.vy;
    P.x = clamp(P.x + P.vx, 8, WORLD - 8);
    P.y += P.vy; P.ground = false;
    if (P.vy >= 0) {
      if (by <= GY + .01 && P.y >= GY && !inGap(P.x)) { P.y = GY; P.ground = true; }
      else for (const p of plats) if (by <= p.y + .01 && P.y >= p.y && P.x + 4 > p.x && P.x - 4 < p.x + p.w) { P.y = p.y; P.ground = true; break; }
    }
    if (P.y > GY + .5) { const g = gaps.find(g => P.px > g.x - 4 && P.px < g.x + g.w + 4); if (g) P.x = clamp(P.x, g.x + 3, g.x + g.w - 3); }
    if (P.ground) {
      if (!wasGround && vyIn > 2.4) { P.sq = 6; SFX.land(); puff(P.x, P.y, 5, '#ffffff', .8); }
      P.vy = 0;
      if (P.y === GY && !gaps.some(g => P.x > g.x - 12 && P.x < g.x + g.w + 12)) P.safe = P.x;
      if (Math.abs(P.vx) > .2) P.phase += Math.abs(P.vx) * .11;
    }
    if (P.sq > 0) P.sq--; else if (P.sq < 0) P.sq++;
    if (P.inv > 0) P.inv--;
    if (P.y > H + 24) { SFX.fall(); resetPlayer(P.safe); P.inv = 60; }

    // bugs
    for (const b of bugs) {
      if (b.dead) { b.dead++; continue; }
      b.x += b.d * .35; if (b.x < b.a) { b.x = b.a; b.d = 1; } if (b.x > b.b) { b.x = b.b; b.d = -1; }
      if (st.sub !== 'field' || P.inv > 0) continue;
      if (Math.abs(P.x - b.x) < 9 && P.y > GY - 11 && P.y - 20 < GY) {
        if (P.vy > .4 && P.py <= GY - 6) { b.dead = 1; P.vy = -3.2; P.sq = -4; SFX.stomp(); puff(b.x, GY - 5, 10, '#d9405b', 1.2); shake = 4; }
        else { P.vx = P.x < b.x ? -1.7 : 1.7; P.vy = -2.3; P.ground = false; P.inv = 70; P.lock = 12; SFX.hurt(); shake = 6; }
      }
    }
    // orbs
    for (const o of orbs) if (!o.got && Math.abs(P.x - o.x) < 9 && Math.abs((P.y - 11) - o.y) < 14) {
      o.got = true; SFX.orb(); puff(o.x, o.y, 12, CH[o.z].color, 1.3); popup(o); hud();
    }
    // checkpoint flags
    for (const f of flags) {
      if (f.done) { f.t = Math.min(30, f.t + 1); continue; }
      if (st.sub === 'field' && P.x >= f.x - 2 && P.x < f.x + 30 && P.y <= GY) {
        f.done = true; P.lock = 34; SFX.flag(); puff(f.x + 8, GY - 40, 16, CH[f.z].color, 1.5); hud();
        setTimeout(() => { if (st.mode === 'play' && st.sub === 'field') openCard(f.z); }, reduce ? 50 : 520);
      }
    }
    // the end
    if (st.sub === 'field' && P.x >= WORLD - 64 && !st.ended) { st.ended = true; P.lock = 40; SFX.win(); puff(WORLD - 40, GY - 50, 24, '#ffd75e', 1.8); setTimeout(() => { if (st.mode === 'play') openEnd(); }, reduce ? 50 : 700); }
    // particles
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += .1; p.l--; }
    parts = parts.filter(p => p.l > 0);
    // camera
    const target = clamp(P.x - 68 + P.vx * 16, 0, WORLD - W);
    cam += (target - cam) * .11;
    // zone change
    const z = clamp(Math.floor(P.x / ZW), 0, N - 1);
    if (z !== st.zone) { st.zone = z; banner(z); hud(); }
    if (shake > 0) shake--;
  }

  /* ---------- rendering ---------- */
  const r3 = v => Math.round(v * SC) / SC;
  function drawSprite(img, x, y, sx = 1, sy = 1) {
    const w = img.width * sx, h = img.height * sy;
    cx.drawImage(img, r3(x - w / 2), r3(y - h), r3(w), r3(h));
  }
  function render(alpha) {
    const c = cx; c.setTransform(SC, 0, 0, SC, 0, 0); c.imageSmoothingEnabled = false;
    let cm = lerp(pcam, cam, alpha); if (shake && !reduce) cm += (Math.random() - .5) * shake * .5;
    cm = r3(cm);
    // background: blend the two nearest zone worlds
    const vc = cm + W / 2, zf = clamp(vc / ZW, 0, N - .001), i = Math.floor(zf), fr = zf - i;
    const t = i < N - 1 ? smooth(clamp((fr - .86) / .14, 0, 1)) : 0, j = Math.min(i + 1, N - 1);
    const A = layers(CH[i].zone), B = layers(CH[j].zone);
    const gr = c.createLinearGradient(0, 0, 0, GY);
    gr.addColorStop(0, t ? mix(A.th.sky[0], B.th.sky[0], t) : A.th.sky[0]); gr.addColorStop(1, t ? mix(A.th.sky[1], B.th.sky[1], t) : A.th.sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const lay = (L, k, a) => { c.globalAlpha = a; c.drawImage(L.far, r3(-(cm - k * ZW + W) * .25), 0); c.drawImage(L.mid, r3(-(cm - k * ZW + W) * .5), 0); c.globalAlpha = 1; };
    lay(A, i, 1); if (t > 0) lay(B, j, t);
    // world space
    c.save(); c.translate(-cm, 0);
    const x0 = Math.floor(cm / 16) * 16;
    for (let x = x0; x < cm + W + 16; x += 16) {
      const zi = clamp(Math.floor(x / ZW), 0, N - 1), L = layers(CH[zi].zone);
      if (gaps.some(g => x >= g.x && x < g.x + g.w)) continue;
      c.drawImage(L.tile, x, GY);
    }
    for (const g of gaps) if (g.x + g.w > cm && g.x < cm + W) {
      const L = layers(CH[clamp(Math.floor(g.x / ZW), 0, N - 1)].zone), dk = L.th.ground[3];
      const pit = c.createLinearGradient(0, GY, 0, H); pit.addColorStop(0, dk); pit.addColorStop(.35, '#0b0d13'); pit.addColorStop(1, '#06070a');
      c.fillStyle = pit; c.fillRect(g.x, GY, g.w, H - GY);
      R(c, '#00000055', g.x, GY, 2, H - GY); R(c, '#00000055', g.x + g.w - 2, GY, 2, H - GY);
    }
    for (const p of plats) if (p.x + p.w > cm && p.x < cm + W) {
      const th = layers(CH[p.z].zone).th, [top, sh, dirt, dk] = th.ground;
      R(c, top, p.x + 1, p.y, p.w - 2, 3); R(c, top, p.x, p.y + 1, p.w, 2); R(c, dirt, p.x, p.y + 3, p.w, 4); R(c, dk, p.x + 1, p.y + 7, p.w - 2, 1); R(c, '#ffffff33', p.x + 1, p.y, p.w - 2, 1);
      for (let k = 4; k < p.w - 4; k += 9) R(c, sh, p.x + k, p.y + 4, 3, 1);
    }
    const tt = tick / 60;
    for (const f of flags) if (f.x > cm - 24 && f.x < cm + W + 8) {
      const col = CH[f.z].color, up = smooth(f.t / 30), fy = r3(GY - 12 - up * 26), wave = f.done ? Math.round(Math.sin(tt * 6 + f.x) * 1) : 0;
      R(c, '#f2f2f2', f.x, GY - 44, 2, 44); R(c, '#b9bcc4', f.x + 1, GY - 44, 1, 44); disc(c, f.x + 1, GY - 45, 2, '#ffd75e');
      R(c, f.done ? col : '#9aa0aa', f.x + 2, fy, 14, 9 + wave); R(c, '#ffffff44', f.x + 2, fy, 14, 1);
      R(c, '#00000033', f.x - 3, GY - 1, 8, 1);
    }
    // the finish arch
    const ex = WORLD - 70;
    if (ex < cm + W + 40) {
      R(c, '#f2f2f2', ex, GY - 52, 3, 52); R(c, '#f2f2f2', ex + 46, GY - 52, 3, 52);
      for (let x = 0; x < 46; x += 4) for (let y = 0; y < 12; y += 4) R(c, ((x + y) / 4) % 2 ? '#1a1410' : '#ffffff', ex + 3 + x, GY - 52 + y, 4, 4);
      R(c, '#ffd75e', ex + 10, GY - 36, 30, 2);
    }
    for (const o of orbs) if (!o.got && o.x > cm - 10 && o.x < cm + W + 10) {
      const col = CH[o.z].color, bob = reduce ? 0 : Math.sin(tt * 3 + o.x * .1) * 2, y = r3(o.y + bob);
      c.globalAlpha = .25 + .15 * Math.sin(tt * 5 + o.x); disc(c, o.x, Math.round(y), 6, col); c.globalAlpha = 1;
      disc(c, o.x, Math.round(y), 4, col); disc(c, o.x - 1, Math.round(y) - 1, 2, '#ffffff99'); R(c, '#ffffff', o.x - 2, Math.round(y) - 2, 1, 1);
    }
    for (const b of bugs) if (b.x > cm - 12 && b.x < cm + W + 12) {
      if (b.dead) { if (b.dead < 26) drawSprite(b.d > 0 ? SPL.BUG0 : SP.BUG0, b.x, GY, 1.2, .35); continue; }
      const fr2 = (tick >> 3) & 1 ? 'BUG1' : 'BUG0'; drawSprite(b.d > 0 ? SPL[fr2] : SP[fr2], b.x, GY + 1);
    }
    // player
    const px = lerp(P.px, P.x, alpha), py = lerp(P.py, P.y, alpha);
    if (!(P.inv > 0 && (P.inv >> 2) % 2)) {
      let k = 'IDLE';
      if (!P.ground) k = P.vy < 0 ? 'JUMP' : 'FALL'; else if (Math.abs(P.vx) > .15) k = RUN[Math.floor(P.phase) % 4];
      const s = reduce ? 0 : P.sq, sx = s > 0 ? 1 + s * .03 : 1 + s * .015, sy = s > 0 ? 1 - s * .035 : 1 - s * .02;
      R(c, '#00000030', r3(px - 5), py, 10, 1);
      drawSprite(P.face < 0 ? SPL[k] : SP[k], px, py + 0.01, sx, sy);
    }
    for (const p of parts) { c.globalAlpha = Math.min(1, p.l / 14); R(c, p.c, r3(p.x), r3(p.y), p.s, p.s); } c.globalAlpha = 1;
    c.restore();
  }

  /* ---------- screen UI ---------- */
  const zc = i => `--zc:${CH[i].color}`;
  function hud() {
    if (st.mode !== 'play') return;
    const got = orbs.filter(o => o.got).length, el = $('.hud', ui); if (!el) return;
    $('.got', el).textContent = got + '/' + TOTAL_SKILLS();
    const z = Math.max(0, st.zone);
    const yr = $('.yr', el); yr.textContent = CH[z].year; yr.parentElement.style.cssText = zc(z);
    flags.forEach((f, i) => { const d = el.querySelectorAll('.prog b')[i]; if (d) d.classList.toggle('done', f.done); });
  }
  function hudProgress() { const el = $('.prog i', ui); if (el) el.style.setProperty('--p', (P.x / WORLD * 100).toFixed(1) + '%'); }
  let bannerT = 0;
  function banner(i) {
    const b = $('.banner', ui); if (!b) return;
    b.style.cssText = zc(i); b.innerHTML = `<span class="y">${esc(CH[i].year === 'NOW' ? 'NOW' : CH[i].year)}</span><span class="n">${esc(CH[i].name)}</span>`;
    b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1900);
  }
  function popup(o) {
    const el = document.createElement('div'); el.className = 'pop'; el.style.cssText = zc(o.z);
    el.style.left = ((o.x - cam) / W * 100) + '%'; el.style.top = ((o.y - 6) / H * 100) + '%'; el.textContent = o.s;
    ui.appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  function setUI(html) { ui.innerHTML = html; }
  function showOff() { setUI('<div class="off-glow"></div>'); }
  function showBoot() { setUI(`<div class="boot"><p class="big">${[...'CK-1'].map((c, i) => `<i style="animation-delay:${i * 90}ms">${c}</i>`).join('')}</p><p class="sub">POCKET LAB</p></div>`); }
  function showTitle() {
    setUI(`<div class="title"><p class="t-sub">THE STORY SO FAR</p><p class="t-logo" data-t="KOPKA'S">KOPKA'S</p><p class="t-logo" data-t="CANVAS">CANVAS</p>
      <p class="t-tag">10 CHAPTERS · 2015 TO NOW</p><p class="t-press">PRESS A</p><p class="t-help">${coarse ? 'Hold ▶ to run · A to jump' : '→ run · Space jump · M chapters'}</p></div>`);
  }
  function showHUD() {
    setUI(`<div class="hud"><div class="prog"><i></i>${flags.map(f => `<b style="left:${(f.x / WORLD * 100).toFixed(1)}%"></b>`).join('')}</div>
      <div class="pill l"><svg viewBox="0 0 10 10" aria-hidden="true"><path fill="#ffd75e" d="M5 0l1.4 3.3L10 3.6 7.3 6l.8 3.5L5 7.7 1.9 9.5 2.7 6 0 3.6l3.6-.3z"/></svg><span class="got">0/20</span></div>
      <div class="pill r"><span class="px yr">2015</span></div><div class="banner"></div>
      <p class="hint-run">${coarse ? 'Hold ▶ to run, tap A to jump' : 'Hold → to run, Space to jump'}</p></div>`);
    hud();
  }

  /* ---------- pop-out card + menu ---------- */
  const pc = $('#popcard');
  let pcOpen = false;
  function placeCard() {
    if (!pcOpen) return;
    const r = screenEl.getBoundingClientRect(), w = pc.offsetWidth, h = pc.offsetHeight;
    const left = clamp(r.left + r.width / 2 - w / 2, 12, innerWidth - w - 12), top = clamp(r.top + r.height * .55 - h / 2, 12, Math.max(12, innerHeight - h - 12));
    pc.style.transform = ''; pc.style.left = left + 'px'; pc.style.top = top + 'px';
  }
  function openPop(html, cls) {
    pc.className = 'popcard ' + (cls || ''); pc.innerHTML = html; pc.hidden = false; pcOpen = true; st.cardAt = now();
    placeCard(); requestAnimationFrame(() => pc.classList.add('show'));
  }
  function closePop() { pcOpen = false; pc.classList.remove('show'); setTimeout(() => { if (!pcOpen) { pc.hidden = true; pc.innerHTML = ''; } }, 260); }
  function mediaHTML(i, w = 192, h = 108) {
    const c = CH[i];
    return c.img ? `<img src="${esc(c.img)}" alt="${esc(c.alt)}">` : `<canvas data-card-scene width="${w}" height="${h}" aria-hidden="true"></canvas>`;
  }
  function openCard(i) {
    const c = CH[i], got = new Set(orbs.filter(o => o.z === i && o.got).map(o => o.s));
    st.sub = 'card'; SFX.open();
    openPop(`<div class="pc-media" style="${zc(i)}">${mediaHTML(i)}<span class="yr"><i></i>${esc(c.year)}</span></div>
      <div class="pc-body" style="${zc(i)}"><p class="lv">Chapter ${i + 1} of ${N}</p><h3 id="pc-title">${esc(c.title)}</h3><p class="s">${esc(c.short)}</p>
      <ul class="pc-skills" aria-label="Skills in this chapter">${c.skills.map(s => `<li class="${got.has(s) ? 'got' : ''}">${esc(s)}</li>`).join('')}</ul>
      <div class="pc-acts"><button type="button" data-act="go"><kbd>A</kbd>Keep playing</button><button type="button" class="ghost" data-act="read" data-ch="${i}"><kbd>B</kbd>Read more</button></div></div>`);
    const sc = $('canvas[data-card-scene]', pc); if (sc) paintScene(sc, c.zone, c.color);
  }
  function openEnd() {
    const got = orbs.filter(o => o.got).length;
    st.sub = 'end';
    openPop(`<div class="pc-body"><p class="pc-trophy">★ STORY COMPLETE ★</p><h3 id="pc-title">Thanks for playing</h3>
      <p class="s">You found ${got} of ${TOTAL_SKILLS()} skills. The full story, with photos and videos, is right below the handheld.</p>
      <div class="pc-acts"><button type="button" data-act="readall"><kbd>A</kbd>Read the story</button><a class="ghost" href="mailto:Christoph@kopkascanvas.com">Email me</a><button type="button" class="ghost" data-act="again"><kbd>B</kbd>Play again</button></div></div>`, 'end');
  }
  function openMenu() {
    st.sub = 'menu'; st.menuSel = Math.max(0, st.zone); SFX.open();
    openPop(`<div class="pc-menu"><h3 id="pc-title">CHAPTERS</h3><ol>${CH.map((c, i) => `<li${i === st.menuSel ? ' class="sel"' : ''}><button type="button" data-goto="${i}" style="${zc(i)}"><i></i><span>${esc(c.year)}</span>${esc(c.name)}${flags[i].done ? '<b>✓</b>' : ''}</button></li>`).join('')}</ol>
      <div class="pc-acts"><button type="button" class="ghost" data-act="close"><kbd>B</kbd>Back to the game</button></div></div>`);
  }
  function menuMove(d) { st.menuSel = (st.menuSel + d + N) % N; $$('.pc-menu li', pc).forEach((li, i) => li.classList.toggle('sel', i === st.menuSel)); SFX.move(); }
  function warp(i) {
    closePop(); SFX.warp(); screenEl.classList.add('dark');
    setTimeout(() => { resetPlayer(i * ZW + 28); st.zone = -1; st.sub = 'field'; st.ended = false; screenEl.classList.remove('dark'); }, reduce ? 0 : 320);
  }
  function resume() { closePop(); SFX.back(); st.sub = 'field'; }
  pc.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.goto) return warp(+b.dataset.goto);
    act(b.dataset.act, b);
  });
  function act(a, b) {
    if (a === 'go' || a === 'close') resume();
    else if (a === 'read') readMore(CH[+(b ? b.dataset.ch : st.zone)]);
    else if (a === 'readall') { powerOff(); setTimeout(() => $('#story').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 60); }
    else if (a === 'again') { closePop(); st.ended = false; st.hintGone = false; buildLevel(); resetPlayer(40); st.zone = -1; st.sub = 'field'; P.moved = false; showHUD(); SFX.start(); }
  }
  function readMore(c) {
    powerOff();
    setTimeout(() => { c.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); c.el.classList.add('flash'); setTimeout(() => c.el.classList.remove('flash'), 2200); }, 60);
  }

  /* ---------- power, modes, playing layout ---------- */
  const wide = () => innerWidth > 960;
  let bootT = 0;
  function powerOn() {
    if (st.on) return;
    st.on = true; audio(); SFX.power();
    dev.classList.add('on'); $('.power', dev).setAttribute('aria-pressed', 'true'); soundBtn.classList.add('show');
    body.classList.add('playing');
    zoomTo(1);
    if (wide()) { scrollTo({ top: 0, behavior: 'instant' }); root.classList.add('lock'); }
    else centerDevice();
    st.mode = 'boot'; showBoot();
    bootT = setTimeout(() => { if (st.mode === 'boot') { SFX.boot(); st.mode = 'title'; showTitle(); } }, reduce ? 150 : 1150);
    if (document.activeElement && document.activeElement !== body) document.activeElement.blur();
  }
  function centerDevice() {
    const r = rigwrap.getBoundingClientRect(), navH = nav.offsetHeight;
    const top = scrollY + r.top - Math.max(navH + 10, (innerHeight - r.height) / 2);
    scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }
  function powerOff() {
    if (!st.on) return;
    if (st.mode === 'play') st.savedX = P.x;
    st.on = false; clearTimeout(bootT); SFX.power(); for (const k in held) held[k] = false;
    dev.classList.remove('on'); $('.power', dev).setAttribute('aria-pressed', 'false'); soundBtn.classList.remove('show');
    body.classList.remove('playing'); root.classList.remove('lock'); zoomTo(0); closePop();
    st.mode = 'off'; st.sub = 'field'; showOff(); clearScreen();
  }
  function startPlay() {
    SFX.start(); screenEl.classList.add('dark');
    setTimeout(() => {
      if (!st.started || st.ended) { buildLevel(); st.started = true; st.ended = false; st.savedX = 40; }
      resetPlayer(st.savedX || 40);
      st.mode = 'play'; st.sub = 'field'; st.zone = -1; P.moved = false; showHUD(); screenEl.classList.remove('dark');
    }, reduce ? 0 : 300);
  }
  function clearScreen() { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#07080a'; cx.fillRect(0, 0, cv.width, cv.height); }

  function press(k) {
    if (k === 'power') return st.on ? powerOff() : powerOn();
    if (!st.on) return;
    if (k === 'esc') return powerOff();
    if (st.mode === 'boot') return;
    if (st.mode === 'title') { if (k === 'a' || k === 'start' || k === 'up') startPlay(); return; }
    if (st.mode !== 'play') return;
    const fresh = now() - st.cardAt > 380;
    if (st.sub === 'field') {
      if (k === 'a' || k === 'up') jumpQueued = true;
      else if (k === 'start' || k === 'select') openMenu();
    } else if (st.sub === 'card') {
      if (!fresh) return;
      if (k === 'a') act('go'); else if (k === 'b') act('read', $('[data-act="read"]', pc));
    } else if (st.sub === 'menu') {
      if (k === 'up') menuMove(-1); else if (k === 'down') menuMove(1);
      else if (k === 'a' && fresh) warp(st.menuSel); else if (k === 'b' || k === 'start' || k === 'select') resume();
    } else if (st.sub === 'end') {
      if (!fresh) return;
      if (k === 'a') act('readall'); else if (k === 'b') act('again');
    }
  }

  /* ---------- input ---------- */
  const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'a', Enter: 'a', k: 'a', K: 'a', j: 'a', J: 'a', Backspace: 'b', l: 'b', L: 'b', Escape: 'esc', m: 'start', M: 'start', Shift: 'select' };
  const BTN = { up: '.u', down: '.d', left: '.l', right: '.r', a: '[data-k="a"]', b: '[data-k="b"]', start: '[data-k="start"]', select: '[data-k="select"]' };
  let inView = true;
  addEventListener('keydown', e => {
    if (!st.on || !inView || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (player.open) return;
    if (t && t.closest && t.closest('button, a') && (e.key === 'Enter' || e.key === ' ') && !t.closest('#device')) return;
    const k = KEYS[e.key]; if (!k) return;
    e.preventDefault();
    if (k in held) { const was = held[k]; held[k] = true; if (k === 'a' || k === 'up') { if (was) return; } }
    if (e.repeat && !(st.sub === 'menu' && (k === 'up' || k === 'down'))) return;
    const b = dev.querySelector(BTN[k]); if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 110); }
    press(k);
  });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k && k in held) held[k] = false; });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });

  // touch and mouse: d-pad and A are hold buttons
  $$('.dpad button, .ab button', dev).forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => {
      if (!st.on) return; e.preventDefault(); audio();
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
      if (k in held) held[k] = true;
      b.classList.add('pressed'); press(k);
    });
    const up = () => { if (k in held) held[k] = false; b.classList.remove('pressed'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  dev.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (b) { if (b.closest('.dpad, .ab') && st.on) return; press(st.on || b.dataset.k === 'power' ? b.dataset.k : 'power'); return; }
    if (!st.on) { press('power'); return; }
    if (e.target.closest('.screen') && st.mode === 'title') press('a');
  });
  $('#play').addEventListener('click', () => { if (!st.on) powerOn(); else if (!wide()) centerDevice(); });
  $('#exit').addEventListener('click', powerOff);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => {
    inView = e.intersectionRatio >= .35;
    if (!inView) for (const k in held) held[k] = false;
  }), { threshold: [0, .35, .6] }).observe(rigwrap);

  /* ---------- the 3D rig: idle tilt, zoom to centre while playing ---------- */
  const rig = $('#rig');
  let zoom = 0, zFrom = 0, zTo = 0, zT0 = 0, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
  function zoomTo(v) { zFrom = zoom; zTo = v; zT0 = now(); }
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; aimX = (e.clientX / innerWidth - .5) * 2; aimY = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  function placeRig(t) {
    const d = reduce ? 1 : Math.min(1, (t - zT0) / 900); zoom = lerp(zFrom, zTo, ease(d));
    tiltX = lerp(tiltX, aimX, .06); tiltY = lerp(tiltY, aimY, .06);
    const z = zoom, small = !wide();
    let tx = 0, ty = 0, s = 1;
    if (z > 0 && !small) {
      const r = rigwrap.getBoundingClientRect(), fit = Math.min((innerHeight * .94) / r.height, (innerWidth * .46) / r.width, 1.9);
      tx = (innerWidth / 2 - (r.left + r.width / 2)) * z; ty = (innerHeight / 2 - (r.top + r.height / 2)) * z; s = lerp(1, Math.max(1, fit), z);
    }
    const amp = reduce ? 0 : lerp(small ? 6 : 12, 2.5, z);
    const ry = lerp(small ? -8 : -24, 0, z) + tiltX * amp, rxx = lerp(small ? 4 : 8, 0, z) - tiltY * amp * .7, rz = lerp(small ? -1 : -3, 0, z);
    rig.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)}) rotateX(${rxx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
  }

  /* ---------- main loop ---------- */
  const STEP = 1000 / 60;
  let last = now(), acc = 0, lastSky = 0;
  function frame(t) {
    const dt = Math.min(100, t - last); last = t;
    placeRig(t);
    const skyGap = st.on ? 140 : (coarse ? 110 : 70);
    if (t - lastSky > skyGap && (scrollY < innerHeight * 1.5 || t - lastSky > 400)) { drawSky(t); lastSky = t; }
    if (st.on && inView) {
      if (st.mode === 'play') {
        acc += dt; let n = 0;
        while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
        if (n === 5) acc = 0;
        render(acc / STEP); hudProgress();
        if (P.moved && !st.hintGone) { st.hintGone = true; const h = $('.hint-run', ui); if (h) h.classList.add('gone'); }
      } else if (st.mode === 'title') {
        resetPlayer(40); tick++; render(1);
      }
    }
    placeCard();
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { sizeSky(); placeCard(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) for (const k in held) held[k] = false; last = now(); });
  sizeSky(); showOff(); clearScreen(); requestAnimationFrame(frame);
})();
