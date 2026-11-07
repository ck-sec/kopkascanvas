/* Kopka's Canvas. The page works without this file. It adds the sky, scroll reveals, the video player and the CK-1 handheld:
   a title menu, an island map with five minigames from my story, and a video channel that plays on the handheld's screen. */
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
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const root = document.documentElement, body = document.body;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- sound ---------- */
  let AC = null, muted = store.get('ck1-muted') === '1';
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
    open: () => { tone(784, .05); tone(1175, .08, .05); },
    back: () => { tone(880, .05); tone(587, .07, .05); },
    move: () => tone(1250, .03, 0, 'square', .02),
    hop: () => tone(330, .14, 0, 'square', .026, 760),
    win: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? .5 : .1, i * .1, 'square', .03)); },
    lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, .18, i * .14, 'square', .03)); },
    count: () => tone(660, .09, 0, 'square', .03),
    go: () => tone(1320, .25, 0, 'square', .035),
    good: () => { tone(988, .05, 0, 'square', .025); tone(1319, .08, .05, 'square', .025); },
    miss: () => tone(220, .12, 0, 'square', .025, 150),
    wrong: () => tone(140, .2, 0, 'sawtooth', .035, 90),
    coin: () => { tone(1319, .05, 0, 'square', .022); tone(1760, .09, .05, 'square', .022); },
    chop: () => { noise(.1, 0, .1, 'lowpass', 800); tone(170, .08, 0, 'square', .03, 80); },
    splash: () => noise(.2, 0, .05, 'highpass', 2400),
    bite: () => { tone(1400, .05, 0, 'square', .03); tone(1400, .05, .09, 'square', .03); },
    reel: () => { [660, 880, 1320].forEach((f, i) => tone(f, .07, i * .05, 'square', .03)); },
    zap: () => { noise(.25, 0, .07, 'bandpass', 900); tone(90, .25, 0, 'sawtooth', .03, 50); },
    whoosh: () => noise(.16, 0, .05, 'bandpass', 1500),
    hit: () => { noise(.12, 0, .08, 'lowpass', 1200); tone(180, .12, 0, 'square', .03, 70); },
    shot: () => tone(1800, .03, 0, 'square', .007, 1200),
    boom: () => { noise(.8, 0, .12, 'lowpass', 600); tone(110, .7, 0, 'sawtooth', .04, 40); },
    bomb: () => { tone(200, .5, 0, 'sawtooth', .03, 1600); noise(.5, 0, .07, 'highpass', 600); },
    whistle: () => tone(1900, .35, 0, 'sine', .05, 2300)
  };
  const soundBtn = $('#sound');
  function paintSound() {
    soundBtn.innerHTML = '<svg viewBox="0 0 10 8" aria-hidden="true"><path fill="currentColor" d="M0 3h2l2-2h1v6H4L2 5H0z"/>' +
      (muted ? '<path fill="currentColor" d="M6 2h1v1H6zM9 2h1v1H9zM7 3h2v2H7zM6 5h1v1H6zM9 5h1v1H9z"/>' : '<path fill="currentColor" d="M6 3h1v2H6zM8 2h1v4H8z"/>') + '</svg>';
    soundBtn.setAttribute('aria-label', muted ? 'Turn game sound on' : 'Mute game sound');
    soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', () => { muted = !muted; store.set('ck1-muted', muted ? '1' : '0'); paintSound(); if (!muted) SFX.move(); });
  paintSound();

  /* ---------- sky: stars + a slow pixel rainbow road ---------- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const sky = $('#sky'), skx = sky.getContext('2d'), SKY_SC = 3;
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
    checker = skx.createPattern(c, 'repeat');
    drawSky(now());
  }
  function drawSky(t) {
    const w = sky.width, h = sky.height;
    skx.fillStyle = '#0d0f0e'; skx.fillRect(0, 0, w, h);
    for (const s of stars) {
      const a = reduce ? .6 : .25 + .75 * Math.abs(Math.sin(t / 1300 * (.4 + s.s) + s.p));
      skx.fillStyle = `rgba(230,235,255,${(a * (.2 + .7 * s.s)).toFixed(2)})`; skx.fillRect(s.x, s.y, 1, 1);
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
    skx.globalAlpha = .75; skx.drawImage(road, 0, 0); skx.globalAlpha = 1;
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
      if (el.matches('.stat, .tile, .vid, .life')) el.style.transitionDelay = (k % 4 * 70) + 'ms';
      io.observe(el);
    });
  } else $$('.rv').forEach(el => el.classList.add('in'));

  const ytSrc = (id, start) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1${start ? '&start=' + (+start) : ''}`;
  const ytFrame = (id, start, title) => `<iframe src="${ytSrc(id, start)}" title="${esc(title || 'Video')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const player = $('#player'), frameBox = $('#frame');
  function closePlayer() { if (player.open) player.close(); }
  player.addEventListener('close', () => { frameBox.innerHTML = ''; });
  player.addEventListener('click', e => { if (e.target === player) closePlayer(); });
  $('#close').addEventListener('click', closePlayer);
  $$('a.vid[data-yt]').forEach(a => {
    a.addEventListener('click', e => {
      if (typeof player.showModal !== 'function' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      player.classList.toggle('vertical', a.hasAttribute('data-vertical'));
      const title = $('.cap b', a);
      frameBox.innerHTML = ytFrame(a.dataset.yt, a.dataset.start, title ? title.textContent : 'Video');
      player.showModal();
    });
  });

  /* ---------- pixel kit ---------- */
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
  function disc(g, cx, cy, r, c) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
  function oval(g, cx, cy, rx, ry, c) { g.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
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
  function blossom(g, x, r, base = 120) {
    R(g, '#6b4a3a', x, base - 24, 3, 24); line(g, x + 1, base - 20, x - 6, base - 28, '#6b4a3a'); line(g, x + 1, base - 22, x + 8, base - 29, '#6b4a3a');
    disc(g, x - 5, base - 32, 7, '#f7b9cb'); disc(g, x + 8, base - 32, 7, '#f7b9cb'); disc(g, x + 1, base - 38, 9, '#fbcad7');
    for (let k = 0; k < 6; k++) R(g, '#ffe4ec', x - 8 + (r() * 18 | 0), base - 42 + (r() * 14 | 0), 1, 1);
  }
  function torii(g, tx, base = 120, h = 40) {
    R(g, '#d8432f', tx, base - h, 4, h); R(g, '#d8432f', tx + 30, base - h, 4, h); R(g, '#d8432f', tx - 6, base - h - 4, 46, 4); R(g, '#1a1410', tx - 8, base - h - 8, 50, 4); R(g, '#d8432f', tx - 2, base - h + 6, 38, 3);
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
  function mkSprite(rows, flip, pal) {
    const P = pal ? Object.assign({}, SPRITES.PAL, pal) : SPRITES.PAL;
    const w = rows[0].length, h = rows.length, c = mkc(w, h), g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && P[ch]) R(g, P[ch], flip ? w - 1 - x : x, y, 1, 1); }));
    return c;
  }
  const SP = {}, SPL = {}, AUT = {}, OPP = {};
  const PAL_AUT = { O: '#d9405b', o: '#9c2340', q: '#ffffff' };
  const PAL_OPP = { H: '#b97a2a', h: '#e3b04e', f: '#f2c6a2', B: '#f2c6a2', O: '#f2c230', o: '#c99a1a', q: '#2f8f4e', P: '#2f6b45', p: '#1f4a30' };
  for (const k in SPRITES.SPR) { SP[k] = mkSprite(SPRITES.SPR[k]); SPL[k] = mkSprite(SPRITES.SPR[k], true); }
  for (const k of ['IDLE', 'RUN0', 'RUN1', 'RUN2', 'JUMP']) { AUT[k] = mkSprite(SPRITES.SPR[k], false, PAL_AUT); OPP[k] = mkSprite(SPRITES.SPR[k], true, PAL_OPP); }
  const RUNF = ['RUN0', 'RUN1', 'RUN2', 'RUN1'];
  const SHIELD = mkSprite(['kkkkkkkkkkk', 'kWWWWWWWWWk', 'kWcccccccdk', 'kWcccccccdk', 'kWcccccccdk', 'kWcccccccdk', '.kcccccccdk', '.kWcccccdk.', '..kWcccdk..', '...kWcdk...', '....kdk....', '.....k.....'],
    false, { k: '#1b1530', W: '#d6ceff', c: '#9b8cff', d: '#6a5acd' });

  /* world layers, built on first use */
  const LAYERS = {};
  function layers(zone) {
    if (LAYERS[zone]) return LAYERS[zone];
    const th = THEMES[zone] || THEMES.canada, seed = [...zone].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1;
    const far = mkc(320, 120), mid = mkc(420, 120);
    th.far(far.getContext('2d'), rng(seed)); th.mid(mid.getContext('2d'), rng(seed + 99));
    return (LAYERS[zone] = { th, far, mid, tile: groundTile(th) });
  }

  /* a still pixel scene of a world: used in the portfolio and on game cards */
  function paintScene(c, zone, color = '#77a0ea') {
    const g = c.getContext('2d'), w = c.width, h = c.height, L = layers(zone), gy = h - 16;
    g.imageSmoothingEnabled = false;
    const gr = g.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, L.th.sky[0]); gr.addColorStop(1, L.th.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.drawImage(L.far, -24, gy - 112); g.drawImage(L.mid, -60, gy - 120);
    for (let x = 0; x < w; x += 16) g.drawImage(L.tile, x, gy);
    g.drawImage(SP.IDLE, 44, gy - 24);
    disc(g, 92, gy - 30, 3, color); R(g, '#ffffff', 91, gy - 32, 1, 1);
  }
  const sceneOf = c => paintScene(c, c.dataset.scene, c.dataset.color);
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { so.unobserve(e.target); sceneOf(e.target); } }), { rootMargin: '600px 0px' });
    $$('canvas[data-scene]').forEach(c => so.observe(c));
  } else $$('canvas[data-scene]').forEach(sceneOf);

  /* ================= the CK-1 handheld ================= */
  const W = 160, H = 144, SC = 3, GY = 120;
  const cv = $('#game'), cx = cv.getContext('2d'), ui = $('#ui'), screenEl = $('#screen'), dev = $('#device'), rigwrap = $('#rigwrap');
  const PXF = '8px "Press Start 2P", ui-monospace, monospace';
  const r3 = v => Math.round(v * SC) / SC;
  function txt(s, x, y, col = '#fff', al = 'left', sh = 'rgba(0,0,0,.75)') {
    cx.font = PXF; cx.textAlign = al; cx.textBaseline = 'top';
    if (sh) { cx.fillStyle = sh; cx.fillText(s, x + 1, y + 1); }
    cx.fillStyle = col; cx.fillText(s, x, y);
  }
  function box(x, y, w, h, fill = 'rgba(10,12,24,.82)', edge = '#ffffff') { R(cx, edge, x + 1, y, w - 2, h); R(cx, edge, x, y + 1, w, h - 2); R(cx, fill, x + 2, y + 2, w - 4, h - 4); }
  function spr(img, x, y, a = 1) { if (a < 1) cx.globalAlpha = a; cx.drawImage(img, r3(x - img.width / 2), r3(y - img.height)); cx.globalAlpha = 1; }
  function fillSky(a, b, h = GY) { const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  function strip(l, r, m) { R(cx, 'rgba(8,10,20,.6)', 0, 0, W, 12); if (l) txt(l, 3, 2); if (m) txt(m, W / 2, 2, '#fff', 'center'); if (r) txt(r, W - 2, 2, '#fff', 'right'); }
  function heart(x, y, c) { R(cx, c, x + 1, y, 2, 1); R(cx, c, x + 4, y, 2, 1); R(cx, c, x, y + 1, 7, 2); R(cx, c, x + 1, y + 3, 5, 1); R(cx, c, x + 2, y + 4, 3, 1); R(cx, c, x + 3, y + 5, 1, 1); }
  const mmss = f => { const s = Math.max(0, Math.ceil(f / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function banner(a, b, col = '#ffd75e') { const w = Math.max(a.length, b ? b.length : 0) * 8 + 16; box(80 - w / 2, 52, w, b ? 34 : 22); txt(a, 80, 59, col, 'center'); if (b) txt(b, 80, 72, '#fff', 'center'); }

  /* effects */
  let parts = [], floats = [], shake = 0, tick = 0;
  function puff(x, y, n, c, sp = 1, g = .1) { if (reduce) n = Math.min(n, 4); for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 2 * sp, vy: -Math.random() * 1.6 * sp, l: 20 + Math.random() * 16, c, s: Math.random() < .5 ? 1 : 2, g }); }
  function float(s, x, y, col = '#fff') { floats.push({ s, x, y, l: 56, col }); }
  function stepFx() {
    tick++;
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.l--; }
    parts = parts.filter(p => p.l > 0);
    for (const f of floats) { f.y -= .35; f.l--; }
    floats = floats.filter(f => f.l > 0);
    if (shake > 0) shake--;
  }
  function drawFx() {
    for (const p of parts) { cx.globalAlpha = Math.min(1, p.l / 12); R(cx, p.c, r3(p.x), r3(p.y), p.s, p.s); }
    cx.globalAlpha = 1;
    for (const f of floats) { cx.globalAlpha = Math.min(1, f.l / 14); txt(f.s, Math.round(f.x), Math.round(f.y), f.col, 'center'); }
    cx.globalAlpha = 1;
  }

  /* progress */
  const ORDER = ['homestead', 'parcels', 'flight', 'dodge', 'boss'];
  let best = {}; try { best = JSON.parse(store.get('ck1-best') || '{}') || {}; } catch (e) { best = {}; }
  let endShown = store.get('ck1-end') === '1';
  const saveBest = () => store.set('ck1-best', JSON.stringify(best));
  const cleared = () => ORDER.filter(id => best[id]).length;
  const totalStars = () => ORDER.reduce((s, id) => s + (best[id] || 0), 0);
  const starHTML = n => `<span class="st-on">${'★'.repeat(n)}</span><span class="st-off">${'★'.repeat(3 - n)}</span>`;

  /* videos come from the portfolio, so the game and the page share one list */
  const VIDS = $$('.vid[data-yt], .vid[data-ytx]').map(a => ({
    id: a.dataset.yt || a.dataset.ytx, start: +a.dataset.start || 0, vertical: a.hasAttribute('data-vertical'), ext: !a.dataset.yt, href: a.href,
    title: ($('.cap b', a) || {}).textContent || 'Video', sub: ($('.cap > span', a) || {}).textContent || '', poster: ($('img', a) || {}).src || ''
  }));
  const vid = id => VIDS.find(v => v.id === id);
  const picSrc = sel => { const el = sel && $(sel); return el ? el.currentSrc || el.src : ''; };

  /* state */
  const st = { on: false, mode: 'off', cardAt: 0, busy: false };
  const held = { left: false, right: false, up: false, down: false, a: false, b: false };
  const ptr = { down: false, x: 0, y: 0, dx: 0, dy: 0 };
  let scene = null;
  function setUI(html) { ui.innerHTML = html; }
  let goTok = 0;
  function go(s, arg, fade = true) {
    const run = () => { if (scene && scene.exit) scene.exit(); scene = s; parts = []; floats = []; shake = 0; ptr.down = false; setUI(''); s.enter(arg); };
    const tok = ++goTok;
    if (!fade || reduce) return run();
    st.busy = true; screenEl.classList.add('dark');
    setTimeout(() => { if (tok !== goTok) return; if (st.on) run(); screenEl.classList.remove('dark'); st.busy = false; }, 260);
  }

  /* ---------- pop-out cards (outside the 3D device, so text stays crisp on phones) ---------- */
  const pc = $('#popcard');
  let pcOpen = false, acts = {};
  function placeCard() {
    if (!pcOpen) return;
    const r = screenEl.getBoundingClientRect(), w = pc.offsetWidth, h = pc.offsetHeight;
    const left = clamp(r.left + r.width / 2 - w / 2, 12, innerWidth - w - 12), top = clamp(r.top + r.height * .55 - h / 2, 12, Math.max(12, innerHeight - h - 12));
    pc.style.left = left + 'px'; pc.style.top = top + 'px';
  }
  function openPop(html, cls, a) {
    acts = a || {}; pc.className = 'popcard ' + (cls || ''); pc.innerHTML = html; pc.hidden = false; pcOpen = true; st.cardAt = now();
    placeCard(); requestAnimationFrame(() => pc.classList.add('show'));
    $$('canvas[data-card-scene]', pc).forEach(c => paintScene(c, c.dataset.cardScene, c.dataset.color));
  }
  function closePop() { pcOpen = false; acts = {}; pc.classList.remove('show'); setTimeout(() => { if (!pcOpen) { pc.hidden = true; pc.innerHTML = ''; } }, 260); }
  pc.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const f = acts[b.dataset.act]; if (f) { e.preventDefault(); audio(); f(); } });
  function cardKey(k) {
    if (now() - st.cardAt < 350) return;
    const f = k === 'a' ? acts.a : k === 'b' ? acts.b : k === 'start' ? (acts.start || acts.a) : k === 'select' ? acts.select : null;
    if (f) f();
  }
  const kA = '<kbd>A</kbd>', kB = '<kbd class="kb">B</kbd>', kS = '<kbd class="ks">▶</kbd>';
  const btn = (act, label, key, ghost) => `<button type="button" data-act="${act}"${ghost ? ' class="ghost"' : ''}>${key || ''}${label}</button>`;
  const mediaOf = g => g.pic ? `<img src="${esc(picSrc(g.pic))}" alt="${esc(g.alt || '')}">` : `<canvas data-card-scene="${g.scene}" data-color="${g.color}" width="192" height="108" aria-hidden="true"></canvas>`;

  function openIntro(g) {
    SFX.open();
    const how = (coarse && g.howTouch) || g.how;
    openPop(`<div class="pc-body intro" style="--zc:${g.color}"><p class="lv"><i></i>${esc(g.year)} · ${esc(g.place)}</p><h3 id="pc-title">${esc(g.name)}</h3><p class="s">${esc(g.story)}</p>
      <ul class="pc-how" aria-label="How to play">${how.map(([k, t]) => `<li>${k ? `<span>${esc(k)}</span>` : ''}${esc(t)}</li>`).join('')}</ul>
      <div class="pc-acts">${btn('a', 'Start', kA)}${btn('b', 'Back to map', kB, 1)}</div></div>`, 'intro', {
      a: () => { closePop(); SFX.start(); RUN.ph = 'count'; RUN.t = 0; },
      b: () => { closePop(); SFX.back(); go(MAP); }
    });
  }
  function openResult(g) {
    const stars = clamp(g.stars(), 1, 3), won = g.won !== false;
    if (won) { best[g.id] = Math.max(best[g.id] || 0, stars); saveBest(); }
    const v = g.vids.map(vid).filter(Boolean)[0];
    const a = {
      a: won ? () => { closePop(); SFX.back(); go(MAP, { after: true }); } : () => { closePop(); go(RUN, g.id); },
      b: () => readMore(g.read),
      map: () => { closePop(); SFX.back(); go(MAP, { after: true }); }
    };
    if (v) a.start = () => { closePop(); go(TV, { id: v.id, ret: 'map' }); };
    SFX.open();
    openPop(`<div class="pc-media" style="--zc:${g.color}">${mediaOf(g)}<span class="yr"><i></i>${esc(g.year)}</span></div>
      <div class="pc-body" style="--zc:${g.color}"><p class="pc-stars" aria-label="${stars} of 3 stars">${starHTML(stars)}<span class="lbl">${won ? 'Cleared' : 'So close'}</span></p>
      <p class="pc-score">${esc(g.summary())}</p><h3 id="pc-title">${esc(g.title)}</h3><p class="s">${esc(g.real)}</p>
      <div class="pc-acts">${btn('a', won ? 'Back to map' : 'Try again', kA)}${v ? btn('start', 'Watch', kS, 1) : ''}${btn('b', 'Read more', kB, 1)}</div>
      ${won ? '' : '<button type="button" class="pc-link" data-act="map">Skip to the map</button>'}</div>`, 'result', a);
  }
  function openEnd() {
    endShown = true; store.set('ck1-end', '1'); SFX.win();
    openPop(`<div class="pc-body"><p class="pc-trophy">ALL 5 ISLANDS CLEARED</p><h3 id="pc-title">Thanks for playing</h3>
      <p class="s">You earned ${totalStars()} of 15 stars. The full story, with photos and talks, is right below the handheld.</p>
      <div class="pc-acts">${btn('a', 'See my portfolio', kA)}<a class="ghost" href="mailto:Christoph@kopkascanvas.com">Email me</a>${btn('b', 'Back to the map', kB, 1)}</div></div>`, 'end', {
      a: () => readMore('#work'), b: () => { closePop(); SFX.back(); }
    });
  }
  function openAbout() {
    SFX.open();
    openPop(`<div class="pc-body about"><img class="pc-avatar" src="${esc(picSrc('.contact .avatar'))}" alt="" width="240" height="300">
      <p class="lv">About me</p><h3 id="pc-title">Hi, I'm Christoph</h3>
      <p class="s">I take complex tech to market. Today that's Microsoft Security in Germany, Austria and Switzerland. Before that I spent five years at SAP with governments and postal services worldwide. Off the clock I captain Austria's dodgeball team.</p>
      <div class="pc-acts">${btn('a', 'Back', kA)}<a class="ghost" href="mailto:Christoph@kopkascanvas.com">Email me</a>${btn('b', 'Portfolio', kB, 1)}</div></div>`, 'about', {
      a: () => { closePop(); SFX.back(); }, b: () => readMore('#work')
    });
  }
  function openPause() {
    SFX.open();
    openPop(`<div class="pc-body"><p class="lv">Paused</p><h3 id="pc-title">${esc(RUN.g.name)}</h3><p class="s">Take a breath. The game waits for you.</p>
      <div class="pc-acts">${btn('a', 'Resume', kA)}${btn('b', 'Quit to map', kB, 1)}</div></div>`, 'pause', {
      a: () => { closePop(); SFX.back(); }, b: () => { closePop(); go(MAP); }
    });
  }
  function readMore(sel) {
    const el = $(sel); powerOff(); if (!el) return;
    setTimeout(() => { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2400); }, 60);
  }

  /* ---------- title ---------- */
  const MENU = ['STORY MODE', 'VIDEOS', 'ABOUT ME'];
  const TSTARS = Array.from({ length: 46 }, (_, i) => ({ x: (i * 53) % 160, y: (i * 29) % 70, p: i * 1.7 }));
  const TITLE = {
    sel: 0, off: 0,
    enter() { this.paint(); },
    paint() {
      setUI(`<div class="title"><p class="t-sub">THE STORY SO FAR</p><p class="t-logo" data-t="KOPKA'S">KOPKA'S</p><p class="t-logo" data-t="CANVAS">CANVAS</p>
        <ul class="t-menu">${MENU.map((m, i) => `<li data-ui="${i}"${i === this.sel ? ' class="sel"' : ''}>${m}</li>`).join('')}</ul>
        <p class="t-foot">${coarse ? 'TAP A CHOICE' : '↑↓ CHOOSE · ENTER SELECT'}</p></div>`);
    },
    move(d) { this.sel = (this.sel + d + MENU.length) % MENU.length; $$('.t-menu li', ui).forEach((li, i) => li.classList.toggle('sel', i === this.sel)); SFX.move(); },
    choose() { if (this.sel === 0) { SFX.start(); go(MAP); } else if (this.sel === 1) { SFX.start(); go(TV, { ret: 'title' }); } else openAbout(); },
    press(k) { if (k === 'up') this.move(-1); else if (k === 'down') this.move(1); else if (k === 'a' || k === 'start') this.choose(); },
    ui(v) { this.sel = +v; this.paint(); this.choose(); },
    step() { this.off += .3; },
    render() {
      const L = layers('canada');
      fillSky('#0a1030', '#3b3a86');
      for (const s of TSTARS) { cx.globalAlpha = .35 + .65 * Math.abs(Math.sin(tick / 50 + s.p)); R(cx, '#fff', s.x, s.y, 1, 1); }
      cx.globalAlpha = 1; disc(cx, 132, 20, 7, '#fff3c4'); disc(cx, 135, 18, 2, '#efe2a8');
      const o = this.off;
      cx.globalAlpha = .9; cx.drawImage(L.far, -(o * .2 % 320), 0); cx.drawImage(L.far, 320 - (o * .2 % 320), 0); cx.globalAlpha = 1;
      R(cx, 'rgba(14,18,64,.5)', 0, 0, W, GY);
      cx.drawImage(L.mid, -(o * .5 % 420), 0); cx.drawImage(L.mid, 420 - (o * .5 % 420), 0);
      R(cx, 'rgba(10,12,46,.42)', 0, 0, W, GY);
      for (let x = -(o % 16); x < W; x += 16) cx.drawImage(L.tile, Math.round(x), GY);
      R(cx, 'rgba(10,12,46,.35)', 0, GY, W, H - GY);
      spr(SP[RUNF[(tick >> 3) % 4]], 26, GY);
    }
  };

  /* ---------- island map ---------- */
  const ISLES = [{ id: 'homestead', x: 26, y: 84 }, { id: 'parcels', x: 50, y: 44 }, { id: 'flight', x: 84, y: 74 }, { id: 'dodge', x: 116, y: 42 }, { id: 'boss', x: 136, y: 84 }];
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const WAVES = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 160, y: 6 + (i * 23) % 132, p: i }));
  const MAP = {
    sel: 0, hop: null,
    enter(o) {
      this.hop = null; this.paint();
      if (o && o.after && cleared() === ORDER.length && !endShown) setTimeout(() => { if (scene === MAP && !pcOpen) openEnd(); }, 500);
    },
    locked(i) { return ISLES[i].id === 'boss' && !best.boss && cleared() < 2; },
    paint() {
      const I = ISLES[this.sel], g = GAMES[I.id], s = best[I.id] || 0, lock = this.locked(this.sel);
      setUI(`<div class="mp"><div class="mp-top"><span class="pill"><svg viewBox="0 0 10 10" aria-hidden="true"><path fill="#ffd75e" d="M5 0l1.4 3.3L10 3.6 7.3 6l.8 3.5L5 7.7 1.9 9.5 2.7 6 0 3.6l3.6-.3z"/></svg>${totalStars()}/15</span><span class="pill dim">B · MENU</span></div>
        <div class="mp-box${lock ? ' locked' : ''}" style="--zc:${g.color}"><p class="mp-y">${esc(g.year)} · ${esc(g.place)}</p><p class="mp-n">${esc(g.name)}</p>
        <p class="mp-s">${lock ? 'Clear 2 islands to unlock' : s ? starHTML(s) : esc(g.teaser)}</p><p class="mp-a" data-ui="go">${lock ? 'LOCKED' : '<b>A</b> PLAY'}</p></div></div>`);
    },
    near(k) {
      const [vx, vy] = DIRS[k], a = ISLES[this.sel]; let bi = -1, bs = 1e9;
      ISLES.forEach((b, j) => { if (j === this.sel) return; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), dot = (dx * vx + dy * vy) / d; if (dot < .3) return; const s = d / (dot * dot); if (s < bs) { bs = s; bi = j; } });
      return bi;
    },
    hopTo(j) { if (j < 0 || j === this.sel) return; this.hop = { a: this.sel, t: 0 }; this.sel = j; SFX.hop(); this.paint(); },
    play() {
      if (this.locked(this.sel)) { SFX.wrong(); shake = 6; float('LOCKED', ISLES[this.sel].x, ISLES[this.sel].y - 34, '#ff8a80'); return; }
      SFX.start(); go(RUN, ISLES[this.sel].id);
    },
    press(k) {
      if (this.hop) return;
      if (DIRS[k]) this.hopTo(this.near(k));
      else if (k === 'a' || k === 'start') this.play();
      else if (k === 'b' || k === 'select') { SFX.back(); go(TITLE); }
    },
    ui(v) { if (v === 'go') this.play(); },
    tap(x, y) {
      const j = ISLES.findIndex(I => Math.abs(x - I.x) < 18 && y > I.y - 30 && y < I.y + 10);
      if (j < 0) return; if (j === this.sel && !this.hop) this.play(); else this.hopTo(j);
    },
    step() { if (this.hop && ++this.hop.t >= 20) this.hop = null; },
    render() {
      R(cx, '#2b62ad', 0, 0, W, H);
      for (let y = 0; y < H; y += 4) if ((y / 4) % 2) R(cx, 'rgba(255,255,255,.025)', 0, y, W, 2);
      for (const w of WAVES) { const x = Math.round((w.x + tick * .08 + Math.sin(tick / 40 + w.p) * 2) % 164) - 2; R(cx, 'rgba(210,235,255,.45)', x, w.y, 3, 1); R(cx, 'rgba(210,235,255,.25)', x + 3, w.y - 1, 2, 1); }
      for (let i = 0; i < ISLES.length - 1; i++) { const a = ISLES[i], b = ISLES[i + 1]; for (let k = 2; k < 14; k += 2) { const t = k / 15; R(cx, 'rgba(255,255,255,.55)', Math.round(lerp(a.x, b.x, t)), Math.round(lerp(a.y, b.y, t) - 3 - Math.sin(t * Math.PI) * 6), 1, 1); } }
      [...ISLES.keys()].sort((i, j) => ISLES[i].y - ISLES[j].y).forEach(i => this.isle(i));
      const B = ISLES[this.sel]; let px = B.x, py = B.y - 6;
      if (this.hop) { const A = ISLES[this.hop.a], t = smooth(this.hop.t / 20); px = lerp(A.x, B.x, t); py = lerp(A.y - 6, B.y - 6, t) - Math.sin(t * Math.PI) * 18; }
      spr(this.hop ? SP.JUMP : SP.IDLE, px, py + (this.hop ? 0 : Math.round(Math.sin(tick / 14))));
      if (!this.hop) { const ay = py - 30 + Math.round(Math.sin(tick / 9) * 1.5); R(cx, '#ffd75e', px - 3, ay, 7, 1); R(cx, '#ffd75e', px - 2, ay + 1, 5, 1); R(cx, '#ffd75e', px - 1, ay + 2, 3, 1); R(cx, '#ffd75e', px, ay + 3, 1, 1); }
    },
    isle(i) {
      const I = ISLES[i], x = I.x, y = I.y, id = I.id, g = cx, dark = id === 'boss';
      cx.globalAlpha = .45 + .25 * Math.sin(tick / 20 + i); oval(g, x, y + 1, 21, 9, '#e6f4ff'); cx.globalAlpha = 1;
      oval(g, x, y, 19, 8, dark ? '#4a4f68' : '#e8d39a'); oval(g, x, y + 3, 18, 5, dark ? '#353a52' : '#cdb57a');
      oval(g, x, y - 1, 15, 5, dark ? '#2c3047' : '#6cc957'); R(g, dark ? '#3c4160' : '#8be070', x - 9, y - 5, 10, 1);
      if (id === 'homestead') {
        pine(g, x - 13, y + 1, 13, '#2f6b45', '#4a8f5c'); pine(g, x + 10, y + 1, 11, '#24563a', '#3b7a4f');
        R(g, '#8b5a3a', x - 5, y - 9, 11, 7); for (let k = 0; k < 3; k++) R(g, '#6e4529', x - 5, y - 8 + k * 2, 11, 1); R(g, '#3a2414', x - 1, y - 6, 3, 4);
        for (let k = 0; k < 5; k++) R(g, '#5a3a24', x - 6 + k, y - 10 - k, 13 - k * 2, 1); for (let k = 0; k < 4; k++) R(g, '#ffffff', x - 4 + k, y - 11 - k, 2, 1);
        R(g, '#5a3a24', x + 3, y - 15, 2, 4); const sm = (tick >> 4) % 3; R(g, '#d9dde3', x + 3 + sm, y - 18 - sm, 2, 2);
      } else if (id === 'parcels') {
        R(g, '#f2c230', x - 7, y - 12, 14, 10); R(g, '#c4372b', x - 8, y - 13, 16, 2); R(g, '#3a2414', x - 2, y - 7, 4, 5); R(g, '#ffffff', x - 3, y - 11, 6, 3); line(g, x - 3, y - 11, x, y - 9, '#c4372b'); line(g, x + 2, y - 11, x, y - 9, '#c4372b');
        R(g, '#c08a52', x + 8, y - 6, 6, 5); R(g, '#c08a52', x + 9, y - 10, 5, 4); R(g, '#e9d8b0', x + 10, y - 6, 1, 5);
      } else if (id === 'flight') {
        R(g, '#5d6270', x - 13, y - 3, 26, 4); for (let k = -10; k < 12; k += 5) R(g, '#ffffff', x + k, y - 2, 3, 1);
        const by = y - 9 + Math.round(Math.sin(tick / 16)); R(g, '#f4f4f4', x - 5, by, 10, 3); R(g, '#d9405b', x - 6, by - 3, 2, 4); R(g, '#cfd6e0', x - 2, by + 1, 6, 1); R(g, '#3a3f55', x + 5, by + ((tick >> 2) & 1 ? -1 : 1), 1, 3); R(g, '#7fd3ff', x + 2, by, 2, 1);
        R(g, '#ff8a3d', x + 11, y - 12, 4, 2); R(g, '#e9e2dc', x + 10, y - 12, 1, 10);
      } else if (id === 'dodge') {
        R(g, '#ffffff', x - 12, y - 8, 24, 9); R(g, '#3d7bd9', x - 11, y - 7, 22, 7); R(g, '#ffffff', x, y - 7, 1, 7);
        const bx = x - 5 + Math.round(Math.abs(Math.sin(tick / 22)) * 10); disc(g, bx, y - 12 - Math.round(Math.abs(Math.sin(tick / 11)) * 4), 2, '#e8413a');
        R(g, '#d9405b', x - 9, y - 6, 2, 3); R(g, '#f2c230', x + 7, y - 6, 2, 3);
      } else {
        const lock = this.locked(i);
        R(g, '#20243a', x - 11, y - 18, 22, 17); R(g, '#20243a', x - 14, y - 24, 6, 23); R(g, '#20243a', x + 8, y - 24, 6, 23); R(g, '#20243a', x - 3, y - 30, 6, 13);
        for (const [a, b] of [[-14, -25], [8, -25], [-3, -31]]) for (let k = 0; k < 6; k += 2) R(g, '#20243a', x + a + k, y + b, 1, 1);
        const glow = lock ? '#4a4f78' : (tick >> 4) % 2 ? '#b7acff' : '#9b8cff';
        R(g, glow, x - 12, y - 18, 2, 3); R(g, glow, x + 10, y - 18, 2, 3); R(g, glow, x - 1, y - 26, 2, 3); R(g, glow, x - 3, y - 9, 6, 8);
        R(g, '#e9e2dc', x, y - 38, 1, 8); R(g, (tick >> 5) % 2 ? '#ff4b4b' : '#6b1d1d', x - 1, y - 39, 3, 2);
        if (lock) {
          cloud(g, x - 10, y - 40, 1, '#5b6078', '#454a60');
          if ((tick % 150) < 6) { line(g, x + 2, y - 36, x - 2, y - 30, '#ffe066'); line(g, x - 2, y - 30, x + 3, y - 25, '#ffe066'); }
          R(g, '#ffd75e', x - 4, y - 7, 9, 7); R(g, '#c9a23a', x - 4, y - 1, 9, 1); R(g, '#ffd75e', x - 3, y - 11, 1, 4); R(g, '#ffd75e', x + 3, y - 11, 1, 4); R(g, '#ffd75e', x - 2, y - 12, 5, 1); R(g, '#20243a', x, y - 5, 1, 2);
        }
      }
      const s = best[id];
      if (s) { const fy = y - 30; R(g, '#ececec', x + 13, fy, 1, 18); R(g, GAMES[id].color, x + 14, fy, 7, 5); R(g, '#ffffff66', x + 14, fy, 7, 1); for (let k = 0; k < s; k++) R(g, '#ffd75e', x + 14 + k * 2, fy + 2, 1, 1); }
    }
  };

  /* ---------- the video channel: a carousel on the screen, videos play right on the handheld ---------- */
  const TV = {
    i: 0, ret: 'title', playing: false,
    enter(o = {}) {
      this.ret = o.ret || 'title'; this.playing = false;
      if (o.id) { const j = VIDS.findIndex(v => v.id === o.id); if (j >= 0) this.i = j; }
      this.paint(); if (o.id) this.play();
    },
    paint() {
      const v = VIDS[this.i]; if (!v) { setUI('<div class="vc"><p class="vc-empty">No videos yet</p></div>'); return; }
      setUI(`<div class="vc"><div class="vc-media"><img src="${esc(v.poster)}" alt=""><span class="vc-play" aria-hidden="true"></span>
        <button type="button" class="vc-arr l" data-ui="prev" aria-label="Previous video">◀</button><button type="button" class="vc-arr r" data-ui="next" aria-label="Next video">▶</button>
        <span class="vc-dots">${VIDS.map((_, j) => `<i${j === this.i ? ' class="on"' : ''}></i>`).join('')}</span>${v.vertical ? '<span class="vc-tag">SHORT</span>' : ''}</div>
        <div class="vc-box"><p class="vc-t">${esc(v.title)}</p><p class="vc-s">${esc(v.sub)}</p>
        <p class="vc-k"><span data-ui="play"><b class="ka">A</b>${v.ext ? 'OPEN' : 'PLAY'}</span><span data-ui="back"><b class="kb">B</b>BACK</span></p></div></div>`);
    },
    move(d) { if (!VIDS.length) return; this.i = (this.i + d + VIDS.length) % VIDS.length; SFX.move(); this.paint(); },
    play() {
      const v = VIDS[this.i]; if (!v) return;
      if (v.ext) { window.open(v.href, '_blank', 'noopener'); return; }
      this.playing = true; SFX.open();
      const wrap = document.createElement('div'); wrap.className = 'tv' + (v.vertical ? ' vertical' : '');
      wrap.innerHTML = `<div class="tv-frame">${ytFrame(v.id, v.start, v.title)}</div><button type="button" class="tv-back" data-ui="back"><b class="kb">B</b>BACK</button>`;
      screenEl.appendChild(wrap); screenEl.removeAttribute('aria-hidden');
    },
    stop() { const w = $('.tv', screenEl); if (w) w.remove(); screenEl.setAttribute('aria-hidden', 'true'); this.playing = false; },
    back() { if (this.playing) { this.stop(); SFX.back(); if (this.ret === 'map') go(MAP); return; } SFX.back(); go(this.ret === 'map' ? MAP : TITLE); },
    press(k) {
      if (this.playing) { if (k === 'b' || k === 'select') this.back(); return; }
      if (k === 'left' || k === 'up') this.move(-1); else if (k === 'right' || k === 'down') this.move(1);
      else if (k === 'a' || k === 'start') this.play(); else if (k === 'b' || k === 'select') this.back();
    },
    ui(v) { if (v === 'prev') this.move(-1); else if (v === 'next') this.move(1); else if (v === 'play') this.play(); else if (v === 'back') this.back(); },
    exit() { this.stop(); },
    step() {},
    render() { fillSky('#14162a', '#07080f', H); for (let y = (tick >> 1) % 3; y < H; y += 3) R(cx, 'rgba(255,255,255,.025)', 0, y, W, 1); }
  };

  /* ---------- minigame runner: intro card, countdown, play, result card ---------- */
  const RUN = {
    g: null, ph: 'intro', t: 0,
    enter(id) { this.g = GAMES[id]; this.g.over = false; this.g.won = true; this.g.init(); this.ph = 'intro'; this.t = 0; openIntro(this.g); },
    step() {
      const g = this.g; this.t++;
      if (this.ph === 'count') { if (this.t === 1 || this.t === 26) SFX.count(); if (this.t === 52) SFX.go(); if (this.t >= 70) { this.ph = 'play'; this.t = 0; } }
      else if (this.ph === 'play') { g.update(); if (g.over) { this.ph = 'done'; this.t = 0; (g.won !== false ? SFX.win : SFX.lose)(); } }
      else if (this.ph === 'done') { if (g.after) g.after(); if (this.t === 95) openResult(g); }
    },
    render() {
      this.g.draw();
      if (this.ph === 'count') { const s = this.t < 52 ? (this.t < 26 ? 'READY' : 'SET') : 'GO!'; banner(s, null, this.t < 52 ? '#ffffff' : '#7cf2c6'); }
      else if (this.ph === 'done' && this.t > 10) banner(this.g.won !== false ? (this.g.doneText || 'CLEAR!') : (this.g.failText || 'SO CLOSE!'), null, this.g.won !== false ? '#ffd75e' : '#ff8a80');
    },
    press(k) { if (this.ph !== 'play') return; if (k === 'start') return openPause(); this.g.key(k); },
    exit() {}
  };

  /* ================= the five minigames =================
     Each game: init(), update() at 60 Hz, draw(), key(k), stars() 1 to 3, summary() for the result card.
     Card copy (story, real result) lives here; photos and videos are read from the portfolio below. */
  const GAMES = {};

  /* --- 1. Homestead: Canada 2015. Three chores: water the garden, chop wood, catch dinner --- */
  function fishy(x, y, c = '#f08a5d') { x = Math.round(x); y = Math.round(y); R(cx, c, x - 3, y - 2, 6, 4); R(cx, c, x - 4, y - 1, 1, 2); R(cx, c, x + 3, y - 1, 1, 2); R(cx, c, x + 4, y - 2, 1, 4); R(cx, '#1b1530', x - 2, y - 1, 1, 1); R(cx, '#ffd0b0', x - 2, y + 1, 4, 1); }
  GAMES.homestead = {
    id: 'homestead', name: 'Homestead', year: '2015', place: 'Western Canada', color: '#7fca86', scene: 'canada', read: '#l-canada', vids: [],
    teaser: 'Garden, woodpile, fishing',
    story: 'A gap year on organic farms in western Canada. Every host had a different job for me. Today: the garden, the woodpile and dinner.',
    how: [['← →', 'walk'], ['A', 'water the plants, chop when the marker is green, reel in when you see !']],
    title: 'A year on Canadian farms',
    real: 'In 2015 I worked my way across organic farms in western Canada. A new host and a new problem every few weeks taught me to adapt fast.',
    init() { this.stage = -1; this.res = { plants: 0, logs: 0, fish: 0 }; this.next(); },
    next() {
      this.stage++; this.t = 0; this.ban = 80; this.endT = 0;
      if (this.stage === 0) { this.px = 18; this.face = 1; this.walk = 0; this.cd = 0; this.pour = 0; this.plants = [34, 58, 82, 106, 130].map((x, i) => ({ x, g: 0, k: i % 3, w: 0 })); this.dur = 720; }
      else if (this.stage === 1) { this.ph = 0; this.chop = 0; this.stun = 0; this.halves = []; this.logY = 0; this.dur = 600; }
      else if (this.stage === 2) { this.fs = 'cast'; this.ft = 0; this.tx = 120; this.wait = 60; this.dur = 720; }
      else this.over = true;
    },
    cast() { this.fs = 'cast'; this.ft = 0; this.tx = 106 + Math.random() * 40 | 0; SFX.whoosh(); },
    stars() { const r = this.res; return (r.plants >= 4) + (r.logs >= 5) + (r.fish >= 2); },
    summary() { const r = this.res; return `You grew ${r.plants} of 5 plants, split ${r.logs} log${r.logs === 1 ? '' : 's'} and caught ${r.fish} fish.`; },
    update() {
      if (this.ban > 0) { this.ban--; return; }
      this.t++;
      const s = this.stage;
      if (s === 0) {
        const d = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        if (d) { this.px = clamp(this.px + d * 1.3, 10, 150); this.face = d; this.walk += .17; }
        if (this.cd > 0) this.cd--; if (this.pour > 0) this.pour--;
        for (const p of this.plants) if (p.w > 0) p.w--;
        this.res.plants = this.plants.filter(p => p.g >= 3).length;
        if (this.res.plants === 5 && !this.endT) { this.endT = 45; float('ALL GROWN!', 80, 40, '#ffd75e'); }
        if (this.endT && --this.endT === 0) return this.next();
        if (this.t >= this.dur && !this.endT) return this.next();
      } else if (s === 1) {
        this.ph += .055 + this.res.logs * .007;
        if (this.chop > 0) this.chop--; if (this.stun > 0) this.stun--;
        if (this.logY < 0) this.logY = Math.min(0, this.logY + 7);
        for (const h of this.halves) { h.x += h.vx; h.y += h.vy; h.vy += .25; if (h.y > 114) { h.y = 114; h.vx *= .6; h.vy = 0; h.l--; } }
        this.halves = this.halves.filter(h => h.l > 0);
        if (this.t >= this.dur) return this.next();
      } else if (s === 2) {
        this.ft++;
        if (this.fs === 'cast') { if (this.ft >= 20) { this.fs = 'wait'; this.ft = 0; this.wait = 45 + Math.random() * 85 | 0; } }
        else if (this.fs === 'wait') { if (this.ft >= this.wait) { this.fs = 'bite'; this.ft = 0; SFX.bite(); } }
        else if (this.fs === 'bite') { if (this.ft >= 34) { this.fs = 'miss'; this.ft = 0; float('TOO LATE', this.tx, 88, '#ff8a80'); } }
        else if (this.ft >= 34) this.cast();
        if (this.t >= this.dur && this.fs !== 'reel') return this.next();
      }
    },
    key(k) {
      if (this.ban > 0 || k !== 'a') return;
      const s = this.stage;
      if (s === 0 && this.cd <= 0) {
        this.cd = 9; this.pour = 12;
        const at = this.px + this.face * 7, p = this.plants.filter(p => p.g < 3 && Math.abs(p.x - at) < 12).sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at))[0];
        if (p) { p.g++; p.w = 12; SFX.splash(); puff(p.x, GY - 10, 5, '#7fd3ff', .5); if (p.g === 3) { SFX.good(); float('+1', p.x, GY - 34, '#b6f5a0'); } }
      } else if (s === 1 && this.chop <= 0 && this.stun <= 0 && this.logY === 0) {
        const pos = (Math.sin(this.ph) + 1) / 2, d = Math.abs(pos - .5), gw = Math.max(.05, .11 - this.res.logs * .007);
        this.chop = 16;
        if (d < gw + .13) {
          const perfect = d < gw; this.res.logs++; SFX.chop(); shake = perfect ? 4 : 2;
          this.halves.push({ x: 91, y: 100, vx: -1.4, vy: -2.6, l: 26 }, { x: 98, y: 100, vx: 1.4, vy: -2.6, l: 26 });
          puff(94, 100, 8, '#e0b27a', 1); float(perfect ? 'PERFECT' : 'GOOD', 94, 64, perfect ? '#ffd75e' : '#ffffff');
          this.logY = -120;
        } else { this.stun = 26; SFX.miss(); float('MISS', 94, 64, '#ff8a80'); }
      } else if (s === 2) {
        if (this.fs === 'wait') { this.fs = 'miss'; this.ft = 0; float('TOO EARLY', this.tx, 88, '#ff8a80'); SFX.miss(); }
        else if (this.fs === 'bite') { this.fs = 'reel'; this.ft = 0; this.res.fish++; SFX.reel(); puff(this.tx, 114, 8, '#bfe8ff', .8); }
      }
    },
    draw() {
      const s = clamp(this.stage, 0, 2), L = layers('canada');
      const sk = [['#86c9f2', '#e8f6ff'], ['#5aaeea', '#d4efff'], ['#ee8a5e', '#ffd39b']][s];
      fillSky(sk[0], sk[1]);
      cx.drawImage(L.far, -40, 0); if (s === 2) R(cx, 'rgba(255,130,70,.2)', 0, 0, W, GY);
      cx.drawImage(L.mid, -90, 0); if (s === 2) R(cx, 'rgba(110,40,50,.15)', 0, 0, W, GY);
      if (s === 2) { for (let x = 0; x < 80; x += 16) cx.drawImage(L.tile, x, GY); this.drawFish(); }
      else { for (let x = 0; x < W; x += 16) cx.drawImage(L.tile, x, GY); s === 0 ? this.drawGarden() : this.drawChop(); }
      const left = this.dur - this.t, val = s === 0 ? `${this.res.plants}/5 GROWN` : s === 1 ? `${this.res.logs} LOGS` : `${this.res.fish} FISH`;
      strip(val, mmss(left));
      for (let i = 0; i < 3; i++) R(cx, i < s ? '#7cf2c6' : i === s ? '#ffffff' : 'rgba(255,255,255,.3)', 96 + i * 7, 4, 4, 4);
      if (this.ban > 0 && RUN.ph === 'play') banner(['WATER THE GARDEN', 'CHOP SOME WOOD', 'CATCH DINNER'][s], ['MORNING', 'NOON', 'EVENING'][s]);
    },
    drawGarden() {
      for (let x = 2; x < W; x += 12) { R(cx, '#a07a4c', x, GY - 17, 2, 17); R(cx, '#80603a', x + 1, GY - 17, 1, 17); }
      R(cx, '#a07a4c', 0, GY - 14, W, 2); R(cx, '#a07a4c', 0, GY - 8, W, 2); R(cx, '#80603a', 0, GY - 13, W, 1); R(cx, '#80603a', 0, GY - 7, W, 1);
      R(cx, '#5a3a24', 22, GY - 3, 120, 4); R(cx, '#6e4529', 22, GY - 3, 120, 1);
      for (const p of this.plants) {
        oval(cx, p.x, GY - 2, 8, 2, '#3f2818'); R(cx, '#8b5a3a', p.x - 6, GY - 4, 13, 1);
        const x = p.x + (p.w > 0 ? Math.round(Math.sin(p.w * .9)) : 0);
        if (p.g === 0) R(cx, '#5a3a24', x - 1, GY - 2, 3, 1);
        if (p.g === 1) { R(cx, '#3f8f3a', x, GY - 6, 1, 5); R(cx, '#6cc957', x - 2, GY - 7, 2, 1); R(cx, '#6cc957', x + 1, GY - 8, 2, 1); }
        if (p.g === 2) { R(cx, '#3f8f3a', x, GY - 11, 1, 10); R(cx, '#6cc957', x - 3, GY - 8, 3, 2); R(cx, '#6cc957', x + 1, GY - 11, 3, 2); R(cx, '#8be070', x - 2, GY - 13, 2, 1); }
        if (p.g >= 3) {
          if (p.k === 0) { R(cx, '#3f8f3a', x - 6, GY - 5, 4, 2); R(cx, '#3f8f3a', x + 3, GY - 6, 4, 2); disc(cx, x, GY - 5, 4, '#f08a24'); R(cx, '#c9600f', x - 2, GY - 8, 1, 7); R(cx, '#c9600f', x + 2, GY - 8, 1, 7); R(cx, '#ffb35c', x - 3, GY - 7, 1, 2); R(cx, '#5a8f2a', x, GY - 11, 2, 3); }
          else if (p.k === 1) { R(cx, '#3f8f3a', x, GY - 20, 1, 19); R(cx, '#6cc957', x - 4, GY - 10, 4, 2); R(cx, '#6cc957', x + 1, GY - 14, 4, 2); disc(cx, x, GY - 22, 4, '#ffd23f'); disc(cx, x, GY - 22, 2, '#7a4a1a'); }
          else { disc(cx, x, GY - 5, 5, '#5fbf5a'); disc(cx, x, GY - 6, 3, '#b6f0a8'); R(cx, '#3f8f3a', x - 4, GY - 3, 8, 1); }
        } else { const dy = GY - 22 - p.g * 3 + Math.round(Math.sin(tick / 10 + p.x)); R(cx, '#bfe8ff', p.x, dy, 1, 1); R(cx, '#7fd3ff', p.x - 1, dy + 1, 3, 2); R(cx, '#4fa8e0', p.x - 1, dy + 3, 3, 1); }
      }
      const moving = held.left || held.right, set = this.face > 0 ? SP : SPL;
      spr(moving ? set[RUNF[Math.floor(this.walk) % 4]] : set.IDLE, this.px, GY);
      const wx = Math.round(this.px + this.face * 7), wy = GY - 12;
      R(cx, '#7d8791', wx - 3, wy, 6, 4); R(cx, '#c9d1da', wx - 3, wy, 6, 1); R(cx, '#7d8791', this.face > 0 ? wx + 3 : wx - 5, wy - (this.pour > 0 ? 0 : 1), 2, 1);
      if (this.pour > 0) for (let k = 0; k < 3; k++) R(cx, '#7fd3ff', wx + this.face * (5 + k), wy + 2 + ((tick + k * 3) % 8), 1, 2);
    },
    drawChop() {
      for (let k = 0; k < this.res.logs; k++) { const col = k % 5, row = k / 5 | 0, x = 10 + col * 7 + (row % 2) * 3, y = GY - 4 - row * 6; disc(cx, x, y, 3, '#a8703f'); disc(cx, x, y, 1, '#e0b27a'); }
      R(cx, '#6e4529', 86, 108, 16, 12); R(cx, '#8b5a3a', 85, 106, 18, 3); R(cx, '#c08a52', 87, 106, 14, 1);
      const ly = 94 + this.logY;
      if (ly > -14) { R(cx, '#8b5a3a', 89, ly, 11, 12); R(cx, '#a8703f', 90, ly, 2, 12); R(cx, '#e0b27a', 89, ly, 11, 2); R(cx, '#c08a52', 92, ly, 5, 1); }
      for (const h of this.halves) { const x = Math.round(h.x), y = Math.round(h.y); R(cx, '#8b5a3a', x - 2, y - 10, 5, 10); R(cx, '#e0b27a', h.vx < 0 ? x + 2 : x - 2, y - 10, 1, 10); }
      spr(SP.IDLE, 75, GY);
      if (this.chop > 8) { line(cx, 81, 110, 92, 97, '#7a5230'); R(cx, '#b8c0c8', 90, 92, 5, 5); R(cx, '#e9eef2', 90, 92, 1, 5); }
      else { line(cx, 81, 110, 79, 90, '#7a5230'); R(cx, '#b8c0c8', 75, 86, 6, 4); R(cx, '#e9eef2', 75, 86, 6, 1); }
      if (this.stun > 0) for (let k = 0; k < 3; k++) { const a = tick / 6 + k * 2.1; R(cx, '#ffd75e', Math.round(75 + Math.cos(a) * 7), Math.round(93 + Math.sin(a) * 2), 1, 1); }
      const pos = (Math.sin(this.ph) + 1) / 2, gw = Math.max(.05, .11 - this.res.logs * .007), mx = 24, mw = 112, my = 30;
      box(mx - 4, my - 4, mw + 8, 14);
      R(cx, '#d9405b', mx, my, mw, 6);
      const yw = Math.round((gw + .13) * mw), gp = Math.round(gw * mw);
      R(cx, '#f2c230', mx + mw / 2 - yw, my, yw * 2, 6); R(cx, '#5fd36a', mx + mw / 2 - gp, my, gp * 2, 6); R(cx, 'rgba(255,255,255,.35)', mx, my, mw, 1);
      const cp = Math.round(mx + pos * mw); R(cx, '#1b1530', cp - 2, my - 3, 4, 12); R(cx, '#ffffff', cp - 1, my - 2, 2, 10);
    },
    drawFish() {
      const wy = 114;
      R(cx, '#2f6fa8', 78, wy, 82, H - wy); R(cx, '#5a9ad4', 78, wy, 82, 1);
      for (let k = 0; k < 8; k++) R(cx, '#9fd0f2', 80 + ((k * 23 + tick * .3) % 76 | 0), wy + 6 + (k * 5) % 22, 4, 1);
      R(cx, '#6e4529', 38, 112, 50, 3); R(cx, '#a8703f', 38, 111, 50, 1); for (const x of [42, 62, 84]) R(cx, '#5a3a24', x, 115, 2, 29);
      R(cx, '#8a929c', 44, 103, 9, 8); R(cx, '#b8c0c8', 43, 102, 11, 2); for (let k = 0; k < Math.min(this.res.fish, 4); k++) R(cx, '#f08a5d', 45 + k * 2, 99 + (k % 2), 1, 3);
      spr(SP.IDLE, 64, 112);
      const tipX = 84, tipY = 86; line(cx, 69, 102, tipX, tipY, '#7a5230');
      let bx = this.tx, by = 115;
      if (this.fs === 'cast') { const t = this.ft / 20; bx = lerp(tipX, this.tx, t); by = lerp(tipY, 115, t) - Math.sin(t * Math.PI) * 16; }
      else if (this.fs === 'wait') by = 115 + (Math.sin(this.ft / 6) > .93 ? 1 : 0);
      else if (this.fs === 'bite') by = 117 + ((this.ft >> 2) & 1);
      else if (this.fs === 'reel') { bx = tipX + 2; by = tipY + 6; }
      for (let i = 0; i <= 14; i++) { const t = i / 14; R(cx, 'rgba(255,255,255,.75)', Math.round(lerp(tipX, bx, t)), Math.round(lerp(tipY, by, t) + Math.sin(t * Math.PI) * 4), 1, 1); }
      R(cx, '#ff4b4b', Math.round(bx) - 1, Math.round(by) - 2, 3, 2); R(cx, '#ffffff', Math.round(bx) - 1, Math.round(by), 3, 1);
      if (this.fs === 'bite') { ring(cx, Math.round(bx), Math.round(by) + 1, 3 + ((this.ft >> 2) % 3), '#bfe8ff'); box(57, 70, 14, 14, '#ffffff', '#1b1530'); txt('!', 61, 73, '#d9405b', 'left', null); }
      if (this.fs === 'reel') { const t = Math.min(1, this.ft / 30); fishy(lerp(this.tx, 49, t), lerp(114, 100, t) - Math.sin(t * Math.PI) * 26); }
    }
  };

  /* --- 2. Parcel Rush: SAP postal 2021 to 2023. Sort parcels into matching bins before the belt jams --- */
  const BINS = [{ x: 28, c: '#4f8fe6', d: '#2f62b0' }, { x: 80, c: '#e2574c', d: '#a8352c' }, { x: 132, c: '#f2c230', d: '#b88d16' }];
  function sym(s, x, y, c) {
    if (s === 0) { R(cx, c, x - 1, y - 2, 3, 1); R(cx, c, x - 1, y + 2, 3, 1); R(cx, c, x - 2, y - 1, 1, 3); R(cx, c, x + 2, y - 1, 1, 3); }
    else if (s === 1) { R(cx, c, x, y - 2, 1, 1); R(cx, c, x - 1, y - 1, 3, 2); R(cx, c, x - 2, y + 1, 5, 2); }
    else R(cx, c, x - 2, y - 2, 5, 5);
  }
  GAMES.parcels = {
    id: 'parcels', name: 'Parcel Rush', year: '2021–2023', place: 'SAP · Postal', color: '#f0a46f', pic: '#p-upu', alt: 'Christoph on stage at the UPU World Leaders Forum 2022', read: '#r-postal', vids: ['tBOu5jzhvd4'],
    teaser: 'Sort parcels, beat the target',
    story: "I led SAP's global postal industry: 67 postal companies, one revenue target. Sort every parcel into the matching bin before the belt jams.",
    how: [['◀ ▼ ▶', 'send the parcel to the left, middle or right bin'], ['', 'match the colour and the shape']],
    title: 'Director, Postal Services at SAP',
    real: 'I advised the leadership of 67 postal companies worldwide, oversaw more than $100M in annual revenue and reached 130% of target.',
    init() { this.t = 0; this.dur = 1800; this.rev = 0; this.ok = 0; this.combo = 0; this.q = []; this.fly = []; this.spawnT = 0; this.jam = 0; this.belt = 0; this.hitB = [0, 0, 0]; this.spawn(); this.q[0].y = 74; },
    spawn() { this.q.push({ c: Math.random() * 3 | 0, y: -16 }); },
    stars() { return this.rev >= 130 ? 3 : this.rev >= 100 ? 2 : 1; },
    summary() { return `You sorted ${this.ok} parcels and booked $${this.rev}M: ${this.rev}% of target.`; },
    update() {
      this.t++;
      const rate = lerp(68, 30, clamp(this.t / this.dur, 0, 1));
      if (this.jam > 0) this.jam--;
      else {
        this.belt++;
        if (++this.spawnT >= rate) {
          this.spawnT = 0;
          if (this.q.length >= 5) { this.jam = 50; this.q.splice(1, 1); this.rev = Math.max(0, this.rev - 5); this.combo = 0; float('JAM! -$5M', 80, 44, '#ff8a80'); SFX.wrong(); shake = 6; }
          this.spawn();
        }
      }
      this.q.forEach((p, i) => { const ty = 74 - i * 18; p.y = p.y < ty ? Math.min(ty, p.y + 3.2) : ty; });
      for (const f of this.fly) if (++f.t === 16) { this.hitB[f.to] = 8; puff(BINS[f.to].x, 112, 6, f.good ? '#ffffff' : '#ff8a80', .8); }
      this.fly = this.fly.filter(f => f.t < (f.good ? 17 : 40));
      for (let i = 0; i < 3; i++) if (this.hitB[i] > 0) this.hitB[i]--;
      if (this.t >= this.dur) this.over = true;
    },
    key(k) {
      const d = k === 'left' ? 0 : k === 'down' ? 1 : k === 'right' ? 2 : -1, p = this.q[0];
      if (d < 0 || !p || p.y < 70) return;
      this.q.shift(); const good = p.c === d;
      this.fly.push({ c: p.c, to: d, t: 0, good });
      if (good) { this.ok++; this.combo++; let add = 5; if (this.combo % 5 === 0) { add += 2; float('STREAK +$2M', 80, 30, '#ffd75e'); } this.rev += add; SFX.good(); }
      else { this.combo = 0; this.rev = Math.max(0, this.rev - 3); SFX.wrong(); shake = 5; float('-$3M', BINS[d].x, 98, '#ff8a80'); }
    },
    tap(x, y) { if (y > 92) this.key(x < 54 ? 'left' : x < 106 ? 'down' : 'right'); },
    parcel(x, y, c) { x = Math.round(x); y = Math.round(y); R(cx, '#1a1410', x - 9, y - 7, 18, 13); R(cx, '#c08a52', x - 8, y - 6, 16, 11); R(cx, '#d9a46a', x - 8, y - 6, 16, 2); R(cx, '#e9d8b0', x - 2, y - 6, 2, 11); R(cx, BINS[c].c, x + 1, y - 4, 7, 7); sym(c, x + 4, y - 1, '#ffffff'); },
    draw() {
      R(cx, '#2a2234', 0, 0, W, 96); for (let x = 0; x < W; x += 20) R(cx, '#30283c', x, 12, 10, 84);
      R(cx, '#f2c230', 10, 22, 34, 14); R(cx, '#c4372b', 10, 22, 34, 2); R(cx, '#ffffff', 21, 26, 12, 8); line(cx, 21, 26, 26, 30, '#c4372b'); line(cx, 32, 26, 27, 30, '#c4372b');
      R(cx, '#3d3046', 0, 96, W, 48); for (let y = 100; y < H; y += 8) R(cx, '#463853', 0, y, W, 1);
      R(cx, '#18141c', 66, 0, 28, 84); for (let y = (this.belt % 6) - 6; y < 84; y += 6) R(cx, '#3a3240', 67, y, 26, 2);
      for (let y = 0; y < 84; y += 4) { const c = (y / 4) % 2 ? '#f2c230' : '#1a1410'; R(cx, c, 64, y, 2, 4); R(cx, c, 94, y, 2, 4); }
      R(cx, '#8d93a1', 58, 84, 44, 5); R(cx, '#b2b8c4', 58, 84, 44, 1);
      line(cx, 58, 89, 36, 108, '#5a4d66'); line(cx, 102, 89, 124, 108, '#5a4d66');
      const hint = 'rgba(255,255,255,.55)';
      R(cx, hint, 46, 98, 1, 1); R(cx, hint, 47, 97, 1, 3); R(cx, hint, 48, 96, 1, 5);
      R(cx, hint, 78, 96, 5, 1); R(cx, hint, 79, 97, 3, 1); R(cx, hint, 80, 98, 1, 1);
      R(cx, hint, 112, 96, 1, 5); R(cx, hint, 113, 97, 1, 3); R(cx, hint, 114, 98, 1, 1);
      BINS.forEach((b, i) => { const u = this.hitB[i] ? 1 : 0; R(cx, b.d, b.x - 18, 109 + u, 36, 5); R(cx, b.c, b.x - 17, 114 + u, 34, 30); R(cx, 'rgba(255,255,255,.25)', b.x - 17, 114 + u, 34, 1); sym(i, b.x, 128 + u, '#ffffff'); });
      for (let i = this.q.length - 1; i >= 0; i--) this.parcel(80, this.q[i].y, this.q[i].c);
      for (const f of this.fly) {
        const b = BINS[f.to];
        if (f.t < 16) { const t = f.t / 16; this.parcel(lerp(80, b.x, t), lerp(74, 112, t) - Math.sin(t * Math.PI) * 14, f.c); }
        else if (!f.good && (f.t >> 2) % 2) { line(cx, b.x - 6, 118, b.x + 6, 130, '#ff4b4b'); line(cx, b.x + 6, 118, b.x - 6, 130, '#ff4b4b'); }
      }
      if (this.jam && (this.jam >> 3) % 2) txt('JAM!', 80, 50, '#ff8a80', 'center');
      strip('$' + this.rev + 'M', mmss(this.dur - this.t));
      const bw = 66, bx = 48; R(cx, 'rgba(0,0,0,.45)', bx, 4, bw, 4); R(cx, this.rev >= 100 ? '#7cf2c6' : '#ffd75e', bx, 4, Math.round(bw * Math.min(1, this.rev / 140)), 4); R(cx, '#ffffff', bx + Math.round(bw * 100 / 140), 2, 1, 8);
      if (this.combo >= 3) txt('x' + this.combo, 157, 15, '#ffd75e', 'right');
    }
  };

  /* --- 3. World Tour: SAP public cloud 2023 to 2025. Fly to four new markets --- */
  function roo(g, x, b) { R(g, '#7a3a20', x, b - 10, 5, 7); R(g, '#7a3a20', x + 4, b - 14, 3, 5); R(g, '#7a3a20', x + 6, b - 17, 1, 3); R(g, '#7a3a20', x - 6, b - 6, 7, 2); R(g, '#7a3a20', x + 1, b - 3, 5, 3); }
  const REG = [
    { n: 'JAPAN', c: 'JP', sky: ['#ff9fb4', '#ffe6cf'], g: ['#79c46a', '#5ea352'], far(g, r) { disc(g, 236, 38, 15, '#ee4a3c'); mountain(g, 108, 34, 92, '#6d79b8', '#5a66a3', '#ffffff', '#dfe5f5'); for (let x = 6; x < 320; x += 46 + (r() * 22 | 0)) blossom(g, x, r); torii(g, 262); } },
    { n: 'AUSTRALIA', c: 'AU', sky: ['#ffb35c', '#ffedc4'], g: ['#e0a35a', '#c98a45'], far(g, r) {
      disc(g, 64, 32, 12, '#fff2b0');
      for (let x = 110; x < 270; x++) { const t = (x - 190) / 80, y = Math.round(80 + Math.pow(Math.abs(t), 4) * 40 + Math.abs(t) * 4); R(g, x > 205 ? '#a8432a' : '#c65632', x, y, 1, 120 - y); }
      for (let k = 0; k < 4; k++) line(g, 134 + k * 30, 92 + (k % 2) * 5, 144 + k * 30, 106, '#9a3c25');
      for (let x = 4; x < 320; x += 30 + (r() * 30 | 0)) { R(g, '#5a6b2a', x + 2, 112, 2, 8); disc(g, x + 3, 110, 4, '#7d9c44'); }
      roo(g, 40, 120); roo(g, 292, 120); } },
    { n: 'UK', c: 'UK', sky: ['#8ea4bf', '#e3e9ee'], g: ['#6fb35c', '#579a48'], far(g, r) {
      hills(g, 320, 102, 16, .03, 2, '#7fae76');
      for (let x = 0; x < 320; x += 18 + (r() * 8 | 0)) { const h = 14 + (r() * 10 | 0); R(g, '#9a8a7a', x, 120 - h, 14, h); R(g, '#6f5f52', x - 1, 120 - h - 3, 16, 3); R(g, '#f4e3a0', x + 4, 124 - h, 2, 2); }
      R(g, '#b59a6a', 196, 40, 12, 80); R(g, '#9a7f52', 196, 40, 2, 80); disc(g, 202, 50, 4, '#f4f0e0'); R(g, '#1a1410', 202, 47, 1, 3); R(g, '#1a1410', 202, 50, 2, 1);
      for (let y = 0; y < 14; y++) { const hw = Math.round(6 - y * .43); R(g, '#7a6a4a', 202 - hw, 26 + y, hw * 2, 1); } R(g, '#7a6a4a', 201, 18, 2, 8);
      cloud(g, 30, 22, 2, '#cfd8e2', '#b8c4d0'); cloud(g, 244, 16, 2, '#cfd8e2', '#b8c4d0'); } },
    { n: 'USA', c: 'US', sky: ['#2f3f7e', '#f19a7a'], g: ['#5a5f6e', '#474b58'], far(g, r) {
      disc(g, 70, 92, 14, '#ffcf8a');
      for (let x = 0; x < 320; x += 12 + (r() * 8 | 0)) tower(g, x, 10 + (r() * 8 | 0), 44 + (r() * 46 | 0), '#2a2f55', '#363c6a', '#ffd75e', r, .3);
      R(g, '#2a2f55', 150, 22, 9, 98); R(g, '#2a2f55', 153, 8, 3, 14); } }
  ];
  const regLayer = i => REG[i].L || (REG[i].L = (() => { const c = mkc(320, 120); REG[i].far(c.getContext('2d'), rng(97 + i * 13)); return c; })());
  function hoop(x, y, front) { for (let a = 0; a < 72; a++) { const t = a / 72 * Math.PI * 2, c = Math.cos(t); if ((c >= 0) !== front) continue; R(cx, '#ffd75e', Math.round(x + c * 3), Math.round(y + Math.sin(t) * 11), 2, 1); } }
  GAMES.flight = {
    id: 'flight', name: 'World Tour', year: '2023–2025', place: 'SAP · Public cloud', color: '#8fd0ff', pic: '#p-japan', alt: 'Christoph with the SAP Japan team', read: '#r-cloud', vids: [],
    teaser: 'Fly the cloud to new markets',
    story: "Take SAP's public sector cloud to four new markets. Grab every deal, dodge the storms and grow the pipeline from $3M to $6M.",
    how: [['▲ ▼', 'fly up and down'], ['', 'grab cloud deals, fly through gold partner rings, avoid storms']],
    howTouch: [['Drag', 'on the screen, or hold ▲ ▼'], ['', 'grab cloud deals, fly through gold partner rings, avoid storms']],
    title: 'Senior GTM Manager, Public Services at SAP',
    real: "I led the global go-to-market for SAP's public sector cloud and grew it from $3M to over $6M in one year, with new markets in Japan, Australia, EMEA and the US.",
    init() { this.t = 0; this.seg = 480; this.dur = this.seg * 4; this.y = 70; this.vy = 0; this.pipe = 3; this.objs = []; this.spawnT = 0; this.region = -1; this.hit = 0; this.scroll = 0; this.banT = 0; },
    stars() { return this.pipe >= 5.95 ? 3 : this.pipe >= 5 ? 2 : 1; },
    summary() { return `You grew the pipeline from $3.0M to $${this.pipe.toFixed(1)}M across four new markets.`; },
    update() {
      this.t++; this.scroll += 1.3;
      const r = Math.min(3, this.t / this.seg | 0);
      if (r !== this.region) { this.region = r; this.banT = 90; SFX.whistle(); }
      if (this.banT > 0) this.banT--;
      let dir = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (ptr.down) { const d = ptr.y - this.y; dir = Math.abs(d) < 3 ? 0 : Math.sign(d); }
      this.vy = dir ? clamp(this.vy + dir * .26, -2.1, 2.1) : this.vy * .86;
      this.y = clamp(this.y + this.vy, 22, 118);
      const lt = this.t % this.seg;
      if (this.t < this.dur - 100) {
        if (++this.spawnT >= 23) { this.spawnT = 0; const storm = Math.random() < .36 && lt > 60; this.objs.push({ k: storm ? 'storm' : 'deal', x: 172, y: rand(26, 112), ph: Math.random() * 6 }); }
        if (lt === 200 || lt === 380) this.objs.push({ k: 'ring', x: 172, y: rand(40, 100), ph: 0 });
      }
      for (const o of this.objs) {
        o.x -= o.k === 'storm' ? 1.7 : 1.3; o.ph += .05;
        if (o.done) continue;
        const oy = o.k === 'deal' ? o.y + Math.sin(o.ph) * 2 : o.y;
        if (o.k === 'deal' && Math.abs(o.x - 36) < 12 && Math.abs(oy - this.y) < 8) { o.done = 1; this.pipe += .1; SFX.coin(); puff(o.x, oy, 6, '#bfe8ff', .8); }
        else if (o.k === 'storm' && this.hit <= 0 && Math.abs(o.x - 30) < 16 && Math.abs(o.y - this.y) < 7) { o.done = 1; this.hit = 70; this.pipe = Math.max(3, this.pipe - .3); SFX.zap(); shake = 7; float('-$0.3M', 40, this.y - 14, '#ff8a80'); }
        else if (o.k === 'ring' && o.x < 38) { o.done = 1; if (Math.abs(o.y - this.y) < 10) { this.pipe += .4; SFX.reel(); float('PARTNERS +$0.4M', 80, o.y - 18, '#ffd75e'); puff(36, o.y, 10, '#ffd75e', 1.2); } }
      }
      this.objs = this.objs.filter(o => o.x > -24 && !(o.done && o.k === 'deal'));
      if (this.hit > 0) this.hit--;
      if (this.t >= this.dur) this.over = true;
    },
    key() {},
    plane(x, y) {
      if (this.hit > 0 && (this.hit >> 2) % 2) return;
      x = Math.round(x); y = Math.round(y); const k = '#1b1530';
      R(cx, k, x - 12, y - 8, 5, 6); R(cx, '#d9405b', x - 11, y - 7, 3, 5);
      R(cx, k, x - 12, y - 3, 24, 7); R(cx, '#f4f4f4', x - 11, y - 2, 22, 5); R(cx, '#d9405b', x - 11, y + 1, 22, 1); R(cx, k, x + 12, y - 1, 1, 3);
      R(cx, k, x - 4, y + 3, 11, 3); R(cx, '#cfd6e0', x - 3, y + 3, 9, 2);
      R(cx, '#2b1d15', x + 1, y - 7, 6, 4); R(cx, '#f2c6a2', x + 2, y - 5, 5, 3); R(cx, '#3a3430', x + 4, y - 5, 3, 1); R(cx, '#bfe8ff', x + 7, y - 4, 2, 2);
      if ((tick >> 1) & 1) R(cx, '#3a3f55', x + 13, y - 5, 1, 11); else R(cx, '#3a3f55', x + 13, y - 2, 1, 5);
    },
    draw() {
      const r = Math.max(0, this.region), lt = this.t % this.seg, nx = Math.min(3, r + 1);
      const f = r < 3 ? smooth(clamp((lt - (this.seg - 60)) / 60, 0, 1)) : 0, A = REG[r], B = REG[nx];
      fillSky(f ? mix(A.sky[0], B.sky[0], f) : A.sky[0], f ? mix(A.sky[1], B.sky[1], f) : A.sky[1], 128);
      const off = Math.round(this.scroll * .3) % 320;
      const lay = (i, a) => { cx.globalAlpha = a; const L = regLayer(i); cx.drawImage(L, -off, 8); cx.drawImage(L, 320 - off, 8); cx.globalAlpha = 1; };
      lay(r, 1); if (f) lay(nx, f);
      const G = f > .5 ? B.g : A.g; R(cx, G[0], 0, 128, W, 16);
      for (let x = -(Math.round(this.scroll) % 12); x < W; x += 12) R(cx, G[1], x, 133 + ((x + 12) % 24 < 12 ? 4 : 0), 6, 2);
      if (r === 2 && f < .5) for (let k = 0; k < 16; k++) R(cx, 'rgba(225,235,255,.55)', (k * 37 + tick * 3) % 168 - 4, (k * 53 + tick * 5) % 126, 1, 3);
      for (const o of this.objs) {
        const x = Math.round(o.x), y = Math.round(o.k === 'deal' ? o.y + Math.sin(o.ph) * 2 : o.y);
        if (o.k === 'deal') { R(cx, '#1b3a6b', x - 5, y - 5, 10, 10); R(cx, '#4f8fe6', x - 4, y - 4, 8, 8); R(cx, '#bfe8ff', x - 4, y - 4, 8, 1); R(cx, '#ffffff', x - 3, y, 6, 2); R(cx, '#ffffff', x - 1, y - 2, 3, 2); }
        else if (o.k === 'storm') { cloud(cx, x - 12, y, 1, '#4a4f63', '#363a4a'); R(cx, '#5b6078', x - 8, y - 5, 6, 1); if ((tick + x) % 40 < 6) { line(cx, x - 2, y + 4, x - 4, y + 9, '#ffe066'); line(cx, x - 4, y + 9, x - 1, y + 13, '#ffe066'); } }
        else hoop(x, y, false);
      }
      this.plane(36, this.y);
      for (const o of this.objs) if (o.k === 'ring') hoop(Math.round(o.x), Math.round(o.y), true);
      strip('$' + this.pipe.toFixed(1) + 'M', REG[r].c);
      R(cx, 'rgba(255,255,255,.35)', 56, 5, 48, 1); for (let i = 0; i < 4; i++) R(cx, i <= r ? '#ffffff' : 'rgba(255,255,255,.4)', 56 + i * 16 - 1, 4, 3, 3);
      R(cx, '#ffd75e', Math.round(56 + clamp(this.t / this.dur, 0, 1) * 48) - 1, 3, 3, 5);
      if (this.banT > 0 && RUN.ph === 'play') banner(REG[r].n, `NEW MARKET ${r + 1}/4`);
    }
  };

  /* --- 4. Captain: Team Austria dodgeball. Dodge, catch and throw to knock out all five players --- */
  const LANE = [76, 104, 132], PX = 28;
  let oppId = 0;
  GAMES.dodge = {
    id: 'dodge', name: 'Captain', year: 'Since 2022', place: 'Team Austria', color: '#ff8a6a', pic: '#p-dodgeball', alt: 'Pixel art of a dodgeball match', read: '#l-dodgeball', vids: ['LpuDfe5eBmI'],
    teaser: 'Dodge, catch, win for Austria',
    story: 'World Championships, Austria against Australia, and you are the captain. Knock out all five players. If you catch a ball, the thrower is out.',
    how: [['▲ ▼', 'change lane to dodge'], ['A', 'catch a ball just before it hits you, or throw yours']],
    title: "Captain of Austria's national dodgeball team",
    real: "I captain Austria's national dodgeball team. At the 2024 World Championships we played Australia, and I'm number 2 in the video.",
    failText: 'YOU ARE OUT',
    init() {
      this.t = 0; this.dur = 2700; this.lane = 1; this.y = LANE[1]; this.lives = 3; this.inv = 0; this.ball = true; this.cd = 0; this.swing = 0; this.outs = 0; this.bench = 2; this.balls = [];
      this.opp = [0, 1, 2].map(l => ({ id: ++oppId, lane: l, y: LANE[l], x: 130 + (l % 2) * 6, st: 'idle', t: 50 + l * 40, out: 0, enter: false }));
    },
    stars() { return this.outs >= 5 ? (this.lives === 3 ? 3 : 2) : this.won ? 2 : 1; },
    summary() { return this.outs >= 5 ? `You knocked out all five players${this.lives === 3 ? ' without getting hit' : ''}.` : `You knocked out ${this.outs} of 5 players.`; },
    active() { return this.opp.filter(o => !o.out); },
    freeLanes(o) { return [0, 1, 2].filter(l => !this.active().some(a => a !== o && a.lane === l)); },
    ko(o) { if (!o || o.out) return; o.out = 1; this.outs++; SFX.hit(); puff(o.x, o.y - 12, 10, '#f2c230', 1.2); float('OUT!', o.x - 6, o.y - 34, '#ffd75e'); if (this.outs >= 5) { this.over = true; this.won = true; } },
    update() {
      this.t++;
      this.y += (LANE[this.lane] - this.y) * .35;
      if (this.inv > 0) this.inv--; if (this.cd > 0) this.cd--; if (this.swing > 0) this.swing--;
      const incoming = this.balls.filter(b => b.dir < 0).length;
      for (const o of this.opp) {
        if (o.out) {
          o.out++; if (o.out > 22) o.x += 1.5;
          if (o.x > 178 && this.bench > 0) { this.bench--; const fr = this.freeLanes(o); Object.assign(o, { id: ++oppId, lane: fr.length ? pick(fr) : 1, out: 0, x: 178, enter: true, st: 'idle', t: 40 }); o.y = LANE[o.lane]; }
          continue;
        }
        if (o.enter) { o.x -= 1.3; if (o.x <= 130) { o.x = 130; o.enter = false; } continue; }
        o.y += (LANE[o.lane] - o.y) * .2;
        if (o.st === 'idle' && --o.t <= 0) {
          if (incoming < 2 && Math.random() < .72) { o.st = 'wind'; o.t = Math.max(24, 42 - this.outs * 4); }
          else { const fr = this.freeLanes(o); if (fr.length) o.lane = pick(fr); o.t = 30 + Math.random() * 40 | 0; }
        } else if (o.st === 'wind' && --o.t <= 0) {
          o.st = 'idle'; o.t = Math.max(40, 90 - this.outs * 10) + Math.random() * 50 | 0;
          this.balls.push({ x: o.x - 8, lane: o.lane, dir: -1, v: 1.6 + this.outs * .14, from: o, fid: o.id }); SFX.whoosh();
        }
      }
      for (const b of this.balls) {
        if (b.dead) continue; b.x += b.dir * b.v;
        if (b.dir < 0) {
          if (b.lane === this.lane && Math.abs(this.y - LANE[this.lane]) < 8 && b.x <= PX + 5 && b.x >= PX - 6 && this.inv <= 0) {
            b.dead = true; this.lives--; this.inv = 90; shake = 7; SFX.hit(); puff(PX, this.y - 12, 12, '#d9405b', 1.2); float('HIT!', PX + 8, this.y - 34, '#ff8a80');
            if (this.lives <= 0) { this.over = true; this.won = false; }
          } else if (b.x < -8) { b.dead = true; if (!this.ball) { this.ball = true; float('BALL', 22, LANE[b.lane] - 32, '#ffffff'); } }
        } else {
          if (!b.seen && b.x > 70) { b.seen = true; const t = this.active().find(o => o.lane === b.lane && o.st === 'idle' && !o.enter); if (t && Math.random() < .3) { const fr = this.freeLanes(t); if (fr.length) t.lane = pick(fr); } }
          const o = this.active().find(o => !o.enter && o.lane === b.lane && Math.abs(o.x - b.x) < 6 && Math.abs(o.y - LANE[o.lane]) < 5);
          if (o) { b.dead = true; this.ko(o); } else if (b.x > 168) b.dead = true;
        }
      }
      this.balls = this.balls.filter(b => !b.dead);
      if (this.t >= this.dur && !this.over) { this.over = true; this.won = this.outs >= 3; }
    },
    key(k) {
      if (k === 'up') this.lane = Math.max(0, this.lane - 1);
      else if (k === 'down') this.lane = Math.min(2, this.lane + 1);
      else if (k === 'a' && this.cd <= 0) {
        this.swing = 10;
        const b = this.balls.find(b => b.dir < 0 && b.lane === this.lane && b.x <= PX + 24 && b.x > PX + 5);
        if (b) { b.dead = true; if (b.from.id === b.fid) this.ko(b.from); this.ball = true; SFX.reel(); float('CATCH!', PX + 10, this.y - 34, '#7cf2c6'); this.cd = 8; this.balls = this.balls.filter(x => !x.dead); }
        else if (this.ball) { this.ball = false; this.balls.push({ x: PX + 8, lane: this.lane, dir: 1, v: 3.2 }); SFX.whoosh(); this.cd = 12; }
        else { this.cd = 40; this.swing = 30; SFX.miss(); float('MISS', PX - 2, this.y - 34, '#ff8a80'); }
      }
    },
    tap(x, y) { if (y > 56) { const l = y < 90 ? 0 : y < 118 ? 1 : 2; if (l === this.lane) this.key('a'); else this.lane = l; } },
    draw() {
      R(cx, '#1f2f52', 0, 0, W, 50);
      const fans = ['#d9405b', '#f2c230', '#ffffff', '#2f8f4e', '#ff9ad5', '#9ad0ff'];
      for (let y = 15; y < 46; y += 7) for (let x = (y % 2) * 3; x < W; x += 6) { const b = ((tick >> 3) + x + y) % 9 === 0 ? -1 : 0; R(cx, '#f2c6a2', x + 1, y + b, 3, 2); R(cx, fans[(x * 7 + y * 3) % 6], x, y + 2 + b, 5, 3); }
      R(cx, '#16223d', 0, 46, W, 4);
      R(cx, '#c98d52', 0, 50, W, 94); for (let y = 58; y < H; y += 9) R(cx, '#b97d44', 0, y, W, 1);
      R(cx, '#ffffff', 79, 50, 2, 94); R(cx, 'rgba(255,255,255,.45)', 54, 50, 1, 94); R(cx, 'rgba(255,255,255,.45)', 105, 50, 1, 94);
      const ents = [{ y: this.y, d: () => this.me() }];
      for (const o of this.opp) if (!(o.out && o.x > 178)) ents.push({ y: o.y, d: () => this.them(o) });
      ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
      for (const b of this.balls) { const y = LANE[b.lane], x = Math.round(b.x); R(cx, 'rgba(0,0,0,.25)', x - 3, y - 1, 7, 2); disc(cx, x, y - 13, 3, '#e8413a'); R(cx, '#ff8a80', x - 1, y - 15, 2, 1); }
      strip(null, mmss(this.dur - this.t), `OUT ${this.outs}/5`);
      for (let i = 0; i < 3; i++) heart(3 + i * 9, 3, i < this.lives ? '#ff5a6e' : 'rgba(255,255,255,.25)');
    },
    me() {
      R(cx, 'rgba(255,255,255,.4)', PX - 7, LANE[this.lane] + 1, 14, 1);
      if (this.inv > 0 && (this.inv >> 2) % 2) return;
      spr(this.swing > 0 ? AUT.JUMP : AUT.IDLE, PX, this.y);
      if (this.ball && this.swing <= 0) { const y = Math.round(this.y); disc(cx, PX + 8, y - 12, 3, '#e8413a'); R(cx, '#ff8a80', PX + 7, y - 14, 2, 1); }
    },
    them(o) {
      if (o.out) { spr(OPP.IDLE, o.x, o.y + Math.min(o.out, 20) * .15, o.out < 22 ? 1 : .5); return; }
      spr(o.enter ? OPP[RUNF[(tick >> 3) % 4]] : o.st === 'wind' ? OPP.JUMP : OPP.IDLE, o.x, o.y);
      if (o.st === 'wind') { const x = Math.round(o.x), y = Math.round(o.y); disc(cx, x + 2, y - 27, 3, '#e8413a'); if ((tick >> 2) % 2) txt('!', x - 3, y - 42, '#ffd75e'); }
    }
  };

  /* --- 5. Phish King: Microsoft Security since 2025. A small bullet-hell boss fight --- */
  GAMES.boss = {
    id: 'boss', name: 'Phish King', year: 'Since 2025', place: 'Microsoft Security', color: '#9b8cff', pic: '#p-summit', alt: 'Christoph at the Microsoft Security Summit in Vienna', read: '#w-microsoft', vids: ['CfX3spaHwh4', 'MwUgNdRwvsI'],
    teaser: 'Boss fight: stop the Phish King',
    story: 'A phishing boss is flooding your customers with fake links. Patch it until it breaks. Only the small white core of your shield can be hit.',
    how: [['Arrows', 'move, your shield fires patches on its own'], ['B', 'hold to move slowly'], ['A', 'firewall: clears the screen, 2 per fight']],
    howTouch: [['Drag', 'on the screen to move, your shield fires on its own'], ['A', 'firewall: clears the screen, 2 per fight']],
    title: 'Security GTM Manager at Microsoft',
    real: 'Since 2025 I take Microsoft Security to market in Germany, Austria and Switzerland, and speak about AI, security and quantum computing.',
    doneText: 'THREAT STOPPED', failText: 'BREACHED',
    init() { this.t = 0; this.p = { x: 80, y: 124 }; this.lives = 3; this.bombs = 2; this.inv = 60; this.bul = []; this.shots = []; this.max = 480; this.hp = this.max; this.phase = 0; this.bx = 80; this.by = 32; this.ang = 0; this.bombR = 0; this.hits = 0; this.dead = 0; this.flash = 0; this.banT = 0; this.hurtT = 0; },
    stars() { return !this.won ? 1 : this.hits === 0 ? 3 : 2; },
    summary() { return this.won ? `You stopped the Phish King in ${Math.round(this.t / 60)} seconds${this.hits ? ` and took ${this.hits} hit${this.hits > 1 ? 's' : ''}` : ' without a scratch'}.` : `The Phish King got through with ${Math.max(1, Math.round(this.hp / this.max * 100))}% of its health left.`; },
    fire(x, y, a, s, k) { if (this.bul.length < 240) this.bul.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, k, r: k === 'lock' ? 2.4 : k === 'mail' ? 2.2 : 1.7 }); },
    aim() { return Math.atan2(this.p.y - this.by - 10, this.p.x - this.bx); },
    clear(r) { this.bul = this.bul.filter(b => { const hit = r < 0 || Math.hypot(b.x - this.p.x, b.y - this.p.y) < r; if (hit && Math.random() < .3) puff(b.x, b.y, 1, '#d6ceff', .5); return !hit; }); },
    update() {
      this.t++;
      if (this.dead) {
        this.dead++; shake = 3;
        if (this.dead % 6 === 0) { puff(this.bx + rand(-18, 18), this.by + rand(-12, 12), 8, pick(['#ffd75e', '#ff8a80', '#ffffff', '#9b8cff']), 1.4); SFX.hit(); }
        if (this.dead > 80) { this.over = true; this.won = true; }
        return;
      }
      const sp = held.b ? .75 : 1.55;
      let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (dx && dy) { dx *= .7071; dy *= .7071; }
      this.p.x = clamp(this.p.x + dx * sp + ptr.dx, 6, 154); this.p.y = clamp(this.p.y + dy * sp + ptr.dy, 54, 138); ptr.dx = ptr.dy = 0;
      if (this.t % 5 === 0) { this.shots.push({ x: this.p.x - 3, y: this.p.y - 6 }, { x: this.p.x + 3, y: this.p.y - 6 }); if (this.t % 20 === 0) SFX.shot(); }
      this.bx = 80 + Math.sin(this.t * .013) * 46; this.by = 32 + Math.sin(this.t * .031) * 5;
      const ratio = this.hp / this.max, ph = ratio > .66 ? 0 : ratio > .33 ? 1 : 2;
      if (ph !== this.phase) { this.phase = ph; this.clear(-1); this.banT = 100; this.flash = 12; SFX.zap(); }
      if (this.banT > 0) this.banT--; if (this.flash > 0) this.flash--; if (this.hurtT > 0) this.hurtT--;
      const t = this.t, bx = this.bx, by = this.by + 10;
      if (this.banT < 60) {
        if (ph === 0) { if (t % 44 === 0) { const a = this.aim(); for (let i = -2; i <= 2; i++) this.fire(bx, by, a + i * .26, 1.25, 'mail'); } if (t % 130 === 65) for (let i = 0; i < 12; i++) this.fire(bx, by, i / 12 * Math.PI * 2 + t, .85, 'dot'); }
        else if (ph === 1) { if (t % 5 === 0) { this.ang += .29; this.fire(bx, by, this.ang, 1, 'link'); this.fire(bx, by, this.ang + Math.PI, 1, 'link'); } if (t % 80 === 0) this.fire(bx, by, this.aim(), 1.7, 'red'); }
        else { if (t % 48 === 0) { const gap = clamp(this.p.x + rand(-30, 30), 22, 138); for (let x = 6; x < W; x += 12) if (Math.abs(x - gap) > 15) this.bul.push({ x, y: 14, vx: 0, vy: .95, k: 'lock', r: 2.4 }); } if (t % 72 === 36) for (let i = 0; i < 14; i++) this.fire(bx, by, i / 14 * Math.PI * 2 + t * .1, .9, 'dot'); }
      }
      for (const s of this.shots) {
        s.y -= 4.5;
        if (Math.abs(s.x - this.bx) < 21 && Math.abs(s.y - this.by) < 14) {
          s.dead = 1; this.hp--; this.hurtT = 3; if (Math.random() < .25) puff(s.x, s.y, 2, '#7cf2c6', .6);
          if (this.hp <= 0) { this.dead = 1; this.clear(-1); SFX.boom(); break; }
        }
      }
      this.shots = this.shots.filter(s => !s.dead && s.y > -6);
      for (const b of this.bul) {
        b.x += b.vx; b.y += b.vy;
        if (this.inv <= 0 && !this.dead) { const ex = b.x - this.p.x, ey = b.y - this.p.y, rr = b.r + 1.1; if (ex * ex + ey * ey < rr * rr) { b.gone = 1; this.hurt(); break; } }
      }
      this.bul = this.bul.filter(b => !b.gone && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);
      if (this.bombR > 0) { this.bombR += 4; this.clear(this.bombR); if (this.bombR > 200) this.bombR = 0; }
      if (this.inv > 0) this.inv--;
    },
    hurt() { this.lives--; this.hits++; this.inv = 110; shake = 9; SFX.hit(); puff(this.p.x, this.p.y, 16, '#9b8cff', 1.4); this.clear(40); if (this.lives <= 0) { this.over = true; this.won = false; } },
    key(k) { if (k === 'a' && this.bombs > 0 && !this.bombR && !this.dead) { this.bombs--; this.bombR = 1; this.hp = Math.max(1, this.hp - 16); this.inv = Math.max(this.inv, 50); this.flash = 8; SFX.bomb(); } },
    king() {
      let x = Math.round(this.bx), y = Math.round(this.by);
      if (this.dead) { x += Math.round(rand(-2, 2)); y += Math.round(rand(-2, 2)); }
      const k = '#1b1530', hurt = this.hurtT > 0 && (this.t >> 1) % 2, rage = this.phase === 2;
      const body = hurt ? '#ffffff' : rage ? '#ffe0e6' : '#ece6ff', flap = hurt ? '#ffffff' : rage ? '#f3b8c4' : '#c9bff0', fin = rage ? '#ff6b8b' : '#5b7bd5', w = Math.round(Math.sin(this.t / 7) * 2);
      for (let j = 0; j < 7; j++) { const len = 8 - j + (j < 3 ? w : -w); R(cx, fin, x - 21 - len, y - 6 + j * 2, len, 2); R(cx, fin, x + 21, y - 6 + j * 2, len, 2); }
      R(cx, k, x - 21, y - 14, 42, 28); R(cx, body, x - 20, y - 13, 40, 26);
      for (let j = 0; j < 14; j++) R(cx, flap, x - 20 + Math.round(j * 1.45), y - 13 + j, Math.max(1, 40 - Math.round(j * 2.9)), 1);
      line(cx, x - 20, y - 13, x, y + 1, k); line(cx, x + 19, y - 13, x, y + 1, k);
      line(cx, x - 13, y - 11, x - 6, y - 8, k); line(cx, x + 12, y - 11, x + 5, y - 8, k);
      R(cx, '#ff3d5a', x - 11, y - 7, 4, 3); R(cx, '#ff3d5a', x + 7, y - 7, 4, 3); R(cx, '#ffffff', x - 11, y - 7, 1, 1); R(cx, '#ffffff', x + 7, y - 7, 1, 1);
      R(cx, k, x - 10, y + 4, 20, 6); for (let i = 0; i < 5; i++) { R(cx, '#ffffff', x - 9 + i * 4, y + 4, 2, 2); R(cx, '#ffffff', x - 7 + i * 4, y + 8, 2, 2); }
      R(cx, '#ffd75e', x - 10, y - 18, 20, 4); R(cx, '#ffd75e', x - 10, y - 22, 3, 4); R(cx, '#ffd75e', x - 1, y - 23, 3, 5); R(cx, '#ffd75e', x + 7, y - 22, 3, 4); R(cx, '#c9a23a', x - 10, y - 15, 20, 1); R(cx, '#ff3d5a', x, y - 17, 2, 2);
      const sw = Math.round(Math.sin(this.t / 15) * 2); R(cx, '#c9ced3', x + sw, y + 14, 1, 7); R(cx, '#c9ced3', x - 3 + sw, y + 21, 4, 1); R(cx, '#c9ced3', x - 3 + sw, y + 18, 1, 3);
    },
    draw() {
      fillSky('#070b1f', '#1a2c5a', H);
      for (let y = Math.round(this.t * .6) % 12; y < H; y += 12) R(cx, 'rgba(111,211,255,.1)', 0, y, W, 1);
      for (let x = 8; x < W; x += 16) R(cx, 'rgba(111,211,255,.06)', x, 0, 1, H);
      if (!this.dead || this.dead < 70) this.king();
      for (const s of this.shots) R(cx, '#7cf2c6', Math.round(s.x), Math.round(s.y), 1, 4);
      if (!(this.inv > 0 && (this.inv >> 2) % 2) && !(this.over && !this.won)) {
        spr(SHIELD, this.p.x, this.p.y + 6); R(cx, '#ffffff', r3(this.p.x) - 1, r3(this.p.y) - 1, 2, 2);
        if (held.b) ring(cx, Math.round(this.p.x), Math.round(this.p.y), 4, 'rgba(255,255,255,.75)');
      }
      for (const b of this.bul) {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.k === 'mail') { R(cx, '#1b1530', x - 3, y - 2, 7, 5); R(cx, '#ffffff', x - 2, y - 1, 5, 3); R(cx, '#ff5a7a', x - 2, y - 1, 1, 1); R(cx, '#ff5a7a', x + 2, y - 1, 1, 1); R(cx, '#ff5a7a', x - 1, y, 3, 1); }
        else if (b.k === 'link') { R(cx, '#5cc8ff', x - 1, y - 2, 3, 1); R(cx, '#5cc8ff', x - 1, y + 2, 3, 1); R(cx, '#5cc8ff', x - 2, y - 1, 1, 3); R(cx, '#5cc8ff', x + 2, y - 1, 1, 3); R(cx, '#e6f8ff', x, y, 1, 1); }
        else if (b.k === 'dot') { disc(cx, x, y, 2, '#ff6bd5'); R(cx, '#ffffff', x, y, 1, 1); }
        else if (b.k === 'lock') { R(cx, '#1b1530', x - 3, y - 1, 7, 5); R(cx, '#ffd75e', x - 2, y, 5, 3); R(cx, '#ffd75e', x - 2, y - 3, 1, 3); R(cx, '#ffd75e', x + 2, y - 3, 1, 3); R(cx, '#ffd75e', x - 1, y - 4, 3, 1); R(cx, '#1b1530', x, y + 1, 1, 1); }
        else { disc(cx, x, y, 2, '#ff4b4b'); R(cx, '#ffd0d0', x - 1, y - 1, 1, 1); }
      }
      if (this.bombR) { cx.strokeStyle = 'rgba(214,206,255,.85)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(this.p.x, this.p.y, this.bombR, 0, Math.PI * 2); cx.stroke(); }
      if (this.flash) R(cx, `rgba(255,255,255,${(this.flash / 24).toFixed(2)})`, 0, 0, W, H);
      R(cx, 'rgba(8,10,20,.6)', 0, 0, W, 12); txt('PHISH KING', 3, 2, '#ffb3c0');
      const hw = Math.round(66 * Math.max(0, this.hp) / this.max); R(cx, '#3a1d2a', 90, 4, 66, 4); R(cx, '#ff4b6e', 90, 4, hw, 4); R(cx, '#ffd0d8', 90, 4, hw, 1);
      for (let i = 0; i < this.lives; i++) cx.drawImage(SHIELD, 3 + i * 13, 129);
      for (let i = 0; i < this.bombs; i++) { const x = 151 - i * 11; ring(cx, x, 135, 4, '#d6ceff'); R(cx, '#d6ceff', x - 1, 134, 3, 3); }
      if (this.banT > 40 && this.phase) banner(['', 'PHASE 2', 'PHASE 3'][this.phase], ['', 'LINK SPIRAL', 'RANSOM RAIN'][this.phase], '#ff8a80');
    }
  };

  /* ---------- power, boot, layout while playing ---------- */
  function showOff() { setUI('<div class="off-glow"></div>'); }
  function showBoot() { setUI(`<div class="boot"><p class="big">${[...'CK-1'].map((c, i) => `<i style="animation-delay:${i * 90}ms">${c}</i>`).join('')}</p><p class="sub">POCKET LAB</p></div>`); }
  function clearScreen() { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#07080a'; cx.fillRect(0, 0, cv.width, cv.height); }
  const wide = () => innerWidth > 960;
  let bootT = 0;
  function powerOn() {
    if (st.on) return;
    st.on = true; audio(); SFX.power();
    if (document.fonts && document.fonts.load) document.fonts.load(PXF).catch(() => {});
    dev.classList.add('on'); $('.power', dev).setAttribute('aria-pressed', 'true'); soundBtn.classList.add('show');
    body.classList.add('playing'); zoomTo(1);
    if (wide()) { scrollTo({ top: 0, behavior: 'instant' }); root.classList.add('lock'); } else centerDevice();
    st.mode = 'boot'; scene = null; showBoot();
    bootT = setTimeout(() => { if (st.mode === 'boot') { SFX.boot(); st.mode = 'on'; go(TITLE, null, false); } }, reduce ? 150 : 1150);
    if (document.activeElement && document.activeElement !== body) document.activeElement.blur();
  }
  function centerDevice() {
    const r = rigwrap.getBoundingClientRect(), navH = nav.offsetHeight;
    const top = scrollY + r.top - Math.max(navH + 10, (innerHeight - r.height) / 2);
    scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }
  function powerOff() {
    if (!st.on) return;
    st.on = false; goTok++; clearTimeout(bootT); SFX.power(); for (const k in held) held[k] = false; ptr.down = false;
    if (scene && scene.exit) scene.exit(); scene = null;
    dev.classList.remove('on'); $('.power', dev).setAttribute('aria-pressed', 'false'); soundBtn.classList.remove('show');
    body.classList.remove('playing'); root.classList.remove('lock'); zoomTo(0); closePop();
    st.mode = 'off'; st.busy = false; screenEl.classList.remove('dark'); showOff(); clearScreen();
  }

  function press(k) {
    if (k === 'power') return st.on ? powerOff() : powerOn();
    if (!st.on) return;
    if (k === 'esc') return powerOff();
    if (st.mode !== 'on' || st.busy) return;
    if (pcOpen) return cardKey(k);
    if (scene && scene.press) scene.press(k);
  }

  /* ---------- input ---------- */
  const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'a', Enter: 'a', k: 'a', K: 'a', j: 'a', J: 'a', p: 'a', P: 'a', Backspace: 'b', l: 'b', L: 'b', Escape: 'esc', m: 'start', M: 'start', Shift: 'select' };
  const BTN = { up: '.u', down: '.d', left: '.l', right: '.r', a: '[data-k="a"]', b: '[data-k="b"]', start: '[data-k="start"]', select: '[data-k="select"]' };
  let inView = true;
  addEventListener('keydown', e => {
    if (!st.on || !inView || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (player.open) return;
    if (t && t.closest && t.closest('button, a') && (e.key === 'Enter' || e.key === ' ') && !t.closest('#device')) return;
    const k = KEYS[e.key]; if (!k) return;
    e.preventDefault();
    if (k in held) { const was = held[k]; held[k] = true; if (was) return; }
    if (e.repeat) return;
    const b = dev.querySelector(BTN[k]); if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 110); }
    press(k);
  });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k && k in held) held[k] = false; });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });

  // the d-pad, A and B are hold buttons for touch and mouse
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
    const u = e.target.closest('[data-ui]');
    if (u && st.mode === 'on' && !st.busy && !pcOpen && scene && scene.ui) { audio(); scene.ui(u.dataset.ui, u); }
  });
  // touch and drag on the screen itself (map, flight, boss, dodgeball)
  const toLogical = e => { const r = screenEl.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, s: W / r.width }; };
  screenEl.addEventListener('pointerdown', e => {
    if (!st.on || st.mode !== 'on' || pcOpen || st.busy || e.target.closest('[data-ui], .tv')) return;
    const p = toLogical(e); Object.assign(ptr, { down: true, x: p.x, y: p.y, lx: e.clientX, ly: e.clientY, dx: 0, dy: 0 });
    try { screenEl.setPointerCapture(e.pointerId); } catch (x) {}
    audio();
    if (scene === RUN && RUN.ph === 'play' && RUN.g.tap) RUN.g.tap(p.x, p.y); else if (scene && scene.tap) scene.tap(p.x, p.y);
  });
  screenEl.addEventListener('pointermove', e => {
    if (!ptr.down) return; const p = toLogical(e);
    ptr.dx += (e.clientX - ptr.lx) * p.s * 1.15; ptr.dy += (e.clientY - ptr.ly) * p.s * 1.15; ptr.lx = e.clientX; ptr.ly = e.clientY; ptr.x = p.x; ptr.y = p.y;
  });
  const ptrUp = () => { ptr.down = false; ptr.dx = ptr.dy = 0; };
  screenEl.addEventListener('pointerup', ptrUp); screenEl.addEventListener('pointercancel', ptrUp);
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
    const amp = reduce ? 0 : lerp(small ? 6 : 12, st.on ? 0 : 2.5, z);
    const ry = lerp(small ? -8 : -24, 0, z) + tiltX * amp, rxx = lerp(small ? 4 : 8, 0, z) - tiltY * amp * .7, rz = lerp(small ? -1 : -3, 0, z);
    rig.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)}) rotateX(${rxx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
  }

  /* ---------- main loop: fixed 60 Hz steps ---------- */
  const STEP = 1000 / 60;
  let last = now(), acc = 0, lastSky = 0;
  function draw() {
    cx.setTransform(SC, 0, 0, SC, 0, 0); cx.imageSmoothingEnabled = false;
    const k = shake && !reduce ? shake * .6 : 0;
    cx.save(); if (k) cx.translate(Math.round((Math.random() - .5) * k), Math.round((Math.random() - .5) * k));
    scene.render(); drawFx(); cx.restore();
  }
  function frame(t) {
    const dt = Math.min(100, t - last); last = t;
    placeRig(t);
    const skyGap = st.on ? 140 : (coarse ? 110 : 70);
    if (t - lastSky > skyGap && (scrollY < innerHeight * 1.5 || t - lastSky > 400)) { drawSky(t); lastSky = t; }
    if (st.on && inView && st.mode === 'on' && scene) {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 4) { if (!pcOpen && !st.busy) { scene.step(); stepFx(); } acc -= STEP; n++; }
      if (n === 4) acc = 0;
      draw();
    }
    placeCard();
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { sizeSky(); placeCard(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) for (const k in held) held[k] = false; last = now(); });
  sizeSky(); showOff(); clearScreen(); requestAnimationFrame(frame);
})();
