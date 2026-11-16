import * as THREE from 'three';
import { MATS, INV, ROOMS, BRIEFS, swatch, swatchCanvas, getRoom, getHouseView, scoreRoom, houseVerdict } from './materials.js';
import { screens, wideScreen, updateScreens } from './anim.js';

/* ================= constants & helpers ================= */
const COR_H = 4.2, END = 45;                       // corridor: 5 m wide, 90 m long (z from -45 to 45)
const ROOM_W = 70, ROOM_D = 64, ROOM_H = 9;        // the big expo hall behind each end of the corridor
const EYE = 1.7, SCR_Z = 10.0, WALL_X = -2.5;
const PAPER = '#f4f2ee';
const SANS = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';
const $ = (s) => document.querySelector(s);
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
if (document.fonts && document.fonts.load) { document.fonts.load(`60px ${SERIF}`); document.fonts.load(`italic 60px ${SERIF}`); document.fonts.load('500 20px Inter'); document.fonts.load('600 20px Inter'); }

/* ================= app state ================= */
const emptyAssign = (b) => Object.fromEntries(ROOMS[b].slots.map(([k]) => [k, null]));
const slotsOf = (me) => ROOMS[me.brief].slots;
const mkSide = (inv) => ({ inv: [...inv], brief: BRIEFS[0], assign: emptyAssign(BRIEFS[0]), openSlot: ROOMS[BRIEFS[0]].slots[0][0], scored: null, newIds: [], incoming: null, pending: false, mode: 'build', wanting: [], waveUntil: 0, house: {}, finale: false });
const roomsDone = (me) => BRIEFS.filter((b) => me.house[b]).length;
const houseTotals = (me) => BRIEFS.reduce((a, b) => (me.house[b] ? { total: a.total + me.house[b].scored.total, max: a.max + me.house[b].scored.max } : { total: a.total, max: a.max + 30 }), { total: 0, max: 0 });
const mkDesk = () => ({ lib: [...INV.A], selected: [], incoming: null, waveUntil: 0 });
let SIDE = { A: mkDesk(), B: mkSide(INV.B) };
const other = (h) => (h === 'A' ? 'B' : 'A');
let counter = 2114;

/* ================= renderer, scene ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
$('#app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 320);
camera.rotation.order = 'YXZ';
scene.add(new THREE.HemisphereLight(0xffffff, 0xb0aca4, 1.7));
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

/* ================= materials ================= */
const blackWall = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const blackCeil = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1 });
const blackFloor = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.65, metalness: 0.15 });
const whiteWall = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.95 });
const whiteCeil = new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1 });
const steel = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, metalness: 0.5, roughness: 0.5 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, depthWrite: false });
const lightFloor = (() => {
  const c = mkCanvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#dcd9d2'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.12)'; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2; g.strokeRect(1, 1, 510, 510);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(ROOM_W / 4, ROOM_D / 4);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
})();

// white lit floor stripes: thick bars lying across the walking direction, with generous gaps
function stripeMat(len, alongX) {
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#e6e6e6';
  if (!alongX) g.fillRect(24, 80, 208, 96); else g.fillRect(80, 24, 96, 208);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (!alongX) t.repeat.set(1, len / 1.2); else t.repeat.set(len / 1.2, 1);
  return new THREE.MeshBasicMaterial({ map: t });
}
const blocks = [];       // rectangles the visitor can not walk through
function floor(x0, x1, z0, z1, mat = blackFloor, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(m);
}
function stripes(x0, x1, z0, z1, alongX = false) { floor(x0, x1, z0, z1, stripeMat(alongX ? x1 - x0 : z1 - z0, alongX), 0.012); }
function ceiling(x0, x1, z0, z1, h, mat = blackCeil) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
  m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, h, (z0 + z1) / 2); scene.add(m);
}
function wall(x0, x1, z0, z1, h, mat = blackWall, y0 = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); scene.add(m);
  if (y0 === 0) blocks.push({ x0, x1, z0, z1 });
}

/* ---------- the corridor (90 m, narrow, dark) ---------- */
floor(-2.5, 2.5, -END, END); stripes(-2.5, 2.5, -END, END);
ceiling(-2.5, 2.5, -END, END, COR_H);
wall(-2.8, -2.5, -END, END, COR_H);
wall(2.5, 2.8, -END, -1.25, COR_H);
wall(2.5, 2.8, 1.25, END, COR_H);

/* ---------- entrance: tent, glass door, small vestibule ---------- */
floor(2.5, 6.5, -1.25, 1.25); ceiling(2.5, 6.5, -1.25, 1.25, COR_H);
wall(2.5, 6.5, -1.55, -1.25, COR_H); wall(2.5, 6.5, 1.25, 1.55, COR_H);
floor(6.5, 14.8, -4, 4); ceiling(6.5, 14.8, -4, 4, COR_H);
stripes(2.5, 14, -1.2, 1.2, true);
wall(6.5, 14.8, -4.3, -4, COR_H); wall(6.5, 14.8, 4, 4.3, COR_H); wall(14.8, 15.1, -4.3, 4.3, COR_H);
wall(6.5, 6.8, -4.3, -0.95, COR_H); wall(6.5, 6.8, 0.95, 4.3, COR_H);
wall(6.5, 6.8, -0.95, 0.95, COR_H - 2.3, blackWall, 2.3);
{
  const add = (w, h, d, x, y, z, mat = steel) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };
  add(0.34, 2.3, 0.1, 6.65, 1.15, -0.95); add(0.34, 2.3, 0.1, 6.65, 1.15, 0.95); add(0.34, 0.1, 2.0, 6.65, 2.3, 0);
  const leaf = (hingeZ, dirZ, ang) => {
    const g = new THREE.Group(); g.position.set(6.65, 0, hingeZ); g.rotation.y = ang;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.2, 0.9), glassMat); pane.position.set(0, 1.1, dirZ * 0.45); g.add(pane);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.92), steel); fT.position.set(0, 2.2, dirZ * 0.45); g.add(fT);
    const fB = fT.clone(); fB.position.y = 0.03; g.add(fB);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.03), steel); hd.position.set(0.06, 1.0, dirZ * 0.82); g.add(hd);
    scene.add(g);
  };
  leaf(-0.95, 1, -1.15); leaf(0.95, -1, 1.15);
  const l1 = new THREE.PointLight(0xffffff, 14, 12, 2); l1.position.set(10, 3.4, 0); scene.add(l1);
  const l2 = new THREE.PointLight(0xffffff, 10, 10, 2); l2.position.set(4.5, 3.6, 0); scene.add(l2);
}

