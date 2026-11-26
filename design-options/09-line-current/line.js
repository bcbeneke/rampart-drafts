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

/* 09, Current. A field of fine threads flows slowly from left to right. On the left they wander and
   cross, each on its own warped path; through the middle they comb into one purple band; one coral
   thread runs through it. */
const draw = ({ ctx, C, rgba, W, H, JX, JY, push }, t) => {
  const N = 150, step = 12;
  const ys = new Float32Array(Math.ceil(W / step) + 2);
  const band = (i) => (i / (N - 1) - 0.5) * 26;
  const thread = (i) => {
    const lane = 14 + i * (H - 28) / (N - 1);
    let k = 0;
    for (let x = 0; x <= W; x += step, k++) {
      const s = Math.min(1, Math.max(0, (x / W - 0.36) / 0.3));
      const u = s * s * (3 - 2 * s);
      const wx = x * 0.0055 + t * 0.045;
      const warp = Math.sin(wx * 1.7 + i * 0.21 + t * 0.09) * 1.4;
      const n = Math.sin(wx * 2.3 + i * 0.37 + warp) * 0.6 + Math.sin(wx * 0.9 - i * 0.13 + t * 0.06) * 0.4;
      const yl = lane + n * 34;
      const yb = JY + band(i) + Math.sin(x * 0.012 - t * 0.5 + i * 0.3) * 1.2;
      let y = yl + (yb - yl) * u;
      y += push(x, y, 110, 16) * (1 - u * 0.6);
      ys[k] = y;
    }
    return k;
  };
  const stroke = (k, from, color, width) => {
    ctx.beginPath();
    for (let j = from; j < k; j++) { const x = j * step; if (j === from) ctx.moveTo(x, ys[j]); else ctx.lineTo(x, ys[j]); }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  };
  const bandFrom = Math.floor((W * 0.42) / step);
  const ramp = ctx.createLinearGradient(W * 0.42, 0, W * 0.64, 0);
  ramp.addColorStop(0, rgba(C.purple, 0)); ramp.addColorStop(1, rgba(C.purple, 0.5));
  const coralI = Math.floor(N / 2);
  for (let i = 0; i < N; i++) {
    if (i === coralI) continue;
    const k = thread(i);
    stroke(k, 0, rgba(C.ink, 0.13), 1);
    stroke(k, bandFrom, ramp, 1);
  }
  const k = thread(coralI);
  stroke(k, 0, rgba(C.coral, 0.95), 1.6);
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
