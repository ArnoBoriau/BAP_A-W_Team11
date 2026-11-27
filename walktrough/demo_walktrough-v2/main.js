import * as THREE from 'three';
import { MATERIALS, MAT, PARTS, PART, CATEGORIES, CATEGORY, fits, textureCanvas } from './catalogue.js';
import { HouseView } from './house3d.js';
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
// the screens use the real PoC's type: Poppins for titles and labels, Manrope for text
const DISPLAY = 'Poppins, "Helvetica Neue", Arial, sans-serif', TEXT = 'Manrope, "Helvetica Neue", Arial, sans-serif';
if (document.fonts && document.fonts.load) ['700 20px Poppins', '600 20px Poppins', '400 20px Manrope', '600 20px Manrope'].forEach((f) => document.fonts.load(f));

/* ================= app state: a scripted story, not a game ================= */
// The screens show what the real PoC (demo/proof-of-concept-v3) looks like, played by itself:
// one hall picks a material and sends it, the other puts it on the house, the roles swap. Four
// parts make a house; a finished house moves to the kiosks in the corridor. No rules, just a loop.
const other = (h) => (h === 'A' ? 'B' : 'A');
const gameView = new HouseView({ width: 1060, height: 756, spin: 40, distance: 22 });   // the house on the game screens
const finished = [   // the houses on the kiosks, newest first
  { no: 12, assign: { facade: 'larch', roof: 'zinc', terrace: 'oak', door: 'walnut' } },
  { no: 11, assign: { facade: 'concrete', roof: 'slate', terrace: 'travertine', door: 'corten-steel' } },
];
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

/* ---------- two kiosk totems in the corridor (like self-order kiosks): a 2 m column with a 65" landscape screen, a little out from the wall (left towards Hall A, right towards Hall B).
   Each shows a finished house, turning slowly (as in the hallway wireframe: "Your turn to build"); a newly finished house comes in on the first one ---------- */
const kiosks = [];
{
  const MW = 1.439, MH = 0.809, MY = 1.4;                  // 65" 16:9 panel in landscape, centre at 1.4 m
  const KW = 1.57, KH = 2.0, KD = 0.14;                    // kiosk housing
  const OUT = 0.9;                                         // kiosk stands 0.9 m out from the wall
  const KC = { w: 960, h: 540, house: { x: 430, y: 0, w: 530, h: 540 } };   // the canvas, and where the house shows through
  const housing = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.45, metalness: 0.3 });
  const glassBlack = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15 });
  [-1, 1].forEach((side, i) => {
    const c = mkCanvas(KC.w, KC.h), tex = canvasTex(c);
    const view = new HouseView({ width: KC.house.w * 2, height: KC.house.h * 2, spin: 30, distance: 27 });
    const z = side * 12, x = side * (HX - OUT);             // side -1: left wall, side +1: right wall
    // local +z faces the middle of the corridor
    const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = -side * Math.PI / 2; scene.add(G);
    const add = (w, h, d, px, py, pz, mat = housing) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py, pz); G.add(m); };
    add(KW + 0.08, 0.04, 0.5, 0, 0.02, -0.04, steel);       // floor plinth
    add(KW, KH - 0.04, KD, 0, 0.04 + (KH - 0.04) / 2, 0);   // column
    add(MW + 0.06, MH + 0.06, 0.01, 0, MY, KD / 2 + 0.005, glassBlack); // black glass around the screen
    // the house behind, the text canvas in front (transparent where the house shows)
    const r = KC.house, hp = new THREE.Mesh(new THREE.PlaneGeometry((r.w / KC.w) * MW, (r.h / KC.h) * MH), new THREE.MeshBasicMaterial({ map: view.rt.texture }));
    hp.position.set(((r.x + r.w / 2) / KC.w - 0.5) * MW, MY + (0.5 - (r.y + r.h / 2) / KC.h) * MH, KD / 2 + 0.012); G.add(hp);   // in front of the black glass (+0.01)
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    scr.position.set(0, MY, KD / 2 + 0.014); G.add(scr);
    blocks.push({ x0: x - 0.35, x1: x + 0.35, z0: z - KW / 2 - 0.1, z1: z + KW / 2 + 0.1 }); // visitor walks around the kiosk
    kiosks.push({ canvas: c, tex, view, index: i, KC, shown: null });
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
const BIG = { w: 1280, h: 854 };
const HOUSE = { x: 372, y: 206, w: 884, h: 630 };   // where the house shows on the game screen (canvas px)
const housePlanes = {};
function mkBig() { const c = mkCanvas(BIG.w, BIG.h); return { canvas: c, ctx: c.getContext('2d'), tex: canvasTex(c) }; }
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