/* ---------- the wall screen: the whole left wall of the corridor, black, with fine architectural line work and the tube drawn into it ---------- */
const INK = '#0a0b0d', ICE = '#9ec5ff';
const TUBE_X = -2.2;
// the tube runs in steps along the wall (like the zigzag in the logo) and dips to the floor at both ends
const WP = [[-44.6, 2.5], [-37, 2.5], [-37, 1.2], [-29.5, 1.2], [-29.5, 2.9], [-22, 2.9], [-22, 1.4], [-14.5, 1.4], [-14.5, 2.7], [-7, 2.7], [-7, 1.2], [0.5, 1.2], [0.5, 2.9], [8, 2.9], [8, 1.4], [15.5, 1.4], [15.5, 2.7], [23, 2.7], [23, 1.2], [30.5, 1.2], [30.5, 2.9], [38, 2.9], [38, 1.6], [44.6, 1.6]];
const wallPath = [];
{
  const out = [[WP[0][0], WP[0][1]]];
  for (let i = 1; i < WP.length - 1; i++) {
    const a = WP[i - 1], b = WP[i], c = WP[i + 1], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), r = Math.min(0.5, l1 / 2, l2 / 2);
    const p1 = [b[0] + ((a[0] - b[0]) * r) / l1, b[1] + ((a[1] - b[1]) * r) / l1], p2 = [b[0] + ((c[0] - b[0]) * r) / l2, b[1] + ((c[1] - b[1]) * r) / l2];
    for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  out.push([WP[WP.length - 1][0], WP[WP.length - 1][1]]);
  let s = 0; wallPath.push({ z: out[0][0], y: out[0][1], s: 0 });
  for (let i = 1; i < out.length; i++) {
    const d = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]), n = Math.max(1, Math.ceil(d / 0.1));
    for (let k = 1; k <= n; k++) { const t = k / n; s += d / n; wallPath.push({ z: out[i - 1][0] + (out[i][0] - out[i - 1][0]) * t, y: out[i - 1][1] + (out[i][1] - out[i - 1][1]) * t, s }); }
  }
}
const WALL_LEN = wallPath[wallPath.length - 1].s;
function wallAt(u) {
  const target = u * WALL_LEN; let lo = 0, hi = wallPath.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (wallPath[m].s < target) lo = m; else hi = m; }
  const a = wallPath[lo], b = wallPath[hi], f = (target - a.s) / Math.max(1e-6, b.s - a.s);
  return { z: a.z + (b.z - a.z) * f, y: a.y + (b.y - a.y) * f };
}
function pipe(g, pts, wo, wi) {
  const stroke = (lw, style, dy = 0) => { g.strokeStyle = style; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + dy) : g.moveTo(p[0], p[1] + dy))); g.stroke(); };
  stroke(wo + 8, 'rgba(0,0,0,.55)'); stroke(wo, 'rgba(232,238,255,.8)'); stroke(wo - 5, '#0b0c0f'); stroke(wi * 0.6, 'rgba(255,255,255,.07)');
  stroke(wi * 0.07, 'rgba(255,255,255,.9)', -wi * 0.3); stroke(wi * 0.04, 'rgba(158,197,255,.7)', wi * 0.27);
}
function clamp(g, x, y, ang, sc) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = '#cfd3da'; g.fillRect(-6 * sc, -34 * sc, 12 * sc, 68 * sc); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(2 * sc, -34 * sc, 4 * sc, 68 * sc);
  g.strokeStyle = '#15171a'; g.lineWidth = 2 * sc; g.strokeRect(-6 * sc, -34 * sc, 12 * sc, 68 * sc); g.restore();
}
{
  const Wd = 8192, H = 384, c = mkCanvas(Wd, H), g = c.getContext('2d'), seg = Wd / 6;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d0e11'); gr.addColorStop(1, '#050506'); g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
  g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; for (let x = 0; x < Wd; x += 91) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 91) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd, y); g.stroke(); }
  // thin vertical dashes forming a facade
  const dashes = (x0, x1) => { for (let y = 20; y < H - 50; y += 24) for (let x = x0; x < x1; x += 12) { const hgt = 8 + 14 * (0.5 + 0.5 * Math.sin(x * 0.011 + y * 0.04)); g.fillStyle = 'rgba(255,255,255,.26)'; g.fillRect(x, y + (24 - hgt) / 2, 2.4, hgt); } };
  dashes(seg * 0 + 160, seg * 1 - 160); dashes(seg * 4 + 160, seg * 5 - 160);
  // construction lines
  for (let i = 0; i < 18; i++) { g.strokeStyle = i % 6 === 0 ? 'rgba(158,197,255,.5)' : 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(seg * 1 + 40, -40 + i * 6); g.lineTo(seg * 2 - 40, 40 + i * 19); g.stroke(); }
  // isometric stepped volumes in line
  const P = (x, y, z, ox) => [ox + (x - y) * 0.866 * 40, 250 + (x + y) * 0.5 * 40 - z * 40];
  [[seg * 2 + 300, 0, [[0, 0, 3, 2, 2], [3, 0, 2, 2, 3], [5, 1, 2, 2, 1.5]]], [seg * 2 + 900, 0, [[0, 0, 2, 3, 1.5], [2, 0, 3, 3, 2.5]]]].forEach(([ox, , bs]) => bs.forEach(([x, y, w, d, h]) => {
    const a = [P(x, y, 0, ox), P(x + w, y, 0, ox), P(x + w, y + d, 0, ox), P(x, y + d, 0, ox)], b = [P(x, y, h, ox), P(x + w, y, h, ox), P(x + w, y + d, h, ox), P(x, y + d, h, ox)];
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.2; [a, b].forEach((q) => { g.beginPath(); q.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); }); a.forEach((p, k) => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(b[k][0], b[k][1]); g.stroke(); });
  }));
  // contour rings
  for (let k = 0; k < 16; k++) { g.strokeStyle = `rgba(255,255,255,${0.2 - k * 0.01})`; g.beginPath(); g.ellipse(seg * 3 + 700, 190, 50 + k * 34, 30 + k * 18, 0, 0, 6.2832); g.stroke(); }
  // a window grid elevation
  for (let ix = 0; ix < 14; ix++) for (let iy = 0; iy < 5; iy++) { g.strokeStyle = 'rgba(255,255,255,.22)'; g.strokeRect(seg * 5 + 200 + ix * 60, 40 + iy * 54, 36, 34); }
  g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 1; i < 6; i++) g.fillRect(i * seg, 0, 2, H);
  g.fillStyle = '#050506'; g.fillRect(0, H - 30, Wd, 30); g.fillStyle = ICE; g.fillRect(0, H - 30, Wd, 2);
  // the tube is part of the screen
  const pts = wallPath.map((p) => [((45 - p.z) * Wd) / 90, (1 - p.y / COR_H) * H]);
  pipe(g, pts, 52, 42);
  for (let i = 0; i < WP.length - 1; i++) {
    const a = WP[i], b = WP[i + 1], zm = (a[0] + b[0]) / 2, ym = (a[1] + b[1]) / 2, horiz = a[1] === b[1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) clamp(g, ((45 - zm) * Wd) / 90, (1 - ym / COR_H) * H, horiz ? 0 : Math.PI / 2, 1);
  }
  [pts[0], pts[pts.length - 1]].forEach((p) => clamp(g, p[0], p[1], 0, 1.5));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2 * END, COR_H), new THREE.MeshBasicMaterial({ map: canvasTex(c), color: 0xe6e6e6 }));
  screen.position.set(WALL_X + 0.01, COR_H / 2, 0); screen.rotation.y = Math.PI / 2; scene.add(screen);
}

/* ---------- the two big halls at the ends ---------- */
const toWorld = (hall, lx, lz) => (hall === 'B' ? { x: lx, z: END + lz } : { x: -lx, z: -END - lz });
function blockLocal(hall, x0, x1, z0, z1) {
  if (hall === 'B') blocks.push({ x0, x1, z0: END + z0, z1: END + z1 });
  else blocks.push({ x0: -x1, x1: -x0, z0: -END - z1, z1: -END - z0 });
}
function buildHall(hall) {
  const s = hall === 'B' ? 1 : -1;
  const zr = (a, b) => (s > 0 ? [END + a, END + b] : [-END - b, -END - a]);
  const [fz0, fz1] = zr(0, ROOM_D);
  floor(-ROOM_W / 2, ROOM_W / 2, fz0, fz1, lightFloor);
  ceiling(-ROOM_W / 2, ROOM_W / 2, fz0, fz1, ROOM_H, whiteCeil);
  let [a, b] = zr(0, 0.3);
  wall(-ROOM_W / 2, -2.5, a, b, ROOM_H, whiteWall); wall(2.5, ROOM_W / 2, a, b, ROOM_H, whiteWall);
  wall(-2.5, 2.5, a, b, ROOM_H - COR_H, whiteWall, COR_H);
  [a, b] = zr(0, ROOM_D);
  wall(-ROOM_W / 2 - 0.3, -ROOM_W / 2, a, b, ROOM_H, whiteWall); wall(ROOM_W / 2, ROOM_W / 2 + 0.3, a, b, ROOM_H, whiteWall);
  [a, b] = zr(ROOM_D, ROOM_D + 0.3);
  wall(-ROOM_W / 2, ROOM_W / 2, a, b, ROOM_H, whiteWall);
  const G = new THREE.Group(); G.position.z = s * END; if (hall === 'A') G.rotation.y = Math.PI; scene.add(G);
  buildPavilion(hall, G);
}

