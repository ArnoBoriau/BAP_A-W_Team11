// Draws a field on a 2D canvas: dots, and lines along the strands.
// Colours: black, white and one blue (the A@W palette from the board).
//
// How the particles move (v3, after tests/dots-lines): every particle has a
// velocity. Two forces act on it:
//   - a spring to its home: where the engine puts it at this moment
//     (engine/motion.js: the pattern plus the material's own movement)
//   - a flow field: a slow, swirling current, shaped by the material
//     (flowing materials drift fast, still ones slowly, linear ones run along a grain)
// Right after a choice the spring is tight: the particles gather into the new
// form (that's the morph, with a little overshoot). Then it loosens: while
// nobody chooses anything, the particles roam around the form on the current,
// and dots that come close join with lines that come and go.
//
// The engine (src/engine) doesn't know about canvases, so this file can later
// be swapped for a react-three-fiber renderer (board step 7: useFrame).

import { buildField } from '../engine/build.js'
import { place } from '../engine/motion.js'
import { createNoise, createRandom } from '../engine/random.js'

export const COLORS = { bg: '#000000', dot: [255, 255, 255], blue: [43, 92, 255] }
const MAX = 2400
const ALPHA_LEVELS = 6
const TAU = Math.PI * 2

// The tension over time, after a choice (seconds).
const GATHER = 1.4 // tight until here: the particles gather into the form
const LOOSEN = 9 // loose from here on: they roam around it
const SPRING = [26, 2.2] // pull to the home, tight → loose (1/s²)
const DAMPING = [7, 1.5] // tight → loose (1/s)
const FLOW = 0.26 // the current's push when loose (screen heights /s²)
const REACH = 0.032 // the come-and-go lines: how close dots must be (screen heights)