/* ---------- the installation: two walls, mirrored on the axis of the hall, facing each other, under one flat roof. Game on one, particles on the other ---------- */
const particleTex = canvasTex(particleWall.canvas);
const IW = { x: 3.15, z0: 8.5, z1: 12.5, h: 3.2, t: 0.3 };   // wall centre line at x = ±3.15: the screens 6 m apart, 6.6 m outside to outside (max 7 m); 4 m long, 3.2 m high
const SCR = { w: 3, h: 2, y: 1.6 };                         // the 3 × 2 m LED screen on the inner face of each wall
const stripTex = (() => {
  const c = mkCanvas(2048, 165), g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 2048, 165); g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `400 62px ${SANS}`; g.fillText('Both halls see the same field', 60, 90);
  g.fillStyle = '#9ec5ff'; g.fillRect(1930, 50, 60, 60);
  return canvasTex(c);
})();
// Only the platform (the island) is white. The walls and roof are black, but a
// charcoal a step lighter than the hall (#151515), so the installation still
// stands out from the room around it.
function buildInstallation(hall, G) {
  const PY = 0.06, zc = (IW.z0 + IW.z1) / 2, blackMat = colMat('#2a2a2e', 0.85), inner = IW.x - IW.t / 2;
  // a thin platform under the whole installation, with a light edge
  const pw = 2 * IW.x + 1.6, pd = IW.z1 - IW.z0 + 1.6;
  box(G, pw, PY, pd, 0, PY / 2, zc, colMat('#efefed', 0.8));
  const led = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  box(G, pw, 0.03, 0.05, 0, PY + 0.012, zc - pd / 2, led); box(G, pw, 0.03, 0.05, 0, PY + 0.012, zc + pd / 2, led);
  box(G, 0.05, 0.03, pd, -pw / 2, PY + 0.012, zc, led); box(G, 0.05, 0.03, pd, pw / 2, PY + 0.012, zc, led);
  const fr = new THREE.MeshBasicMaterial({ color: 0xeaf1ff });
  // side -1: the game wall, side +1: the particle wall. Same wall, mirrored.
  [-1, 1].forEach((side) => {
    box(G, IW.t, IW.h, IW.z1 - IW.z0, side * IW.x, PY + IW.h / 2, zc, blackMat);
    blockLocal(hall, side * IW.x - IW.t / 2 - 0.05, side * IW.x + IW.t / 2 + 0.05, IW.z0 - 0.05, IW.z1 + 0.05);
    const sg = new THREE.Group(); sg.position.set(side * (inner - 0.01), PY + SCR.y, zc); sg.rotation.y = -side * Math.PI / 2; G.add(sg);
    sg.add(new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), new THREE.MeshBasicMaterial({ map: side < 0 ? big[hall].tex : particleTex, transparent: side < 0 })));
    if (side < 0) {
      // the house, just behind the game canvas: it shows through where the canvas is left clear (HOUSE)
      const hp = new THREE.Mesh(new THREE.PlaneGeometry((HOUSE.w / BIG.w) * SCR.w, (HOUSE.h / BIG.h) * SCR.h), new THREE.MeshBasicMaterial({ map: gameView.rt.texture }));
      hp.position.set(((HOUSE.x + HOUSE.w / 2) / BIG.w - 0.5) * SCR.w, (0.5 - (HOUSE.y + HOUSE.h / 2) / BIG.h) * SCR.h, -0.004); sg.add(hp);
      housePlanes[hall] = hp;
    }
    box(sg, SCR.w + 0.08, 0.03, 0.02, 0, SCR.h / 2 + 0.015, 0, fr); box(sg, SCR.w + 0.08, 0.03, 0.02, 0, -SCR.h / 2 - 0.015, 0, fr);
    box(sg, 0.03, SCR.h, 0.02, SCR.w / 2 + 0.015, 0, 0, fr); box(sg, 0.03, SCR.h, 0.02, -SCR.w / 2 - 0.015, 0, 0, fr);
    // the strip above each screen: the counter on the game side, a quiet label on the particle side
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.w * 165 / 2048), new THREE.MeshBasicMaterial({ map: side < 0 ? header[hall].tex : stripTex }));
    strip.position.set(0, SCR.h / 2 + 0.25, 0); sg.add(strip);
    // plants at the outer ends of each wall
    [IW.z0 - 0.7, IW.z1 + 0.7].forEach((z) => { const pt = plant(1.2); pt.position.set(side * IW.x, PY, z); G.add(pt); blockLocal(hall, side * IW.x - 0.45, side * IW.x + 0.45, z - 0.45, z + 0.45); });
  });
  // the roof: one flat slab on top of both walls, outer face to outer face, so the two screens read as one installation
  const RT = 0.2, rw = 2 * IW.x + IW.t;
  box(G, rw, RT, IW.z1 - IW.z0, 0, PY + IW.h + RT / 2, zc, blackMat);
  [[0, 3, zc - 2.5, 16, 0xfff6ec], [0, 3, zc + 2.5, 16, 0xfff6ec]].forEach(([x, y, z, i, col]) => { const l = new THREE.PointLight(col, i, 18, 2); l.position.set(x, y, z); G.add(l); });
}