/* ---------- materials for the cubes and furniture ---------- */
function woodCanvas(base) {
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(80,48,18,${0.05 + Math.random() * 0.1})`; g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 4 + (Math.random() - 0.5) * 2);
    g.stroke();
  }
  return c;
}
const woodMat = new THREE.MeshStandardMaterial({ map: canvasTex(woodCanvas('#a07f55')), roughness: 0.8 });
const woodMatDark = new THREE.MeshStandardMaterial({ map: canvasTex(woodCanvas('#6e5236')), roughness: 0.8 });
const woodPlatform = new THREE.MeshStandardMaterial({ map: canvasTex(woodCanvas('#3b2c1f')), roughness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
const matCache = {};
const colMat = (hex, rough = 0.8) => matCache[hex + rough] || (matCache[hex + rough] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough }));
const screenTex = {}, screenMats = {};
for (const k in screens) { screenTex[k] = canvasTex(screens[k].canvas); screenMats[k] = new THREE.MeshBasicMaterial({ map: screenTex[k] }); }
const SCREEN_KINDS = Object.keys(screens);
const wideTex = canvasTex(wideScreen.canvas);

/* ---------- canvases for the big screens and the counter above them ---------- */
function mkBig() { const c = mkCanvas(1280, 640); return { canvas: c, ctx: c.getContext('2d'), tex: canvasTex(c) }; }
const big = { A: mkBig(), B: mkBig() };
function mkHeader() { const c = mkCanvas(2048, 165); return { canvas: c, ctx: c.getContext('2d'), tex: canvasTex(c) }; }
const header = { A: mkHeader(), B: mkHeader() };

const box = (grp, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); grp.add(m); return m; };
const cyl = (grp, rt, rb, h, x, y, z, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); grp.add(m); return m; };

/* ---------- real furniture ---------- */
function sofa(w, fabric) {
  const g = new THREE.Group(), m = colMat(fabric, 0.95);
  box(g, w, 0.4, 0.95, 0, 0.38, 0, m); box(g, w, 0.55, 0.24, 0, 0.78, 0.36, m);
  box(g, 0.22, 0.55, 0.95, -w / 2 + 0.11, 0.62, 0, m); box(g, 0.22, 0.55, 0.95, w / 2 - 0.11, 0.62, 0, m);
  box(g, w - 0.5, 0.14, 0.7, 0, 0.64, -0.05, colMat('#d9d2c5', 0.95));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, 0.03, 0.03, 0.18, sx * (w / 2 - 0.12), 0.09, sz * 0.38, woodMatDark));
  return g;
}
function plant(scale = 1) {
  const g = new THREE.Group(); cyl(g, 0.3 * scale, 0.24 * scale, 0.5 * scale, 0, 0.25 * scale, 0, colMat('#2a2a2a', 0.6), 20);
  cyl(g, 0.025, 0.03, 0.5 * scale, 0, 0.7 * scale, 0, colMat('#4a3b2a'));
  for (let i = 0; i < 11; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 12, 8), colMat(i % 2 ? '#3e7a4a' : '#4f8f58', 0.7));
    leaf.scale.set(0.16, 0.6, 0.05); leaf.rotation.order = 'YXZ'; leaf.rotation.y = i * 2.4; leaf.rotation.x = -0.55 - (i % 3) * 0.12;
    leaf.position.set(Math.cos(i * 2.4) * 0.2 * scale, (0.95 + (i % 4) * 0.12) * scale, Math.sin(i * 2.4) * 0.2 * scale); g.add(leaf);
  }
  return g;
}
function floorLamp() {
  const g = new THREE.Group(); cyl(g, 0.2, 0.2, 0.03, 0, 0.015, 0, colMat('#1a1a1a', 0.4), 24); cyl(g, 0.012, 0.012, 1.6, 0, 0.8, 0, colMat('#1a1a1a', 0.4), 8);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.34, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe6b8, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 }));
  sh.position.y = 1.7; g.add(sh);
  const l = new THREE.PointLight(0xffe9c8, 14, 8, 2); l.position.y = 1.6; g.add(l); return g;
}
function sideTable() { const g = new THREE.Group(); cyl(g, 0.34, 0.34, 0.04, 0, 0.5, 0, woodMat, 24); cyl(g, 0.03, 0.03, 0.5, 0, 0.25, 0, colMat('#1a1a1a', 0.4)); cyl(g, 0.18, 0.18, 0.02, 0, 0.01, 0, colMat('#1a1a1a', 0.4), 20); return g; }
function pendant(G, x, y, z, r = 0.26) {
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, ROOM_H - y, 6), colMat('#222222')); cab.position.set(x, y + (ROOM_H - y) / 2, z); G.add(cab);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3dc })); gl.position.set(x, y, z); G.add(gl);
}

/* ---------- the tube above the game screen: it runs over two LED cubes and ends at the screen ---------- */
function mkRelay() { const c = mkCanvas(1024, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { canvas: c, ctx: c.getContext('2d'), tex: t }; }
const relay = { A: mkRelay(), B: mkRelay() };
const relayClones = { A: [], B: [] };   // the two cubes each show half of the canvas, so each needs its own texture object
const RELAY = (() => {
  const P = [[1024, 256], [512, 256], [512, 512]], r = 80, out = [P[0]];
  const a = P[0], b = P[1], c = P[2], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const p1 = [b[0] + ((a[0] - b[0]) * r) / l1, b[1] + ((a[1] - b[1]) * r) / l1], p2 = [b[0] + ((c[0] - b[0]) * r) / l2, b[1] + ((c[1] - b[1]) * r) / l2];
  for (let k = 0; k <= 12; k++) { const t = k / 12, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  out.push(P[2]);
  const pts = [], total = out.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) : 0), 0);
  let s = 0; pts.push({ x: out[0][0], y: out[0][1], s: 0 });
  for (let i = 1; i < out.length; i++) { const d = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]), n = Math.max(1, Math.ceil(d / 8)); for (let k = 1; k <= n; k++) { const t = k / n; s += d / n; pts.push({ x: out[i - 1][0] + (out[i][0] - out[i - 1][0]) * t, y: out[i - 1][1] + (out[i][1] - out[i - 1][1]) * t, s }); } }
  return { pts, len: s, total };
})();
function relayAt(f) {
  const target = Math.min(1, Math.max(0, f)) * RELAY.len, pts = RELAY.pts; let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s < target) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], t = (target - a.s) / Math.max(1e-6, b.s - a.s); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function drawRelay(h, now) {
  const g = relay[h].ctx; g.fillStyle = '#08090b'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let x = 0; x <= 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  const pts = RELAY.pts.map((p) => [p.x, p.y]);
  pipe(g, pts, 112, 92);
  clamp(g, 800, 256, 0, 2.2); clamp(g, 512, 470, Math.PI / 2, 2.2);
  pulses.forEach((p) => {
    const sender = p.dir > 0 ? 'A' : 'B', el = (now - p.t0) / 1000;
    for (let j = 0; j < 4; j++) {
      let f = -1;
      if (h === sender) { const te = el - j * 0.45; if (te > 0 && te < LEAD) f = 1 - te / LEAD; } else { const te = el - (TOTAL - TAIL) - j * 0.45; if (te > 0 && te < TAIL) f = te / TAIL; }
      if (f < 0) continue;
      const q = relayAt(f), gr = g.createRadialGradient(q.x - 12, q.y - 14, 4, q.x, q.y, 36); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, ['#ffffff', '#d6dae2', '#9ec5ff', '#f2f2f2'][j]); gr.addColorStop(1, '#6a7280');
      g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, 34, 0, 6.2832); g.fill();
    }
  });
  relay[h].tex.needsUpdate = true; relayClones[h].forEach((t) => { t.needsUpdate = true; });
}

/* ---------- the pavilion: a cube of LED, black and wooden blocks on a platform ---------- */
function arcLamp() {
  const g = new THREE.Group(), blk = colMat('#111111', 0.4);
  box(g, 0.34, 0.05, 0.34, 0, 0.025, 0, blk); cyl(g, 0.014, 0.014, 1.9, 0, 0.95, 0, blk, 8);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.014, 8, 40, Math.PI), blk); arc.position.set(0.85, 1.9, 0); g.add(arc);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.27, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4efe6, emissive: 0xffe6b8, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 }));
  sh.position.set(1.7, 1.7, 0); g.add(sh);
  const l = new THREE.PointLight(0xffe9c8, 14, 8, 2); l.position.set(1.7, 1.5, 0); g.add(l); return g;
}
function buildPavilion(hall, G) {
  const CUBE = 1.5, T = 0.09, PY = 0.06;
  let n = hall === 'A' ? 0 : 3, bi = 0;
  const blackMat = colMat('#121213', 0.85), ink = colMat('#151515', 0.6);
  const litW = new THREE.MeshBasicMaterial({ color: 0xf2f5ff }), litI = new THREE.MeshBasicMaterial({ color: 0x9ec5ff });
  const cube = (x, z, level, type, custom = null) => {
    const size = CUBE, grp = new THREE.Group(); grp.position.set(x, PY + level * size + size / 2, z);
    if (type === 'S') {
      const sm = screenMats[SCREEN_KINDS[n++ % SCREEN_KINDS.length]];
      grp.add(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), [custom || sm, sm, darkMat, sm, sm, sm]));
    } else if (type === 'B') {
      box(grp, size * 0.985, size * 0.985, size * 0.985, 0, 0, 0, blackMat);
      const i = bi++;
      if (i % 2 === 0) {
        const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), i % 4 === 0 ? litW : litI);
        sq.position.set((((i * 37) % 5) - 2) * 0.22, (((i * 53) % 5) - 2) * 0.22, -size / 2 - 0.006); sq.rotation.y = Math.PI; grp.add(sq);
      }
    } else {
      const part = (w, h, d, px, py, pz) => box(grp, w, h, d, px, py, pz, woodMat);
      part(size, size, T, 0, 0, size / 2 - T / 2);
      part(size, T, size, 0, size / 2 - T / 2, 0); part(size, T, size, 0, -size / 2 + T / 2, 0);
      part(T, size, size, -size / 2 + T / 2, 0, 0); part(T, size, size, size / 2 - T / 2, 0, 0);
    }
    G.add(grp);
    if (level === 0) blockLocal(hall, x - size / 2 - 0.05, x + size / 2 + 0.05, z - size / 2 - 0.05, z + size / 2 + 0.05);
  };
  // the platform with a glowing edge
  box(G, 11.2, PY, 8.5, 0, PY / 2, 9.55, colMat('#efefed', 0.8));
  const led = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  box(G, 11.2, 0.03, 0.05, 0, PY + 0.012, 5.325, led); box(G, 11.2, 0.03, 0.05, 0, PY + 0.012, 13.775, led);
  box(G, 0.05, 0.03, 8.5, -5.575, PY + 0.012, 9.55, led); box(G, 0.05, 0.03, 8.5, 5.575, PY + 0.012, 9.55, led);

  // four corner posts, a black wall behind the screen, a ring of cubes on top (you walk under it), and two blocks stacked higher
  const X = [-2.25, -0.75, 0.75, 2.25], Zc = [7.75, 9.25, 10.75, 12.25];
  [[X[0], Zc[0], 'SW'], [X[3], Zc[0], 'SW'], [X[0], Zc[3], 'SS'], [X[3], Zc[3], 'BS']].forEach(([x, z, lv]) => [...lv].forEach((t, i) => cube(x, z, i, t)));
  [Zc[1], Zc[2]].forEach((z) => [0, 1].forEach((lv) => cube(X[0], z, lv, 'B')));
  ['SSSS', 'SBSS'].forEach((row, r) => [...row].forEach((t, i) => cube(X[i], r ? Zc[3] : Zc[0], 2, t)));
  const rm = (off) => { const t = relay[hall].tex.clone(); t.repeat.set(0.5, 1); t.offset.set(off, 0); t.needsUpdate = true; relayClones[hall].push(t); return new THREE.MeshBasicMaterial({ map: t }); };
  cube(X[0], Zc[2], 2, 'S', rm(0)); cube(X[0], Zc[1], 2, 'S', rm(0.5));   // the tube runs over these two, right above the game screen
  cube(X[3], Zc[1], 2, 'S'); cube(X[3], Zc[2], 2, 'W');
  cube(X[3], Zc[0], 3, 'S'); cube(X[3], Zc[3], 3, 'W');

  cube(-2.5, 6.2, 0, 'W');
  { const pt = plant(0.85); pt.position.set(-2.5, PY + CUBE, 6.2); G.add(pt); }

  // the game screen on the right-hand wall inside, with a thin light frame; the counter above it
  const sg = new THREE.Group(); sg.position.set(-1.42, PY + 0.85 + 0.85, SCR_Z); sg.rotation.y = Math.PI / 2; G.add(sg);
  sg.add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.7, 0.1), [darkMat, darkMat, darkMat, darkMat, new THREE.MeshBasicMaterial({ map: big[hall].tex }), darkMat]));
  const fr = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  box(sg, 3.08, 0.03, 0.12, 0, 0.865, 0, fr); box(sg, 3.08, 0.03, 0.12, 0, -0.865, 0, fr); box(sg, 0.03, 1.7, 0.12, 1.525, 0, 0, fr); box(sg, 0.03, 1.7, 0.12, -1.525, 0, 0, fr);
  const hd = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.24), new THREE.MeshBasicMaterial({ map: header[hall].tex }));
  hd.position.set(-1.46, PY + 2.8, SCR_Z); hd.rotation.y = Math.PI / 2; G.add(hd);
  // an LED table in front of the screen with three physical buttons on top
  const pod = new THREE.Group(); pod.position.set(-0.9, PY, SCR_Z); pod.rotation.y = Math.PI / 2; G.add(pod);
  const tbl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.75), [blackMat, blackMat, screenMats.pixels, blackMat, blackMat, blackMat]); tbl.position.set(0, 0.45, 0); pod.add(tbl);
  [[-0.5, 0xf4f2ee], [0, 0x111111], [0.5, 0x8a8a8a]].forEach(([x, col]) => cyl(pod, 0.17, 0.17, 0.08, x, 0.94, 0, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }), 24));
  blockLocal(hall, -1.3, -0.5, SCR_Z - 1.05, SCR_Z + 1.05);

  // furniture around the cube
  const put = (obj, x, z, ry = 0) => { obj.position.set(x, PY, z); obj.rotation.y = ry; G.add(obj); return obj; };
  put(sofa(2.1, '#2b2b2d'), 2.4, 10.0, Math.PI / 2); blockLocal(hall, 1.85, 2.95, 8.9, 11.1);      // under the ring, between the posts
  put(sofa(1.15, '#8a4b2b'), 0.6, 12.35, 0); blockLocal(hall, 0.0, 1.2, 11.8, 12.9);                 // tucked into the back opening
  put(plant(1.1), -0.95, 12.4); blockLocal(hall, -1.4, -0.5, 11.95, 12.85);
  put(arcLamp(), 4.7, 8.0, Math.PI); put(sideTable(), 4.7, 11.8);
  put(plant(1.4), -4.6, 8.1); blockLocal(hall, -5.05, -4.15, 7.65, 8.55);
  put(plant(1.1), -4.7, 13.0);
  [[-4.4, 3.4, 9.6], [4.1, 3.2, 7.1], [3.4, 3.6, 13.1]].forEach(([x, y, z]) => pendant(G, x, y, z));
  [[0, 2.2, 10, 30, 0xfff6ec], [0, 2.4, 7.0, 25, 0xbcd4ff], [0, 2.4, 13.0, 25, 0xbcd4ff]].forEach(([x, y, z, i, col]) => { const l = new THREE.PointLight(col, i, 16, 2); l.position.set(x, y, z); G.add(l); });
}

buildHall('A');
buildHall('B');

/* ================= a message: coloured balls travelling along the tube on the screens ================= */
function makeLabel(line2) {
  const c = mkCanvas(1360, 300), g = c.getContext('2d');
  g.fillStyle = 'rgba(8,9,11,.92)'; g.beginPath(); g.moveTo(130, 8); g.lineTo(1230, 8); g.arc(1230, 150, 142, -Math.PI / 2, Math.PI / 2); g.lineTo(130, 292); g.arc(130, 150, 142, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '600 82px Inter, Helvetica, Arial, sans-serif'; g.fillText('MESSAGE SENDING', 680, 100);
  g.fillStyle = '#9ec5ff'; g.font = '500 58px Inter, Helvetica, Arial, sans-serif'; g.fillText(line2, 680, 205);
  return canvasTex(c);
}
const labelGeo = new THREE.PlaneGeometry(3.6, 0.8);
function ballTexture(hex) {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  const halo = g.createRadialGradient(64, 64, 20, 64, 64, 64); halo.addColorStop(0, 'rgba(210,225,255,.35)'); halo.addColorStop(1, 'rgba(210,225,255,0)'); g.fillStyle = halo; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(50, 48, 4, 64, 64, 46); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, hex); gr.addColorStop(1, '#6a7280');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 44, 0, 6.29); g.fill();
  return canvasTex(c);
}
const ballGeo = new THREE.PlaneGeometry(0.42, 0.42);
const ballMats = ['#ffffff', '#d6dae2', '#9ec5ff', '#f2f2f2'].map((h) => new THREE.MeshBasicMaterial({ map: ballTexture(h), transparent: true, depthWrite: false }));
const LEAD = 8, WALL_T = 34, TAIL = 8, TOTAL = LEAD + WALL_T + TAIL;   // seconds: leaves the screen, crosses the wall, arrives
const pulses = [];
function spawnPulse({ dir, onArrive, text = '' }) {
  const g = new THREE.Group(), balls = [];
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(ballGeo, ballMats[i]); b.visible = false; g.add(b); balls.push(b); }
  const lt = makeLabel(dir > 0 ? 'Hall A is sending materials' : 'Hall B is requesting materials'), label = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: lt, transparent: true })); label.rotation.y = Math.PI / 2; label.visible = false; g.add(label);
  scene.add(g);
  pulses.push({ g, balls, label, dir, t0: performance.now(), onArrive, arrived: false });
  counter++;
}
function updatePulses(now) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i], el = (now - p.t0) / 1000;
    p.balls.forEach((b, j) => {
      const tw = el - LEAD - j * 0.45, on = tw > 0 && tw < WALL_T; b.visible = on;
      if (on) { const q = wallAt(p.dir > 0 ? tw / WALL_T : 1 - tw / WALL_T); b.position.set(WALL_X + 0.03, q.y, q.z); b.rotation.set(0, Math.PI / 2, 0); }
    });
    const tl = el - LEAD, onl = tl > 0 && tl < WALL_T; p.label.visible = onl;
    if (onl) { const q = wallAt(p.dir > 0 ? tl / WALL_T : 1 - tl / WALL_T); p.label.position.set(WALL_X + 0.035, Math.max(0.6, q.y - 0.95), q.z); }
    if (!p.arrived && el >= TOTAL) { p.arrived = true; if (p.onArrive) p.onArrive(); }
    if (el > TOTAL + 1) { scene.remove(p.g); pulses.splice(i, 1); }
  }
}

/* ================= drawing the big screens (a design app, light like the references) and the counter ================= */
const APPBG = '#e9eaec';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, 0); g.lineTo(x + w, y + h - r); g.arc(x + w - r, y + h - r, r, 0, Math.PI / 2); g.lineTo(x + r, y + h); g.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); g.closePath(); }
function chipC(g, id, cx, cy, r, sel) {
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.clip(); g.drawImage(swatchCanvas(id), cx - r, cy - r, r * 2, r * 2); g.restore();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke();
  if (sel) { g.lineWidth = 3; g.strokeStyle = '#111'; g.beginPath(); g.arc(cx, cy, r + 6, 0, 6.2832); g.stroke(); }
}
function pill(g, x, y, w, h, label, kind) {
  rr(g, x, y, w, h, h / 2);
  if (kind === 'orange') { g.fillStyle = '#ffffff'; g.fill(); } else { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.stroke(); }
  g.fillStyle = kind === 'orange' ? '#111' : '#fff'; g.font = `600 17px ${SANS}`; g.textAlign = 'center'; g.fillText(label, x + w / 2, y + h / 2 + 6); g.textAlign = 'left';
}
function drawPresence(g, x, y, w, h, who, t, waving) {
  const sc = h / 150;
  g.save(); rr(g, x, y, w, h, 14 * sc); g.clip();
  g.fillStyle = '#0a0b0d'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
  for (let gx = x; gx < x + w; gx += h / 9) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
  for (let gy = y; gy < y + h; gy += h / 9) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
  const cx = x + w / 2, sway = Math.sin(t * 1.3) * 2 * sc, hy = y + h * 0.4, sy = hy + 30 * sc;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 2.6 * sc;
  g.beginPath(); g.arc(cx + sway * 0.6, hy, 15 * sc, 0, 6.2832); g.stroke();   // head: an empty circle, no face
  g.beginPath(); g.moveTo(cx - 34 * sc + sway, sy + 4 * sc); g.quadraticCurveTo(cx - 32 * sc + sway, sy - 4 * sc, cx - 18 * sc + sway, sy - 4 * sc); g.lineTo(cx + 18 * sc + sway, sy - 4 * sc); g.quadraticCurveTo(cx + 32 * sc + sway, sy - 4 * sc, cx + 34 * sc + sway, sy + 4 * sc); g.stroke();
  g.beginPath(); g.moveTo(cx - 30 * sc + sway, sy + 6 * sc); g.lineTo(cx - 26 * sc, y + h + 6); g.moveTo(cx + 30 * sc + sway, sy + 6 * sc); g.lineTo(cx + 26 * sc, y + h + 6); g.stroke();
  g.beginPath(); g.moveTo(cx - 34 * sc + sway, sy + 4 * sc); g.lineTo(cx - 42 * sc + sway, sy + 40 * sc); g.stroke();
  const sx = cx + 34 * sc + sway, s0 = sy + 4 * sc; g.strokeStyle = waving ? ICE : 'rgba(255,255,255,.92)'; g.beginPath(); g.moveTo(sx, s0);
  if (waving) { const ex = sx + 12 * sc, ey = s0 - 22 * sc, hx = ex + Math.sin(t * 9) * 14 * sc, hy2 = ey - 26 * sc; g.lineTo(ex, ey); g.lineTo(hx, hy2); g.stroke(); g.fillStyle = ICE; g.beginPath(); g.arc(hx, hy2, 4 * sc, 0, 6.2832); g.fill(); }
  else { g.lineTo(sx + 8 * sc, s0 + 36 * sc); g.stroke(); }
  // who is on the camera
  g.fillStyle = 'rgba(0,0,0,.7)'; rr(g, x + 8 * sc, y + 8 * sc, 92 * sc, 24 * sc, 12 * sc); g.fill();
  g.fillStyle = (Math.floor(t * 1.2) % 2) ? ICE : 'rgba(158,197,255,.35)'; g.beginPath(); g.arc(x + 21 * sc, y + 20 * sc, 3.5 * sc, 0, 6.2832); g.fill();
  g.fillStyle = '#fff'; g.font = `600 ${12 * sc}px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('HALL ' + who, x + 30 * sc, y + 24.5 * sc);
  g.restore();
}
function drawBuilder(h) {
  const g = big[h].ctx, me = SIDE[h], o = other(h), now = performance.now(), room = ROOMS[me.brief], slots = room.slots;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = APPBG; g.fillRect(0, 0, 1280, 640);
  rr(g, 12, 8, 1256, 56, 28); g.fillStyle = '#111'; g.fill();
  g.fillStyle = '#fff'; g.font = `600 21px ${SANS}`; g.fillText('‹   Room designer', 40, 43);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `500 14px ${SANS}`; g.fillText('HALL ' + h, 262, 42);
  pill(g, 866, 18, 230, 36, 'Request materials', 'orange'); pill(g, 1112, 18, 130, 36, 'Score', 'ghost');
  drawTracker(g, 470, 820, 36, h, now, true, 1);
  // the brief
  g.fillStyle = '#111'; g.font = `600 13px ${SANS}`; g.fillText(`THE BRIEF  ·  ROOM ${BRIEFS.indexOf(me.brief) + 1} OF ${BRIEFS.length}`, 44, 106);
  g.font = `600 25px ${SANS}`; g.fillText(`Design a ${room.name}.`, 44, 138);
  g.fillStyle = '#4a4b50'; g.font = `400 16px ${SANS}`; wrapText(g, 'You only have a few materials. Missing something? Request it from Hall A: they decide what to send you. Every finished room becomes part of one house.', 44, 164, 540, 22);
  g.drawImage(getRoom(me.assign, me.brief), 60, 222, 410, 351);
  // the camera in the top right corner: the person on the other side, as an abstract figure
  drawPresence(g, 1010, 78, 230, 140, o, now / 1000, SIDE[o].waveUntil > now);
  g.fillStyle = '#111'; g.font = `600 13px ${SANS}`; g.fillText('MATERIALS', 640, 106);
  g.fillStyle = '#6f7076'; g.font = `400 15px ${SANS}`; wrapText(g, `${me.inv.length} available. Need more? Request them from Hall A.`, 640, 130, 340, 20);
  let y = 226;
  for (const [k, name] of slots) {
    const open = me.openSlot === k, cur = me.assign[k], rows = Math.ceil(me.inv.length / 8), ch = 56 + (open ? 14 + rows * 62 : 0);
    rr(g, 640, y, 600, ch, 16); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = '#111'; g.font = `600 19px ${SANS}`; g.textAlign = 'left'; g.fillText(name, 664, y + 34);
    g.fillStyle = '#6f7076'; g.font = `400 16px ${SANS}`; g.textAlign = 'right'; g.fillText((cur ? MATS[cur].name : 'Not chosen') + (open ? '   –' : '   +'), 1216, y + 34); g.textAlign = 'left';
    if (open) me.inv.forEach((id, i) => chipC(g, id, 664 + 26 + (i % 8) * 68, y + 56 + 14 + 24 + Math.floor(i / 8) * 62 - 10, 24, cur === id));
    y += ch + 10;
  }
  if (me.scored) {
    g.fillStyle = '#111'; g.font = `400 54px ${SERIF}`; g.fillText(`${me.scored.total}`, 504, 480);
    g.font = `400 22px ${SERIF}`; g.fillStyle = '#6f7076'; g.fillText(`/ ${me.scored.max}`, 504, 510);
    g.font = `500 15px ${SANS}`; g.fillStyle = '#333'; wrapText(g, me.scored.verdict, 504, 540, 100, 18);
  }
  if (me.incoming) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 584, 1280, 56); g.fillStyle = '#111'; g.font = `600 20px ${SANS}`;
    g.fillText(`Hall ${o} is asking for ${me.incoming.ids.map((id) => MATS[id].name).join(', ')}`, 32, 619);
  } else if (me.pending) {
    g.fillStyle = '#111'; g.fillRect(0, 584, 1280, 56); g.fillStyle = '#fff'; g.font = `500 19px ${SANS}`;
    g.fillText(`Request sent to Hall ${o}. Waiting for their materials…`, 32, 619);
  } else if (me.scored && roomsDone(me) === BRIEFS.length) {
    g.fillStyle = '#111'; g.fillRect(0, 584, 1280, 56); g.fillStyle = '#fff'; g.font = `600 19px ${SANS}`;
    g.fillText('All four rooms are done. Press E to see the finished house.', 32, 619);
  }
  big[h].tex.needsUpdate = true;
}
// a small map of the tube: where is the message now?
function drawTracker(g, x0, x1, y, hall, now, dark, sc) {
  const fg = dark ? '#ffffff' : '#111111', ice = dark ? '#9ec5ff' : '#2f5fc4';
  g.save(); g.lineCap = 'round'; g.textBaseline = 'middle';
  g.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.22)'; g.lineWidth = 6 * sc; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  ['A', 'B'].forEach((k, i) => {
    const cx = i ? x1 : x0; g.beginPath(); g.arc(cx, y, 13 * sc, 0, 6.2832); g.fillStyle = hall === k ? fg : (dark ? '#111' : '#f4f2ee'); g.fill(); g.strokeStyle = fg; g.lineWidth = 2 * sc; g.stroke();
    g.fillStyle = hall === k ? (dark ? '#111' : '#fff') : fg; g.font = `600 ${13 * sc}px ${SANS}`; g.textAlign = 'center'; g.fillText(k, cx, y + 1);
  });
  pulses.forEach((p) => {
    const f = Math.min(1, (now - p.t0) / 1000 / TOTAL), pos = p.dir > 0 ? f : 1 - f;
    for (let j = 0; j < 3; j++) { const pp = Math.min(1, Math.max(0, pos - p.dir * j * 0.035)); g.globalAlpha = 1 - j * 0.3; g.fillStyle = j ? fg : ice; g.beginPath(); g.arc(x0 + (x1 - x0) * (0.07 + 0.86 * pp), y, (7 - j * 1.5) * sc, 0, 6.2832); g.fill(); }
  });
  g.restore();
}
function drawDesk() {
  const g = big.A.ctx, me = SIDE.A, now = performance.now(), B = SIDE.B, room = ROOMS[B.brief];
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = APPBG; g.fillRect(0, 0, 1280, 640);
  rr(g, 12, 8, 1256, 56, 28); g.fillStyle = '#111'; g.fill();
  g.fillStyle = '#fff'; g.font = `600 21px ${SANS}`; g.fillText('‹   Material desk', 40, 43);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `500 14px ${SANS}`; g.fillText('HALL A', 262, 42);
  drawTracker(g, 470, 820, 36, 'A', now, true, 1);
  pill(g, 866, 18, 230, 36, 'Send materials', me.selected.length ? 'orange' : 'ghost'); 
  // the brief
  g.fillStyle = '#111'; g.font = `600 13px ${SANS}`; g.fillText(`THE BRIEF  ·  ROOM ${BRIEFS.indexOf(B.brief) + 1} OF ${BRIEFS.length}`, 44, 106);
  g.font = `600 25px ${SANS}`; g.fillText(`Hall B is designing a ${room.name}.`, 44, 138);
  g.fillStyle = '#4a4b50'; g.font = `400 16px ${SANS}`; wrapText(g, `They only have a few materials and need yours. Choose up to 3 that suit the ${room.slots.map((s) => s[1].toLowerCase()).join(', ')} and send them through the tube.`, 44, 164, 540, 22);
  g.fillStyle = '#6f7076'; g.font = `600 13px ${SANS}`; g.fillText('YOUR LIBRARY', 44, 226);
  me.lib.forEach((id, i) => {
    const col = i % 4, row = Math.floor(i / 4), cx = 115 + col * 140, cy = 280 + row * 104;
    chipC(g, id, cx, cy, 33, me.selected.includes(id));
    g.fillStyle = '#111'; g.font = `500 15px ${SANS}`; g.textAlign = 'center'; g.fillText(MATS[id].name, cx, cy + 56); g.textAlign = 'left';
  });
  drawPresence(g, 1010, 78, 230, 140, 'B', now / 1000, SIDE.B.waveUntil > now);
  g.fillStyle = '#111'; g.font = `600 13px ${SANS}`; g.fillText('SELECTED', 640, 106);
  g.fillStyle = '#6f7076'; g.font = `400 15px ${SANS}`; g.fillText(`${me.selected.length} of 3`, 640, 130);
  rr(g, 640, 236, 600, 190, 16); g.fillStyle = '#fff'; g.fill();
  if (!me.selected.length) { g.fillStyle = '#6f7076'; g.font = `400 17px ${SANS}`; g.fillText('Nothing selected yet.', 672, 336); }
  me.selected.forEach((id, i) => { const cx = 640 + 100 + i * 190, cy = 308; chipC(g, id, cx, cy, 38, false); g.fillStyle = '#111'; g.font = `500 16px ${SANS}`; g.textAlign = 'center'; g.fillText(MATS[id].name, cx, cy + 64); g.textAlign = 'left'; });
  g.fillStyle = '#4a4b50'; g.font = `400 16px ${SANS}`; wrapText(g, 'Hall B can also request materials from you. Their requests appear at the bottom of this screen.', 640, 466, 590, 22);
  if (me.incoming) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 584, 1280, 56); g.fillStyle = '#111'; g.font = `600 20px ${SANS}`;
    g.fillText(`Hall B is asking for ${me.incoming.ids.map((id) => MATS[id].name).join(', ')}`, 32, 619);
    g.textAlign = 'right'; g.font = `500 17px ${SANS}`; g.fillText('Press E to answer', 1248, 619); g.textAlign = 'left';
  }
  big.A.tex.needsUpdate = true;
}
function drawFinale(h) {
  const g = big[h].ctx, B = SIDE.B, o = other(h), now = performance.now(), t = houseTotals(B);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = APPBG; g.fillRect(0, 0, 1280, 640);
  rr(g, 12, 8, 1256, 56, 28); g.fillStyle = '#111'; g.fill();
  g.fillStyle = '#fff'; g.font = `600 21px ${SANS}`; g.fillText('‹   The finished house', 40, 43);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `500 14px ${SANS}`; g.fillText('HALL ' + h, 292, 42);
  drawTracker(g, 520, 840, 36, h, now, true, 1);
  g.drawImage(getHouseView(B.house), 40, 90, 580, 497);
  drawPresence(g, 1010, 78, 230, 140, o, now / 1000, false);
  g.fillStyle = '#111'; g.font = `600 13px ${SANS}`; g.fillText('THE FINISHED HOUSE', 660, 106);
  g.fillStyle = '#6f7076'; g.font = `400 15px ${SANS}`; g.fillText('Four rooms, one house', 660, 130);
  g.fillStyle = '#111'; g.font = `400 80px ${SERIF}`; g.fillText(`${t.total}`, 660, 220);
  g.font = `400 28px ${SERIF}`; g.fillStyle = '#6f7076'; g.fillText(`/ ${t.max}`, 660 + g.measureText(`${t.total}`).width * 2.9 + 10, 220);
  g.font = `500 17px ${SANS}`; g.fillStyle = '#333'; wrapText(g, houseVerdict(t.total, t.max), 660, 252, 340, 24);
  BRIEFS.forEach((b, i) => {
    const r = B.house[b], y = 300 + i * 64;
    rr(g, 660, y, 580, 52, 14); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = '#111'; g.font = `600 18px ${SANS}`; g.fillText(ROOMS[b].name.charAt(0).toUpperCase() + ROOMS[b].name.slice(1), 684, y + 32);
    g.fillStyle = '#6f7076'; g.font = `400 16px ${SANS}`; g.textAlign = 'right'; g.fillText(r ? `${r.scored.total} / ${r.scored.max}` : 'not done', 1216, y + 32); g.textAlign = 'left';
  });
  big[h].tex.needsUpdate = true;
}
function drawApp(h) { if (SIDE.B.finale) drawFinale(h); else if (h === 'A') drawDesk(); else drawBuilder(h); }

