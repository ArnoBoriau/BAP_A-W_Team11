// Seeded randomness (board step 8): both halls get the same move + seed, so
// they calculate exactly the same animation. Everything that picks a random
// number in the engine goes through these, never Math.random().

// mulberry32: a small, fast PRNG. seed (any integer) → () => 0…1
export function createRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A string or a few values → a 32-bit seed (FNV-1a).
export function hashSeed(...parts) {
  let h = 2166136261
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// 3D value noise (x, y, time) → -1…1, with its own seeded permutation.
export function createNoise(seed) {
  const random = createRandom(seed)
  const P = new Uint8Array(512)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255]

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a, b, t) => a + (b - a) * t
  const hash = (x, y, z) => P[P[P[x & 255] + (y & 255)] + (z & 255)] / 127.5 - 1

  return function noise3(x, y, z) {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const u = fade(x - xi)
    const v = fade(y - yi)
    const w = fade(z - zi)
    const x0 = lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u)
    const x1 = lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u)
    const x2 = lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u)
    const x3 = lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u)
    return lerp(lerp(x0, x1, v), lerp(x2, x3, v), w)
  }
}
