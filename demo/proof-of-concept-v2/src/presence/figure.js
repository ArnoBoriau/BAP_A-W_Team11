// Turns 17 joint positions into an abstract, faceless figure: a round head,
// a soft torso and rounded limbs, drawn solid and then blurred into a glow.
// You can read posture, nodding, waving, leaning in — not who it is.

import { KEYPOINTS } from './tracking'

const MIN_CONF = 0.3
const FOLLOW = 12 // how fast the drawn figure catches up with the tracked one (1/s)
const FADE = 4 // how fast joints fade in/out (1/s)

const NOSE = 0
const FACE = [0, 1, 2, 3, 4]
const [LS, RS, LE, RE, LW, RW, LH, RH, LK, RK, LA, RA] = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

export function createFigure() {
  const pos = new Float32Array(KEYPOINTS * 2)
  const conf = new Float32Array(KEYPOINTS)
  let seen = false
  let aspect = 4 / 3
  const layer = document.createElement('canvas')

  // Ease the drawn figure towards the latest pose: hides tracking jitter
  // and the 20 fps of the link.
  function update(points, pointsAspect, dt) {
    if (pointsAspect) aspect = pointsAspect
    const follow = 1 - Math.exp(-dt * FOLLOW)
    const fade = 1 - Math.exp(-dt * FADE)
    for (let i = 0; i < KEYPOINTS; i++) {
      const c = points ? points[i * 3 + 2] : 0
      if (points && c >= MIN_CONF) {
        const x = points[i * 3]
        const y = points[i * 3 + 1]
        // A joint that just appeared jumps in place instead of flying in.
        const jump = !seen || conf[i] < 0.05
        pos[i * 2] = jump ? x : pos[i * 2] + (x - pos[i * 2]) * follow
        pos[i * 2 + 1] = jump ? y : pos[i * 2 + 1] + (y - pos[i * 2 + 1]) * follow
      }
      conf[i] += ((points && c >= MIN_CONF ? 1 : 0) - conf[i]) * fade
    }
    if (points) seen = true
  }

  // How much of a person is visible right now (0…1), used for the fade.
  function presence() {
    return Math.max(conf[LS], conf[RS], conf[NOSE])
  }

  function draw(canvas, { color, background, idle = 0, time = 0 }) {
    const ctx = fit(canvas)
    const { width: w, height: h } = canvas
    ctx.globalAlpha = 1
    ctx.filter = 'none'
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)

    // Nobody in view: a slow breathing dot, so the tile never looks broken.
    if (idle > 0) {
      const r = Math.min(w, h) * (0.1 + 0.015 * Math.sin(time * 1.6))
      ctx.globalAlpha = idle * 0.35
      ctx.filter = `blur(${r * 0.5}px)`
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const alpha = presence()
    if (alpha < 0.02) return

    // Camera frame → tile: "cover", like a video call.
    const s = Math.max(w / aspect, h)
    const P = (i) => [w / 2 + (pos[i * 2] - 0.5) * aspect * s, h / 2 + (pos[i * 2 + 1] - 0.5) * s]
    const ok = (i) => conf[i] > 0.5
    const unit = bodyUnit(P, ok, h)

    // 1. the body as solid shapes on a separate layer (overlaps don't add up)
    layer.width = w
    layer.height = h
    const g = layer.getContext('2d')
    g.fillStyle = g.strokeStyle = color
    g.lineCap = g.lineJoin = 'round'
    shapeBody(g, P, ok, unit)

    // 2. that layer onto the tile twice: a wide glow, then a softened core.
    ctx.globalAlpha = alpha * 0.55
    ctx.filter = `blur(${unit * 0.35}px)`
    ctx.drawImage(layer, 0, 0)
    ctx.globalAlpha = alpha
    ctx.filter = `blur(${unit * 0.09 + 1}px)`
    ctx.drawImage(layer, 0, 0)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
  }

  return { update, draw, presence }
}

// Shoulder width in px: the yardstick for every other size, so the figure
// scales with how close the person stands.
function bodyUnit(P, ok, h) {
  if (ok(LS) && ok(RS)) return Math.max(dist(P(LS), P(RS)), h * 0.08)
  if (ok(3) && ok(4)) return dist(P(3), P(4)) * 2.4
  if (ok(1) && ok(2)) return dist(P(1), P(2)) * 4.5
  return h * 0.3
}

function shapeBody(g, P, ok, unit) {
  const shoulders = ok(LS) && ok(RS)

  // torso: shoulders to hips, or straight down when the hips are out of frame
  if (shoulders) {
    const [ls, rs] = [P(LS), P(RS)]
    const hips = ok(LH) && ok(RH)
    const down = unit * 1.5
    const lh = hips ? P(LH) : [ls[0] + unit * 0.08, ls[1] + down]
    const rh = hips ? P(RH) : [rs[0] - unit * 0.08, rs[1] + down]
    g.lineWidth = unit * 0.3
    g.beginPath()
    g.moveTo(...ls)
    g.lineTo(...rs)
    g.lineTo(...rh)
    g.lineTo(...lh)
    g.closePath()
    g.fill()
    g.stroke()
  }

  // head: one round shape, placed on the face points (never the face itself)
  const face = FACE.filter(ok).map(P)
  if (face.length) {
    const cx = face.reduce((a, p) => a + p[0], 0) / face.length
    const cy = face.reduce((a, p) => a + p[1], 0) / face.length - unit * 0.06
    if (shoulders) {
      const mid = mix(P(LS), P(RS))
      limb(g, mid, [cx, cy], unit * 0.26) // neck
    }
    g.beginPath()
    g.ellipse(cx, cy, unit * 0.27, unit * 0.33, 0, 0, Math.PI * 2)
    g.fill()
  }

  // arms and legs
  const chain = (a, b, c, wAB, wBC) => {
    if (!ok(a) || !ok(b)) return
    limb(g, P(a), P(b), unit * wAB)
    if (ok(c)) limb(g, P(b), P(c), unit * wBC)
  }
  chain(LS, LE, LW, 0.22, 0.18)
  chain(RS, RE, RW, 0.22, 0.18)
  chain(LH, LK, LA, 0.28, 0.22)
  chain(RH, RK, RA, 0.28, 0.22)
  for (const wrist of [LW, RW]) {
    if (!ok(wrist)) continue
    g.beginPath()
    g.arc(...P(wrist), unit * 0.13, 0, Math.PI * 2)
    g.fill()
  }
}

function limb(g, a, b, width) {
  g.lineWidth = width
  g.beginPath()
  g.moveTo(...a)
  g.lineTo(...b)
  g.stroke()
}

// Keep the canvas sharp on retina screens; returns its 2D context.
function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(canvas.clientWidth * dpr)
  const h = Math.round(canvas.clientHeight * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  return canvas.getContext('2d')
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const mix = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
