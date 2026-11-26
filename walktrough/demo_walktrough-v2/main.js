import * as THREE from 'three';
import { MATS, INV, ROOMS, BRIEFS, swatch, swatchCanvas, getRoom, getHouseView, scoreRoom, houseVerdict } from './materials.js';
import { screens, updateScreens } from './anim.js';
import { particleWall, particleChoice, drawParticles } from './particles.js';

/* ================= constants & helpers ================= */
const COR_H = 6, END = 25, HX = 4;                // corridor: 8 m wide, 6 m high, 50 m long (z from -25 to 25)
const EX = HX + 14, EW = 8, EO = 4;               // entrance room: 14 m deep, 16 m wide (wider than the corridor), 8 m wide opening into it
const ROOM_W = 70, ROOM_D = 64, ROOM_H = 9;        // the big expo hall behind each end of the corridor
const EYE = 1.7;
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
const steel = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, metalness: 0.5, roughness: 0.5 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, depthWrite: false });

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
floor(-HX, HX, -END, END); stripes(-HX, HX, -END, END);
ceiling(-HX, HX, -END, END, COR_H);
wall(-HX - 0.3, -HX, -END, END, COR_H);
wall(HX, HX + 0.3, -END, -EW, COR_H);
wall(HX, HX + 0.3, EW, END, COR_H);

/* ---------- entrance: a wide black room like the corridor, glass door in the far wall ---------- */
floor(HX, EX, -EW, EW); ceiling(HX, EX, -EW, EW, COR_H);
stripes(HX, EX, -EO, EO, true);
wall(HX, EX, -EW - 0.3, -EW, COR_H); wall(HX, EX, EW, EW + 0.3, COR_H);
wall(HX, HX + 0.3, -EW, -EO, COR_H); wall(HX, HX + 0.3, EO, EW, COR_H);
wall(EX, EX + 0.3, -EW - 0.3, -0.95, COR_H); wall(EX, EX + 0.3, 0.95, EW + 0.3, COR_H);
wall(EX, EX + 0.3, -0.95, 0.95, COR_H - 2.3, blackWall, 2.3);
{
  const add = (w, h, d, x, y, z, mat = steel) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };
  add(0.34, 2.3, 0.1, EX + 0.15, 1.15, -0.95); add(0.34, 2.3, 0.1, EX + 0.15, 1.15, 0.95); add(0.34, 0.1, 2.0, EX + 0.15, 2.3, 0);
  const leaf = (hingeZ, dirZ, ang) => {
    const g = new THREE.Group(); g.position.set(EX + 0.15, 0, hingeZ); g.rotation.y = ang;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.2, 0.9), glassMat); pane.position.set(0, 1.1, dirZ * 0.45); g.add(pane);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.92), steel); fT.position.set(0, 2.2, dirZ * 0.45); g.add(fT);
    const fB = fT.clone(); fB.position.y = 0.03; g.add(fB);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.03), steel); hd.position.set(0.06, 1.0, dirZ * 0.82); g.add(hd);
    scene.add(g);
  };
  leaf(-0.95, 1, -1.15); leaf(0.95, -1, 1.15);
  const l1 = new THREE.PointLight(0xffffff, 14, 12, 2); l1.position.set(EX - 4, 4.5, 0); scene.add(l1);
  const l2 = new THREE.PointLight(0xffffff, 10, 10, 2); l2.position.set(HX + 4, 4.5, 0); scene.add(l2);
}

const ICE = '#9ec5ff';