function drawHeader(h) {
  const g = header[h].ctx;
  g.fillStyle = '#111'; g.fillRect(0, 0, 2048, 165); g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = '#fff'; g.font = `600 84px ${SANS}`; const n = counter.toLocaleString('en-US'); g.fillText(n, 60, 86);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `400 62px ${SANS}`; g.fillText('messages sent today', 60 + g.measureText(n).width * 1.12 + 40, 90);
  g.fillStyle = '#9ec5ff'; g.fillRect(1930, 50, 60, 60);
  g.textBaseline = 'alphabetic'; header[h].tex.needsUpdate = true;
}

/* ================= flow: request, answer ================= */
function requestFrom(h) {
  const me = SIDE[h], ot = SIDE[other(h)];
  if (!me.wanting.length) return;
  const ids = [...me.wanting]; me.pending = true; me.mode = 'build'; me.wanting = [];
  spawnPulse({ dir: h === 'A' ? 1 : -1, text: 'Request: ' + ids.map((id) => MATS[id].name).join(', '), onArrive: () => { ot.incoming = { ids }; refreshPanel(); } });
  closeP();
}
function sendMaterials() {
  const A = SIDE.A, ids = [...A.selected]; if (!ids.length) return;
  A.selected = []; A.incoming = null;
  spawnPulse({
    dir: 1, text: 'Materials: ' + ids.map((id) => MATS[id].name).join(', '), onArrive: () => {
      const b = SIDE.B; ids.forEach((id) => { if (!b.inv.includes(id)) b.inv.push(id); });
      b.newIds = ids; b.pending = false; refreshPanel();
    },
  });
  closeP();
}
function restart() { SIDE = { A: mkDesk(), B: mkSide(INV.B) }; closeP(); }

