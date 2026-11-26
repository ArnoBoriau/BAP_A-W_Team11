// Placeholder motion graphics for the LED cubes (no text). Black, fine white lines, one ice-blue accent. Replace later with Blender / After Effects loops.
const ICE = '#9ec5ff', INK = '#08090b', SZ = 320, C = SZ / 2;
const hash = (i, j) => { const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return x - Math.floor(x); };
const W = (a) => `rgba(255,255,255,${a})`;
function bg(g) { g.fillStyle = INK; g.fillRect(0, 0, SZ, SZ); }

// a perspective grid, like looking down a hall
function grid3d(g, t) {
  bg(g); const hy = 150; g.lineWidth = 1;
  for (let i = 0; i < 16; i++) { const z = ((i + t * 0.6) % 16) / 16, y = z * z * 170; g.strokeStyle = W(0.15 + z * 0.55); g.beginPath(); g.moveTo(0, hy + y); g.lineTo(SZ, hy + y); g.stroke(); g.beginPath(); g.moveTo(0, hy - y); g.lineTo(SZ, hy - y); g.stroke(); }
  for (let i = -8; i <= 8; i++) { g.strokeStyle = W(0.22); g.beginPath(); g.moveTo(C, hy); g.lineTo(C + i * 60, SZ); g.stroke(); g.beginPath(); g.moveTo(C, hy); g.lineTo(C + i * 60, 0); g.stroke(); }
  g.strokeStyle = ICE; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, hy); g.lineTo(SZ, hy); g.stroke();
}

// footprints rising into volumes, drawn as fine isometric wire
function extrude(g, t) {
  bg(g); const P = (x, y, z) => [C + (x - y) * 0.866, 190 + (x + y) * 0.5 - z];
  const boxes = [[-70, -30, 70, 50], [10, -50, 60, 70], [-40, 30, 90, 40], [20, 40, 50, 50]];
  boxes.forEach(([x, y, w, d], i) => {
    const h = 25 + 90 * (0.5 + 0.5 * Math.sin(t * 0.55 + i * 1.7)), a = [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], b = [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)];
    g.fillStyle = W(0.05); g.beginPath(); b.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.strokeStyle = i === 1 ? ICE : W(0.8); g.lineWidth = 1.2;
    [a, b].forEach((q) => { g.beginPath(); q.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); });
    a.forEach((p, k) => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(b[k][0], b[k][1]); g.stroke(); });
  });
}

// a facade of thin vertical dashes breathing in waves
function facade(g, t) {
  bg(g); const cols = 24, rows = 16, cw = SZ / cols, rh = SZ / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.8 + c * 0.32 + r * 0.2), h = rh * (0.15 + 0.75 * k);
    g.fillStyle = W(0.35 + 0.5 * k); g.fillRect(c * cw + cw * 0.4, r * rh + (rh - h) / 2, cw * 0.18, h);
  }
  g.fillStyle = ICE; g.fillRect(0, SZ - 3, SZ, 3);
}

