// The choices a user can make, and the character each one gives the particles.
// Every choice is just a set of behaviour axes (0…1) plus a palette;
// sim.js reads only the axes, so a new choice is a new entry here.
//
//   rough     jitter, jagged lines, square dots
//   smooth    particles follow one coherent flow, long trails
//   soft      bigger glowing dots, faint lines that reach further
//   weight    sinks and slows down
//   order     snaps to a grid, lines only along the grid
//   grain     flow runs in one direction, lines run along it
//   link      how readily dots connect with lines
//   scatter   how much dot sizes differ

export const AXES = [
  { key: 'rough', label: 'roughness' },
  { key: 'smooth', label: 'smoothness' },
  { key: 'soft', label: 'softness' },
  { key: 'weight', label: 'weight' },
  { key: 'order', label: 'order' },
  { key: 'grain', label: 'grain' },
  { key: 'link', label: 'lines' },
  { key: 'scatter', label: 'scatter' },
];

export const CHOICES = [
  {
    key: 'concrete',
    name: 'Concrete',
    axes: { rough: 0.85, smooth: 0.1, soft: 0.15, weight: 0.75, order: 0.05, grain: 0, link: 0.35, scatter: 0.55 },
    palette: ['#9a9a96', '#c9c7c1', '#6d6c69'],
  },
  {
    key: 'oak',
    name: 'Oak',
    axes: { rough: 0.3, smooth: 0.65, soft: 0.25, weight: 0.3, order: 0, grain: 0.95, link: 0.55, scatter: 0.25 },
    palette: ['#c98a4b', '#e6b77e', '#8a5a2e'],
  },
  {
    key: 'glass',
    name: 'Glass',
    axes: { rough: 0, smooth: 1, soft: 0.05, weight: 0, order: 0, grain: 0, link: 0.9, scatter: 0.05 },
    palette: ['#bfe8ef', '#ffffff', '#7fc4d3'],
  },
  {
    key: 'plaster',
    name: 'Plaster',
    axes: { rough: 0.2, smooth: 0.55, soft: 0.95, weight: 0.2, order: 0, grain: 0, link: 0.3, scatter: 0.3 },
    palette: ['#f3efe8', '#e2dbd0', '#fffaf2'],
  },
  {
    key: 'tiles',
    name: 'Tiles',
    axes: { rough: 0.05, smooth: 0.4, soft: 0.1, weight: 0.35, order: 1, grain: 0, link: 0.7, scatter: 0 },
    palette: ['#e9f0f2', '#9fb7c0', '#ffffff'],
  },
  {
    key: 'terrazzo',
    name: 'Terrazzo',
    axes: { rough: 0.5, smooth: 0.2, soft: 0.25, weight: 0.5, order: 0, grain: 0, link: 0.15, scatter: 1 },
    palette: ['#e8e2d6', '#d46a4c', '#5c7f73', '#e0b44c'],
  },
];
