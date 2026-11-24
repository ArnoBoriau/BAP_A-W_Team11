// Board step 5: the behaviour gives the base pattern. Each behaviour has
//   shape(x, y)       how much a point here belongs to the pattern (0…1)
//   motion(p, t, out) an extra movement on top of the material's own (optional):
//                     adds to out[0] (x), out[1] (y), multiplies out[2] (alpha)
//   mirror            the left half is made, the right half mirrors it
//   depth(x, y)       for layering: which layer (0 front … 1 back)
//
// The area is x 0…w (w = width / height of the screen), y 0…1.
// make(w, random) sets up the pattern for one move (random = seeded).

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
const band = (v, from, to, soft = 0.02) => smooth(from - soft, from + soft, v) * (1 - smooth(to - soft, to + soft, v))

export const PATTERNS = {
  // v3: a material that has no place yet (picked, sent or received, not placed):
  // no form, the material fills the screen. A place gives it its form.
  material(w) {
    return {
      shape: (x, y) => band(y, 0.1, 0.9, 0.08) * band(x / w, 0.06, 0.94, 0.06),
    }
  },

  // a wall with gaps: the particles form a screen, things pass through the gaps
  filtering(w, random) {
    const slats = 5 + Math.floor(random() * 3)
    const open = 0.4 + random() * 0.12 // share of every slat that's a gap
    return {
      shape: (x, y) => {
        const slat = ((x / w) * slats) % 1
        return band(y, 0.14, 0.86) * band(slat, open, 1, 0.015)
      },
      // a slow horizontal current, strongest in the gaps
      motion: (p, t, out) => {
        out[0] += Math.sin(t * 0.5 + p.hy * 6) * 0.006
      },
    }
  },

  // a ring around an empty space
  enclosing(w, random) {
    const cx = w / 2
    const r = 0.3 + random() * 0.06
    const thickness = 0.1 + random() * 0.05
    return {
      shape: (x, y) => {
        const d = Math.hypot(x - cx, y - 0.5)
        return band(d, r - thickness, r + thickness, 0.03)
      },
      // breathing slightly inward: closing the space
      motion: (p, t, out) => {
        const s = Math.sin(t * 0.6) * 0.012
        out[0] += (cx - p.hx) * s
        out[1] += (0.5 - p.hy) * s
      },
    }
  },

  // clusters, with corridors between them
  connecting(w, random) {
    const count = 4 + Math.floor(random() * 3)
    const nodes = Array.from({ length: count }, (_, i) => [
      ((i + 0.5) / count) * w + (random() - 0.5) * 0.15,
      0.22 + random() * 0.56,
    ])
    const r = 0.09 + random() * 0.04
    const distToSegment = (x, y, [ax, ay], [bx, by]) => {
      const dx = bx - ax
      const dy = by - ay
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
      return Math.hypot(x - ax - t * dx, y - ay - t * dy)
    }
    return {
      shape: (x, y) => {
        let best = 0
        for (const [nx, ny] of nodes) best = Math.max(best, 1 - smooth(r * 0.7, r, Math.hypot(x - nx, y - ny)))
        for (let i = 1; i < nodes.length; i++) {
          const d = distToSegment(x, y, nodes[i - 1], nodes[i])
          best = Math.max(best, (1 - smooth(0.008, 0.025, d)) * 0.8)
        }
        return best
      },
    }
  },

  // streams that converge toward a point: they guide the eye
  directing(w, random) {
    const target = [w * (0.85 + random() * 0.1), 0.5 + (random() - 0.5) * 0.2]
    return {
      shape: (x, y) => {
        const along = x / target[0] // 0 at the left, 1 at the target
        if (along > 1) return 0
        const centre = 0.5 + (target[1] - 0.5) * along
        const half = 0.42 * (1 - along) + 0.03
        return band(y, centre - half, centre + half, 0.03)
      },
      // everything flows toward the target, fading in and out along the way
      motion: (p, t, out) => {
        const life = (t * 0.06 + p.phase) % 1
        out[0] += life * 0.06 - 0.03
        out[2] *= Math.sin(life * Math.PI)
      },
    }
  },

  // a base, with columns rising from it
  supporting(w, random) {
    const columns = 3 + Math.floor(random() * 3)
    const colWidth = 0.05 + random() * 0.03
    return {
      shape: (x, y) => {
        const base = band(y, 0.72, 0.9, 0.015)
        const slot = ((x / w) * columns) % 1
        const column = band(slot, 0.5 - colWidth * columns * 0.5, 0.5 + colWidth * columns * 0.5, 0.01) * band(y, 0.15, 0.75)
        return Math.max(base, column)
      },
    }
  },

  // a form on the left, and its mirror image on the right
  reflecting(w, random) {
    const blobs = Array.from({ length: 3 }, () => [w * (0.12 + random() * 0.3), 0.25 + random() * 0.5, 0.08 + random() * 0.08])
    return {
      mirror: true,
      shape: (x, y) => {
        if (x > w / 2) return 0
        let best = 0
        for (const [bx, by, r] of blobs) best = Math.max(best, 1 - smooth(r * 0.6, r, Math.hypot(x - bx, y - by)))
        return best
      },
    }
  },

  // overlapping bands, each a layer at its own depth
  layering(w, random) {
    const layers = 3 + Math.floor(random() * 2)
    const height = 0.16
    const step = (0.76 - height) / (layers - 1)
    const slope = 0.04 + random() * 0.05
    // front layer at the bottom, each layer further back sits higher and starts further in
    const layerOf = (x, y) => {
      for (let k = 0; k < layers; k++) {
        const top = 0.88 - height - k * step - (x / w) * slope
        if (y > top && y < top + height && x > k * 0.06 * w) return k
      }
      return -1
    }
    return {
      shape: (x, y) => (layerOf(x, y) >= 0 ? 1 : 0),
      depth: (x, y) => Math.max(0, layerOf(x, y)) / Math.max(1, layers - 1),
    }
  },
}
