/* Option 03, Instrument. A bench instrument for a pay run, built in three.js r169.
   One engine at the centre (four layers: Payroll, Compliance, Payments, the global data model) and a column
   for every country, each column a stack of pay slabs. The run has five poses:
     0 patchwork  every country on its own system: scattered, tilted, each a different stock
     1 calculate  every column set into one ring around one engine
     2 file       the top slabs (taxes and contributions) lift out to the authorities' ring
     3 pay        the net slabs slide out to the people at the rim
     4 report     everything back in the ring, linked to the engine, seen from above
   Pointer: drag to turn the instrument, point at a column to read its country, press a key to run a step.
   The one sequence (patchwork to calculate) plays once on load and any key or drag retargets it.
   Frames are drawn only while something moves; nothing renders off screen or in a hidden tab. */

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

// three.js loads after the menu is wired, so the menu works even when the CDN cannot be reached.
let THREE = null, RoomEnvironment = null;
try {
  THREE = await import('three');
  ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
} catch (e) { THREE = null; }

const scene$ = document.querySelector('.scene');
const canvas = document.getElementById('gl');
const keys = [...document.querySelectorAll('.key')];
const roLine = document.querySelector('.ro-line');
const roCountry = document.querySelector('.ro-country');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CODES = ['US', 'CA', 'MX', 'BR', 'AR', 'GB', 'IE', 'FR', 'DE', 'NL', 'ES', 'IT', 'PL', 'SE', 'CH', 'AE', 'IN', 'SG', 'JP', 'AU', 'ZA', 'NG'];
const LINES = [
  '',
  'Gross-to-net under every country’s rules, for every entity.',
  'Taxes, social contributions and statutory reports, with every authority.',
  'Net pay, tax remittances and benefits, from the system that calculates them.',
  'Real-time payroll data and reporting across every country.',
];

// Dimensions of the model, in metres at bench scale.
const N = CODES.length;
const LEVELS = 5;          // per column: three net slabs below, two filing slabs above
const FILE_FROM = 3;       // levels 3 and 4 are taxes and contributions
const R = 3.2;             // the country ring
const SLAB = { w: 0.5, h: 0.12, d: 0.3, gap: 0.04 };
const PLATE_R = 5.3;

const C = THREE && {
  enamel: new THREE.Color('#e2e5df'), plate: new THREE.Color('#d5d9d2'), graphite: new THREE.Color('#1e2530'),
  steel: new THREE.Color('#8e99a4'), brass: new THREE.Color('#b8893a'), signal: new THREE.Color('#1e2530'),
};