/* ---------- two monitors in the corridor (0.85 m high, about half a person), one on each wall (left towards Hall A, right towards Hall B). Each shows a house ---------- */
{
  const houses = [
    { facade: 'concrete', roof: 'tile', door: 'oak', terrace: 'teak' },
    { facade: 'terrazzo', roof: 'steel', door: 'teak', terrace: 'cork' },
  ];
  const MW = 1.51, MH = 0.85, bezel = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5 });
  [-1, 1].forEach((side, i) => {
    const c = mkCanvas(960, 540), g = c.getContext('2d');
    g.fillStyle = '#e9eaec'; g.fillRect(0, 0, 960, 540);
    g.drawImage(getRoom(houses[i], 'house'), 200, 20, 560, 480);
    const z = side * 12, x = side * HX;                     // side -1: left wall, side +1: right wall
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, MH + 0.03, MW + 0.03), bezel); body.position.set(x - side * 0.02, 1.6, z); scene.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshBasicMaterial({ map: canvasTex(c) }));
    scr.position.set(x - side * 0.041, 1.6, z); scr.rotation.y = -side * Math.PI / 2; scene.add(scr);
  });
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
  floor(-ROOM_W / 2, ROOM_W / 2, fz0, fz1);
  ceiling(-ROOM_W / 2, ROOM_W / 2, fz0, fz1, ROOM_H);
  let [a, b] = zr(0, 0.3);
  wall(-ROOM_W / 2, -HX, a, b, ROOM_H, blackWall); wall(HX, ROOM_W / 2, a, b, ROOM_H, blackWall);
  wall(-HX, HX, a, b, ROOM_H - COR_H, blackWall, COR_H);
  [a, b] = zr(0, ROOM_D);
  wall(-ROOM_W / 2 - 0.3, -ROOM_W / 2, a, b, ROOM_H, blackWall); wall(ROOM_W / 2, ROOM_W / 2 + 0.3, a, b, ROOM_H, blackWall);
  [a, b] = zr(ROOM_D, ROOM_D + 0.3);
  wall(-ROOM_W / 2, ROOM_W / 2, a, b, ROOM_H, blackWall);
  const G = new THREE.Group(); G.position.z = s * END; if (hall === 'A') G.rotation.y = Math.PI; scene.add(G);
  buildInstallation(hall, G);
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

/* ---------- canvases for the big screens and the counter above them ---------- */
// 3:2 like the screen; the 1280 × 640 app sits in the middle
function mkBig() { const c = mkCanvas(1280, 854); return { canvas: c, ctx: c.getContext('2d'), tex: canvasTex(c) }; }
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

/* ---------- the installation: two walls, mirrored on the axis of the hall, facing each other. Game on one, particles on the other ---------- */
const particleTex = canvasTex(particleWall.canvas);
const IW = { x: 3.5, z0: 8.5, z1: 12.5, h: 3.2, t: 0.3 };    // wall centre line at x = ±3.5, 4 m long, 3.2 m high
const SCR = { w: 3, h: 2, y: 1.6 };                         // the 3 × 2 m LED screen on the inner face of each wall
const stripTex = (() => {
  const c = mkCanvas(2048, 165), g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 2048, 165); g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `400 62px ${SANS}`; g.fillText('Both halls see the same field', 60, 90);
  g.fillStyle = '#9ec5ff'; g.fillRect(1930, 50, 60, 60);
  return canvasTex(c);
})();
function buildInstallation(hall, G) {
  const PY = 0.06, zc = (IW.z0 + IW.z1) / 2, blackMat = colMat('#121213', 0.85), inner = IW.x - IW.t / 2;
  // a thin platform under the whole installation, with a light edge
  const pw = 2 * IW.x + 1.6, pd = IW.z1 - IW.z0 + 1.6;
  box(G, pw, PY, pd, 0, PY / 2, zc, colMat('#efefed', 0.8));
  const led = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  box(G, pw, 0.03, 0.05, 0, PY + 0.012, zc - pd / 2, led); box(G, pw, 0.03, 0.05, 0, PY + 0.012, zc + pd / 2, led);
  box(G, 0.05, 0.03, pd, -pw / 2, PY + 0.012, zc, led); box(G, 0.05, 0.03, pd, pw / 2, PY + 0.012, zc, led);
  const fr = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  // side -1: the game wall, side +1: the particle wall. Same wall, mirrored.
  [-1, 1].forEach((side) => {
    box(G, IW.t, IW.h, IW.z1 - IW.z0, side * IW.x, PY + IW.h / 2, zc, whiteWall);
    blockLocal(hall, side * IW.x - IW.t / 2 - 0.05, side * IW.x + IW.t / 2 + 0.05, IW.z0 - 0.05, IW.z1 + 0.05);
    const sg = new THREE.Group(); sg.position.set(side * (inner - 0.01), PY + SCR.y, zc); sg.rotation.y = -side * Math.PI / 2; G.add(sg);
    sg.add(new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), new THREE.MeshBasicMaterial({ map: side < 0 ? big[hall].tex : particleTex })));
    box(sg, SCR.w + 0.08, 0.03, 0.02, 0, SCR.h / 2 + 0.015, 0, fr); box(sg, SCR.w + 0.08, 0.03, 0.02, 0, -SCR.h / 2 - 0.015, 0, fr);
    box(sg, 0.03, SCR.h, 0.02, SCR.w / 2 + 0.015, 0, 0, fr); box(sg, 0.03, SCR.h, 0.02, -SCR.w / 2 - 0.015, 0, 0, fr);
    // the strip above each screen: the counter on the game side, a quiet label on the particle side
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.w * 165 / 2048), new THREE.MeshBasicMaterial({ map: side < 0 ? header[hall].tex : stripTex }));
    strip.position.set(0, SCR.h / 2 + 0.25, 0); sg.add(strip);
    // plants at the outer ends of each wall
    [IW.z0 - 0.7, IW.z1 + 0.7].forEach((z) => { const pt = plant(1.2); pt.position.set(side * IW.x, PY, z); G.add(pt); blockLocal(hall, side * IW.x - 0.45, side * IW.x + 0.45, z - 0.45, z + 0.45); });
  });
  [[-1.5, 3.6, zc - 2.6], [1.5, 3.6, zc + 2.6]].forEach(([x, y, z]) => pendant(G, x, y, z, 0.3));
  [[0, 3, zc - 2.5, 16, 0xfff6ec], [0, 3, zc + 2.5, 16, 0xfff6ec]].forEach(([x, y, z, i, col]) => { const l = new THREE.PointLight(col, i, 18, 2); l.position.set(x, y, z); G.add(l); });
}