buildHall('A');
buildHall('B');

/* ================= the game screens, drawn like the real PoC (demo/proof-of-concept-v3): dark, Poppins caps, agora. blue ================= */
const UI = {
  bg: '#0e1111', panel: '#141413', s2: '#1d1d1b', s3: '#2a2a27', text: '#edeae4', soft: '#c9c6bf', muted: '#8f8c86',
  line: 'rgba(237,234,228,0.12)', lineStrong: 'rgba(237,234,228,0.26)', accent: '#0072b6', accentText: '#9ec5ff',
};
function type(g, weight, px, family = TEXT, spacing = 0) { g.font = `${weight} ${px}px ${family}`; g.letterSpacing = `${spacing}px`; }
function say(g, str, x, y, color, align = 'left') { g.fillStyle = color; g.textAlign = align; g.fillText(str, x, y); g.textAlign = 'left'; }
function caps(g, str, x, y, px, color, { weight = 600, spacing = 1.2, align = 'left' } = {}) { type(g, weight, px, DISPLAY, spacing); say(g, str.toUpperCase(), x, y, color, align); g.letterSpacing = '0px'; }
function wrapCaps(g, str, x, y, maxW, px, lh, color) { type(g, 700, px, DISPLAY, 0); g.fillStyle = color; return wrapText(g, str.toUpperCase(), x, y, maxW, lh); }
function swatchAt(g, id, x, y, s) { g.drawImage(textureCanvas(id), x, y, s, s); g.strokeStyle = UI.line; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); }
function blankAt(g, x, y, s) { g.fillStyle = '#141413'; g.fillRect(x, y, s, s); g.strokeStyle = UI.lineStrong; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); }
function button(g, label, x, y, w, h, on) {
  g.fillStyle = on ? UI.accent : UI.s3; g.fillRect(x, y, w, h);
  caps(g, label, x + w / 2, y + h / 2 + 5, 13, on ? '#ffffff' : UI.muted, { weight: 700, spacing: 1.3, align: 'center' });
}
// the role badge with slanted ends, like A@W's country label
function badge(g, label, x, y) {
  type(g, 700, 11, DISPLAY, 1.2); const w = g.measureText(label.toUpperCase()).width + 24;
  g.fillStyle = UI.accent; g.beginPath(); g.moveTo(x + 5, y); g.lineTo(x + w, y); g.lineTo(x + w - 5, y + 20); g.lineTo(x, y + 20); g.closePath(); g.fill();
  say(g, label.toUpperCase(), x + 12, y + 14, '#ffffff'); g.letterSpacing = '0px';
}
const toFill = () => PARTS.filter((p) => !story.house.assign[p.id]).length;
const progress = () => (toFill() ? `The house · ${toFill()} to fill in` : 'Finished');

