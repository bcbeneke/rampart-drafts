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

/* 13, Current, countries. Twenty-two country codes sit at the left ends of a field of fine threads.
   The threads leave their codes straight, wander and cross, then comb into one purple band; one coral
   thread runs through it. One purple thread peels off the band and drifts down and back to the left,
   thickening into the page's spine, so the vertical line grows out of the purple. The field holds
   still; the only motion is one slow pulse that runs from the codes along every thread into the band. */
const CODES = ['US', 'CA', 'MX', 'BR', 'AR', 'GB', 'IE', 'FR', 'DE', 'NL', 'ES', 'IT', 'PL', 'SE', 'CH', 'AE', 'IN', 'SG', 'JP', 'AU', 'ZA', 'NG'];
const draw = ({ ctx, C, rgba, mix, W, H, JX, JY, push, spineX, spineW = 1.6, fade, xL = 0, xR = W, codes = true, pulse = true, codeFont = 'sans-serif' }, t) => {
  const N = 150, step = 12, T = 7; // the threads' shape is fixed at T; only the pulse uses t
  // the codes sit just in from the window's left edge (where the SVG put them), right-aligned;
  // the threads start beside them and run to the right edge of the window
  const cx = xL + 12 + 58, X0 = cx + 12;
  const sx = Number.isFinite(spineX) ? spineX : 180, r = 30;
  const spineI = Math.floor(N * 0.62); // the band thread the spine peels from
  const ys = new Float32Array(Math.ceil((xR - X0) / step) + 3);
  const band = (i) => (i / (N - 1) - 0.5) * 26;
  const smooth = (v) => { const s = Math.min(1, Math.max(0, v)); return s * s * (3 - 2 * s); };
  const laneY = (i) => JY + (i / (N - 1) - 0.5) * 206; // 12: half of the original 412-unit spread
  const thread = (i) => {
    const lane = laneY(i);
    let k = 0;
    for (let x = X0; x <= xR + step; x += step, k++) {
      const u = smooth((x / W - 0.36) / 0.3);
      const wx = x * 0.0055 + T * 0.045;
      const warp = Math.sin(wx * 1.7 + i * 0.21 + T * 0.09) * 1.4;
      const n = Math.sin(wx * 2.3 + i * 0.37 + warp) * 0.6 + Math.sin(wx * 0.9 - i * 0.13 + T * 0.06) * 0.4;
      // each thread leaves its code straight and in order, then starts to wander
      const yl = lane + n * 17 * smooth((x - X0) / 90);
      const yb = JY + band(i) + Math.sin(x * 0.012 - T * 0.5 + i * 0.3) * 1.2;
      let y = yl + (yb - yl) * u;
      y += push(x, y, 110, 16) * (1 - u * 0.6);
      ys[k] = y;
    }
    return k;
  };
  const stroke = (k, from, to, color, width) => {
    ctx.beginPath();
    for (let j = from; j < to; j++) { const x = X0 + j * step; if (j === from) ctx.moveTo(x, ys[j]); else ctx.lineTo(x, ys[j]); }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  };
  const bandFrom = Math.floor((W * 0.42 - X0) / step);
  const ramp = ctx.createLinearGradient(W * 0.42, 0, W * 0.64, 0);
  ramp.addColorStop(0, rgba(C.purple, 0)); ramp.addColorStop(1, rgba(C.purple, 0.5));
  // the pulse: one soft glow with a tail, moving at a constant speed from the codes into the band,
  // ink on the left and purple as the threads gather; it fades out inside the band, then a pause.
  // The outer threads run a little behind the middle ones, so the pulse follows the threads in
  // rather than sweeping down the field as one straight edge.
  let px = 0, pa = 0, pcol = null;
  const PL = 150, PH = 40; // tail and head lengths, in units
  if (pulse) {
    const P = 11, TRAVEL = 8, xEnd = W * 0.8;
    const ph = (((t - 7.8) % P) + P) % P; // t starts at 7: the first pulse leaves 0.8 s after load
    if (ph < TRAVEL) {
      px = X0 + (xEnd - X0 + 40) * (ph / TRAVEL);
      pa = 0.26 * smooth((px - X0) / 60) * (1 - smooth((px - W * 0.62) / (W * 0.18)));
      pcol = mix(C.ink, C.purple, smooth((px / W - 0.36) / 0.3));
    }
  }
  const glow = (i, k) => {
    const hx = px - 0.35 * Math.abs(laneY(i) - JY); // this thread's head
    const g = ctx.createLinearGradient(hx - PL, 0, hx + PH, 0);
    g.addColorStop(0, rgba(pcol, 0)); g.addColorStop(PL / (PL + PH), rgba(pcol, pa)); g.addColorStop(1, rgba(pcol, 0));
    const a = Math.max(0, Math.floor((hx - PL - X0) / step)), b = Math.min(k, Math.ceil((hx + PH - X0) / step) + 1);
    if (b > a + 1) stroke(k, a, b, g, 1);
  };
  const coralI = Math.floor(N / 2);
  for (let i = 0; i < N; i++) {
    if (i === coralI) continue;
    const k = thread(i);
    stroke(k, 0, k, rgba(C.ink, 0.13), 1);
    stroke(k, bandFrom, k, ramp, 1);
    if (pa > 0) glow(i, k);
  }
  const k = thread(coralI);
  stroke(k, 0, k, rgba(C.coral, 0.95), 1.6);
  // the 22 country codes, each at the left end of its own thread
  if (codes) {
    ctx.font = `400 8.5px ${codeFont}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(C.ink2);
    CODES.forEach((c, n) => ctx.fillText(c, cx, laneY(Math.round(n * (N - 1) / (CODES.length - 1)))));
  }
  if (fade) fade();
  // the spine grows out of the purple band: one purple thread peels off where the band is already purple
  // and drifts down and back to the left on a loose, slowly moving curve, thickening into the spine
  thread(spineI);
  const at = (x) => { const j = (x - X0) / step, j0 = Math.floor(j), f = j - j0; return ys[j0] + (ys[j0 + 1] - ys[j0]) * f; };
  const x0 = W * 0.6, y0 = at(x0);
  const wob = (a, b, m) => Math.sin(T * a + b) * m; // fixed at T: the curve no longer sways
  // two cubic segments meeting smoothly: peel off the band, one bend, arrive pointing straight down
  const mx = (x0 + sx) / 2 + wob(0.13, 0.7, 30), my = H * 0.74 + wob(0.17, 2.1, 12);
  const seg = [
    [[x0, y0], [x0 - 90, y0 + 18], [mx + 130, my - 36 + wob(0.21, 1.3, 10)], [mx, my]],
    [[mx, my], [mx - 130, my + 36 - wob(0.21, 1.3, 10)], [sx, H - 110], [sx, H]],
  ];
  const bez = (q, u) => { const v = 1 - u; return [0, 1].map((d) => v * v * v * q[0][d] + 3 * v * v * u * q[1][d] + 3 * v * u * u * q[2][d] + u * u * u * q[3][d]); };
  const S = 40;
  let prev = [x0, y0];
  for (let g = 0; g < 2; g++) for (let n = 1; n <= S; n++) {
    const u = (g + n / S) / 2, p2 = bez(seg[g], n / S);
    // starts as thin as a band thread and only thickens as it turns down, reaching the coral thread's width
    const s2 = Math.min(1, Math.max(0, (u - 0.45) / 0.5)), w = s2 * s2 * (3 - 2 * s2);
    ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p2[0], p2[1]);
    ctx.lineWidth = 1 + (spineW - 1) * w; ctx.strokeStyle = rgba(C.purple, 0.5 + 0.5 * Math.min(1, u * 1.4)); ctx.lineCap = 'round'; ctx.stroke();
    prev = p2;
  }
  ctx.beginPath(); ctx.moveTo(sx, H - 2); ctx.lineTo(sx, H + 4); ctx.lineWidth = spineW; ctx.strokeStyle = rgba(C.purple); ctx.lineCap = 'butt'; ctx.stroke();
};

/* The hero graphic, alive: a canvas drawn in the hero's place. The field holds still and one pulse runs
   along the threads from the codes into the band, about every 11 s, while it is on screen. It does not
   respond to the pointer. It stops drawing off screen and in a hidden tab; device pixel ratio is capped at
   2; under reduced motion it draws one still frame with no pulse. The SVG it replaces stays as the
   no-script picture. */
(() => {
  const fig = document.querySelector('.line-fig');
  const svg = fig && fig.querySelector('svg.lines');
  if (!fig || !svg) return;
  const cs = getComputedStyle(document.documentElement);
  const hex = (v) => { const h = cs.getPropertyValue(v).trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const C = { ink: hex('--ink'), ink2: hex('--ink-2'), paper: hex('--paper'), purple: hex('--pigment'), coral: hex('--coral') };
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  const W = 1200, H = 290, JX = 760, JY = 125; // 12: a shorter box that fits the half-height field
  const canvas = document.createElement('canvas');
  canvas.className = 'live';
  canvas.setAttribute('aria-hidden', 'true');
  fig.appendChild(canvas);
  fig.classList.add('is-live');
  const ctx = canvas.getContext('2d');
  // The canvas bleeds past its box, above (behind the hero text) and below (behind the first section),
  // so no thread is cut by an edge; negative margins keep the page layout where it was, and a soft
  // fade dissolves the field at both edges.
  const PADT = 70, PADB = 200;
  let scale = 1, ox = 0, pt = 0, pb = 0, cssH = 0, dpr = 1;
  const size = () => {
    const w = fig.clientWidth, h = Math.min(w * H / W, innerHeight * 0.52);
    dpr = Math.min(devicePixelRatio || 1, 2);
    scale = Math.min(w / W, h / H); ox = (w - W * scale) / 2;
    pt = PADT * scale; pb = PADB * scale; cssH = h + pt + pb;
    canvas.style.width = `${w}px`; canvas.style.height = `${cssH}px`;
    canvas.style.marginTop = `${-pt}px`; fig.style.marginBottom = `${-pb}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * pt);
    // the page's vertical line takes the coral thread's thickness (1.6 units), never under 1px
    const spw = Math.max(1, 1.6 * scale);
    document.documentElement.style.setProperty('--spine-w', `${spw}px`);
    env.spineW = spw / scale;
    env.xL = -ox / scale - 12; env.xR = W + ox / scale + 12;
    // the codes are drawn only where they render at 7px or more; below that (narrow tablets and
    // phones) 22 codes cannot fit the field's height, and the threads start at the same place without them
    env.codes = 8.5 * scale >= 7;
    const sp = document.querySelector('.spine');
    if (sp) {
      const left = parseFloat(getComputedStyle(sp, '::before').left) || 0;
      const px = sp.getBoundingClientRect().left + left + spw / 2 - canvas.getBoundingClientRect().left;
      env.spineX = (px - ox) / scale;
    }
  };
  const clear = () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); };
  // soft edges: everything drawn so far fades out into the bleed above and below
  const fade = () => {
    if (!(cssH > 0)) return; // no width yet (first draw before layout)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    const a = pt / cssH, b = (pt + H * scale) / cssH;
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(a, 'rgba(0,0,0,1)');
    g.addColorStop(b, 'rgba(0,0,0,1)'); g.addColorStop(Math.min(1, b + (1 - b) * 0.8), 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
  // No pointer response (removed by request): the graphic moves on its own clock only.
  const push = () => 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const env = { ctx, C, rgba, mix, W, H, JX, JY, push, fade, pulse: !reduced, codeFont: cs.getPropertyValue('--text').trim() || 'sans-serif' };
  let t = 7, last = 0, raf = 0, visible = false;
  const frame = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    t += dt;
    clear();
    draw(env, t);
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  };
  const start = () => { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame); };
  size();
  draw(env, t);
  addEventListener('resize', () => { size(); if (reduced || !raf) { clear(); draw(env, t); } }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(fig);
  document.addEventListener('visibilitychange', start);
  // the codes are canvas text: redraw a still frame once the web font has loaded
  if (document.fonts) document.fonts.ready.then(() => { if (!raf) { clear(); draw(env, t); } });
})();