/* ================= panels: the same app on both sides ================= */
const panels = { A: $('#panelA'), B: $('#panelB') };
let openPanel = null;
const dot = (id, sel) => `<span class="dot"><img src="${swatch(id)}" alt="">${sel ? '<i class="tick">✓</i>' : ''}</span>`;

function renderDesk() {
  const body = panels.A.querySelector('.pn-body'), me = SIDE.A; let html = '';
  if (me.incoming) html += `<div class="banner"><div><span>Hall B is asking for</span><div class="mini">${me.incoming.ids.map((id) => `<div class="mi">${dot(id, false)}<b>${MATS[id].name}</b></div>`).join('')}</div></div><div class="row"><button class="primary" data-selreq>Select these</button><button data-decline>Decline</button></div></div>`;
  html += `<div class="brief-box"><span>The brief · room ${BRIEFS.indexOf(SIDE.B.brief) + 1} of ${BRIEFS.length}</span><p><b>Hall B is designing a ${ROOMS[SIDE.B.brief].name}.</b> They only have a few materials and need yours. Choose up to 3 that suit the ${ROOMS[SIDE.B.brief].slots.map((x) => x[1].toLowerCase()).join(', ')} and send them through the tube. Hall B can also request materials from you.</p></div>`;
  html += `<div class="app-top"><div class="app-title"><i>‹</i> Material desk <small>Hall A</small></div><canvas id="trkCv" width="520" height="80"></canvas><div class="row"><button class="primary" data-sendmat ${me.selected.length ? '' : 'disabled'}>Send materials${me.selected.length ? ` (${me.selected.length})` : ''}</button></div></div>`;
  html += `<div class="app-grid"><div><h3 class="lib-h">Your library</h3><p class="brief">Choose up to 3 materials for the person in Hall B. They travel through the tube.</p><div class="grid">${me.lib.map((id) => { const sel = me.selected.includes(id); return `<button class="sw${sel ? ' sel' : ''}" data-lib="${id}">${dot(id, sel)}<b>${MATS[id].name}</b></button>`; }).join('')}</div></div>`;
  html += `<div class="app-side"><div class="cam-row"><div class="cam-meta"><span>Camera · Hall B</span><small>No sound. Abstract view only.</small></div><canvas id="camCv" width="460" height="280"></canvas></div><p class="hint">${me.selected.length} of 3 selected</p></div></div>`;
  body.innerHTML = html;
}
function renderFinale(h) {
  const body = panels[h].querySelector('.pn-body'), B = SIDE.B, o = other(h), t = houseTotals(B); let html = '';
  html += `<div class="app-top"><div class="app-title"><i>‹</i> The finished house <small>Hall ${h}</small></div><canvas id="trkCv" width="520" height="80"></canvas><div class="row"><button data-newhouse>Start a new house</button></div></div>`;
  html += `<div class="app-grid"><div class="roombox"><canvas id="finCv" width="560" height="480"></canvas></div><div class="app-side"><div class="cam-row"><div class="cam-meta"><span>Camera · Hall ${o}</span><small>No sound. Abstract view only.</small></div><canvas id="camCv" width="460" height="280"></canvas></div>`;
  html += `<div class="result"><div class="big">${t.total} <small>/ ${t.max}</small></div><ul>${BRIEFS.map((b) => `<li><span>${ROOMS[b].name.charAt(0).toUpperCase() + ROOMS[b].name.slice(1)}</span><span>${B.house[b] ? `${B.house[b].scored.total} / ${B.house[b].scored.max}` : 'not done'}</span></li>`).join('')}</ul><p>${houseVerdict(t.total, t.max)}</p></div></div></div>`;
  body.innerHTML = html;
  const cv = body.querySelector('#finCv'); if (cv) cv.getContext('2d').drawImage(getHouseView(B.house), 0, 0);
}
function renderPanel(h) {
  if (SIDE.B.finale) return renderFinale(h);
  if (h === 'A') return renderDesk();
  const body = panels[h].querySelector('.pn-body'), me = SIDE[h], o = other(h);
  let html = '';
  if (me.incoming) {
    html += `<div class="banner"><div><span>Hall ${o} is asking for</span><div class="mini">${me.incoming.ids.map((id) => `<div class="mi">${dot(id, false)}<b>${MATS[id].name}</b></div>`).join('')}</div></div><div class="row"><button class="primary" data-give>Send materials</button><button data-decline>Decline</button></div></div>`;
  }
  html += `<div class="app-top"><div class="app-title"><i>‹</i> Room designer <small>Hall ${h}</small></div><canvas id="trkCv" width="520" height="80"></canvas><div class="row"><button data-mode ${me.mode === 'request' ? 'class="primary"' : ''}>Request materials</button><button data-score>Score my room</button></div></div>`;
  html += `<div class="brief-box"><span>The brief · room ${BRIEFS.indexOf(me.brief) + 1} of ${BRIEFS.length}</span><p><b>Design a ${ROOMS[me.brief].name}.</b> You only have a few materials. Missing something? Request materials from Hall A: they decide what to send you. You can keep building while you wait. Every finished room becomes part of one house.</p></div>`;
  if (me.pending) html += `<div class="note">Request sent to Hall ${o}. Waiting for their materials…</div>`;
  html += `<div class="app-grid"><div class="roombox"><canvas id="houseCv" width="560" height="480"></canvas></div><div class="app-side"><div class="cam-row"><div class="cam-meta"><span>Camera · Hall ${o}</span><small>No sound. Abstract view only.</small></div><canvas id="camCv" width="460" height="280"></canvas></div>`;
  if (me.mode === 'request') {
    const missing = SIDE.A.lib.filter((id) => !me.inv.includes(id));
    html += `<h3>Request from Hall ${o}</h3><p class="brief">Pick up to 3 materials you do not have yet.</p>`;
    if (!missing.length) html += `<p class="brief">You already have everything they have.</p>`;
    html += `<div class="grid">${missing.map((id) => { const sel = me.wanting.includes(id); return `<button class="sw${sel ? ' sel' : ''}" data-want="${id}">${dot(id, sel)}<b>${MATS[id].name}</b></button>`; }).join('')}</div>`;
    html += `<div class="row"><button class="primary" data-sendreq ${me.wanting.length ? '' : 'disabled'}>Send request${me.wanting.length ? ` (${me.wanting.length})` : ''}</button><button data-cancelreq>Cancel</button></div>`;
  } else {
    for (const [k, name] of slotsOf(me)) {
      const cur = me.assign[k], open = me.openSlot === k;
      html += `<div class="acc${open ? ' open' : ''}"><button class="acc-h" data-open="${k}"><span>${name}</span><span class="acc-v">${cur ? MATS[cur].name : 'Not chosen'}</span><i>${open ? '−' : '+'}</i></button>`;
      if (open) html += `<div class="acc-b">${me.inv.map((id) => `<button class="sw sm${cur === id ? ' sel' : ''}" data-slot="${k}" data-mat="${id}">${dot(id, cur === id)}<b>${MATS[id].name}${me.newIds.includes(id) ? ' <em>new</em>' : ''}</b></button>`).join('')}</div>`;
      html += `</div>`;
    }
    html += `<div class="result">`;
    if (me.scored) html += `<div class="big">${me.scored.total} <small>/ ${me.scored.max}</small></div><ul>${me.scored.slots.map((s) => `<li><span>${s.name}: ${s.mat.name}</span><span>${s.note} · ${s.pts}/10</span></li>`).join('')}</ul><p>${me.scored.verdict}</p><div class="row"><button class="primary" data-nextroom>${roomsDone(me) === BRIEFS.length ? 'See the finished house' : 'Next room'}</button></div>`;
    else html += `<span class="hint">${me.msg || `Dress the ${ROOMS[me.brief].name} with the materials you have. Missing something? Request it from Hall A.`}</span>`;
    html += `</div>`;
  }
  html += `</div></div>`;
  body.innerHTML = html;
  const cv = body.querySelector('#houseCv'); if (cv) cv.getContext('2d').drawImage(getRoom(me.assign, me.brief), 0, 0);
}
function refreshPanel() { if (openPanel) renderPanel(openPanel); }
function openP(h) { openPanel = h; renderPanel(h); panels[h].classList.add('open'); if (document.pointerLockElement) document.exitPointerLock(); }
function closeP() { if (!openPanel) return; panels[openPanel].classList.remove('open'); openPanel = null; }
function lock() { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }

document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset, h = openPanel, me = h ? SIDE[h] : null;
  if (d.close !== undefined) { closeP(); lock(); }
  else if (!h) return;
  else if (d.mode !== undefined) { me.mode = me.mode === 'request' ? 'build' : 'request'; me.wanting = []; renderPanel(h); }
  else if (d.want) { const i = me.wanting.indexOf(d.want); if (i >= 0) me.wanting.splice(i, 1); else if (me.wanting.length < 3) me.wanting.push(d.want); renderPanel(h); }
  else if (d.sendreq !== undefined) requestFrom(h);
  else if (d.cancelreq !== undefined) { me.mode = 'build'; me.wanting = []; renderPanel(h); }
  else if (d.lib) { const i = me.selected.indexOf(d.lib); if (i >= 0) me.selected.splice(i, 1); else if (me.selected.length < 3) me.selected.push(d.lib); renderPanel(h); }
  else if (d.sendmat !== undefined) sendMaterials();
  else if (d.selreq !== undefined) { me.selected = me.incoming.ids.filter((id) => me.lib.includes(id)).slice(0, 3); renderPanel(h); }
  else if (d.decline !== undefined) { me.incoming = null; SIDE.B.pending = false; renderPanel(h); }
  else if (d.open) { me.openSlot = me.openSlot === d.open ? null : d.open; renderPanel(h); }
  else if (d.slot) {
    me.assign[d.slot] = d.mat; me.scored = null; me.msg = '';
    const next = slotsOf(me).map((x) => x[0]).find((k) => !me.assign[k]); me.openSlot = next || d.slot; renderPanel(h);
  }
  else if (d.score !== undefined) { const sc = scoreRoom(me.assign, me.brief); if (sc) { me.scored = sc; me.msg = ''; me.house[me.brief] = { assign: { ...me.assign }, scored: sc }; } else me.msg = 'Choose a material for every part of the room first.'; renderPanel(h); }
  else if (d.nextroom !== undefined) {
    if (roomsDone(me) === BRIEFS.length) me.finale = true;
    else { const i0 = BRIEFS.indexOf(me.brief), nx = [1, 2, 3, 4].map((k) => BRIEFS[(i0 + k) % BRIEFS.length]).find((b) => !me.house[b]); me.brief = nx; me.assign = emptyAssign(nx); me.scored = null; me.msg = ''; me.openSlot = ROOMS[nx].slots[0][0]; }
    renderPanel(h);
  }
  else if (d.newhouse !== undefined) { const B = SIDE.B; B.house = {}; B.finale = false; B.brief = BRIEFS[0]; B.assign = emptyAssign(B.brief); B.scored = null; B.msg = ''; B.openSlot = ROOMS[B.brief].slots[0][0]; renderPanel(h); }
});