// the presence tile (top right): the other hall, an abstract figure, never video
function tile(g, h, t) {
  const x = 1028, y = 18, w = 234, sh = 160, o = other(h);
  g.fillStyle = UI.panel; g.fillRect(x - 6, y - 6, w + 12, sh + 36); g.strokeStyle = UI.line; g.strokeRect(x - 6.5, y - 6.5, w + 13, sh + 37);
  g.fillStyle = UI.s2; g.fillRect(x, y, w, sh);
  const cx = x + w / 2 + Math.sin(t * 0.7) * 6, cy = y + 70, glow = g.createRadialGradient(cx, cy, 2, cx, cy, 46);
  glow.addColorStop(0, 'rgba(237,234,228,0.55)'); glow.addColorStop(1, 'rgba(237,234,228,0)');
  g.fillStyle = glow; g.fillRect(x, y, w, sh);
  g.fillStyle = 'rgba(237,234,228,0.35)'; g.beginPath(); g.arc(cx, cy - 18, 13, 0, 6.2832); g.fill();
  g.beginPath(); g.ellipse(cx, cy + 40, 34, 26, 0, Math.PI, 0); g.fill();
  g.fillStyle = UI.bg; g.fillRect(x + w - 62, y + sh - 74, 56, 68); g.strokeStyle = UI.lineStrong; g.strokeRect(x + w - 61.5, y + sh - 73.5, 55, 67);
  caps(g, `Hall ${o}`, x + 10, y + sh - 12, 10, UI.text, { weight: 700 });
  type(g, 400, 10, TEXT); say(g, 'Only body points are shared, never video.', x, y + sh + 20, UI.muted);
}
// the top line: which hall, where the house is at, the other hall
function meta(g, h) {
  caps(g, `Hall ${h}`, 36, 40, 15, UI.text, { weight: 700, spacing: 0.4 });
  type(g, 400, 13, TEXT); say(g, progress(), 120, 40, UI.muted);
  g.fillStyle = UI.accentText; g.fillRect(300, 31, 7, 7); say(g, `Hall ${other(h)} is connected`, 314, 40, UI.muted);
}
function clearHouse(g) { g.clearRect(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); }