// Seeded random so the patchwork is the same on every load.
let seed = 20261124;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // no WebGL: the designed still frame stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = C.enamel.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  // One shadow-casting key light, low and to the side so the slabs throw long shadows across the plate.
  const sun = new THREE.DirectionalLight('#fff6e8', 2.4);
  sun.position.set(-6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.normalBias = 0.02;
  scene.add(sun, new THREE.HemisphereLight('#f4f5f1', '#9aa39a', 0.6));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: '#1e2530', opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Everything that turns with the pointer.
  const rig = new THREE.Group();
  scene.add(rig);

  // The base plate, engraved with each country's code beside its column.
  const plateTex = engrave();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(PLATE_R, PLATE_R + 0.06, 0.12, 128),
    [new THREE.MeshStandardMaterial({ color: C.plate, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.75 }), new THREE.MeshStandardMaterial({ color: C.plate })],
  );
  plate.position.y = 0.06;
  plate.receiveShadow = true;
  rig.add(plate);

  // The engine: four layers, the global data model widest at the base.
  const core = new THREE.Group();
  [[1.35, C.graphite, 0.16], [1.12, C.steel, 0.14], [0.94, C.steel, 0.14], [0.76, C.plate, 0.14]].reduce((y, [r, col, h]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 }));
    m.position.y = y + h / 2;
    m.castShadow = m.receiveShadow = true;
    core.add(m);
    return y + h + 0.02;
  }, 0.12);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 12, 96), new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.3, metalness: 0.85 }));
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 0.82;
  core.add(crown);
  rig.add(core);

  // The data links from the engine to every country, brightest when reporting.
  const linkPos = new Float32Array(N * 6);
  for (let c = 0; c < N; c++) {
    const a = (c / N) * Math.PI * 2;
    linkPos.set([Math.cos(a) * 1.4, 0.2, Math.sin(a) * 1.4, Math.cos(a) * (R - 0.32), 0.14, Math.sin(a) * (R - 0.32)], c * 6);
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0 });
  rig.add(new THREE.LineSegments(linkGeo, linkMat));

  // The pay slabs: one instanced mesh, 110 instances, one draw call.
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(SLAB.w, SLAB.h, SLAB.d), new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.35 }), N * LEVELS);
  slabs.castShadow = slabs.receiveShadow = true;
  slabs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rig.add(slabs);

  // Poses: for every slab, a position, a rotation, a scale and a colour in each of the five steps.
  const poses = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const stack = (k) => 0.12 + SLAB.h / 2 + k * (SLAB.h + SLAB.gap);
  const stocks = Array.from({ length: N }, () => new THREE.Color().setHSL(0.25 + rnd() * 0.35, 0.06 + rnd() * 0.1, 0.42 + rnd() * 0.3));
  const scatter = Array.from({ length: N }, (_, c) => ({
    a: (c / N) * Math.PI * 2 + (rnd() - 0.5) * 0.5, r: R * (0.75 + rnd() * 0.6), tx: (rnd() - 0.5) * 0.7, tz: (rnd() - 0.5) * 0.7, ty: rnd() * Math.PI,
    w: 0.7 + rnd() * 0.7, step: 0.6 + rnd() * 1.4, lift: rnd() * 0.5,
  }));
  for (let c = 0; c < N; c++) {
    const a = (c / N) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const face = -a + Math.PI / 2; // long side tangent to the ring
    for (let k = 0; k < LEVELS; k++) {
      const filing = k >= FILE_FROM;
      const set = [];
      // 0 patchwork
      const s = scatter[c];
      set.push({
        p: new THREE.Vector3(Math.cos(s.a) * s.r, stack(k) * s.step + s.lift, Math.sin(s.a) * s.r),
        q: q.setFromEuler(e.set(s.tx, s.ty + k * 0.12, s.tz)).clone(), s: new THREE.Vector3(s.w, 1, 1 / s.w), col: stocks[c].clone(),
      });
      // 1 calculate
      const ring = { p: new THREE.Vector3(ca * R, stack(k), sa * R), q: q.setFromEuler(e.set(0, face, 0)).clone(), s: new THREE.Vector3(1, 1, 1), col: (filing ? C.steel.clone().offsetHSL(0, 0, 0.08) : C.steel.clone()) };
      set.push(ring);
      // 2 file: taxes and contributions lift out to the authorities' ring
      const filed = { p: new THREE.Vector3(ca * (R + 1.35), 1.15 + (k - FILE_FROM) * 0.2, sa * (R + 1.35)), q: ring.q.clone(), s: new THREE.Vector3(0.9, 1, 0.9), col: C.signal.clone() };
      set.push(filing ? filed : { ...ring, col: C.steel.clone() });
      // 3 pay: the net slabs slide out to the rim and lie flat, side by side
      const tang = 0;
      const paid = { p: new THREE.Vector3(ca * (R + 1.0 + k * 0.32) - sa * tang, 0.2, sa * (R + 1.0 + k * 0.32) + ca * tang), q: ring.q.clone(), s: new THREE.Vector3(0.9, 0.6, 0.9), col: C.brass.clone() };
      set.push(filing ? filed : paid);
      // 4 report: all back in the ring, coloured by what they became
      set.push({ ...ring, col: (filing ? C.signal : C.brass).clone() });
      poses.push(set);
    }
  }

  // Camera vantages: the bench at an angle, and straight down for the report.
  const vBench = { p: new THREE.Vector3(0, 8.4, 14.8), t: new THREE.Vector3(0, -1.9, 0) };
  const vTop = { p: new THREE.Vector3(0, 26, 3.1), t: new THREE.Vector3(0, 0, 2.5) };

  // The one motion graphic: a 5 s shot on first view. Time only advances on drawn frames, so it pauses
  // off screen and in a hidden tab. Reduced motion starts at the final frame.
  const expo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const intro = { on: false, t: reduced ? 5 : 0,
    push() { return expo(this.t / 5); },
    ev() { return expo(Math.max(0, Math.min(1, (this.t - 1.8) / 1.4))); } };

  // State, eased toward targets every frame; retargeting mid-move is how everything stays interruptible.
  const st = { s: 1, sGoal: 1, from: 1, t0: 0, yaw: 0, yawGoal: 0, hover: -1, shown: -1 };
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const m4 = new THREE.Matrix4(), pv = new THREE.Vector3(), qv = new THREE.Quaternion(), sv = new THREE.Vector3(), cv = new THREE.Color();
  const white = new THREE.Color('#ffffff');

  function pose() {
    const s = Math.min(Math.max(st.s, 0), 4);
    const i = Math.min(Math.floor(s), 3), f = io(s - i);
    for (let n = 0; n < poses.length; n++) {
      const A = poses[n][i], B = poses[n][i + 1];
      pv.lerpVectors(A.p, B.p, f);
      qv.slerpQuaternions(A.q, B.q, f);
      sv.lerpVectors(A.s, B.s, f);
      m4.compose(pv, qv, sv);
      slabs.setMatrixAt(n, m4);
      cv.lerpColors(A.col, B.col, f);
      if (Math.floor(n / LEVELS) === st.hover) cv.lerp(white, 0.35);
      slabs.setColorAt(n, cv);
    }
    slabs.instanceMatrix.needsUpdate = true;
    slabs.instanceColor.needsUpdate = true;
    // The one motion graphic's event: the engine's data links light to every country (the global data model).
    const ev = intro.ev();
    linkMat.opacity = s > 3 ? 0.35 + 0.55 * (s - 3) : 0.7 * ev;
    rig.rotation.y = st.yaw;
    const top = io(Math.max(0, s - 3));
    camera.position.lerpVectors(vBench.p, vTop.p, top);
    const look = pv.lerpVectors(vBench.t, vTop.t, top);
    camera.position.lerp(look, 0.04 * intro.push()); // the camera push, 4% toward the subject
    camera.lookAt(look);
  }

  // Sizing: a long lens; on tall screens widen the vertical view so the whole ring stays in frame.
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 34 * Math.min(1.9, (1.2 / (w / h))) : 34;
    camera.updateProjectionMatrix();
    kick();
  }

  // The frame loop runs only while something is settling, the scene is on screen and the tab is visible.
  let raf = 0, last = 0, onScreen = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    if (intro.on && intro.t < 5) intro.t = Math.min(5, intro.t + dt);
    last = now;
    // Finishing pass: the one motion is a step change, 280 ms, ease-out; the turn follows the pointer directly.
    const k = reduced ? 1 : Math.min(1, (now - st.t0) / 280);
    st.s = st.from + (st.sGoal - st.from) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) st.s = st.sGoal;
    st.yaw = st.yawGoal;
    pose();
    renderer.render(scene, camera);
    const moving = st.s !== st.sGoal || st.yaw !== st.yawGoal || (intro.on && intro.t < 5);
    raf = moving && onScreen && !document.hidden ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  }
  function kick() { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }

  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) { intro.on = true; kick(); } }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  new ResizeObserver(size).observe(canvas);

  // Keys: run a step. Arrow keys move between them like one control.
  function setPhase(p) {
    st.from = st.s; st.t0 = performance.now(); st.sGoal = p;
    keys.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.phase === p)));
    roLine.textContent = LINES[p];
    kick();
  }
  keys.forEach((b, i) => {
    b.addEventListener('click', () => setPhase(+b.dataset.phase));
    b.addEventListener('keydown', (ev) => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      const next = keys[(i + d + keys.length) % keys.length];
      next.focus();
      setPhase(+next.dataset.phase);
    });
  });

  // Pointer: drag turns the instrument, hovering reads a column.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, yaw: st.yawGoal, id: ev.pointerId };
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (drag) {
      st.yawGoal = drag.yaw + (ev.clientX - drag.x) * 0.006;
      kick();
      return;
    }
    if (ev.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(slabs)[0];
    const col = hit ? Math.floor(hit.instanceId / LEVELS) : -1;
    if (col !== st.hover) {
      st.hover = col;
      roCountry.hidden = col < 0;
      roCountry.textContent = col < 0 ? '' : `Column ${CODES[col]}`;
      pose();
      renderer.render(scene, camera);
    }
  });
  const end = (ev) => { if (drag && ev.pointerId === drag.id) { drag = null; canvas.classList.remove('dragging'); } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (st.hover !== -1) { st.hover = -1; roCountry.hidden = true; pose(); renderer.render(scene, camera); } });

  size();
  pose();
  renderer.render(scene, camera);
  scene$.dataset.state = 'live';
  kick(); // the one sequence: patchwork into the ring, under two seconds
}

