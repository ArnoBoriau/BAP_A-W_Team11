// Board step 7: animate it. Where every particle is at time t (seconds since
// the move arrived), from its home position, the material's movement and the
// behaviour's own motion. Pure: same field + same t → same picture, in both halls.
//
//   flowing     drifts on a slow current
//   rhythmic    a beat: rows pull in and let go, one after the other
//   expanding   grows out from the centre, again and again
//   dispersing  particles drift outward, fade, and start again
//   still       barely moves, a slow breath

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const out = [0, 0, 1] // x offset, y offset, alpha factor
const particle = { hx: 0, hy: 0, phase: 0 }

// Writes x, y (screen units, height = 1) and alpha for every particle.
export function place(field, t, xs, ys, alphas) {
  const s = field.recipe.settings
  const { noise, pattern, w } = field
  const cx = w / 2
  const cy = 0.5
  const maxR = Math.hypot(cx, cy)

  const flow = t * 0.12 * (0.4 + s.speed)
  const beatLength = 1.8 - s.speed
  const growCycle = (t * 0.09 * (0.5 + s.speed)) % 1

  for (let i = 0; i < field.count; i++) {
    const hx = field.hx[i]
    const hy = field.hy[i]
    const phase = field.phase[i]
    let x = hx
    let y = hy
    let a = 1

    // flowing (and a little bit of everything): a slow, noisy current
    const drift = s.drift * 0.022 + s.wobble * 0.004
    if (drift) {
      x += noise(hx * 2.5, hy * 2.5, flow) * drift
      y += noise(hx * 2.5 + 40, hy * 2.5, flow) * drift
    }

    // rhythmic: a beat travels through the strands
    if (s.pulse) {
      const beat = ((t + (field.strand[i] % 4) * beatLength * 0.25) / beatLength) % 1
      const kick = Math.exp(-beat * 7) * s.pulse * 0.025
      x += (cx - hx) * kick
      y += (cy - hy) * kick
    }

    // expanding: out from the centre, points appear as the edge passes them
    if (s.grow) {
      const r = Math.hypot(hx - cx, hy - cy) / maxR
      a *= 1 - s.grow + s.grow * smooth(r - 0.08, r, growCycle * 1.2)
      const scale = 1 - s.grow * 0.12 * (1 - growCycle)
      x = cx + (x - cx) * scale
      y = cy + (y - cy) * scale
    }

    // dispersing: each particle drifts outward over its own life, then starts again
    if (s.spread) {
      const life = (t * 0.07 * (0.5 + s.speed) + phase) % 1
      const dx = hx - cx
      const dy = hy - cy
      const d = Math.hypot(dx, dy) || 1
      x += (dx / d) * life * 0.08 * s.spread
      y += (dy / d) * life * 0.08 * s.spread
      a *= smooth(0, 0.15, life) * (1 - smooth(0.7, 1, life) * s.spread)
    }

    // still: breathing
    y += Math.sin(t * 0.7 + phase * 6.28) * 0.0015

    // the behaviour's own motion
    if (pattern.motion) {
      particle.hx = hx
      particle.hy = hy
      particle.phase = phase
      out[0] = 0
      out[1] = 0
      out[2] = 1
      pattern.motion(particle, t, out)
      x += out[0]
      y += out[1]
      a *= out[2]
    }

    xs[i] = x
    ys[i] = y
    alphas[i] = a * (1 - field.depth[i] * 0.6)
  }
}
