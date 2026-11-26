/* Draft 3 motion. Every graphic runs on its own while it is on screen and pauses when it is not.
   Nothing here listens to scroll position, pins a section or changes scroll speed. */
(() => {
  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = { matches: true }; // finishing pass: every graphic holds its settled frame

  // Theme switch from the review shell
  addEventListener('message', (e) => {
    if (e.source === parent && e.data && e.data.rpTheme) {
      if (e.data.rpTheme === 'default') delete root.dataset.theme; else root.dataset.theme = e.data.rpTheme;
    }
  });

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const chip = (g, x, y, code, w = 54, h = 28) => {
    const c = el('g', { class: 'g-chip', transform: `translate(${x - w / 2} ${y - h / 2})` }, g);
    el('rect', { width: w, height: h }, c);
    el('circle', { class: 'dot', cx: 11, cy: h / 2, r: 3.5 }, c);
    const t = el('text', { x: 21, y: h / 2 + 4.2 }, c); t.textContent = code;
    return c;
  };
  const core = (g, cx, cy, s, label) => {
    const c = el('g', {}, g);
    el('rect', { class: 'g-ring ring', x: cx - s / 2, y: cy - s / 2, width: s, height: s }, c);
    el('rect', { class: 'g-core', x: cx - s / 2, y: cy - s / 2, width: s, height: s }, c);
    const w = s * 0.58, h = w * 78.52 / 130;
    el('use', { href: '#rp-sym', x: cx - w / 2, y: cy - h / 2 - (label ? 7 : 0), width: w, height: h }, c);
    if (label) { const t = el('text', { x: cx, y: cy + h / 2 + 10, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 11, fill: '#b4bccb' }, c); t.textContent = label; }
    return c;
  };

  // A registry of per-frame updaters, each tied to an .anim container
  const tickers = [];
  const onScreen = new WeakMap();
  const io = new IntersectionObserver((es) => es.forEach((e) => { onScreen.set(e.target, e.isIntersecting); e.target.classList.toggle('on', e.isIntersecting); }), { rootMargin: '80px' });
  const register = (host, fn) => { io.observe(host); tickers.push({ host, fn }); };

  // Moving dots along straight segments. dir 1 = a to b, -1 = b to a.
  const mover = (g, a, b, cls, r = 3.2) => {
    const d = el('circle', { class: cls, r, cx: a[0], cy: a[1], opacity: 0 }, g);
    return (p) => { // p in [0,1], or null to hide
      if (p == null || p < 0 || p > 1) { d.setAttribute('opacity', 0); return; }
      d.setAttribute('cx', a[0] + (b[0] - a[0]) * p); d.setAttribute('cy', a[1] + (b[1] - a[1]) * p);
      d.setAttribute('opacity', Math.min(1, p * 6, (1 - p) * 6));
    };
  };
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const seg = (p, a, b) => (p < a || p > b) ? null : ease((p - a) / (b - a));

  // 1. Orbit: countries around one engine. Inputs travel in, the run processes, payments travel out, the country turns paid.
  function orbit(svg, { W = 600, H = 540, rx = 236, ry = 206, codes, coreSize = 112, label = '' }) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const cx = W / 2, cy = H / 2;
    const gl = el('g', {}, svg), gd = el('g', {}, svg), gc = el('g', {}, svg), gx = el('g', {}, svg);
    const items = codes.map((code, i) => {
      const a = -Math.PI / 2 + (i / codes.length) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      el('line', { class: 'g-line soft', x1: x, y1: y, x2: cx, y2: cy }, gl);
      return { c: chip(gx, x, y, code), inD: mover(gd, [x, y], [cx, cy], 'g-dotin'), outD: mover(gd, [cx, cy], [x, y], 'g-dotout'), off: (i * 0.618) % 1 };
    });
    core(gc, cx, cy, coreSize, label);
    const P = 8.5;
    return (t) => {
      for (const it of items) {
        const p = (t / P + it.off) % 1;
        it.inD(seg(p, 0.04, 0.3)); it.outD(seg(p, 0.56, 0.8));
        const st = p >= 0.82 ? 'paid' : p >= 0.3 ? 'proc' : '';
        if (it.st !== st) { it.c.classList.toggle('proc', st === 'proc'); it.c.classList.toggle('paid', st === 'paid'); it.st = st; }
      }
    };
  }
  orbit.settle = (svg) => svg.querySelectorAll('.g-chip').forEach((c) => c.classList.add('paid'));

  // 2. Problem: today, a patchwork; with Rampart, one engine
  function before(svg) {
    svg.setAttribute('viewBox', '0 0 600 375');
    const boxes = [[92, 96, 'DE', -4], [236, 66, 'US', 3], [404, 92, 'FR', -2], [520, 172, 'IN', 5], [108, 238, 'BR', 4], [262, 200, 'GB', -5], [420, 268, 'JP', 2], [300, 312, 'MX', -3]];
    const links = [[0, 1], [1, 2], [2, 3], [0, 5], [5, 2], [4, 5], [5, 6], [6, 3], [4, 7], [7, 6], [1, 5]];
    const gl = el('g', {}, svg), gb = el('g', {}, svg);
    links.forEach(([a, b], i) => el('line', { class: 'g-dash', x1: boxes[a][0], y1: boxes[a][1], x2: boxes[b][0], y2: boxes[b][1], style: `animation-duration:${5 + (i % 4)}s` }, gl));
    boxes.forEach(([x, y, code, r], i) => {
      const g = el('g', { class: 'drift', style: `--r:${r}deg;animation-duration:${5 + (i % 3) * 1.3}s;animation-delay:-${i * .9}s` }, gb);
      const w = [76, 64, 84, 70][i % 4], h = [46, 52, 40, 48][i % 4];
      el('rect', { class: 'g-box', x: x - w / 2, y: y - h / 2, width: w, height: h, style: i % 2 ? 'stroke-dasharray:3 3' : '' }, g);
      const t = el('text', { class: 'g-lbl', x, y: y + 4.5, 'text-anchor': 'middle', 'font-family': 'var(--mono)' }, g); t.textContent = code;
      if (i % 3 === 0) el('circle', { class: 'g-warn flash', cx: x + w / 2, cy: y - h / 2, r: 6, style: `animation-delay:${i * .7}s` }, g);
    });
    const cap = el('text', { class: 'g-sub', x: 20, y: 28 }, svg); cap.textContent = 'Today';
    return null;
  }
  function after(svg) {
    svg.setAttribute('viewBox', '0 0 600 375');
    const codes = ['DE', 'US', 'FR', 'IN', 'BR', 'GB', 'JP', 'MX'];
    const gl = el('g', {}, svg), gd = el('g', {}, svg), gx = el('g', {}, svg);
    const bar = { x: 70, y: 250, w: 460, h: 58 };
    const items = codes.map((code, i) => {
      const x = 70 + 27 + i * (406 / 7), y = 110;
      el('line', { class: 'g-line', x1: x, y1: y, x2: x, y2: bar.y }, gl);
      return { c: chip(gx, x, y, code), d: mover(gd, [x, y + 14], [x, bar.y], 'g-dotin'), off: i / 8 };
    });
    el('rect', { class: 'g-core', x: bar.x, y: bar.y, width: bar.w, height: bar.h }, gx);
    el('use', { href: '#rp-sym', x: bar.x + 20, y: bar.y + 17, width: 40, height: 24 }, gx);
    const t = el('text', { x: bar.x + 72, y: bar.y + 34, 'font-family': 'var(--mono)', 'font-size': 13, fill: '#e6e6e6' }, gx); t.textContent = 'one engine · one data model';
    const cap = el('text', { class: 'g-sub', x: 20, y: 28 }, svg); cap.textContent = 'With Rampart';
    const P = 4.2;
    return (tt) => items.forEach((it) => {
      const p = (tt / P + it.off) % 1;
      it.d(seg(p, 0, 0.55));
      const paid = p > 0.55;
      if (it.paid !== paid) { it.c.classList.toggle('paid', paid); it.paid = paid; }
    });
  }

  // 3. AI: agents, your AI and your workbench around one engine
  function ai(svg, vertical) {
    const L = vertical
      ? { W: 400, H: 640, core: [200, 330, 96],
          left: { head: [24, 34, 'AGENTS'], boxes: [[24, 48, 'Implement'], [144, 48, 'Monitor'], [264, 48, 'Change']], w: 112, h: 40, side: 'top' },
          right: { head: [24, 492, 'YOUR WORKBENCH'], boxes: [[24, 506, 'Rampart'], [144, 506, 'Your HCM'], [264, 506, 'Chat']], w: 112, h: 40, side: 'bottom' },
          ai: [24, 590, 'Your AI', 'API · MCP · A2A', 210], files: [246, 590, 'Flat files', '', 130] }
      : { W: 1200, H: 360, core: [600, 180, 108],
          left: { head: [70, 52, 'AGENTS'], boxes: [[70, 66, 'Implement'], [70, 156, 'Monitor'], [70, 246, 'Change']], w: 190, h: 52, side: 'left' },
          right: { head: [940, 52, 'YOUR WORKBENCH'], boxes: [[940, 66, 'Rampart'], [940, 156, 'Your HCM'], [940, 246, 'Chat']], w: 190, h: 52, side: 'right' },
          ai: [500, 20, 'Your AI', 'API · MCP · A2A', 200], files: [500, 296, 'Flat files', 'Managed exchange', 200] };
    svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
    const [cx, cy, cs] = L.core;
    const gl = el('g', {}, svg), gd = el('g', {}, svg), gb = el('g', {}, svg);
    const ms = [];
    const box = (x, y, w, h, label, sub, brand) => {
      el('rect', { class: 'g-box' + (brand ? ' brand' : ''), x, y, width: w, height: h }, gb);
      const t = el('text', { class: 'g-lbl', x: x + 14, y: y + (sub ? h / 2 - 1 : h / 2 + 4.5) }, gb); t.textContent = label;
      if (sub) { const s = el('text', { class: 'g-sub', x: x + 14, y: y + h / 2 + 14 }, gb); s.textContent = sub; }
    };
    const head = ([x, y, s]) => { const t = el('text', { class: 'g-sub', x, y }, gb); t.textContent = s; };
    const link = (a, b, inOut, k) => {
      el('line', { class: 'g-line', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gl);
      if (inOut !== 'out') ms.push({ m: mover(gd, a, b, 'g-dotin'), off: k * 0.23, w: [0.05, 0.45] });
      if (inOut !== 'in') ms.push({ m: mover(gd, b, a, 'g-dotout'), off: k * 0.23, w: [0.55, 0.95] });
    };
    const edge = (side) => side === 'left' ? [cx - cs / 2, cy] : side === 'right' ? [cx + cs / 2, cy] : side === 'top' ? [cx, cy - cs / 2] : [cx, cy + cs / 2];
    head(L.left.head); head(L.right.head);
    L.left.boxes.forEach(([x, y, s], i) => {
      box(x, y, L.left.w, L.left.h, s);
      const a = L.left.side === 'left' ? [x + L.left.w, y + L.left.h / 2] : [x + L.left.w / 2, y + L.left.h];
      link(a, edge(L.left.side), 'in', i);
    });
    L.right.boxes.forEach(([x, y, s], i) => {
      box(x, y, L.right.w, L.right.h, s, '', i === 0);
      const a = L.right.side === 'right' ? [x, y + L.right.h / 2] : [x + L.right.w / 2, y];
      link(a, edge(L.right.side), 'both', i + 3);
    });
    const [ax, ay, al, as, aw] = L.ai, [fx, fy, fl, fs, fw] = L.files, bh = vertical ? 40 : 44;
    box(ax, ay, aw, bh, al, vertical ? '' : as, true);
    if (vertical) { const s = el('text', { class: 'g-sub', x: ax + 80, y: ay + bh / 2 + 4 }, gb); s.textContent = as; }
    box(fx, fy, fw, bh, fl, vertical ? '' : fs);
    if (vertical) {
      link([ax + aw / 2, ay], [cx - 20, cy + cs / 2], 'both', 8);
      link([fx + fw / 2, fy], [cx + 20, cy + cs / 2], 'both', 9);
    } else {
      link([ax + aw / 2, ay + bh], edge('top'), 'both', 8);
      link([fx + fw / 2, fy], edge('bottom'), 'both', 9);
    }
    core(gb, cx, cy, cs);
    const P = 4.6;
    return (t) => ms.forEach((o) => { const p = (t / P + o.off) % 1; o.m(seg(p, o.w[0], o.w[1])); });
  }

  // 4. One integration: one connection in, every country out
  function integ(svg, { left = 'Your HCM', leftSub = 'one integration' } = {}) {
    svg.setAttribute('viewBox', '0 0 640 500');
    const codes = ['US', 'CA', 'MX', 'BR', 'AR', 'GB', 'IE', 'FR', 'DE', 'NL', 'ES', 'IT', 'PL', 'SE', 'CH', 'IN', 'SG', 'JP', 'AU', 'ZA'];
    const gl = el('g', {}, svg), gd = el('g', {}, svg), gb = el('g', {}, svg);
    const hb = { x: 24, y: 216, w: 150, h: 68 }, cc = [282, 250], cs = 92;
    el('rect', { class: 'g-box', x: hb.x, y: hb.y, width: hb.w, height: hb.h }, gb);
    const t1 = el('text', { class: 'g-lbl', x: hb.x + 16, y: hb.y + 30 }, gb); t1.textContent = left;
    const t2 = el('text', { class: 'g-sub', x: hb.x + 16, y: hb.y + 48 }, gb); t2.textContent = leftSub;
    const a = [hb.x + hb.w, cc[1]];
    el('line', { class: 'g-line', x1: a[0], y1: a[1], x2: cc[0], y2: cc[1], 'stroke-width': 2.4, style: 'stroke:var(--brand)' }, gl);
    const ms = [{ m: mover(gd, a, cc, 'g-dotin', 4), off: 0, w: [0, .5] }, { m: mover(gd, cc, a, 'g-dotout', 4), off: .5, w: [0, .5] }];
    const rows = 5, cols = 4, x0 = 420, dx = 62, y0 = 70, dy = 90;
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * dy, first = [x0 - 25, y];
      el('line', { class: 'g-line soft', x1: cc[0], y1: cc[1], x2: first[0], y2: y }, gl);
      el('line', { class: 'g-line soft', x1: first[0], y1: y, x2: x0 + (cols - 1) * dx, y2: y }, gl);
      ms.push({ m: mover(gd, cc, first, 'g-dotin', 2.8), off: r * 0.21, w: [0.1, 0.55] });
    }
    codes.forEach((code, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const c = chip(gb, x0 + col * dx, y0 + row * dy, code, 50, 26);
      c.classList.add('lit'); c.querySelector('rect').style.animationDelay = `${(i * 0.37 % 1) * 10}s`;
    });
    core(gb, cc[0], cc[1], cs);
    const P = 3.8;
    return (t) => ms.forEach((o) => { const p = (t / P + o.off) % 1; o.m(seg(p, o.w[0], o.w[1])); });
  }

  const build = { orbit, before, after, ai, integ };
  document.querySelectorAll('svg[data-g]').forEach((svg) => {
    const kind = svg.dataset.g, opts = svg.dataset.opts ? JSON.parse(svg.dataset.opts) : {};
    const fn = kind === 'ai' ? ai(svg, svg.dataset.v === '1') : build[kind](svg, opts);
    const host = svg.closest('.anim') || svg;
    if (reduce.matches) { if (kind === 'orbit' || kind === 'after') svg.querySelectorAll('.g-chip').forEach((c) => c.classList.add('paid')); return; }
    if (fn) register(host, fn);
    else io.observe(host);
  });

  // One loop for all graphics; graphics off screen skip their frames and keep their time
  const clock = new Map();
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (const { host, fn } of tickers) {
      if (!onScreen.get(host) || document.hidden) continue;
      const t = (clock.get(fn) || 0) + dt; clock.set(fn, t); fn(t);
    }
    requestAnimationFrame(frame);
  };
  if (!reduce.matches) requestAnimationFrame(frame);

  // Menu bar: one panel at a time, opens on click or hover, closes on Escape, outside click or leaving the header
  const navEl = document.querySelector('.nav');
  if (navEl) {
    const trigs = [...navEl.querySelectorAll('.trig[data-m]')];
    const mbtn = navEl.querySelector('.mbtn'), sheet = document.getElementById('msheet');
    const hoverable = matchMedia('(hover: hover) and (pointer: fine)');
    let openKey = null, timer = 0;
    const setOpen = (key) => {
      clearTimeout(timer);
      if (key === openKey) return;
      trigs.forEach((t) => {
        const on = t.dataset.m === key;
        t.setAttribute('aria-expanded', String(on));
        document.getElementById('m-' + t.dataset.m).hidden = !on;
      });
      openKey = key;
      navEl.classList.toggle('open', !!key);
    };
    trigs.forEach((t) => {
      t.addEventListener('click', () => setOpen(openKey === t.dataset.m ? null : t.dataset.m));
      t.addEventListener('pointerenter', () => { if (hoverable.matches) { clearTimeout(timer); timer = setTimeout(() => setOpen(t.dataset.m), openKey ? 0 : 90); } });
    });
    navEl.addEventListener('pointerleave', () => { if (hoverable.matches) { clearTimeout(timer); timer = setTimeout(() => setOpen(null), 220); } });
    navEl.addEventListener('pointerenter', () => { if (openKey) clearTimeout(timer); });
    navEl.querySelectorAll('.mega a, .msheet a').forEach((a) => a.addEventListener('click', () => { setOpen(null); setSheet(false); }));
    document.addEventListener('click', (e) => { if (!navEl.contains(e.target)) setOpen(null); });
    const setSheet = (on) => {
      if (!mbtn) return;
      mbtn.setAttribute('aria-expanded', String(on)); sheet.hidden = !on;
      navEl.classList.toggle('open', on); root.style.overflow = on ? 'hidden' : '';
    };
    if (mbtn) mbtn.addEventListener('click', () => setSheet(mbtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (openKey) { const t = trigs.find((x) => x.dataset.m === openKey); setOpen(null); t && t.focus(); }
      if (mbtn && mbtn.getAttribute('aria-expanded') === 'true') { setSheet(false); mbtn.focus(); }
    });
    matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setSheet(false); else setOpen(null); });
    const onScroll = () => navEl.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();

