// Board step 6: combine the pattern and the settings.
//
//   structure (how)   fills the screen with strands of points   (structures.js)
//   pattern   (where) keeps the points that fall in its shape   (patterns.js)
//   density           how close the points are, how many drop out
//   character         organic = points pushed off their perfect place
//
// The result is a FIELD: every particle's home position plus what it needs to
// move (its strand, a phase, a depth), and the lines between particles.
// Seeded: the same recipe and screen shape always give the same field.

import { PATTERNS } from './patterns.js'
import { STRUCTURES } from './structures.js'
import { createNoise, createRandom } from './random.js'

const MAX_PARTICLES = 2400
const lerp = (a, b, t) => a + (b - a) * t

// recipe: from resolve(). w: screen width / height.
export function buildField(recipe, w) {
  const s = recipe.settings
  const random = createRandom(recipe.seed)
  const noise = createNoise(recipe.seed + 1)

  const pattern = PATTERNS[recipe.behaviour.id](w, random)
  // density = how many particles end up IN the pattern, so a small shape
  // (a few clusters) isn't emptier than a big one (a wall)
  const target = lerp(350, 1500, s.count)
  const spacing = Math.sqrt((w * coverage(pattern, w)) / target)
  const strands = STRUCTURES[s.structure](random, w, spacing)

  // Keep what's in the pattern; a dropped point breaks its strand in two.
  const dropChance = s.gap * 0.35
  let kept = []
  for (const strand of strands) {
    let piece = []
    for (const [x, y] of strand) {
      const keep = x >= 0 && x <= w && y >= 0 && y <= 1 && random() < pattern.shape(x, y) * (1 - dropChance)
      if (keep) piece.push([x, y])
      else if (piece.length) {
        kept.push(piece)
        piece = []
      }
    }
    if (piece.length) kept.push(piece)
  }

  if (pattern.mirror) kept = kept.concat(kept.map((strand) => strand.map(([x, y]) => [w - x, y])))

  // Character: organic and soft forms aren't exactly where the structure put them.
  const push = s.wobble * spacing * 0.9
  const field = {
    recipe,
    w,
    pattern,
    noise,
    count: 0,
    hx: new Float32Array(MAX_PARTICLES),
    hy: new Float32Array(MAX_PARTICLES),
    strand: new Uint16Array(MAX_PARTICLES),
    phase: new Float32Array(MAX_PARTICLES),
    depth: new Float32Array(MAX_PARTICLES),
    size: new Float32Array(MAX_PARTICLES),
    lines: [], // pairs of particle indices
  }

  kept.forEach((strand, k) => {
    let previous = -1
    for (const [x, y] of strand) {
      if (field.count >= MAX_PARTICLES) return
      const i = field.count++
      field.hx[i] = x + noise(x * 4, y * 4, 0) * push
      field.hy[i] = y + noise(x * 4 + 31, y * 4, 0) * push
      field.strand[i] = k
      field.phase[i] = random()
      field.depth[i] = pattern.depth?.(x, y) ?? 0
      field.size[i] = random() ** 3
      if (previous >= 0) field.lines.push(previous, i)
      previous = i
    }
  })

  return field
}

// Roughly how much of the screen the pattern covers (0…1), on a coarse grid.
function coverage(pattern, w) {
  let sum = 0
  let n = 0
  for (let y = 0.02; y < 1; y += 0.04) {
    for (let x = 0.02; x < w; x += 0.04) {
      sum += pattern.shape(x, y) * (pattern.mirror ? 2 : 1)
      n++
    }
  }
  return Math.max(0.05, Math.min(1, sum / n))
}
