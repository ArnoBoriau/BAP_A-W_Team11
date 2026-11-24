// Draws a field on a 2D canvas: dots, and lines along the strands.
// Colours: black, white and one blue (the A@W palette from the board).
// A new field doesn't snap in: every particle flies from where a particle of
// the old field was to its new home (the morph), then the lines fade in.
//
// The engine (src/engine) doesn't know about canvases, so this file can later
// be swapped for a react-three-fiber renderer (board step 7: useFrame).

import { buildField } from '../engine/build.js'
import { place } from '../engine/motion.js'

export const COLORS = { bg: '#000000', dot: [255, 255, 255], blue: [43, 92, 255] }
const MAX = 2400
const MORPH = 1.8 // seconds
const ALPHA_LEVELS = 6

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')
  let W = 0
  let H = 0
  let field = null
  let recipe = null
  let started = 0 // when the current move arrived (seconds)

  // where every particle is now (screen units), and where it came from
  const xs = new Float32Array(MAX)
  const ys = new Float32Array(MAX)
  const alphas = new Float32Array(MAX)
  const fromX = new Float32Array(MAX)
  const fromY = new Float32Array(MAX)
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

  // A new move: build its field, start the morph from what's on screen now.
  function show(nextRecipe, now) {
    const next = buildField(nextRecipe, W / H)
    for (let i = 0; i < next.count; i++) {
      if (shownCount) {
        const j = i % shownCount
        fromX[i] = xs[j]
        fromY[i] = ys[j]
      } else {
        // first move: come in from the centre
        fromX[i] = next.w / 2
        fromY[i] = 0.5
      }
    }
    field = next
    recipe = nextRecipe
    started = now
  }

  function frame(now) {
    if (!field) return
    const t = now - started
    const s = field.recipe.settings
    place(field, t, xs, ys, alphas)

    // the morph: from the old positions to the new ones, each particle a bit later than the last
    const morphing = t < MORPH + 0.6
    if (morphing) {
      for (let i = 0; i < field.count; i++) {
        const k = ease(Math.min(1, Math.max(0, (t - field.phase[i] * 0.6) / MORPH)))
        xs[i] = lerp(fromX[i], xs[i], k)
        ys[i] = lerp(fromY[i], ys[i], k)
      }
    }
    shownCount = field.count

    // trails: flowing things leave a trace, still and rigid things stay crisp
    ctx.fillStyle = `rgba(0, 0, 0, ${lerp(0.75, 0.22, s.drift).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)

    const lineIn = Math.min(1, Math.max(0, (t - MORPH * 0.6) / MORPH))
    drawLines(s, lineIn)
    drawDots(s)
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
        if (d > H * 0.08) continue // stretched too far (mid-morph): don't draw
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
        ctx.arc(xs[i] * H, ys[i] * H, r, 0, Math.PI * 2)
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
          ctx.arc(x, y, r, 0, Math.PI * 2)
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
  return { show, frame }
}