// The plate's engraving: tick marks and the country codes, drawn once into a canvas texture.
function engrave() {
  const S = 2048, cx = S / 2, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#d5d9d2';
  g.fillRect(0, 0, S, S);
  const px = S / 2 / PLATE_R; // pixels per metre at the plate's top face
  g.strokeStyle = '#a9b0a8';
  g.lineWidth = 2;
  [R - 0.42, R + 0.42, R + 2.0].forEach((r) => { g.beginPath(); g.arc(cx, cx, r * px, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = '#3a4350';
  g.font = '500 44px "Inter", ui-monospace, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, r1 = (PLATE_R - 0.18) * px, r2 = (PLATE_R - (i % 5 ? 0.3 : 0.45)) * px;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2); g.stroke();
  }
  CODES.forEach((code, c) => {
    // the cylinder cap's UVs turn the world a quarter turn against the canvas
    const a = (c / N) * Math.PI * 2 - Math.PI / 2;
    const r = (R + 0.62) * px;
    g.save();
    g.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
    g.rotate(a - Math.PI / 2); // tops face outward, so the near codes read upright from the bench
    g.fillText(code, 0, 0);
    g.restore();
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Wait for the mono face so the engraving is set in it, then build.
(document.fonts ? document.fonts.load('500 44px "Inter"').catch(() => {}) : Promise.resolve()).then(() => { if (THREE) start(); });
