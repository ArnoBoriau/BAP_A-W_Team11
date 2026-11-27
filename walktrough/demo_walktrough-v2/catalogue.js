// Materials, categories and the parts of the house, for the walkthrough's game.
// The rows are the real PoC's (catalogue.data.js); the textures are drawn by the
// real PoC's painters (textures/), so everything looks like demo/proof-of-concept-v3.

import { ROWS } from './catalogue.data.js';
import { FAMILIES, finish } from './textures/families.js';
import { SIZE, hash, seededRandom, shade } from './textures/draw.js';

export const CATEGORIES = [
  { id: 'stone', label: 'Stone' },
  { id: 'plastics', label: 'Plastics' },
  { id: 'bioplastics', label: 'Bioplastics' },
  { id: 'wood', label: 'Wood' },
  { id: 'concrete', label: 'Concrete' },
  { id: 'glass', label: 'Glass' },
  { id: 'ceramics', label: 'Ceramics' },
  { id: 'metals', label: 'Metals' },
  { id: 'natural', label: 'Natural materials' },
];
export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const [d, org, round, move, tr] = [0, 1, 2, 3, 4];
export const MATERIALS = ROWS.map((row) => ({
  id: row.id,
  name: row.name,
  categories: row.categories,
  row,
  tags: { d: row.particles[d], org: row.particles[org], round: row.particles[round], move: row.particles[move], tr: row.particles[tr] },
}));
export const MAT = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

// The house the halls build together: four parts, filled in this order of
// turns (whichever is still empty), each by one hall with a material the other
// hall sent.
export const PARTS = [
  { id: 'facade', label: 'Facade', kind: 'wall' },
  { id: 'roof', label: 'Roof', kind: 'wall' },
  { id: 'terrace', label: 'Terrace', kind: 'floor' },
  { id: 'door', label: 'Front door', kind: 'wall' },
];
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));

// Glass goes in the facade or the door, not on a roof or a terrace.
export const fits = (id, part) =>
  MAT[id].row.surfaces.includes(PART[part].kind) && !(MAT[id].row.through && part === 'roof');

// A material's texture, drawn once (the same canvas feeds the swatches and the 3D house).
const cache = {};
export function textureCanvas(id) {
  if (cache[id]) return cache[id];
  const row = MAT[id].row, c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d'), family = FAMILIES[row.family];
  if (family?.paint) {
    const rand = seededRandom(hash(id));
    family.paint(g, rand, row);
    finish(g, rand, row);
  } else {
    // glass: no texture, a cool gradient for the swatch
    const gr = g.createLinearGradient(0, 0, SIZE, SIZE);
    gr.addColorStop(0, shade(row.color, 0.4)); gr.addColorStop(0.55, shade(row.color, -0.12)); gr.addColorStop(1, shade(row.color, 0.6));
    g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE);
  }
  return (cache[id] = c);
}