// giver: choose a material (tabs, grid, the bar with the pick and the send button)
function drawPicker(g, h) {
  meta(g, h);
  caps(g, `Your turn · A material for Hall ${other(h)}`, 36, 98, 12, UI.accentText);
  type(g, 700, 37, DISPLAY); say(g, 'IT’S YOUR TURN TO CHOOSE A MATERIAL', 36, 142, UI.text);
  type(g, 400, 15, TEXT); say(g, `Hall ${other(h)} is designing the house right now. Choose a material they can use there.`, 36, 172, UI.soft);
  // the category tabs
  let tx = 36; const tabs = [{ id: 'all', label: 'All' }, ...CATEGORIES];
  tabs.forEach((c) => {
    type(g, 600, 11.5, DISPLAY, 1.1); const label = c.label.toUpperCase(), w = g.measureText(label).width, on = story.filter === c.id;
    say(g, label, tx, 218, on ? UI.text : UI.muted);
    if (on) { g.fillStyle = UI.text; g.fillRect(tx, 228, w, 2); }
    tx += w + 22;
  });
  g.letterSpacing = '0px'; g.fillStyle = UI.line; g.fillRect(36, 230, BIG.w - 72, 1);
  // the grid
  const list = story.filter === 'all' ? MATERIALS : MATERIALS.filter((m) => m.categories.includes(story.filter));
  const cols = 9, gap = 12, cw = (BIG.w - 72 - gap * (cols - 1)) / cols;
  list.forEach((m, i) => {
    const x = 36 + (i % cols) * (cw + gap), y = 248 + Math.floor(i / cols) * (cw + 46);
    if (y > 700) return;
    swatchAt(g, m.id, x, y, cw);
    const on = story.chosen === m.id;
    if (on) { g.strokeStyle = UI.accent; g.lineWidth = 3; g.strokeRect(x - 4, y - 4, cw + 8, cw + 8); g.lineWidth = 1; }
    caps(g, m.name, x, y + cw + 18, 10.5, on ? UI.accentText : UI.text, { spacing: 0.7 });
    type(g, 400, 10.5, TEXT); say(g, story.filter === 'all' ? CATEGORY[m.categories[0]].label : '', x, y + cw + 33, UI.muted);
  });
  // the bar at the bottom
  g.fillStyle = UI.panel; g.fillRect(0, 770, BIG.w, 84); g.fillStyle = UI.lineStrong; g.fillRect(0, 770, BIG.w, 1);
  if (story.chosen) {
    const m = MAT[story.chosen]; swatchAt(g, m.id, 36, 786, 52);
    caps(g, m.name, 104, 808, 14, UI.text, { weight: 700, spacing: 0.6 });
    type(g, 400, 12, TEXT); say(g, CATEGORY[m.categories[0]].label, 104, 828, UI.muted);
  } else { type(g, 400, 15, TEXT); say(g, 'Pick a material for the house. Tap a card to choose.', 36, 818, UI.muted); }
  button(g, story.chosen ? `Send to Hall ${other(h)}` : 'Choose a material to send', BIG.w - 36 - 270, 789, 270, 48, !!story.chosen);
}
// giver: sent, waiting while the other hall designs
function drawSent(g, h, t) {
  meta(g, h);
  swatchAt(g, story.plan.mat, BIG.w / 2 - 90, 220, 180);
  caps(g, `Sent to Hall ${other(h)}`, BIG.w / 2, 448, 12, UI.accentText, { align: 'center' });
  type(g, 700, 40, DISPLAY); say(g, 'YOUR MATERIAL IS ON ITS WAY', BIG.w / 2, 496, UI.text, 'center');
  type(g, 400, 16, TEXT); say(g, `Waiting for Hall ${other(h)} to design.`, BIG.w / 2, 530, UI.soft, 'center');
  for (let i = 0; i < 3; i++) { g.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(t * 4 - i * 0.7)); g.fillStyle = UI.muted; g.fillRect(BIG.w / 2 - 22 + i * 16, 562, 9, 9); }
  g.globalAlpha = 1;
}
// placer: the house, and the panel with the material and the parts
function drawDesigner(g, h, t) {
  clearHouse(g);
  const x = 22, y = 22, w = 326, placing = story.step === 'place', mat = placing ? MAT[story.plan.mat] : null;
  g.fillStyle = UI.panel; g.fillRect(x, y, w, 520); g.strokeStyle = UI.line; g.strokeRect(x + 0.5, y + 0.5, w - 1, 519);
  caps(g, `Hall ${h}`, x + 18, y + 32, 15, UI.text, { weight: 700, spacing: 0.4 });
  type(g, 400, 11.5, TEXT); say(g, progress(), x + w - 18, y + 32, UI.muted, 'right');
  g.fillStyle = UI.accentText; g.fillRect(x + 18, y + 47, 6, 6); say(g, `Hall ${other(h)} is connected`, x + 30, y + 54, UI.muted);
  // the status box
  g.fillStyle = UI.s2; g.fillRect(x + 18, y + 74, w - 36, 108); g.fillStyle = placing ? UI.accent : UI.lineStrong; g.fillRect(x + 18, y + 74, 2, 108);
  if (placing) { badge(g, 'It’s your turn to design', x + 32, y + 88); swatchAt(g, mat.id, x + 32, y + 120, 44); type(g, 400, 13.5, TEXT); g.fillStyle = UI.text; wrapText(g, `Hall ${other(h)} sent you ${mat.name.toLowerCase()} for the house. Where does it go?`, x + 88, y + 134, w - 124, 18); }
  else { caps(g, 'It’s your turn to design', x + 32, y + 102, 11, UI.muted); type(g, 400, 13.5, TEXT); g.fillStyle = UI.text; wrapText(g, `Waiting for a material from Hall ${other(h)}… Look around the house meanwhile.`, x + 32, y + 128, w - 64, 19); }
  // the parts
  caps(g, 'Parts · The house', x + 18, y + 212, 10.5, UI.muted);
  PARTS.forEach((p, i) => {
    const ry = y + 226 + i * 44, cur = story.house.assign[p.id], sel = placing && story.part === p.id, ok = !placing || (!cur && fits(story.plan.mat, p.id));
    if (sel) { g.strokeStyle = UI.accent; g.lineWidth = 1.5; g.strokeRect(x + 18, ry, w - 36, 38); g.lineWidth = 1; }
    g.globalAlpha = ok ? 1 : 0.4;
    if (cur) swatchAt(g, cur, x + 28, ry + 9, 20); else blankAt(g, x + 28, ry + 9, 20);
    type(g, 500, 14, TEXT); say(g, p.label, x + 60, ry + 24, UI.text);
    type(g, 400, 12, TEXT); say(g, cur ? MAT[cur].name : 'Not filled in', x + w - 28, ry + 24, UI.muted, 'right');
    g.globalAlpha = 1;
  });
  button(g, 'Apply my selection', x + 18, y + 412, w - 36, 44, placing && !!story.part);
  if (story.last) {
    caps(g, 'Last turn', x + 18, y + 484, 10.5, UI.muted);
    type(g, 400, 12, TEXT); g.fillStyle = UI.muted;
    const l = story.last; wrapText(g, l.by === h ? `You used Hall ${other(h)}’s ${MAT[l.mat].name.toLowerCase()} on the ${PART[l.part].label.toLowerCase()}.` : `Hall ${l.by} used your ${MAT[l.mat].name.toLowerCase()} on the ${PART[l.part].label.toLowerCase()}.`, x + 18, y + 504, w - 36, 16);
  }
  // the notice when the material arrives
  if (placing && t - story.t0 / 1000 < 2.4) {
    const nx = HOUSE.x + HOUSE.w / 2, ny = HOUSE.y + HOUSE.h / 2;
    g.fillStyle = 'rgba(20,20,19,0.94)'; g.fillRect(nx - 190, ny - 46, 380, 92); g.fillStyle = UI.accent; g.fillRect(nx - 190, ny - 46, 380, 3);
    type(g, 700, 22, DISPLAY); say(g, 'A MATERIAL HAS ARRIVED', nx, ny + 2, UI.text, 'center');
    type(g, 400, 14, TEXT); say(g, `From Hall ${other(h)}`, nx, ny + 26, UI.soft, 'center');
  }
  type(g, 400, 12, TEXT); say(g, 'Drag to rotate · Scroll or pinch to zoom · Click to select a part', HOUSE.x + HOUSE.w / 2, BIG.h - 14, UI.muted, 'center');
}
// giver, after the other hall placed it: what they did with your material
function drawReveal(g, h, t) {
  clearHouse(g); const l = story.last, el = t - story.t0 / 1000;
  caps(g, `Hall ${other(h)}`, 36, 60, 12, UI.accentText);
  const y = wrapCaps(g, `This is what Hall ${other(h)} changed with your material`, 36, 104, 310, 30, 34, UI.text);
  type(g, 400, 15, TEXT); g.fillStyle = UI.soft; wrapText(g, `They used your ${MAT[l.mat].name.toLowerCase()} on the ${PART[l.part].label.toLowerCase()}.`, 36, y + 10, 310, 21);
  g.fillStyle = UI.panel; g.fillRect(36, 730, 310, 82); g.strokeStyle = UI.line; g.strokeRect(36.5, 730.5, 309, 81);
  caps(g, 'Next up: your turn to design', 191, 764, 13, UI.text, { weight: 600, spacing: 0.8, align: 'center' });
  g.fillStyle = UI.lineStrong; g.fillRect(66, 786, 250, 4); g.fillStyle = UI.accentText; g.fillRect(66, 786, 250 * Math.min(1, el / STEP.reveal), 4);
}
// placer, after applying: the screen changes to the picker
function drawSwitch(g, h) {
  caps(g, `Hall ${other(h)}`, BIG.w / 2, 360, 12, UI.accentText, { align: 'center' });
  type(g, 700, 44, DISPLAY); say(g, 'IT’S YOUR TURN TO CHOOSE A MATERIAL', BIG.w / 2, 416, UI.text, 'center');
  type(g, 400, 17, TEXT); say(g, `Your material is on the house. Now choose a material for Hall ${other(h)}.`, BIG.w / 2, 456, UI.soft, 'center');
  type(g, 400, 14, TEXT); say(g, 'Changing interfaces…', BIG.w / 2, 500, UI.muted, 'center');
}
// both, when the fourth part is on: the finished house, before it moves to the corridor
function drawFinished(g) {
  clearHouse(g); const a = story.house.assign;
  caps(g, `House ${story.house.no} · finished`, 36, 60, 12, UI.accentText);
  wrapCaps(g, 'The house is finished', 36, 104, 310, 34, 38, UI.text);
  PARTS.forEach((p, i) => {
    const y = 200 + i * 58; swatchAt(g, a[p.id], 36, y, 44);
    caps(g, p.label, 94, y + 18, 10.5, UI.muted); type(g, 500, 15, TEXT); say(g, MAT[a[p.id]].name, 94, y + 38, UI.text);
  });
  type(g, 400, 15, TEXT); g.fillStyle = UI.soft; wrapText(g, 'Built by Hall A and Hall B together. It moves to the screens in the corridor.', 36, 470, 300, 21);
}

