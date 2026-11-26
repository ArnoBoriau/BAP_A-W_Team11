// Materials, material painting, the isometric house and the scoring.

const S4 = (facade, roof, door, terrace) => ({ facade, roof, door, terrace });
export const MATS = {
  terrazzo: { name: 'Terrazzo', color: '#d9d3c7', pat: 'speckle', chips: ['#b86f4b', '#454b52', '#ece6d9', '#8a9a8e'], s: S4(6, 3, 1, 9) },
  carpet:   { name: 'Carpet', color: '#7d6a8f', pat: 'fuzz', s: S4(0, 0, 0, 0) },
  oak:      { name: 'Oak wood', color: '#c19a6b', pat: 'grain', s: S4(8, 4, 9, 6) },
  chocolate:{ name: 'Chocolate', color: '#4b2e22', pat: 'choc', s: S4(0, 0, 1, 0) },
  marble:   { name: 'Marble', color: '#ecebea', pat: 'marble', s: S4(7, 3, 3, 6) },
  bubble:   { name: 'Bubble wrap', color: '#cfe8f2', pat: 'bubbles', s: S4(0, 0, 0, 0) },
  tile:     { name: 'Ceramic tile', color: '#e6e1d8', pat: 'tile', s: S4(7, 9, 1, 8) },
  teak:     { name: 'Teak', color: '#a8743f', pat: 'grain', s: S4(8, 4, 9, 9) },
  velvet:   { name: 'Velvet', color: '#8e2f4a', pat: 'plain', s: S4(1, 0, 1, 0) },
  mosaic:   { name: 'Glass mosaic', color: '#6fb3b8', pat: 'mosaic', s: S4(6, 2, 1, 5) },
  sponge:   { name: 'Sponge', color: '#e8c84a', pat: 'sponge', s: S4(0, 0, 0, 1) },
  steel:    { name: 'Stainless steel', color: '#b8bec4', pat: 'steel', s: S4(7, 9, 7, 3) },
  concrete: { name: 'Micro-cement', color: '#9a9894', pat: 'speck2', s: S4(9, 6, 4, 8) },
  cork:     { name: 'Cork', color: '#b48a5a', pat: 'speckle', chips: ['#8a5f33', '#d3a870', '#6e4a27'], s: S4(6, 3, 5, 4) },
  gold:     { name: 'Gold leaf', color: '#d4af37', pat: 'gold', s: S4(4, 4, 6, 1) },
};

// What each side has in its library at the start. The other side has what you are missing.
export const INV = {
  A: ['terrazzo', 'oak', 'carpet', 'chocolate', 'marble', 'tile', 'gold', 'bubble', 'velvet', 'mosaic', 'cork', 'sponge'],   // the material desk
  B: ['teak', 'steel', 'concrete'],                                                                                           // the house starts with a few basics
};

// scores for the room briefs: floor, walls, bathtub, kitchen counter, sofa, bed
const EXTRA = { terrazzo: [10, 7, 6, 7, 0, 0], carpet: [0, 1, 0, 0, 6, 7], oak: [6, 6, 3, 5, 5, 6], chocolate: [0, 0, 0, 0, 0, 0], marble: [7, 9, 8, 9, 0, 0], bubble: [0, 1, 0, 0, 0, 0], tile: [9, 9, 7, 6, 0, 0], teak: [8, 6, 8, 5, 5, 5], velvet: [0, 2, 0, 0, 10, 9], mosaic: [5, 9, 7, 4, 0, 0], sponge: [1, 1, 2, 0, 2, 2], steel: [3, 6, 8, 10, 1, 0], concrete: [8, 8, 6, 8, 1, 0], cork: [5, 4, 2, 3, 5, 6], gold: [1, 5, 4, 3, 1, 2] };
for (const id in EXTRA) Object.assign(MATS[id].s, { floor: EXTRA[id][0], walls: EXTRA[id][1], bath: EXTRA[id][2], counter: EXTRA[id][3], sofa: EXTRA[id][4], bed: EXTRA[id][5] });
// the floor of a living room or bedroom is judged differently from a bathroom floor
const FLOOR_LIVING = { terrazzo: 8, carpet: 6, oak: 9, chocolate: 0, marble: 6, bubble: 0, tile: 6, teak: 9, velvet: 2, mosaic: 3, sponge: 1, steel: 2, concrete: 7, cork: 7, gold: 1 };
const FLOOR_BED = { terrazzo: 4, carpet: 9, oak: 9, chocolate: 0, marble: 3, bubble: 0, tile: 3, teak: 9, velvet: 3, mosaic: 1, sponge: 2, steel: 0, concrete: 4, cork: 8, gold: 0 };
function scoreOf(kind, key, id) {
  if (key === 'floor' && kind === 'living') return FLOOR_LIVING[id];
  if (key === 'floor' && kind === 'bedroom') return FLOOR_BED[id];
  return MATS[id].s[key];
}

