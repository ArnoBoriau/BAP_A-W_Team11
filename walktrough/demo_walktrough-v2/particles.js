// The particle wall: black, white dots and fine lines, one ice-blue accent.
// It only reacts to choices (a material placed on a part of the room, materials sent from Hall A).
// Both halls show the same field. Placeholder for the real engine in tests/material-particles.
import { MATS, ROOMS } from './materials.js';

// the patterns are laid out on 1280 × 640, the canvas is 3:2 like the 3 × 2 m screen
const W = 1280, H = 640, CH = 854, N = 560, ICE = '#9ec5ff', INK = '#08090b';
const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = CH;
const g = canvas.getContext('2d');
export const particleWall = { canvas };

// what a material looks like as particles: density, organic (0 = rigid), round dots, movement, transparency
const TAGS = {
  terrazzo: [0.8, 0.3, false, 'still', 0], carpet: [0.9, 0.8, true, 'flow', 0], oak: [0.7, 0.7, true, 'flow', 0],
  chocolate: [0.85, 0.6, true, 'disperse', 0], marble: [0.95, 0.5, true, 'still', 0.1], bubble: [0.3, 0.6, true, 'expand', 0.8],
  tile: [0.8, 0.05, false, 'rhythm', 0], teak: [0.75, 0.7, true, 'flow', 0], velvet: [0.9, 0.9, true, 'flow', 0.1],
  mosaic: [0.65, 0.1, false, 'rhythm', 0.5], sponge: [0.35, 0.9, true, 'disperse', 0.2], steel: [1, 0, false, 'still', 0],
  concrete: [0.95, 0.2, false, 'still', 0], cork: [0.45, 0.7, true, 'disperse', 0], gold: [0.6, 0.3, false, 'expand', 0.2],
};
const tagsOf = (id) => { const [d, org, round, move, tr] = TAGS[id] || [0.6, 0.4, true, 'still', 0]; return { d, org, round, move, tr }; };
const MOVE_WORD = { flow: 'flowing', rhythm: 'rhythmic', expand: 'expanding', disperse: 'dispersing', still: 'still' };
const densityWord = (d) => (d >= 0.85 ? 'solid' : d >= 0.65 ? 'dense' : d >= 0.45 ? 'open' : 'porous');
const charWord = (o) => (o > 0.6 ? 'organic' : o < 0.25 ? 'rigid' : 'soft');
// the part of the room decides the behaviour (where the particles go)
const BEHAVIOUR = { floor: 'layering', walls: 'filtering', bath: 'enclosing', counter: 'enclosing', sofa: 'enclosing', bed: 'enclosing' };

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// homes: [x, y, strand] for n particles
const PATTERNS = {
  idle(n, r) {
    const out = [], cols = 28, rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) { const c = i % cols, ro = Math.floor(i / cols); out.push([140 + (c / (cols - 1)) * 1000, 130 + (ro / (rows - 1)) * 400, ro]); }
    return out;
  },
  layering(n, r, t) {
    const out = [], bands = 4 + Math.round(t.d * 3), per = Math.ceil(n / bands);
    for (let b = 0; b < bands; b++) {
      const z = b / (bands - 1), y = 150 + Math.pow(z, 1.4) * 400, spread = 1100 * (0.55 + 0.45 * z);
      for (let k = 0; k < per && out.length < n; k++) out.push([W / 2 - spread / 2 + (k / (per - 1)) * spread, y + Math.sin(k * 0.3 + b) * 4, b]);
    }
    return out;
  },
  filtering(n, r) {
    const cols = 36, rows = 15, gaps = Array.from({ length: 3 + Math.floor(r() * 2) }, () => { const c = 2 + Math.floor(r() * (cols - 8)), ro = 1 + Math.floor(r() * (rows - 5)); return [c, ro, c + 3 + Math.floor(r() * 4), ro + 2 + Math.floor(r() * 3)]; });
    const cells = [];
    for (let ro = 0; ro < rows; ro++) for (let c = 0; c < cols; c++) if (!gaps.some(([c0, r0, c1, r1]) => c >= c0 && c < c1 && ro >= r0 && ro < r1)) cells.push([110 + (c / (cols - 1)) * 1060, 120 + (ro / (rows - 1)) * 420, ro]);
    const out = []; for (let i = 0; i < n; i++) out.push(cells[Math.floor((i / n) * cells.length)]);
    return out;
  },
  enclosing(n, r, t) {
    const out = [], rings = 3 + Math.round(t.d * 2), per = Math.ceil(n / rings);
    for (let k = 0; k < rings; k++) {
      const rad = 120 + k * 42;
      for (let i = 0; i < per && out.length < n; i++) { const a = (i / per) * Math.PI * 2; out.push([W / 2 + Math.cos(a) * rad * 1.7, H / 2 + 20 + Math.sin(a) * rad, k]); }
    }
    return out;
  },
  directing(n, r) {
    const out = [], streams = 8, per = Math.ceil(n / streams), fx = 1000, fy = H / 2 + 20;
    for (let s = 0; s < streams; s++) {
      const sx = 90, sy = 120 + (s / (streams - 1)) * 420, cx = 520, cy = sy + (fy - sy) * 0.15 + (r() - 0.5) * 60;
      for (let i = 0; i < per && out.length < n; i++) { const u = i / (per - 1), v = 1 - u; out.push([v * v * sx + 2 * v * u * cx + u * u * fx, v * v * sy + 2 * v * u * cy + u * u * fy, s]); }
    }
    return out;
  },
};