function drawApp(h) {
  const g = big[h].ctx, t = performance.now() / 1000, giver = story.giver === h, st = story.step;
  g.textBaseline = 'alphabetic'; g.fillStyle = UI.bg; g.fillRect(0, 0, BIG.w, BIG.h);
  let house = false;
  if (st === 'finished') { drawFinished(g); house = true; }
  else if (giver) {
    if (st === 'pick' || st === 'chosen') drawPicker(g, h);
    else if (st === 'sent' || st === 'place') drawSent(g, h, t);
    else { drawReveal(g, h, t); house = true; }
  } else if (st === 'reveal') drawSwitch(g, h);
  else { drawDesigner(g, h, t); house = true; }
  housePlanes[h].visible = house;
  tile(g, h, t);
  big[h].tex.needsUpdate = true;
}

function drawHeader(h) {
  const g = header[h].ctx;
  g.fillStyle = UI.bg; g.fillRect(0, 0, 2048, 165); g.textBaseline = 'middle'; g.textAlign = 'left';
  type(g, 700, 84, DISPLAY); const n = counter.toLocaleString('en-US'); say(g, n, 60, 90, UI.text);
  const nw = g.measureText(n).width; type(g, 400, 58, TEXT); say(g, 'messages sent today', 60 + nw + 36, 92, UI.muted);
  g.fillStyle = UI.accentText; g.fillRect(1930, 55, 56, 56);
  g.textBaseline = 'alphabetic'; header[h].tex.needsUpdate = true;
}

