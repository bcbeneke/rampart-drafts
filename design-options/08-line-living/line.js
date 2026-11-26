/* Navigation, as in the draft: Platform, Solutions and Enterprise open panels (hover on a mouse, click or
   Enter anywhere), Escape closes and returns focus, a click outside closes, and phones get a full-screen menu. */
(() => {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  const root = document.documentElement;
  const trigs = [...nav.querySelectorAll('.trig[data-m]')];
  const mbtn = nav.querySelector('.mbtn');
  const sheet = document.getElementById('msheet');
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)');
  let openKey = null, timer = 0;

  const setOpen = (key) => {
    openKey = key;
    trigs.forEach((t) => {
      const on = t.dataset.m === key;
      t.setAttribute('aria-expanded', String(on));
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    nav.classList.toggle('menu-open', !!key);
  };
  const setSheet = (on) => {
    if (!mbtn) return;
    mbtn.setAttribute('aria-expanded', String(on));
    sheet.hidden = !on;
    nav.classList.toggle('sheet-open', on);
    root.style.overflow = on ? 'hidden' : '';
  };

  trigs.forEach((t) => {
    t.addEventListener('click', () => setOpen(openKey === t.dataset.m ? null : t.dataset.m));
    t.addEventListener('pointerenter', () => {
      if (!hoverable.matches) return;
      clearTimeout(timer);
      timer = setTimeout(() => setOpen(t.dataset.m), openKey ? 0 : 90);
    });
  });
  nav.addEventListener('pointerleave', () => { if (hoverable.matches) { clearTimeout(timer); timer = setTimeout(() => setOpen(null), 220); } });
  nav.addEventListener('pointerenter', () => { if (openKey) clearTimeout(timer); });
  nav.querySelectorAll('.mega a, .msheet a').forEach((a) => a.addEventListener('click', () => { setOpen(null); setSheet(false); }));
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(null); });
  if (mbtn) mbtn.addEventListener('click', () => setSheet(mbtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (openKey) { const t = trigs.find((x) => x.dataset.m === openKey); setOpen(null); if (t) t.focus(); }
    if (mbtn && mbtn.getAttribute('aria-expanded') === 'true') { setSheet(false); mbtn.focus(); }
  });
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  addEventListener('resize', () => { if (mbtn && getComputedStyle(mbtn).display === 'none') setSheet(false); }, { passive: true });
})();

/* 08, Living lines. Each country's line drifts on its own slow noise, like a local system that never quite
   lines up; the drift calms as the lines near the join. The one purple line never moves. Every few seconds
   a coral payment leaves the join along it. */
const CODES = ['US','CA','MX','BR','AR','GB','IE','FR','DE','NL','ES','IT','PL','SE','CH','AE','IN','SG','JP','AU','ZA','NG'];
const draw = ({ ctx, C, rgba, W, H, JX, JY, push }, t) => {
  const N = CODES.length;
  ctx.font = '400 11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = rgba(C.ink2);
  ctx.lineWidth = 1; ctx.strokeStyle = rgba(C.ink, 0.5);
  for (let i = 0; i < N; i++) {
    const y0 = 24 + i * (H - 48) / (N - 1);
    ctx.fillText(CODES[i], 58, y0 + 4);
    ctx.beginPath();
    let lastY = y0;
    for (let x = 70; x <= 660; x += 10) {
      const u = (x - 70) / 590;
      const base = y0 + (JY - y0) * Math.pow(Math.max(0, (x - 150) / 600), 2);
      const amp = 26 * Math.pow(1 - u, 1.2);
      const n = Math.sin(x * 0.018 + t * 0.21 + i * 1.3) * 0.55 + Math.sin(x * 0.043 - t * 0.13 + i * 2.7) * 0.35 + Math.sin(x * 0.006 + t * 0.07 + i * 0.5) * 0.45;
      let y = base + amp * n;
      y += push(x, y, 90, 14);
      if (x === 70) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      lastY = y;
    }
    ctx.bezierCurveTo(700, lastY, 720, JY, JX, JY);
    ctx.stroke();
  }
  // the one line, steady
  ctx.lineWidth = 3; ctx.strokeStyle = rgba(C.purple);
  ctx.beginPath(); ctx.moveTo(JX, JY); ctx.lineTo(W - 20, JY); ctx.stroke();
  ctx.fillStyle = rgba(C.purple); ctx.beginPath(); ctx.arc(JX, JY, 5, 0, Math.PI * 2); ctx.fill();
  // payments leaving the join
  const every = 3.4, run = 2.8;
  for (let k = Math.floor((t - run) / every); k <= Math.floor(t / every); k++) {
    const p = (t - k * every) / run;
    if (p < 0 || p > 1) continue;
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    ctx.fillStyle = rgba(C.coral, Math.min(1, p * 8, (1 - p) * 8));
    ctx.beginPath(); ctx.arc(JX + (W - 20 - JX) * e, JY, 4.5, 0, Math.PI * 2); ctx.fill();
  }
};

/* The hero graphic, alive: a canvas drawn in the hero's place, moving slowly and without end while it is
   on screen (a full cycle takes 30 to 40 s and never visibly repeats). It does not respond to the pointer. It stops drawing off screen and in a hidden tab; device pixel ratio is capped at
   2; under reduced motion it draws one still frame. The SVG it replaces stays as the no-script picture. */
(() => {
  const fig = document.querySelector('.line-fig');
  const svg = fig && fig.querySelector('svg.lines');
  if (!fig || !svg) return;
  const cs = getComputedStyle(document.documentElement);
  const hex = (v) => { const h = cs.getPropertyValue(v).trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const C = { ink: hex('--ink'), ink2: hex('--ink-2'), paper: hex('--paper'), purple: hex('--pigment'), coral: hex('--coral') };
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  const W = 1200, H = 440, JX = 760, JY = 220;
  const canvas = document.createElement('canvas');
  canvas.className = 'live';
  canvas.setAttribute('aria-hidden', 'true');
  fig.appendChild(canvas);
  fig.classList.add('is-live');
  const ctx = canvas.getContext('2d');
  let scale = 1, ox = 0;
  const size = () => {
    const w = fig.clientWidth, h = Math.min(w * H / W, innerHeight * 0.52);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    scale = Math.min(w / W, h / H); ox = (w - W * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, 0);
  };
  // No pointer response (removed by request): the graphic moves on its own clock only.
  const push = () => 0;
  const env = { ctx, C, rgba, mix, W, H, JX, JY, push };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 7, last = 0, raf = 0, visible = false;
  const frame = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    t += dt;
    ctx.clearRect(-ox / scale, 0, W + 2 * ox / scale, H);
    draw(env, t);
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  };
  const start = () => { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame); };
  size();
  draw(env, t);
  addEventListener('resize', () => { size(); if (reduced || !raf) { ctx.clearRect(-ox / scale, 0, W + 2 * ox / scale, H); draw(env, t); } }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(fig);
  document.addEventListener('visibilitychange', start);
})();
