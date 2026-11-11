import './style.css';
import {
  fullscreenVert,
  updateFrag,
  particleVert,
  particleFrag,
  fadeFrag,
  compositeFrag,
} from './shaders.js';

// ---------------------------------------------------------------- setup

const SIM = 512; // SIM × SIM particles
const COUNT = SIM * SIM;

const canvas = document.createElement('canvas');
document.querySelector('#app').append(canvas);

// ---------------------------------------------------------------- materials
// gain: density → height, bump: surface relief in css px,
// lod: mip level the normals are taken from (higher = smoother, more "poured"),
// density: how much material each particle deposits.

const MATERIALS = [
  { id: 0, key: 'light', name: 'Light', gain: 1, bump: 0, lod: 0, density: 1 },
  { id: 1, key: 'glass', name: 'Glass', gain: 2.2, bump: 26, lod: 1.5, density: 1 },
  { id: 2, key: 'wool', name: 'Wool', gain: 3.5, bump: 10, lod: 2.5, density: 1.6 },
  { id: 3, key: 'silk', name: 'Silk', gain: 2.0, bump: 60, lod: 4.0, density: 1.4 },
  { id: 4, key: 'metal', name: 'Liquid metal', gain: 2.5, bump: 40, lod: 2.5, density: 1.3 },
  { id: 5, key: 'porcelain', name: 'Porcelain', gain: 2.5, bump: 22, lod: 2.0, density: 1.3 },
];
const TOUR_HOLD = 35; // seconds per material while touring
const MAT_FADE = 1.6; // seconds of material crossfade

const params = new URLSearchParams(location.search);
const startMat = Math.max(0, MATERIALS.findIndex((m) => m.key === params.get('m')));

const ui = document.createElement('nav');
ui.className = 'picker';
ui.innerHTML =
  MATERIALS.map((m, i) => `<button data-i="${i}"><span>${i + 1}</span>${m.name}</button>`).join('') +
  '<button data-tour class="tour">tour</button>';
document.querySelector('#app').append(ui);

const hint = document.createElement('div');
hint.className = 'hint';
hint.innerHTML =
  '<span>1–6</span> material · <span>a</span> tour · <span>click</span> reseed · <span>space</span> pause · <span>f</span> fullscreen · <span>s</span> save · <span>h</span> hide';
document.querySelector('#app').append(hint);

const gl = canvas.getContext('webgl2', {
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
});

if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
  hint.textContent = 'This piece needs WebGL2 with float render targets.';
  hint.classList.add('visible', 'error');
  throw new Error('WebGL2 + EXT_color_buffer_float required');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- gl helpers

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
  }
  return s;
}

function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }
  const cache = new Map();
  const u = (name) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
    return cache.get(name);
  };
  return { p, u };
}

function stateTexture(data) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIM, SIM, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function stateTarget(pos, vel) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pos, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vel, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  return { fb, pos, vel };
}

// ---------------------------------------------------------------- programs

const progUpdate = program(fullscreenVert, updateFrag);
const progParticles = program(particleVert, particleFrag);
const progFade = program(fullscreenVert, fadeFrag);
const progComposite = program(fullscreenVert, compositeFrag);

const emptyVao = gl.createVertexArray();
gl.bindVertexArray(emptyVao);

// ---------------------------------------------------------------- palettes
// Inigo Quilez cosine palettes: a + b·cos(2π(c·t + d)).

const PALETTES = [
  // moonlit teal → pearl
  [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 1.0, 1.0], [0.3, 0.2, 0.2]],
  // ember / rose gold
  [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 0.7, 0.4], [0.0, 0.15, 0.2]],
  // aurora
  [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 1.0, 0.5], [0.8, 0.9, 0.3]],
  // ink & violet
  [[0.55, 0.45, 0.6], [0.45, 0.4, 0.45], [1.0, 1.0, 1.0], [0.55, 0.65, 0.85]],
  // sea glass
  [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 1.0, 1.0], [0.0, 0.1, 0.2]],
  // dusk
  [[0.8, 0.5, 0.4], [0.2, 0.4, 0.2], [2.0, 1.0, 1.0], [0.0, 0.25, 0.25]],
];

const PALETTE_HOLD = 38; // seconds on a palette
const PALETTE_FADE = 14; // seconds of crossfade