// the kiosks: the hallway wireframe's copy, and a finished house turning behind the clear part
function drawKiosk(k) {
  const g = k.canvas.getContext('2d'), { w, h, house: r } = k.KC, f = finished[k.index] ?? finished[0];
  g.textBaseline = 'alphabetic'; g.fillStyle = UI.bg; g.fillRect(0, 0, w, h); g.clearRect(r.x, r.y, r.w, r.h);
  type(g, 700, 30, DISPLAY); say(g, 'agora.', 44, 64, UI.text);
  caps(g, `House ${f.no} · built by Hall A & Hall B`, 44, 196, 12, UI.accentText);
  const y = wrapCaps(g, 'Your turn to build', 44, 246, 360, 50, 52, UI.text);
  type(g, 400, 17, TEXT); g.fillStyle = UI.soft; wrapText(g, 'Visitors in two halls build each house together. Walk to either end and take part.', 44, y + 8, 340, 25);
  PARTS.forEach((p, i) => { const x = 44 + i * 88; swatchAt(g, f.assign[p.id], x, 452, 34); type(g, 400, 11, TEXT); say(g, p.label, x, 504, UI.muted); });
  k.tex.needsUpdate = true;
  if (k.shown !== f) { k.view.set(f.assign); k.shown = f; }
}

