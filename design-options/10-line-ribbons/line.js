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

/* 10, Ribbons. Two ribbons, purple and coral (the two strands of the Rampart symbol), fold and weave
   across the left of the hero and flatten into the one purple line at the join. Folds are shaded by which
   way each strip faces; crossings swap which ribbon is in front. */
const draw = ({ ctx, C, rgba, mix, W, H, JX, JY, push }, t) => {
  const step = 5;
  const rib = (x, phase, hw0) => {
    const u = Math.min(1, x / JX);
    const calm = Math.pow(1 - u, 0.9);
    let cy = JY + (Math.sin(x * 0.0085 + t * 0.11 + phase) * 92 + Math.sin(x * 0.019 - t * 0.07 + phase * 1.7) * 30) * calm;
    cy += push(x, cy, 120, 22);
    const tw = x * 0.011 + t * 0.23 + phase * 0.8;
    const face = Math.cos(tw);
    const hw = (hw0 * Math.pow(1 - u, 0.55) + 1.5) * Math.abs(face) + 0.6;
    const z = Math.sin(x * 0.0085 + t * 0.11 + phase + 1.2);
    return { cy, hw, face, z };
  };
  const shade = (base, face) => {
    const f = Math.abs(face);
    return face >= 0 ? mix(base, C.paper, 0.38 * (1 - f)) : mix(base, C.ink, 0.28 * (1 - f));
  };
  let prevA = rib(40, 0, 40), prevB = rib(40, 2.6, 24);
  for (let x = 40 + step; x <= JX; x += step) {
    const a = rib(x, 0, 40), b = rib(x, 2.6, 24);
    const quads = [[prevA, a, C.purple], [prevB, b, C.coral]].sort((p, q) => p[1].z - q[1].z);
    for (const [p, q, col] of quads) {
      ctx.fillStyle = rgba(shade(col, q.face));
      ctx.beginPath();
      ctx.moveTo(x - step, p.cy - p.hw); ctx.lineTo(x + 0.6, q.cy - q.hw);
      ctx.lineTo(x + 0.6, q.cy + q.hw); ctx.lineTo(x - step, p.cy + p.hw);
      ctx.closePath(); ctx.fill();
    }
    prevA = a; prevB = b;
  }
  ctx.lineWidth = 3; ctx.strokeStyle = rgba(C.purple);
  ctx.beginPath(); ctx.moveTo(JX, JY); ctx.lineTo(W - 20, JY); ctx.stroke();
  ctx.fillStyle = rgba(C.purple); ctx.beginPath(); ctx.arc(JX, JY, 5, 0, Math.PI * 2); ctx.fill();
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