/* The one motion graphic (third pass): the hero orbit, one shot.
   On entering the viewport: a camera push of 4% over 5 s on an exponential ease-out, and inside it one event,
   the engine paying every country at once (payment lines draw out to every country, and each turns paid
   as its line lands). Then it holds; no second beat, no loop. Pauses off screen and in a hidden tab. Reduced motion: the final frame, at once. */
(() => {
  const svg = document.querySelector('.hero svg[data-g="orbit"]');
  const fig = svg && svg.closest('.art');
  if (!svg || !fig) return;
  const chips = [...svg.querySelectorAll('.g-chip')];
  const lines = [...svg.querySelectorAll('.g-line')];
  const EXPO = 'cubic-bezier(0.19, 1, 0.22, 1)'; // exponential ease-out
  svg.style.transformOrigin = '50% 50%';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.classList.add('paid-run'); svg.style.transform = 'scale(1.04)'; return; }

  // Armed state: countries idle, payment lines retracted into the engine.
  chips.forEach((c) => c.classList.remove('paid'));
  const lens = lines.map((l) => {
    const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
    l.style.strokeDasharray = `${len} ${len}`;
    l.style.strokeDashoffset = `${-len}`;
    return len;
  });

  const anims = [];
  let started = false, inView = false;
  const play = () => {
    started = true;
    svg.classList.add('paid-run');
    anims.push(svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], { duration: 5000, easing: EXPO, fill: 'forwards' }));
    lines.forEach((l, i) => {
      const a = l.animate([{ strokeDashoffset: -lens[i] }, { strokeDashoffset: 0 }], { duration: 1400, delay: 1800, easing: EXPO, fill: 'forwards' });
      a.finished.then(() => chips[i] && chips[i].classList.add('paid'), () => {});
      anims.push(a);
    });
  };
  const hold = (on) => anims.forEach((a) => (on ? a.pause() : a.playState === 'paused' && a.play()));
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && !started && !document.hidden) play();
    else hold(!inView);
  }, { threshold: 0.4 }).observe(fig);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && inView && !started) play(); else hold(document.hidden || !inView); });

})();