/* ================= the story: one hall picks and sends, the other places, the roles swap ================= */
const STEP = { pick: 3.4, chosen: 1.6, sent: 3, place: 3.4, reveal: 4.5, finished: 6 };   // seconds per step
let story;
const shuffle = (list) => list.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
function newHouse(no) { return { no, assign: { facade: null, roof: null, terrace: null, door: null }, order: shuffle(PARTS.map((p) => p.id)) }; }
function nextTurn() {
  const part = story.house.order.find((p) => !story.house.assign[p]);
  const used = Object.values(story.house.assign);
  const options = MATERIALS.filter((m) => fits(m.id, part) && !used.includes(m.id));
  const mat = options[Math.floor(Math.random() * options.length)].id;
  Object.assign(story, { plan: { part, mat, cat: MAT[mat].categories[0] }, step: 'pick', t0: performance.now(), filter: 'all', chosen: null, part: null });
}
function restart() { story = { giver: 'A', house: newHouse(finished[0].no + 1), last: null }; particleChoice(null); nextTurn(); }
function go(step) { story.step = step; story.t0 = performance.now(); }
function tickStory(now) {
  const el = (now - story.t0) / 1000;
  switch (story.step) {
    case 'pick':
      if (el > 1.2) story.filter = story.plan.cat;
      if (el > 2.4) story.chosen = story.plan.mat;
      if (el > STEP.pick) go('chosen');
      break;
    case 'chosen':
      if (el > STEP.chosen) { go('sent'); counter++; particleChoice({ send: MAT[story.plan.mat] }); }
      break;
    case 'sent':
      if (el > STEP.sent) go('place');
      break;
    case 'place':
      if (el > 1.4) story.part = story.plan.part;
      if (el > STEP.place) {
        story.house.assign[story.plan.part] = story.plan.mat;
        story.last = { by: other(story.giver), mat: story.plan.mat, part: story.plan.part };
        particleChoice({ mat: MAT[story.plan.mat], part: PART[story.plan.part] });
        go('reveal');
      }
      break;
    case 'reveal':
      if (el > STEP.reveal) {
        story.giver = other(story.giver);
        if (toFill()) nextTurn(); else go('finished');
      }
      break;
    case 'finished':
      if (el > STEP.finished) {
        finished.unshift({ no: story.house.no, assign: { ...story.house.assign } }); finished.length = 2;
        story.house = newHouse(story.house.no + 1); story.last = null; nextTurn();
      }
      break;
  }
  // the house on the game screens: what's placed, plus the part being tried
  const a = { ...story.house.assign };
  if (story.step === 'place' && story.part) a[story.part] = story.plan.mat;
  const key = JSON.stringify(a);
  if (key !== story.shownKey) { gameView.set(a); story.shownKey = key; }
}
restart();

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
window.__dbg = { renderer, scene, camera, pos, particleChoice, story: () => story, gameView, kiosks };
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
let last = performance.now(), tPart = performance.now(), tAnim = 0, tBig = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started) move(dt);
  camera.position.set(pos.x, EYE + Math.sin(bob) * 0.03, pos.z);
  camera.rotation.set(pitch, yaw, 0);
  tickStory(now);
  if (now - tAnim > 50) { tAnim = now; updateScreens(now / 1000); for (const k in screenTex) screenTex[k].needsUpdate = true; }
  if (now - tPart > 33) { drawParticles(now / 1000, Math.min(0.1, (now - tPart) / 1000)); tPart = now; particleTex.needsUpdate = true; }
  if (now - tBig > 80) { tBig = now; drawApp('A'); drawApp('B'); drawHeader('A'); drawHeader('B'); kiosks.forEach(drawKiosk); }
  // the houses: on the game screens, and turning on the kiosks
  gameView.render(renderer, dt); kiosks.forEach((k) => k.view.render(renderer, dt));
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