const smooth = (x) => x * x * (3 - 2 * x);
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function cosPalette(p, t) {
  return [0, 1, 2].map((i) => p[0][i] + p[1][i] * Math.cos(6.28318 * (p[2][i] * t + p[3][i])));
}

// ---------------------------------------------------------------- state

let read, write;
let seed = params.has('seed') ? Number(params.get('seed')) : Math.random() * 100;
let paletteOffset = Math.floor(Math.random() * PALETTES.length);

function seedParticles() {
  const aspect = innerWidth / innerHeight;
  const pos = new Float32Array(COUNT * 4);
  const vel = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 4 + 0] = (Math.random() * 2 - 1) * aspect * 1.08;
    pos[i * 4 + 1] = (Math.random() * 2 - 1) * 1.08;
    // stagger ages so respawns don't pulse in sync
    const life = 4 + 10 * Math.pow(Math.random(), 1.5);
    pos[i * 4 + 2] = Math.random() * life;
    pos[i * 4 + 3] = life;
    vel[i * 4 + 2] = Math.random(); // fixed per-particle hue jitter
  }
  for (const t of [read, write]) {
    if (!t) continue;
    gl.deleteFramebuffer(t.fb);
    gl.deleteTexture(t.pos);
    gl.deleteTexture(t.vel);
  }
  read = stateTarget(stateTexture(pos), stateTexture(vel));
  write = stateTarget(stateTexture(pos), stateTexture(vel));
}

// Trail buffers (half-float, with mip chains for glow and smooth normals):
//   trail: rgb = emissive colour, a = density / height
//   fibre: xy  = double-angle fibre direction weighted by density
let trail = null;
let fibre = null;
let trailFb = null;
let W = 0;
let H = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = Math.max(1, Math.floor(innerWidth * dpr));
  H = Math.max(1, Math.floor(innerHeight * dpr));
  canvas.width = W;
  canvas.height = H;

  for (const t of [trail, fibre]) if (t) gl.deleteTexture(t);
  if (trailFb) gl.deleteFramebuffer(trailFb);

  const levels = Math.floor(Math.log2(Math.max(W, H))) + 1;
  const make = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA16F, W, H);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  trail = make();
  fibre = make();

  trailFb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, trailFb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trail, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, fibre, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// ---------------------------------------------------------------- input

const mouse = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, lastMove: -1e9 };
let paused = false;
let saveNext = false;
let hintHidden = false;
let hintTimer = 0;

function showHint(ms = 2800) {
  if (hintHidden) return;
  hint.classList.add('visible');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.remove('visible'), ms);
}

function toWorld(e) {
  const aspect = innerWidth / innerHeight;
  return [(e.clientX / innerWidth) * 2 * aspect - aspect, 1 - (e.clientY / innerHeight) * 2];
}

addEventListener('pointermove', (e) => {
  const [x, y] = toWorld(e);
  if (performance.now() - mouse.lastMove > 400) {
    mouse.x = x;
    mouse.y = y;
  }
  mouse.tx = x;
  mouse.ty = y;
  mouse.lastMove = performance.now();
  document.body.classList.remove('idle');
});

let clickStart = 0;
canvas.addEventListener('pointerdown', () => (clickStart = performance.now()));
canvas.addEventListener('pointerup', () => {
  if (performance.now() - clickStart < 300) reseed();
});

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ') {
    paused = !paused;
    e.preventDefault();
  } else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  } else if (k === 's') {
    saveNext = true;
  } else if (k === 'h') {
    hintHidden = !hintHidden;
    hint.classList.toggle('visible', !hintHidden);
  } else if (k === 'r') {
    reseed();
  } else if (k === 'a') {
    mat.tour = !mat.tour;
    mat.clock = 0;
    syncPicker();
  } else if (k >= '1' && k <= String(MATERIALS.length)) {
    setMaterial(Number(k) - 1);
  }
});

// ---- material state: A is shown, B fades in over MAT_FADE seconds
const mat = { a: startMat, b: startMat, mix: 0, tour: params.get('tour') !== '0', clock: 0 };

function setMaterial(i, fromTour = false) {
  if (!fromTour) mat.tour = false;
  mat.clock = 0;
  if (i === mat.b) return syncPicker();
  if (mat.mix > 0) mat.a = mat.b; // retarget mid-fade from what is mostly showing
  mat.b = i;
  mat.mix = 0.0001;
  syncPicker();
}