export const ROOMS = {
  bathroom: { name: 'bathroom', slots: [['floor', 'Floor'], ['walls', 'Walls'], ['bath', 'Bathtub']] },
  kitchen: { name: 'kitchen', slots: [['floor', 'Floor'], ['walls', 'Walls'], ['counter', 'Counter']] },
  living: { name: 'living room', slots: [['floor', 'Floor'], ['walls', 'Walls'], ['sofa', 'Sofa']] },
  bedroom: { name: 'bedroom', slots: [['floor', 'Floor'], ['walls', 'Walls'], ['bed', 'Bed']] },
  house: { name: 'small house', slots: [['facade', 'Facade'], ['roof', 'Roof'], ['door', 'Door'], ['terrace', 'Terrace']] },
};
export const BRIEFS = ['bathroom', 'kitchen', 'living', 'bedroom'];   // together they become one house
export const SLOTS = ROOMS.house.slots;

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPattern(g, m, w, h, k) {
  const r = rng(hash(m.name));
  const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  switch (m.pat) {
    case 'tile': {
      const st = 0.45 * k; g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = Math.max(1, k * 0.015);
      for (let x = 0; x <= w; x += st) line(x, 0, x, h);
      for (let y = 0; y <= h; y += st) line(0, y, w, y);
      break;
    }
    case 'mosaic': {
      const st = 0.14 * k;
      for (let x = 0; x < w; x += st) for (let y = 0; y < h; y += st) {
        g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${(r() * 0.25).toFixed(3)})` : `rgba(0,40,60,${(r() * 0.22).toFixed(3)})`;
        g.fillRect(x, y, st, st);
      }
      g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 0.6;
      for (let x = 0; x <= w; x += st) line(x, 0, x, h);
      for (let y = 0; y <= h; y += st) line(0, y, w, y);
      break;
    }
    case 'grain': {
      const st = 0.09 * k; g.lineWidth = Math.max(1, k * 0.02);
      for (let y = 0, i = 0; y < h; y += st, i++) {
        g.strokeStyle = `rgba(60,30,10,${(0.1 + r() * 0.16).toFixed(3)})`;
        g.beginPath();
        for (let x = 0; x <= w; x += 12) { const yy = y + Math.sin(x * 0.04 + i) * 0.03 * k; x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
        g.stroke();
      }
      break;
    }
    case 'speckle': {
      const chips = m.chips || ['rgba(0,0,0,.2)'];
      const n = Math.min(900, (w * h) / (k * k) * 60);
      for (let i = 0; i < n; i++) {
        g.fillStyle = chips[Math.floor(r() * chips.length)];
        const sz = (0.03 + r() * 0.06) * k;
        g.fillRect(r() * w, r() * h, sz, sz * (0.6 + r() * 0.8));
      }
      break;
    }
    case 'fuzz': {
      const n = Math.min(2500, (w * h) / (k * k) * 300); g.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)';
        const x = r() * w, y = r() * h, a = r() * 6.28, l = 0.05 * k;
        line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      break;
    }
    case 'bubbles': {
      const rad = 0.1 * k, st = 0.22 * k;
      for (let x = st / 2; x < w + st; x += st) for (let y = st / 2; y < h + st; y += st) {
        g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(x, y, rad, 0, 6.29); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.22, 0, 6.29); g.fill();
      }
      break;
    }
    case 'choc': {
      const st = 0.5 * k;
      for (let x = 0; x < w; x += st) for (let y = 0; y < h; y += st) {
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + st * 0.08, y + st * 0.08, st * 0.84, st * 0.84);
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = Math.max(1, k * 0.02); g.strokeRect(x + st * 0.05, y + st * 0.05, st * 0.9, st * 0.9);
      }
      break;
    }
    case 'marble': {
      g.lineWidth = Math.max(1, k * 0.02);
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = `rgba(90,90,105,${(0.18 + r() * 0.25).toFixed(3)})`;
        g.beginPath(); g.moveTo(r() * w, 0);
        g.bezierCurveTo(r() * w, h * 0.3, r() * w, h * 0.6, r() * w, h); g.stroke();
      }
      break;
    }
    case 'gold': {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#f6e27a'); gr.addColorStop(0.35, '#d4af37'); gr.addColorStop(0.6, '#a67c00'); gr.addColorStop(1, '#f2d66b');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      break;
    }
    case 'steel': {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#9aa1a8'); gr.addColorStop(0.5, '#e4e8eb'); gr.addColorStop(1, '#9aa1a8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.lineWidth = 1;
      for (let y = 0; y < h; y += 3) { g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.07)'; line(0, y, w, y); }
      break;
    }
    case 'sponge': {
      const n = Math.min(500, (w * h) / (k * k) * 40);
      for (let i = 0; i < n; i++) {
        g.fillStyle = 'rgba(150,110,0,.45)'; g.beginPath();
        g.ellipse(r() * w, r() * h, (0.03 + r() * 0.04) * k, (0.02 + r() * 0.04) * k, 0, 0, 6.29); g.fill();
      }
      break;
    }
    case 'speck2': {
      const n = Math.min(1500, (w * h) / (k * k) * 200);
      for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.1)'; g.fillRect(r() * w, r() * h, 0.025 * k, 0.025 * k); }
      break;
    }
    default: {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  }
}

// Paints a parallelogram face: origin O, edge vectors U and V, k = pixels per metre.
export function paintFace(ctx, mat, O, U, V, k, dark = 0) {
  const lu = Math.hypot(U[0], U[1]), lv = Math.hypot(V[0], V[1]);
  ctx.save();
  ctx.transform(U[0] / lu, U[1] / lu, V[0] / lv, V[1] / lv, O[0], O[1]);
  ctx.beginPath(); ctx.rect(0, 0, lu, lv); ctx.clip();
  ctx.fillStyle = mat.color; ctx.fillRect(0, 0, lu, lv);
  drawPattern(ctx, mat, lu, lv, k);
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, lu, lv); }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(O[0], O[1]); ctx.lineTo(O[0] + U[0], O[1] + U[1]);
  ctx.lineTo(O[0] + U[0] + V[0], O[1] + U[1] + V[1]); ctx.lineTo(O[0] + V[0], O[1] + V[1]);
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

const swCache = {};
export function swatchCanvas(id, size = 128) {
  const key = id + size;
  if (swCache[key]) return swCache[key];
  const c = mkCanvas(size, size);
  paintFace(c.getContext('2d'), MATS[id], [0, 0], [size, 0], [0, size], size / 1.6, 0);
  swCache[key] = c;
  return c;
}
const urlCache = {};
export function swatch(id) { return urlCache[id] || (urlCache[id] = swatchCanvas(id, 96).toDataURL()); }

const EMPTY = { name: 'empty', color: '#d9d4ca', pat: 'plain' };

export function paintPoly(ctx, mat, pts, k, dark = 0) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  ctx.save();
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
  ctx.translate(x0, y0); ctx.fillStyle = mat.color; ctx.fillRect(0, 0, w, h); drawPattern(ctx, mat, w, h, k);
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.restore();
}

export function drawHouse(g, cx, cy, s, A) {
  const P = (x, y, z) => [cx + (x - y) * 0.866 * s, cy + (x + y) * 0.5 * s - z * s];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const m = (k) => (A[k] ? MATS[A[k]] : EMPTY);
  const quad = (pts, fill, stroke, lw) => {
    g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } g.restore();
  };
  // terrace slab
  let O = P(-1, -0.8, 0);
  paintFace(g, m('terrace'), O, sub(P(6.2, -0.8, 0), O), sub(P(-1, 5.2, 0), O), s, 0);
  O = P(-1, 5.2, 0); paintFace(g, m('terrace'), O, sub(P(6.2, 5.2, 0), O), sub(P(-1, 5.2, -0.25), O), s, 0.35);
  O = P(6.2, -0.8, 0); paintFace(g, m('terrace'), O, sub(P(6.2, 5.2, 0), O), sub(P(6.2, -0.8, -0.25), O), s, 0.5);
  // facade (front) and side wall
  O = P(0, 4, 3); paintFace(g, m('facade'), O, sub(P(5, 4, 3), O), sub(P(0, 4, 0), O), s, 0.04);
  O = P(5, 0, 3); paintFace(g, m('facade'), O, sub(P(5, 4, 3), O), sub(P(5, 0, 0), O), s, 0.3);
  paintPoly(g, m('facade'), [P(5, 0, 3), P(5, 4, 3), P(5, 2, 4.6)], s, 0.3);
  // roof
  O = P(0, 4, 3); paintFace(g, m('roof'), O, sub(P(5, 4, 3), O), sub(P(0, 2, 4.6), O), s, 0.08);
  // door
  O = P(3.6, 4, 2.1); paintFace(g, m('door'), O, sub(P(4.6, 4, 2.1), O), sub(P(3.6, 4, 0), O), s, 0);
  const hd = P(3.78, 4, 1.0); g.fillStyle = '#111'; g.beginPath(); g.arc(hd[0], hd[1], 2.5, 0, 6.29); g.fill();
  // windows
  quad([P(0.8, 4, 2.2), P(2.4, 4, 2.2), P(2.4, 4, 1.0), P(0.8, 4, 1.0)], '#e8f4fb', '#fff', 3);
  quad([P(5, 1, 2.2), P(5, 2.6, 2.2), P(5, 2.6, 1.0), P(5, 1, 1.0)], '#c9dde8', '#fff', 3);
}

const CABINET = { name: 'cabinet', color: '#2c2c2e', pat: 'plain' };
const FIXKEY = { bathroom: 'bath', kitchen: 'counter', living: 'sofa', bedroom: 'bed' };
// a box seen from above in the isometric view: a top and two front faces
function isoBox(g, P, sub, x0, y0, x1, y1, z0, z1, top, front, k, d1 = 0.2, d2 = 0.34) {
  let O = P(x0, y1, z1); paintFace(g, front, O, sub(P(x1, y1, z1), O), sub(P(x0, y1, z0), O), k, d1);
  O = P(x1, y0, z1); paintFace(g, front, O, sub(P(x1, y1, z1), O), sub(P(x1, y0, z0), O), k, d2);
  O = P(x0, y0, z1); paintFace(g, top, O, sub(P(x1, y0, z1), O), sub(P(x0, y1, z1), O), k, 0);
}
function poly(g, pts, fill) { g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = fill; g.fill(); g.restore(); }
// the fixture of each room, placed in a 6 x 6 m module that starts at (ox, oy)
function drawFixture(g, P, sub, kind, mat, ox, oy, k) {
  if (kind === 'bathroom') {
    isoBox(g, P, sub, ox + 0.5, oy + 0.15, ox + 4.5, oy + 1.95, 0, 1.0, mat, mat, k);
    poly(g, [P(ox + 0.7, oy + 0.35, 1.0), P(ox + 4.3, oy + 0.35, 1.0), P(ox + 4.3, oy + 1.75, 1.0), P(ox + 0.7, oy + 1.75, 1.0)], 'rgba(0,0,0,.2)');
  } else if (kind === 'kitchen') {
    isoBox(g, P, sub, ox + 0.3, oy + 0.15, ox + 5.5, oy + 1.0, 0, 0.95, mat, CABINET, k, 0.1, 0.3);
    poly(g, [P(ox + 1.2, oy + 0.3, 0.95), P(ox + 2.4, oy + 0.3, 0.95), P(ox + 2.4, oy + 0.85, 0.95), P(ox + 1.2, oy + 0.85, 0.95)], 'rgba(0,0,0,.28)');
    poly(g, [P(ox + 3.6, oy + 0.35, 0.95), P(ox + 4.6, oy + 0.35, 0.95), P(ox + 4.6, oy + 0.8, 0.95), P(ox + 3.6, oy + 0.8, 0.95)], 'rgba(0,0,0,.6)');
  } else if (kind === 'living') {
    isoBox(g, P, sub, ox + 0.9, oy + 0.4, ox + 4.7, oy + 0.9, 0, 1.3, mat, mat, k, 0.3, 0.45);
    isoBox(g, P, sub, ox + 0.9, oy + 0.9, ox + 4.7, oy + 2.1, 0, 0.6, mat, mat, k, 0.12, 0.3);
    isoBox(g, P, sub, ox + 1.8, oy + 3.4, ox + 3.8, oy + 4.4, 0, 0.35, CABINET, CABINET, k, 0.1, 0.25);
  } else if (kind === 'bedroom') {
    isoBox(g, P, sub, ox + 1.3, oy + 0.3, ox + 3.9, oy + 0.55, 0, 1.4, mat, mat, k, 0.3, 0.45);
    isoBox(g, P, sub, ox + 1.3, oy + 0.55, ox + 3.9, oy + 3.3, 0, 0.55, mat, mat, k, 0.12, 0.3);
    poly(g, [P(ox + 1.5, oy + 0.75, 0.56), P(ox + 2.5, oy + 0.75, 0.56), P(ox + 2.5, oy + 1.25, 0.56), P(ox + 1.5, oy + 1.25, 0.56)], 'rgba(255,255,255,.55)');
    poly(g, [P(ox + 2.7, oy + 0.75, 0.56), P(ox + 3.7, oy + 0.75, 0.56), P(ox + 3.7, oy + 1.25, 0.56), P(ox + 2.7, oy + 1.25, 0.56)], 'rgba(255,255,255,.55)');
  }
}
function drawRoomIso(g, cx, cy, s, A, kind) {
  const P = (x, y, z) => [cx + (x - y) * 0.866 * s, cy + (x + y) * 0.5 * s - z * s];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const W = 6, H = 3.4, fixKey = FIXKEY[kind];
  const fl = A.floor ? MATS[A.floor] : EMPTY, wl = A.walls ? MATS[A.walls] : EMPTY, fx = A[fixKey] ? MATS[A[fixKey]] : EMPTY;
  let O = P(0, 0, 0);
  paintFace(g, fl, O, sub(P(W, 0, 0), O), sub(P(0, W, 0), O), s, 0);
  O = P(0, 0, H);
  paintFace(g, wl, O, sub(P(0, W, H), O), sub(P(0, 0, 0), O), s, 0.14);
  paintFace(g, wl, O, sub(P(W, 0, H), O), sub(P(0, 0, 0), O), s, 0.04);
  poly(g, [P(0, 1.2, 2.9), P(0, 3.8, 2.9), P(0, 3.8, 1.4), P(0, 1.2, 1.4)], '#e8f4fb');
  g.save(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); [P(0, 1.2, 2.9), P(0, 3.8, 2.9), P(0, 3.8, 1.4), P(0, 1.2, 1.4)].forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); g.restore();
  drawFixture(g, P, sub, kind, fx, 0, 0, s);
}

// the finished house: the four rooms side by side in one cut-away view
export function drawHouseView(g, cx, cy, s, rooms) {
  const P = (x, y, z) => [cx + (x - y) * 0.866 * s, cy + (x + y) * 0.5 * s - z * s];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const pos = { bathroom: [0, 0], kitchen: [6, 0], living: [0, 6], bedroom: [6, 6] }, H = 3.2;
  const A = (kind) => (rooms[kind] && rooms[kind].assign) || {};
  BRIEFS.forEach((kind) => { const [ox, oy] = pos[kind], a = A(kind), O = P(ox, oy, 0); paintFace(g, a.floor ? MATS[a.floor] : EMPTY, O, sub(P(ox + 6, oy, 0), O), sub(P(ox, oy + 6, 0), O), s, 0); });
  const wall = (kind) => (A(kind).walls ? MATS[A(kind).walls] : EMPTY);
  [[0, 6, 'bathroom'], [6, 12, 'living']].forEach(([y0, y1, kind]) => { const O = P(0, y0, H); paintFace(g, wall(kind), O, sub(P(0, y1, H), O), sub(P(0, y0, 0), O), s, 0.14); });
  [[0, 6, 'bathroom'], [6, 12, 'kitchen']].forEach(([x0, x1, kind]) => { const O = P(x0, 0, H); paintFace(g, wall(kind), O, sub(P(x1, 0, H), O), sub(P(x0, 0, 0), O), s, 0.04); });
  // low walls between the rooms
  const low = { name: 'low', color: '#d9d4ca', pat: 'plain' };
  [[6, 0, 6, 12, 'x'], [0, 6, 12, 6, 'y']].forEach(([x0, y0, x1, y1, ax]) => {
    if (ax === 'x') { const O = P(6, 0, 0.9); paintFace(g, low, O, sub(P(6, 12, 0.9), O), sub(P(6, 0, 0), O), s, 0.2); } else { const O = P(0, 6, 0.9); paintFace(g, low, O, sub(P(12, 6, 0.9), O), sub(P(0, 6, 0), O), s, 0.1); }
  });
  BRIEFS.forEach((kind) => {
    const [ox, oy] = pos[kind], a = A(kind), fx = a[FIXKEY[kind]] ? MATS[a[FIXKEY[kind]]] : EMPTY;
    drawFixture(g, P, sub, kind, fx, ox, oy, s);
    const c = P(ox + 3, oy + 4.6, 0), label = ROOMS[kind].name.toUpperCase();
    g.save(); g.font = `600 ${Math.max(11, s * 0.5)}px Inter, Helvetica, Arial, sans-serif`; g.textAlign = 'center'; const w = g.measureText(label).width + 14;
    g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(c[0] - w / 2, c[1] - 11, w, 20); g.fillStyle = '#111'; g.fillText(label, c[0], c[1] + 4); g.restore();
  });
}
export function getHouseView(rooms) {
  const key = JSON.stringify(BRIEFS.map((b) => (rooms[b] ? rooms[b].assign : null)));
  if (houseViewCache.key === key) return houseViewCache.canvas;
  const c = mkCanvas(560, 480); drawHouseView(c.getContext('2d'), 280, 118, 24, rooms);
  houseViewCache = { key, canvas: c }; return c;
}
let houseViewCache = { key: '', canvas: null };

let roomCache = {};
export function getRoom(assign, kind = 'house') {
  const key = kind + JSON.stringify(assign);
  if (roomCache[key]) return roomCache[key];
  const c = mkCanvas(560, 480), g = c.getContext('2d');
  if (kind === 'house') drawHouse(g, 265, 190, 44, assign); else drawRoomIso(g, 280, 190, 46, assign, kind);
  if (Object.keys(roomCache).length > 80) roomCache = {};
  return (roomCache[key] = c);
}

export function scoreRoom(assign, kind = 'house') {
  const slots0 = ROOMS[kind].slots;
  if (!slots0.every(([k]) => assign[k])) return null;
  const slots = slots0.map(([key, name]) => {
    const mat = MATS[assign[key]]; const pts = scoreOf(kind, key, assign[key]);
    const note = pts >= 8 ? 'great fit' : pts >= 5 ? 'it works' : pts >= 2 ? 'risky choice' : 'this will not end well';
    return { key, name, mat, pts, note };
  });
  const total = slots.reduce((a, b) => a + b.pts, 0), max = slots.length * 10, r = total / max, nm = ROOMS[kind].name;
  const verdict = r >= 0.85 ? `A ${nm} that could actually be built. Well chosen.` : r >= 0.6 ? `Solid, with a few brave choices.` : r >= 0.35 ? `It is… a ${nm}. Mostly.` : `Please do not let anyone use this ${nm}.`;
  return { slots, total, max, verdict };
}
export function houseVerdict(total, max) {
  const r = total / max;
  return r >= 0.85 ? 'A house you would actually want to live in.' : r >= 0.6 ? 'A solid house, with a few brave choices.' : r >= 0.35 ? 'It is… a house. Mostly.' : 'Please do not let anyone live in this house.';
}
