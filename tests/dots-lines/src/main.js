import './style.css';
import { AXES, CHOICES } from './choices.js';
import { createField } from './sim.js';

// Dots & lines: every choice a user makes gets its own particle response.
//
//   1–6       a material: its character (rough, smooth, soft, …) takes over
//   sliders   set each axis by hand (top left)
//
// The particles only answer choices: they don't follow the mouse.
//
// The particles never jump: the character eases from one choice to the next.

const EASE = 2.2; // how fast the character follows a new choice (per second)
const IDLE_MS = 3000;

const app = document.querySelector('#app');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
app.append(canvas);
const field = createField(ctx);

// ---------------------------------------------------------------- character

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const fourColors = (palette) => [0, 1, 2, 3].map((k) => hexToRgb(palette[k % palette.length]));

const params = new URLSearchParams(location.search);
const start = CHOICES.find((c) => c.key === params.get('c')) ?? CHOICES[2];

const current = { ...start.axes }; // what the particles do now
const target = { ...start.axes }; // where they're heading
const colors = fourColors(start.palette);
let targetColors = fourColors(start.palette);
let choice = start.key;

function choose(key) {
  const next = CHOICES.find((c) => c.key === key);
  if (!next) return;
  choice = key;
  Object.assign(target, next.axes);
  targetColors = fourColors(next.palette);
  syncUi();
}

// ---------------------------------------------------------------- ui

const picker = document.createElement('nav');
picker.className = 'picker';
picker.setAttribute('aria-label', 'Choices');
picker.innerHTML =
  CHOICES.map((c, i) => `<button type="button" data-key="${c.key}"><span>${i + 1}</span>${c.name}</button>`).join('') +
''
picker.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (button) choose(button.dataset.key);
});

// One quiet slider per axis: shows the character as it moves, and lets you set it by hand.
const panel = document.createElement('section');
panel.className = 'axes';
panel.setAttribute('aria-label', 'Character');
panel.innerHTML = AXES.map(
  (a) => `<label><span>${a.label}</span><input type="range" min="0" max="1" step="0.01" data-axis="${a.key}" /></label>`,
).join('');
const sliders = [...panel.querySelectorAll('input')];
panel.addEventListener('input', (e) => {
  target[e.target.dataset.axis] = Number(e.target.value);
  choice = 'manual';
  syncUi();
});

const hint = document.createElement('div');
hint.className = 'hint visible';
hint.innerHTML =
  '<span>1–6</span> choice · <span>space</span> pause · <span>r</span> reseed · <span>f</span> fullscreen · <span>s</span> save · <span>h</span> hide';

app.append(panel, picker, hint);

function syncUi() {
  for (const b of picker.querySelectorAll('button')) b.classList.toggle('active', b.dataset.key === choice);
  document.body.dataset.choice = choice;
}

function syncSliders() {
  for (const s of sliders) if (document.activeElement !== s) s.value = current[s.dataset.axis];
}

// ---------------------------------------------------------------- keys

let paused = false;
let saveNext = false;
let uiHidden = false;

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
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
    uiHidden = !uiHidden;
    document.body.classList.toggle('bare', uiHidden);
  } else if (k === 'r') {
    field.seed();
  } else if (k >= '1' && k <= String(CHOICES.length)) {
    choose(CHOICES[Number(k) - 1].key);
  }
});

// Idle: hide the cursor and fade the controls, so it can hang on a wall.
let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), IDLE_MS);
}
addEventListener('pointermove', wake);
addEventListener('keydown', wake);
wake();

// ---------------------------------------------------------------- loop

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  field.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
syncUi();

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = performance.now();
let time = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (paused) return;

  // Ease the character (and the colours) toward the choice.
  const k = 1 - Math.exp(-dt * EASE);
  for (const a of AXES) current[a.key] += (target[a.key] - current[a.key]) * k;
  for (let c = 0; c < 4; c++) for (let i = 0; i < 3; i++) colors[c][i] += (targetColors[c][i] - colors[c][i]) * k;
  const rgb = colors.map((c) => c.map(Math.round));

  const f = dt * 60 * (reducedMotion ? 0.5 : 1);
  time += dt * (reducedMotion ? 0.5 : 1);
  field.step(f, time, current);
  field.draw(current, rgb);
  syncSliders();

  if (saveNext) {
    saveNext = false;
    const a = document.createElement('a');
    a.download = `dots-lines-${choice}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }
}
requestAnimationFrame(frame);