function syncPicker() {
  ui.querySelectorAll('[data-i]').forEach((b) =>
    b.classList.toggle('active', Number(b.dataset.i) === mat.b),
  );
  ui.querySelector('[data-tour]').classList.toggle('active', mat.tour);
}

ui.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tour !== undefined) {
    mat.tour = !mat.tour;
    mat.clock = 0;
    syncPicker();
  } else setMaterial(Number(b.dataset.i));
});
syncPicker();

function reseed() {
  seed = Math.random() * 100;
  paletteOffset = (paletteOffset + 1 + Math.floor(Math.random() * (PALETTES.length - 1))) % PALETTES.length;
  paletteClock = 0;
}

addEventListener('resize', resize);

// ---------------------------------------------------------------- frame

resize();
seedParticles();

let simTime = 0;
let paletteClock = 0;
let last = performance.now();

showHint(6000);

function frame(now) {
  requestAnimationFrame(frame);

  let dt = Math.min(Math.max(0, (now - last) / 1000), 1 / 20);
  last = now;
  if (paused) dt = 0;
  const motion = reducedMotion ? 0.45 : 1;
  simTime += dt * motion;
  paletteClock += dt;
  const t = simTime;

  const aspect = W / H;

  // ---- slow "mood" drift (incommensurate periods → never quite repeats)
  const scale = 0.68 + 0.2 * Math.sin(t * 0.0111 + seed) + 0.1 * Math.sin(t * 0.0273 + seed * 1.7);
  const flowT = seed + t * 0.035;
  const speed = 0.13 * motion;
  // how strongly streams gather into filaments; breathes slowly
  const converge = 0.32 + 0.18 * Math.sin(t * 0.0191 + seed * 2.3);
  const decayBase = 0.9915 + 0.0035 * Math.sin(t * 0.0137 + seed * 0.3);
  const decay = Math.pow(decayBase, dt * 60);

  const vortices = [0, 1, 2].flatMap((i) => {
    const a = seed * (i + 1) * 0.71;
    return [
      Math.sin(t * (0.021 + i * 0.007) + a) * aspect * 0.62,
      Math.cos(t * (0.017 + i * 0.005) + a * 1.3) * 0.58,
      (i === 1 ? -1 : 1) * (0.55 + 0.3 * Math.sin(t * (0.013 + i * 0.004) + a)),
    ];
  });

  // pointer: a gentle eddy that follows the cursor and relaxes when still
  const sinceMove = (now - mouse.lastMove) / 1000;
  const targetStrength = sinceMove < 1.2 ? 0.28 : 0;
  mouse.strength += (targetStrength - mouse.strength) * Math.min(1, dt * 2.5);
  mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 6);
  mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 6);
  if (sinceMove > 2.5 && !document.body.classList.contains('idle')) {
    document.body.classList.add('idle');
  }

  // ---- palette crossfade
  const cycle = PALETTE_HOLD + PALETTE_FADE;
  const step = Math.floor(paletteClock / cycle);
  const within = paletteClock - step * cycle;
  const mixT = smooth(Math.max(0, (within - PALETTE_HOLD) / PALETTE_FADE));
  const pa = PALETTES[(paletteOffset + step) % PALETTES.length];
  const pb = PALETTES[(paletteOffset + step + 1) % PALETTES.length];
  const pal = [0, 1, 2, 3].map((i) => lerp3(pa[i], pb[i], mixT));
  const hue = 0.5 + 0.25 * Math.sin(t * 0.009 + seed);

  // ---- material tour + crossfade
  if (!paused) mat.clock += dt;
  if (mat.tour && mat.clock > TOUR_HOLD) setMaterial((mat.b + 1) % MATERIALS.length, true);
  if (mat.mix > 0) {
    mat.mix += dt / MAT_FADE;
    if (mat.mix >= 1) {
      mat.a = mat.b;
      mat.mix = 0;
    }
  }
  const mA = MATERIALS[mat.a];
  const mB = MATERIALS[mat.b];
  const mixM = smooth(Math.min(mat.mix, 1));
  const densityMul = mA.density + (mB.density - mA.density) * mixM;

  // ---- 1. simulate
  if (dt > 0) {
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.viewport(0, 0, SIM, SIM);
    gl.useProgram(progUpdate.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.pos);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, read.vel);
    gl.uniform1i(progUpdate.u('uPos'), 0);
    gl.uniform1i(progUpdate.u('uVel'), 1);
    gl.uniform1f(progUpdate.u('uTime'), t);
    gl.uniform1f(progUpdate.u('uDt'), dt * motion);
    gl.uniform1f(progUpdate.u('uFlowT'), flowT);
    gl.uniform1f(progUpdate.u('uScale'), scale);
    gl.uniform1f(progUpdate.u('uSpeed'), speed);
    gl.uniform1f(progUpdate.u('uConverge'), converge);
    gl.uniform2f(progUpdate.u('uAspect'), aspect, 1);
    gl.uniform3fv(progUpdate.u('uVortex'), vortices);
    gl.uniform3f(progUpdate.u('uMouse'), mouse.x, mouse.y, mouse.strength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    [read, write] = [write, read];
  }

  // ---- 2. trails: fade, then splat particles additively
  gl.bindFramebuffer(gl.FRAMEBUFFER, trailFb);
  gl.viewport(0, 0, W, H);
  // keep the trail texture off every sampler unit while it is the render target
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, read.pos);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, read.vel);
  gl.enable(gl.BLEND);

  if (dt > 0) {
    gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
    gl.useProgram(progFade.p);
    gl.uniform1f(progFade.u('uDecay'), decay);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Self-calibrate so average density is similar on any screen size.
    // Segment length already scales with dt, so brightness is fps-independent.
    const refSegPx = Math.max(1, (speed * 1.5 * (H / 2)) / 60);
    const intensity = 0.27 * (1 - decayBase) * ((W * H) / (COUNT * refSegPx));

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(progParticles.p);
    gl.uniform1f(progParticles.u('uDensity'), densityMul);
    gl.uniform1i(progParticles.u('uPos'), 0);
    gl.uniform1i(progParticles.u('uVel'), 1);
    gl.uniform2f(progParticles.u('uAspect'), aspect, 1);
    gl.uniform1f(progParticles.u('uStep'), speed * dt);
    gl.uniform1f(progParticles.u('uIntensity'), intensity);
    gl.uniform1f(progParticles.u('uHue'), hue);
    gl.uniform3fv(progParticles.u('uPalA'), pal[0]);
    gl.uniform3fv(progParticles.u('uPalB'), pal[1]);
    gl.uniform3fv(progParticles.u('uPalC'), pal[2]);
    gl.uniform3fv(progParticles.u('uPalD'), pal[3]);
    gl.drawArrays(gl.LINES, 0, COUNT * 2);
  }
  gl.disable(gl.BLEND);

  // ---- 3. composite to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fibre);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, trail);
  gl.generateMipmap(gl.TEXTURE_2D);

  const bgA = cosPalette(pal, hue + 0.5).map((v) => Math.max(0, v) * 0.05 + 0.006);
  const bgB = cosPalette(pal, hue + 0.2).map((v) => Math.max(0, v) * 0.012 + 0.002);

  gl.useProgram(progComposite.p);
  gl.uniform1i(progComposite.u('uTrail'), 0);
  gl.uniform1i(progComposite.u('uFiber'), 1);
  gl.uniform1i(progComposite.u('uMatA'), mA.id);
  gl.uniform1i(progComposite.u('uMatB'), mB.id);
  gl.uniform1f(progComposite.u('uMatMix'), mat.mix > 0 ? mixM : 0);
  gl.uniform4f(progComposite.u('uPrmA'), mA.gain, mA.bump, mA.lod, 0);
  gl.uniform4f(progComposite.u('uPrmB'), mB.gain, mB.bump, mB.lod, 0);
  gl.uniform1f(progComposite.u('uDpr'), dpr);
  gl.uniform1f(progComposite.u('uExposure'), 1.15);
  gl.uniform1f(progComposite.u('uBloom'), 0.22);
  gl.uniform1f(progComposite.u('uTime'), now / 1000);
  gl.uniform2f(progComposite.u('uRes'), W, H);
  gl.uniform3fv(progComposite.u('uBgA'), bgA);
  gl.uniform3fv(progComposite.u('uBgB'), bgB);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  if (saveNext) {
    saveNext = false;
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `drift-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
}

requestAnimationFrame(frame);
