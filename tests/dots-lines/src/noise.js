// Small 3D value noise (x, y, time) → -1…1. Smooth enough for a flow field,
// cheap enough to sample once per particle per frame.

const P = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, y, z) => P[P[P[x & 255] + (y & 255)] + (z & 255)] / 127.5 - 1;

export function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const x0 = lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u);
  const x1 = lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u);
  const x2 = lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u);
  const x3 = lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(x0, x1, v), lerp(x2, x3, v), w);
}