const lerp = (a, b, t) => a + (b - a) * t
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')
  const flowNoise = createNoise(7) // the current runs on across moves
  let W = 0
  let H = 0
  let field = null
  let recipe = null
  let started = 0 // when the current move arrived (seconds)
  let last = null // the previous frame's time

  // where every particle is (screen units, height = 1), how fast it goes,
  // and where the engine wants it (its home at this moment)
  const xs = new Float32Array(MAX)
  const ys = new Float32Array(MAX)
  const vx = new Float32Array(MAX)
  const vy = new Float32Array(MAX)
  const tx = new Float32Array(MAX)
  const ty = new Float32Array(MAX)
  const alphas = new Float32Array(MAX)
  let shownCount = 0

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    W = innerWidth
    H = innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, W, H)
    if (recipe) field = buildField(recipe, W / H) // the pattern depends on the screen's shape
  }

  // A new choice: build its field. Its particles start where the shown ones
  // are now, keep their speed, and the spring pulls them into the new form.
  function show(nextRecipe, now) {
    const next = buildField(nextRecipe, W / H)
    if (shownCount) {
      // copy first (a new index can read an old one that's being overwritten)
      const ox = xs.slice(0, shownCount)
      const oy = ys.slice(0, shownCount)
      const ovx = vx.slice(0, shownCount)
      const ovy = vy.slice(0, shownCount)
      for (let i = 0; i < next.count; i++) {
        const j = i % shownCount
        xs[i] = ox[j]
        ys[i] = oy[j]
        vx[i] = ovx[j]
        vy[i] = ovy[j]
      }
    } else {
      // the first choice: gather from all over the screen
      const random = createRandom(nextRecipe.seed)
      for (let i = 0; i < next.count; i++) {
        xs[i] = random() * next.w
        ys[i] = random()
        vx[i] = vy[i] = 0
      }
    }
    shownCount = next.count
    field = next
    recipe = nextRecipe
    started = now
  }

  function frame(now) {
    if (!field) return
    const dt = last === null ? 1 / 60 : Math.min(0.05, Math.max(0, now - last))
    last = now
    const t = now - started
    const s = field.recipe.settings
    const loose = smooth(GATHER, LOOSEN, t)

    place(field, t, tx, ty, alphas)
    step(s, now, loose, dt)

    // trails: moving things leave a trace, still and rigid things stay crisp
    ctx.fillStyle = `rgba(0, 0, 0, ${lerp(0.7, 0.2, Math.max(s.drift, loose * 0.55)).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)

    const lineIn = smooth(0.2, GATHER + 0.6, t)
    drawLines(s, lineIn)
    if (loose > 0.05) drawNearLines(s, loose)
    drawDots(s)
  }

  function step(s, now, loose, dt) {
    const k = lerp(SPRING[0], SPRING[1], loose)
    const damp = Math.exp(-lerp(DAMPING[0], DAMPING[1], loose) * dt)
    // flowing materials drift fast, still ones slowly, but nothing stands still
    const push = FLOW * (0.15 + 0.85 * loose) * (0.5 + s.speed + s.drift * 0.4)
    const scale = lerp(2.4, 1.2, s.curve) // organic: broad swirls; rigid: tighter ones
    // the current itself keeps changing, so the particles never settle where it balances the spring
    const time = now * (0.16 + 0.2 * s.speed)
    const grain = s.structure === 'linear' ? 0.15 : 1 // linear: the current runs along the grain

    for (let i = 0; i < field.count; i++) {
      const x = xs[i]
      const y = ys[i]
      const a = flowNoise(x * scale, y * scale, time) * TAU * grain
      vx[i] = (vx[i] + ((tx[i] - x) * k + Math.cos(a) * push) * dt) * damp
      vy[i] = (vy[i] + ((ty[i] - y) * k + Math.sin(a) * push) * dt) * damp
      xs[i] = x + vx[i] * dt
      ys[i] = y + vy[i] * dt
    }
  }

  function drawLines(s, fadeIn) {
    if (!fadeIn) return
    const lines = field.lines
    ctx.lineWidth = 0.6 + (1 - s.curve) * 0.4
    ctx.lineCap = s.round > 0.5 ? 'round' : 'butt'
    const bend = s.curve * 0.25
    // lines in a few opacity levels (one path each, much faster than one per line)
    for (let level = 1; level <= ALPHA_LEVELS; level++) {
      const min = (level - 1) / ALPHA_LEVELS
      const max = level / ALPHA_LEVELS
      ctx.beginPath()
      let any = false
      for (let m = 0; m < lines.length; m += 2) {
        const i = lines[m]
        const j = lines[m + 1]
        const a = Math.min(alphas[i], alphas[j])
        if (a <= min || a > max) continue
        const ax = xs[i] * H
        const ay = ys[i] * H
        const bx = xs[j] * H
        const by = ys[j] * H
        const d = Math.hypot(bx - ax, by - ay)
        if (d > H * 0.1) continue // stretched too far (mid-morph, or roamed apart): don't draw
        ctx.moveTo(ax, ay)
        if (bend) {
          // organic: a gentle arc, always to the same side
          const mx = (ax + bx) / 2 - ((by - ay) / (d || 1)) * d * bend
          const my = (ay + by) / 2 + ((bx - ax) / (d || 1)) * d * bend
          ctx.quadraticCurveTo(mx, my, bx, by)
        } else ctx.lineTo(bx, by)
        any = true
      }
      if (!any) continue
      ctx.strokeStyle = rgba(COLORS.blue, max * 0.55 * fadeIn * (0.4 + s.opacity * 0.6))
      ctx.stroke()
    }
  }

  // While loose: dots that roam close to each other join with a line, like
  // tests/dots-lines. Each dot links to its nearest one or two.
  const cells = new Map()
  const buckets = Array.from({ length: ALPHA_LEVELS }, () => [])
  function drawNearLines(s, loose) {
    cells.clear()
    for (let i = 0; i < field.count; i++) {
      if (alphas[i] < 0.2) continue
      const key = Math.floor(xs[i] / REACH) * 4096 + Math.floor(ys[i] / REACH)
      let cell = cells.get(key)
      if (!cell) cells.set(key, (cell = []))
      cell.push(i)
    }
    for (const b of buckets) b.length = 0
    const links = s.count > 0.7 ? 1 : 2 // dense fields have plenty of lines already
    for (let i = 0; i < field.count; i++) {
      if (alphas[i] < 0.2) continue
      const cx = Math.floor(xs[i] / REACH)
      const cy = Math.floor(ys[i] / REACH)
      let best = [Infinity, -1, Infinity, -1]
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = cells.get((cx + ox) * 4096 + cy + oy)
          if (!cell) continue
          for (const j of cell) {
            if (j <= i) continue // each pair once
            const d = Math.hypot(xs[j] - xs[i], ys[j] - ys[i])
            if (d > REACH) continue
            if (d < best[0]) best = [d, j, best[0], best[1]]
            else if (d < best[2]) best = [best[0], best[1], d, j]
          }
        }
      }
      for (let k = 0; k < links * 2; k += 2) {
        if (best[k + 1] < 0) break
        const strength = 1 - best[k] / REACH
        buckets[Math.min(ALPHA_LEVELS - 1, Math.floor(strength * ALPHA_LEVELS))].push(i, best[k + 1])
      }
    }
    ctx.lineWidth = 0.5
    ctx.lineCap = 'round'
    buckets.forEach((list, level) => {
      if (!list.length) return
      ctx.strokeStyle = rgba(COLORS.blue, ((level + 1) / ALPHA_LEVELS) * 0.5 * loose * (0.4 + s.opacity * 0.6))
      ctx.beginPath()
      for (let m = 0; m < list.length; m += 2) {
        ctx.moveTo(xs[list[m]] * H, ys[list[m]] * H)
        ctx.lineTo(xs[list[m + 1]] * H, ys[list[m + 1]] * H)
      }
      ctx.stroke()
    })
  }

  function drawDots(s) {
    const base = (H / 900) * lerp(1.3, 2.1, s.round)
    const square = s.round < 0.5

    // translucent: a blue haze around every dot
    if (s.glow > 0.05) {
      ctx.fillStyle = rgba(COLORS.blue, s.glow * 0.08)
      ctx.beginPath()
      for (let i = 0; i < field.count; i++) {
        if (alphas[i] < 0.2) continue
        const r = base * 5 * (1 + field.size[i])
        ctx.moveTo(xs[i] * H + r, ys[i] * H)
        ctx.arc(xs[i] * H, ys[i] * H, r, 0, TAU)
      }
      ctx.fill()
    }

    for (let level = 1; level <= ALPHA_LEVELS; level++) {
      const min = (level - 1) / ALPHA_LEVELS
      const max = level / ALPHA_LEVELS
      ctx.beginPath()
      for (let i = 0; i < field.count; i++) {
        if (alphas[i] <= min || alphas[i] > max) continue
        const r = base * (1 + field.size[i] * 1.5) * (1 - field.depth[i] * 0.3)
        const x = xs[i] * H
        const y = ys[i] * H
        if (square) ctx.rect(x - r, y - r, r * 2, r * 2)
        else {
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, TAU)
        }
      }
      const a = max * s.opacity
      // transparent: outlines only, you see through the particles
      if (s.outline > 0.5) {
        ctx.strokeStyle = rgba(COLORS.dot, a)
        ctx.lineWidth = 0.8
        ctx.stroke()
      } else {
        ctx.fillStyle = rgba(COLORS.dot, a)
        ctx.fill()
      }
    }
  }

  addEventListener('resize', resize)
  resize()
  const dispose = () => removeEventListener('resize', resize)
  return { show, frame, dispose }
}