buildHall('A');
buildHall('B');

/* ================= a message between the halls: no tube any more, it just takes a few seconds (the tracker on the screen shows where it is) ================= */
const TOTAL = 6;   // seconds from one hall to the other
const pulses = [];
function spawnPulse({ dir, onArrive }) { pulses.push({ dir, t0: performance.now(), onArrive, arrived: false }); counter++; }
function updatePulses(now) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i], el = (now - p.t0) / 1000;
    if (!p.arrived && el >= TOTAL) { p.arrived = true; if (p.onArrive) p.onArrive(); }
    if (el > TOTAL + 1) pulses.splice(i, 1);
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
// a small map of the two halls: where is the message now?
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
  g.fillStyle = '#4a4b50'; g.font = `400 16px ${SANS}`; wrapText(g, `They only have a few materials and need yours. Choose up to 3 that suit the ${room.slots.map((s) => s[1].toLowerCase()).join(', ')} and send them to Hall B.`, 44, 164, 540, 22);
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
function drawApp(h) {
  const g = big[h].ctx; g.fillStyle = APPBG; g.fillRect(0, 0, 1280, 854); g.save(); g.translate(0, 107);
  if (SIDE.B.finale) drawFinale(h); else if (h === 'A') drawDesk(); else drawBuilder(h);
  g.restore();
}

function drawHeader(h) {
  const g = header[h].ctx;
  g.fillStyle = '#111'; g.fillRect(0, 0, 2048, 165); g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = '#fff'; g.font = `600 84px ${SANS}`; const n = counter.toLocaleString('en-US'); g.fillText(n, 60, 86);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `400 62px ${SANS}`; g.fillText('messages sent today', 60 + g.measureText(n).width * 1.12 + 40, 90);
  g.fillStyle = '#9ec5ff'; g.fillRect(1930, 50, 60, 60);
  g.textBaseline = 'alphabetic'; header[h].tex.needsUpdate = true;
}

