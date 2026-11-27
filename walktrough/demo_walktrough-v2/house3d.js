// The house the halls build together, in 3D: a simple gabled house with a
// terrace, four parts the game fills in (catalogue.js PARTS). A part nobody
// has filled in yet is a line drawing, white edges on black, like the real
// PoC's blueprint; a filled part wears its material's texture.
//
// HouseView renders one house into a texture (a render target) that a screen
// in the walkthrough shows: the kiosks in the corridor (a finished house,
// turning slowly) and the game screens (the house being built).

import * as THREE from 'three';
import { MAT, textureCanvas } from './catalogue.js';

const W = 6, D = 4.4, H = 2.8, T = 0.2;      // footprint, wall height, wall thickness (m)
const RISE = 1.7, OVER = 0.4, RT = 0.16;     // roof: ridge height above the walls, overhang, thickness

const BLUEPRINT = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const EDGE = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const FIXED = {
  base: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.95 }),
  window: new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.15, metalness: 0.4 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.6 }),
};

// one shared texture per material; meshes clone it for their own repeat
const baseTex = {};
function textureOf(id) {
  if (!baseTex[id]) {
    const t = new THREE.CanvasTexture(textureCanvas(id));
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    baseTex[id] = t;
  }
  return baseTex[id];
}
const matCache = {};
function materialFor(id, [w, h]) {
  const key = `${id}|${w.toFixed(1)}|${h.toFixed(1)}`;
  if (matCache[key]) return matCache[key];
  const row = MAT[id].row;
  if (row.through) {
    return (matCache[key] = new THREE.MeshStandardMaterial({ color: row.color, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.3 }));
  }
  const map = textureOf(id).clone();
  map.repeat.set(w / row.tile, h / row.tile); map.needsUpdate = true;
  // A metal keeps some of its own colour: there's little to reflect in this small scene.
  return (matCache[key] = new THREE.MeshStandardMaterial({ map, roughness: Math.max(row.roughness, 0.3), metalness: Math.min(row.metalness, 0.55) }));
}

export function makeHouse() {
  const group = new THREE.Group();
  const parts = { facade: [], roof: [], terrace: [], door: [] };
  const add = (part, geo, pos, size, rot) => {
    const mesh = new THREE.Mesh(geo, BLUEPRINT);
    mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), EDGE);
    mesh.add(edges);
    mesh.userData = { size, edges };
    group.add(mesh); parts[part].push(mesh);
    return mesh;
  };
  const fixed = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; };

  // ground plate under it all
  fixed(FIXED.base, W + 3.2, 0.12, D + 5, 0, -0.06, 0.9);
  // the four walls (facade)
  add('facade', new THREE.BoxGeometry(W, H, T), [0, H / 2, D / 2 - T / 2], [W, H]);
  add('facade', new THREE.BoxGeometry(W, H, T), [0, H / 2, -D / 2 + T / 2], [W, H]);
  add('facade', new THREE.BoxGeometry(T, H, D - 2 * T), [W / 2 - T / 2, H / 2, 0], [D, H]);
  add('facade', new THREE.BoxGeometry(T, H, D - 2 * T), [-W / 2 + T / 2, H / 2, 0], [D, H]);
  // the gable ends: triangles on the short walls
  const gable = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, RISE)]);
  const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: T, bevelEnabled: false });
  add('facade', gableGeo, [W / 2 - T, H, 0], [D, RISE], [0, Math.PI / 2, 0]);
  add('facade', gableGeo, [-W / 2, H, 0], [D, RISE], [0, Math.PI / 2, 0]);
  // the roof: two slabs from the ridge down past the eaves (the overhang). The underside runs
  // through the ridge (0, H + RISE) and the top of the wall's outer face (±D/2, H).
  const L0 = Math.hypot(D / 2, RISE), pitch = Math.atan2(RISE, D / 2), len = L0 + OVER + RT / 2;
  [-1, 1].forEach((s) => {
    const u = [s * (D / 2) / L0, -RISE / L0], n = [s * RISE / L0, (D / 2) / L0];   // down the slope, and out of it
    const c = [u[0] * (len / 2 - RT / 4) + n[0] * (RT / 2), H + RISE + u[1] * (len / 2 - RT / 4) + n[1] * (RT / 2)];
    add('roof', new THREE.BoxGeometry(W + 2 * OVER, RT, len), [0, c[1], c[0]], [W + 2 * OVER, len], [s * pitch, 0, 0]);
  });
  // the terrace: a deck in front of the house
  add('terrace', new THREE.BoxGeometry(W + 0.6, 0.16, 2.4), [0, 0.08, D / 2 + 1.2], [W + 0.6, 2.4]);
  // the front door, in the middle of the long front wall
  add('door', new THREE.BoxGeometry(1.0, 2.15, 0.08), [0.9, 1.075, D / 2 + 0.04], [1, 2.15]);
  // windows: dark glass with a frame (not a part, the same on every house)
  const win = (w, h, x, y, z, ry = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; group.add(g);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), FIXED.window); g.add(pane);
    [[w + 0.1, 0.06, 0, h / 2], [w + 0.1, 0.06, 0, -h / 2], [0.06, h, w / 2, 0], [0.06, h, -w / 2, 0]].forEach(([fw, fh, fx, fy]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.07), FIXED.frame); f.position.set(fx, fy, 0); g.add(f);
    });
  };
  win(2.0, 1.5, -1.5, 1.45, D / 2 + 0.03);
  win(1.4, 1.2, 0, 1.5, -D / 2 - 0.03);
  win(1.4, 1.2, W / 2 + 0.03, 1.5, 0, Math.PI / 2);
  win(1.4, 1.2, -W / 2 - 0.03, 1.5, 0, Math.PI / 2);

  function setPart(part, id) {
    for (const mesh of parts[part]) {
      mesh.material = id ? materialFor(id, mesh.userData.size) : BLUEPRINT;
      mesh.userData.edges.visible = !id;
    }
  }
  // assign: { facade, roof, terrace, door } → material id or null
  function setAll(assign) { for (const p in parts) setPart(p, assign[p] ?? null); }
  return { group, setPart, setAll };
}

// One house rendered into a texture, for a screen. `spin`: seconds per turn
// (0: stands still at a three-quarter view).
export class HouseView {
  constructor({ width = 1024, height = 768, background = '#0e1111', distance = 15, spin = 30 } = {}) {
    this.rt = new THREE.WebGLRenderTarget(width, height, { samples: 4 });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(background);
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.5, 100);
    this.camera.position.set(distance * 0.62, distance * 0.42, distance * 0.66);
    this.camera.lookAt(0, 1.6, 0.6);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 10, 8); this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9ec5ff, 0.6); rim.position.set(-8, 4, -6); this.scene.add(rim);
    this.house = makeHouse();
    this.scene.add(this.house.group);
    this.spin = spin;
    this.angle = -0.5;
  }
  set(assign) { this.house.setAll(assign); }
  render(renderer, dt) {
    if (this.spin) this.angle += (dt / this.spin) * Math.PI * 2;
    this.house.group.rotation.y = this.angle;
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }
}
