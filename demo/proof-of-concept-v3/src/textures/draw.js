// Drawing helpers shared by the texture families (families.js). Everything
// draws on a SIZE × SIZE canvas that tiles seamlessly.

export const SIZE = 512

// --- colour ---------------------------------------------------------------

export function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Lighter (amount > 0) or darker (amount < 0), towards white or black.
export function shade(hex, amount) {
  const target = amount > 0 ? 255 : 0
  const t = Math.min(1, Math.abs(amount))
  const [r, g, b] = rgbOf(hex).map((c) => Math.round(c + (target - c) * t))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// "r,g,b" for rgba() strings.
export const rgbList = (hex) => rgbOf(hex).join(',')

export const rgba = (hex, alpha) => `rgba(${rgbList(hex)},${alpha})`

// --- shapes ---------------------------------------------------------------

export function fill(ctx, color) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, SIZE, SIZE)
}

export function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// Draws a shape again on the opposite edges when it overlaps them, keeping the tile seamless.
export function wrapped(x, y, r, draw) {
  for (const dx of [-SIZE, 0, SIZE]) {
    for (const dy of [-SIZE, 0, SIZE]) {
      const px = x + dx
      const py = y + dy
      if (px + r >= 0 && px - r <= SIZE && py + r >= 0 && py - r <= SIZE) draw(px, py)
    }
  }
}

export function blotch(ctx, x, y, r, rgb, alpha) {
  wrapped(x, y, r, (px, py) => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, `rgba(${rgb},${alpha})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(px - r, py - r, r * 2, r * 2)
  })
}

export function speckle(ctx, rand, count, alpha) {
  for (let i = 0; i < count; i++) {
    const light = rand() > 0.5
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(40,35,30,${alpha})`
    const s = rand() > 0.9 ? 2 : 1
    ctx.fillRect(Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), s, s)
  }
}

// A filled polygon around (x, y): `sides` corners at radius r, each jittered.
export function chip(ctx, rand, x, y, r, color, { sides = 5, stretch = 1 } = {}) {
  const n = sides + Math.floor(rand() * 2)
  const rot = rand() * Math.PI
  const jitter = Array.from({ length: n }, () => 0.6 + rand() * 0.5)
  wrapped(x, y, r * stretch, (px, py) => {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let k = 0; k < n; k++) {
      const a = rot + (k / n) * Math.PI * 2
      ctx.lineTo(px + Math.cos(a) * r * stretch * jitter[k], py + Math.sin(a) * r * jitter[k])
    }
    ctx.fill()
  })
}

// Wavy grain lines across a band (y0…y0 + h). The wave period divides the
// width, so the tile repeats cleanly.
export function grain(ctx, rand, y0, h, color, { lines = 26, strength = 1, amp = 3 } = {}) {
  if (strength <= 0) return
  const dark = rgba(shade(color, -0.6), 0.14 * strength)
  const light = rgba(shade(color, 0.5), 0.1 * strength)
  for (let g = 0; g < lines; g++) {
    const base = y0 + rand() * h
    const a = 1 + rand() * amp
    const freq = 1 + Math.floor(rand() * 3)
    const phase = rand() * Math.PI * 2
    ctx.strokeStyle = rand() > 0.5 ? dark : light
    ctx.lineWidth = 0.5 + rand() * 1.5
    ctx.beginPath()
    for (let x = 0; x <= SIZE; x += 8) {
      const y = base + Math.sin((x / SIZE) * Math.PI * 2 * freq + phase) * a
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

// --- randomness -----------------------------------------------------------

export function seededRandom(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h
}