/* ================= the game plays itself: a scripted loop so both screens keep changing ================= */
function sendMaterials() {
  const A = SIDE.A, ids = [...A.selected]; if (!ids.length) return;
  A.selected = []; A.incoming = null; particleChoice({ send: ids });
  spawnPulse({ dir: 1, onArrive: () => { const b = SIDE.B; ids.forEach((id) => { if (!b.inv.includes(id)) b.inv.push(id); }); b.newIds = ids; b.pending = false; } });
}
function restart() { SIDE = { A: mkDesk(), B: mkSide(INV.B) }; autoN = 0; particleChoice(null); }
const fit = (id, key) => MATS[id].s[key] || 0;
let autoN = 0;
function autoStep() {
  const A = SIDE.A, B = SIDE.B, n = autoN++;
  if (B.finale) return restart();
  if (A.selected.length) return sendMaterials();                       // Hall A sends what it picked
  if (B.pending) return;                                                // wait for the materials to arrive
  if (B.scored) {                                                       // the room is done: next room, or the finished house
    if (roomsDone(B) === BRIEFS.length) { B.finale = true; return; }
    const nx = BRIEFS.find((r) => !B.house[r]); B.brief = nx; B.assign = emptyAssign(nx); B.scored = null; B.openSlot = ROOMS[nx].slots[0][0]; return;
  }
  const key = slotsOf(B).map((x) => x[0]).find((k) => !B.assign[k]);
  if (!key) { const sc = scoreRoom(B.assign, B.brief); B.scored = sc; B.house[B.brief] = { assign: { ...B.assign }, scored: sc }; return; }
  // now and then Hall B asks Hall A for something better for this part of the room
  const missing = A.lib.filter((id) => !B.inv.includes(id)).sort((x, y) => fit(y, key) - fit(x, key));
  if (n % 3 === 1 && missing.length) { A.selected = missing.slice(0, 2); B.pending = true; return; }
  const best = [...B.inv].sort((x, y) => fit(y, key) - fit(x, key))[n % 4 === 0 ? 1 : 0] || B.inv[0];
  B.assign[key] = best; B.openSlot = key; B.newIds = [];
  particleChoice({ room: B.brief, slot: key, mat: best });
}

/* ================= movement & controls ================= */
const pos = new THREE.Vector3(EX - 2.5, EYE, 0);
let yaw = Math.PI / 2, pitch = 0, started = false, dragging = false, bob = 0;
const keys = {};
function teleport(where) {
  if (where === 'entrance') { pos.set(EX - 2.5, EYE, 0); yaw = Math.PI / 2; return void (pitch = 0); }
  // stand in the aisle between the two walls, in front of the game
  const p = toWorld(where, -0.6, (IW.z0 + IW.z1) / 2); pos.set(p.x, EYE, p.z); yaw = where === 'A' ? -Math.PI / 2 : Math.PI / 2;
  pitch = 0;
}
addEventListener('keydown', (e) => {
  keys[e.code] = true; if (!started) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Digit1') teleport('A'); if (e.code === 'Digit2') teleport('entrance'); if (e.code === 'Digit3') teleport('B');
  if (e.code === 'KeyR') restart();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', () => { if (!started) return; dragging = true; if (!document.pointerLockElement) lock(); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (!started) return;
  if (document.pointerLockElement || dragging) { yaw -= e.movementX * 0.0022; pitch -= e.movementY * 0.0022; pitch = Math.max(-1.3, Math.min(1.3, pitch)); }
});
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

window.__view = (x, z, y, p = 0) => { pos.set(x, EYE, z); yaw = y; pitch = p; };
window.__send = (dir = 1) => spawnPulse({ dir });
window.__dbg = { renderer, scene, camera, pos, pulses, TOTAL, particleChoice };
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

function lock() { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
$('#enterBtn').addEventListener('click', () => { $('#start').style.display = 'none'; $('#hud').hidden = false; started = true; lock(); });

/* ================= main loop ================= */
let last = performance.now(), tPart = performance.now(), tAnim = 0, tBig = 0, tAuto = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started) move(dt);
  camera.position.set(pos.x, EYE + Math.sin(bob) * 0.03, pos.z);
  camera.rotation.set(pitch, yaw, 0);
  updatePulses(now);
  if (now - tAnim > 50) { tAnim = now; updateScreens(now / 1000); for (const k in screenTex) screenTex[k].needsUpdate = true; }
  if (now - tPart > 33) { drawParticles(now / 1000, Math.min(0.1, (now - tPart) / 1000)); tPart = now; particleTex.needsUpdate = true; }
  if (now - tAuto > 5000) { tAuto = now; autoStep(); }
  if (now - tBig > 80) { tBig = now; drawApp('A'); drawApp('B'); drawHeader('A'); drawHeader('B'); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