/* ================= movement & controls ================= */
const pos = new THREE.Vector3(11, EYE, 0);
let yaw = Math.PI / 2, pitch = 0, started = false, dragging = false, bob = 0, near = null;
const keys = {};
function teleport(where) {
  if (where === 'entrance') { pos.set(11, EYE, 0); yaw = Math.PI / 2; }
  else if (where === 'A') { pos.set(-0.5, EYE, -(END + SCR_Z)); yaw = -Math.PI / 2; }
  else { pos.set(0.5, EYE, END + SCR_Z); yaw = Math.PI / 2; }
  pitch = 0;
}
addEventListener('keydown', (e) => {
  keys[e.code] = true; if (!started) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE') { if (openPanel) { closeP(); lock(); } else if (near) openP(near); }
  if (e.code === 'Escape' && openPanel) closeP();
  if (!openPanel) {
    if (e.code === 'Digit1') teleport('A'); if (e.code === 'Digit2') teleport('entrance'); if (e.code === 'Digit3') teleport('B');
    if (e.code === 'KeyR') restart();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', () => { if (!started || openPanel) return; dragging = true; if (!document.pointerLockElement) lock(); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (!started || openPanel) return;
  if (document.pointerLockElement || dragging) { yaw -= e.movementX * 0.0022; pitch -= e.movementY * 0.0022; pitch = Math.max(-1.3, Math.min(1.3, pitch)); }
});
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

window.__view = (x, z, y, p = 0) => { pos.set(x, EYE, z); yaw = y; pitch = p; };
window.__send = (dir = 1) => spawnPulse({ dir });
window.__dbg = { renderer, scene, camera, pos, relay, pulses, relayAt, LEAD, TOTAL };
const PR = 0.35;
function move(dt) {
  let f = 0, r = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD) r += 1; if (keys.KeyA) r -= 1;
  if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt;
  const sp = keys.ShiftLeft || keys.ShiftRight ? 9 : 3.6;
  if (f || r) {
    const len = Math.hypot(f, r); f /= len; r /= len;
    pos.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp * dt;
    pos.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp * dt;
    bob += dt * sp * 1.6;
  }
  for (const b of blocks) {
    const cx = Math.max(b.x0, Math.min(pos.x, b.x1)), cz = Math.max(b.z0, Math.min(pos.z, b.z1));
    const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
    if (d < PR) {
      if (d > 1e-4) { pos.x = cx + (dx / d) * PR; pos.z = cz + (dz / d) * PR; }
      else {
        const o = [[pos.x - b.x0, -1, 0], [b.x1 - pos.x, 1, 0], [pos.z - b.z0, 0, -1], [b.z1 - pos.z, 0, 1]].sort((p, q) => p[0] - q[0])[0];
        pos.x += o[1] * (o[0] + PR); pos.z += o[2] * (o[0] + PR);
      }
    }
  }
}