const P = Array.from({ length: N }, (_, i) => ({ x: W / 2, y: H / 2, hx: W / 2, hy: H / 2, s: 0, a: 0, on: 1, ph: (i * 2.399) % 6.283, ice: i % 9 === 0 }));
let state = { behaviour: 'idle', t: tagsOf(null), line1: 'Waiting for the first choice', line2: '' };

function apply(behaviour, t, seed) {
  const r = rng(seed), active = behaviour === 'idle' ? 364 : Math.round(N * (0.4 + 0.6 * t.d));
  const homes = PATTERNS[behaviour](active, r, t), jit = 4 + t.org * 22;
  P.forEach((p, i) => {
    if (i < active) { const h = homes[i]; p.hx = h[0] + (r() - 0.5) * jit; p.hy = h[1] + (r() - 0.5) * jit; p.s = h[2]; p.on = 1; }
    else p.on = 0;
  });
}
apply('idle', state.t, 1);

// a choice in the game: { room, slot, mat } from the room designer, or { send: [ids] } from the material desk
export function particleChoice(c) {
  if (!c) { state = { behaviour: 'idle', t: tagsOf(null), line1: 'Waiting for the first choice', line2: '' }; apply('idle', state.t, 1); return; }
  const id = c.send ? c.send[0] : c.mat, t = tagsOf(id), behaviour = c.send ? 'directing' : BEHAVIOUR[c.slot] || 'layering';
  const part = c.send ? 'sent to Hall B' : `${ROOMS[c.room].name} · ${ROOMS[c.room].slots.find((s) => s[0] === c.slot)[1].toLowerCase()}`;
  const mats = c.send ? c.send.map((m) => MATS[m].name).join(', ') : MATS[id].name;
  state = { behaviour, t, line1: `${mats}  ·  ${part}`, line2: `${behaviour}  ·  ${densityWord(t.d)} · ${charWord(t.org)} · ${MOVE_WORD[t.move]}` };
  apply(behaviour, t, hash(JSON.stringify(c)));
}

export function drawParticles(time, dt) {
  const t = state.t, k = 1 - Math.exp(-dt * 1.6), cx = W / 2, cy = H / 2;
  g.fillStyle = INK; g.fillRect(0, 0, W, CH);
  g.save(); g.translate(0, (CH - H) / 2 + 30);
  P.forEach((p) => {
    let ox = 0, oy = 0;
    if (t.move === 'flow') { ox = Math.sin(time * 0.6 + p.hy * 0.012 + p.ph * 0.2) * 7; oy = Math.cos(time * 0.4 + p.hx * 0.008) * 3; }
    else if (t.move === 'rhythm') { const s = Math.sin(time * 1.4 + p.s * 0.6) * 0.012; ox = (p.hx - cx) * s; oy = (p.hy - cy) * s; }
    else if (t.move === 'expand') { const s = 0.025 * Math.sin(time * 0.5); ox = (p.hx - cx) * s; oy = (p.hy - cy) * s; }
    else if (t.move === 'disperse') { ox = Math.sin(time * 0.7 + p.ph * 3) * 9; oy = Math.cos(time * 0.5 + p.ph * 5) * 9; }
    else { ox = Math.sin(time * 0.3 + p.ph) * 1.2; }
    p.x += (p.hx + ox - p.x) * k; p.y += (p.hy + oy - p.y) * k; p.a += (p.on - p.a) * k;
  });
  // lines along each strand
  if (t.tr > 0.3) { g.fillStyle = 'rgba(158,197,255,.05)'; g.fillRect(0, 0, W, H); }
  g.lineWidth = 1; g.strokeStyle = t.tr > 0.3 ? 'rgba(158,197,255,.28)' : 'rgba(255,255,255,.2)'; g.beginPath();
  for (let i = 1; i < N; i++) { const a = P[i - 1], b = P[i]; if (a.on && b.on && a.s === b.s && Math.hypot(a.x - b.x, a.y - b.y) < 70) { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); } }
  g.stroke();
  const rad = 2.6, alpha = 1 - t.tr * 0.55;
  P.forEach((p) => {
    if (p.a < 0.02) return;
    g.globalAlpha = p.a * alpha; g.fillStyle = p.ice ? ICE : '#f2f5ff';
    if (t.round || state.behaviour === 'idle') { g.beginPath(); g.arc(p.x, p.y, rad, 0, 6.2832); g.fill(); } else g.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
  });
  g.globalAlpha = 1; g.restore();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '500 20px Inter, Helvetica, Arial, sans-serif'; g.fillText(state.line1, 48, 56);
  g.fillStyle = ICE; g.font = '400 16px Inter, Helvetica, Arial, sans-serif'; g.fillText(state.line2, 48, 82);
}