// contour lines, like a site plan
function contour(g, t) {
  bg(g);
  for (let k = 0; k < 15; k++) {
    const r = 12 + k * 10; g.strokeStyle = k === 9 ? ICE : W(0.75 - k * 0.04); g.lineWidth = k === 9 ? 1.6 : 1; g.beginPath();
    for (let a = 0; a <= 6.2832 + 0.05; a += 0.06) { const rr = r + 7 * Math.sin(a * 3 + t * 0.45 + k * 0.4) + 4 * Math.sin(a * 5 - t * 0.3 + k); const x = C + Math.cos(a) * rr * 1.05, y = C + Math.sin(a) * rr * 0.95; a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
}

// wireframe cubes tumbling slowly
const FACES = [[0, 1, 2, 3], [4, 5, 6, 7]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const VERT = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
function blocks(g, t) {
  bg(g);
  for (let i = 0; i < 6; i++) {
    const x = 90 * Math.sin(t * 0.4 + i * 1.3), y = 75 * Math.sin(t * 0.5 + i * 2.1), z = 60 * Math.sin(t * 0.35 + i * 0.9), s = 26 + (i % 3) * 9, ax = t * 0.5 + i, ay = t * 0.7 + i * 0.7;
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    const pj = VERT.map(([a, b, c]) => { const y1 = b * cx - c * sx, z1 = b * sx + c * cx, x2 = a * cy + z1 * sy, z2 = -a * sy + z1 * cy, zz = z + z2 * s, f = 320 / (320 + zz); return [C + (x + x2 * s) * f, C + (y + y1 * s) * f]; });
    g.fillStyle = W(0.04); FACES.forEach((f) => { g.beginPath(); f.forEach((vi, j) => (j ? g.lineTo(pj[vi][0], pj[vi][1]) : g.moveTo(pj[vi][0], pj[vi][1]))); g.closePath(); g.fill(); });
    g.strokeStyle = i === 2 ? ICE : W(0.8); g.lineWidth = 1.2; EDGES.forEach(([a, b]) => { g.beginPath(); g.moveTo(pj[a][0], pj[a][1]); g.lineTo(pj[b][0], pj[b][1]); g.stroke(); });
  }
}

// a sparse field of small lights, like a building after dark
function pixels(g, t) {
  bg(g); const n = 9, s = SZ / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = '#111215'; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    const v = Math.sin(t * 0.5 + hash(i, j) * 40);
    if (v > 0.9) { g.fillStyle = '#f2f5ff'; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); } else if (v > 0.84) { g.fillStyle = ICE; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
  }
}

// a slowly turning globe of fine lines
function globe(g, t) {
  bg(g); const R = 108; g.lineWidth = 1;
  for (let k = 0; k < 9; k++) { const a = t * 0.3 + (k * Math.PI) / 9; g.strokeStyle = W(0.7); g.beginPath(); g.ellipse(C, C, Math.abs(Math.cos(a)) * R, R, 0, 0, 6.2832); g.stroke(); }
  for (let k = -3; k <= 3; k++) { const lat = (k / 4) * (Math.PI / 2), ry = Math.cos(lat) * R, y = Math.sin(lat) * R; g.strokeStyle = W(0.45); g.beginPath(); g.ellipse(C, C + y, ry, ry * 0.18, 0, 0, 6.2832); g.stroke(); }
  g.strokeStyle = ICE; g.lineWidth = 1.5; g.beginPath(); g.ellipse(C, C, R + 24, 26, t * 0.2, 0, 6.2832); g.stroke();
}

// construction lines sweeping across the sheet
function lines(g, t) {
  bg(g); const vx = C + 70 * Math.sin(t * 0.3), vy = -40; g.lineWidth = 1;
  for (let i = 0; i < 24; i++) { const bx = -80 + i * 22 + 10 * Math.sin(t * 0.4 + i); g.strokeStyle = i % 6 === 0 ? ICE : W(0.5); g.beginPath(); g.moveTo(vx, vy); g.lineTo(bx + 40, SZ); g.stroke(); }
  for (let k = 0; k < 6; k++) { const y = (k * 56 + t * 16) % 340; g.strokeStyle = W(0.7); g.beginPath(); g.moveTo(0, y); g.lineTo(SZ, y); g.stroke(); }
}

const defs = { grid3d, extrude, facade, contour, blocks, pixels, globe, lines };
export const screens = {};
for (const k of Object.keys(defs)) {
  const c = document.createElement('canvas'); c.width = c.height = SZ;
  screens[k] = { canvas: c, ctx: c.getContext('2d'), draw: defs[k] };
}
const wc = document.createElement('canvas'); wc.width = 640; wc.height = 320;
export const wideScreen = { canvas: wc, ctx: wc.getContext('2d') };
export function updateScreens(t) { for (const k in screens) screens[k].draw(screens[k].ctx, t); }