function updateHud() {
  const zc = END + SCR_Z;
  near = Math.hypot(pos.x - 0.5, pos.z + zc) < 2.6 ? 'A' : Math.hypot(pos.x + 0.5, pos.z - zc) < 2.6 ? 'B' : null;
  const pr = $('#prompt');
  if (near && !openPanel) { pr.style.display = 'block'; pr.textContent = 'Press E'; } else pr.style.display = 'none';
}
$('#enterBtn').addEventListener('click', () => { $('#start').style.display = 'none'; $('#hud').hidden = false; started = true; lock(); });

/* ================= main loop ================= */
let last = performance.now(), tAnim = 0, tBig = 0, tHud = 0, tCam = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started && !openPanel) move(dt);
  camera.position.set(pos.x, EYE + Math.sin(bob) * 0.03, pos.z);
  camera.rotation.set(pitch, yaw, 0);
  updatePulses(now);
  if (now - tAnim > 50) { tAnim = now; updateScreens(now / 1000); for (const k in screenTex) screenTex[k].needsUpdate = true; wideTex.needsUpdate = true; }
  if (openPanel && now - tCam > 60) { tCam = now; const cv = document.querySelector('#camCv'); if (cv) { const ot = other(openPanel); drawPresence(cv.getContext('2d'), 0, 0, cv.width, cv.height, ot, now / 1000, SIDE[ot].waveUntil > now); } const tk = document.querySelector('#trkCv'); if (tk) { const tg = tk.getContext('2d'); tg.clearRect(0, 0, tk.width, tk.height); drawTracker(tg, 40, 480, 40, openPanel, now, false, 1.5); } }
  if (now - tBig > 80) { tBig = now; drawRelay('A', now); drawRelay('B', now); drawApp('A'); drawApp('B'); drawHeader('A'); drawHeader('B'); }
  if (now - tHud > 200) { tHud = now; if (started) updateHud(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
