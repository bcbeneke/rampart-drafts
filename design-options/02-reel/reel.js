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

/* The one motion graphic (the hero photograph). One shot when the hero comes into view: the photograph pushes in from 1 to 1.04 over 5 s, exponential ease-out,
   and inside it one event: the pay run's status resolves from ready for review to paid, and a mint rule draws under it. Then it holds; no second beat, no loop.
   Pauses off screen and in a hidden tab.
   Reduced motion: the final frame at once. */
(() => {
  const fig = document.querySelector('.hero-shot');
  if (!fig) return;
  const EXPO = 'cubic-bezier(0.19, 1, 0.22, 1)';
  const anims = [];
  const img = fig.querySelector('.hero-photo'), status = fig.querySelector('.hero-status');
  const final = () => { img.style.transform = 'scale(1.04)'; };
  const arm = () => status.classList.add('armed');
  const event = () => {
    const fire = () => {
      status.classList.remove('armed');
      anims.push(status.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1200, easing: EXPO, fill: 'both', pseudoElement: '::after' }));
    };
    const tick = () => { if ((anims[0].currentTime || 0) >= 1800) fire(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    // the state change rides on the push's clock, so it pauses with it
    anims[0].finished.catch(() => {});
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { final(); return; }
  arm();
  let started = false, inView = false;
  const play = () => {
    started = true;
    anims.push(img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], { duration: 5000, easing: EXPO, fill: 'forwards' }));
    event();
  };
  const hold = (on) => anims.forEach((a) => (on ? a.pause() : a.playState === 'paused' && a.play()));
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && !started && !document.hidden) play(); else hold(!inView);
  }, { threshold: 0.4 }).observe(fig);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && inView && !started) play(); else hold(document.hidden || !inView); });
})();
