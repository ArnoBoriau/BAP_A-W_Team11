// Procedural, seamlessly tiling textures drawn on a canvas.
// No image assets needed, so the prototype runs offline and stays small.
// Each canvas is generated once and cached; the same canvas also feeds the UI swatches.

import * as THREE from 'three'

const SIZE = 512

const painters = {
  plaster(ctx, rand) {
    fill(ctx, '#efebe5')
    for (let i = 0; i < 40; i++) {
      blotch(ctx, rand() * SIZE, rand() * SIZE, 40 + rand() * 90, rand() > 0.5 ? '255,255,255' : '180,170,160', 0.035)
    }
    speckle(ctx, rand, 7000, 0.05)
  },

  concrete(ctx, rand) {
    fill(ctx, '#aeaba5')
    for (let i = 0; i < 70; i++) {
      blotch(ctx, rand() * SIZE, rand() * SIZE, 30 + rand() * 110, rand() > 0.5 ? '230,228,222' : '110,106,100', 0.08)
    }
    speckle(ctx, rand, 14000, 0.18)
    // Formwork panel seams on the tile border (shows up as a grid once repeated).
    ctx.fillStyle = 'rgba(70,66,60,0.35)'
    ctx.fillRect(0, 0, SIZE, 2)
    ctx.fillRect(0, 0, 2, SIZE)
    // Tie holes, 3 × 2 per panel.
    for (const fx of [1 / 6, 3 / 6, 5 / 6]) {
      for (const fy of [1 / 4, 3 / 4]) {
        const x = fx * SIZE
        const y = fy * SIZE
        ctx.fillStyle = 'rgba(235,232,226,0.6)'
        circle(ctx, x, y, 9)
        ctx.fillStyle = 'rgba(60,56,52,0.85)'
        circle(ctx, x, y, 6)
      }
    }
  },

  wood(ctx, rand) {
    const planks = 6
    const h = SIZE / planks
    const tones = ['#b8946c', '#b18e66', '#bc9871', '#ad8a62', '#b5916a']
    for (let p = 0; p < planks; p++) {
      const y0 = p * h
      // Two staggered boards per row, each with its own tone, so rows don't read as stripes.
      const joint = Math.floor(rand() * SIZE)
      for (const [start, len] of [[joint, SIZE / 2], [joint + SIZE / 2, SIZE / 2]]) {
        ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
        ctx.fillRect(start % SIZE, y0, len, h)
        ctx.fillRect((start % SIZE) - SIZE, y0, len, h) // wrap-around part
        ctx.fillStyle = 'rgba(60,38,20,0.75)'
        ctx.fillRect(start % SIZE, y0, 2, h)
      }
      // Grain: wavy lines whose period divides the width, so the tile repeats cleanly.
      for (let g = 0; g < 26; g++) {
        const base = y0 + rand() * h
        const amp = 1 + rand() * 3
        const freq = 1 + Math.floor(rand() * 3)
        const phase = rand() * Math.PI * 2
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(90,55,25,0.14)' : 'rgba(255,235,200,0.10)'
        ctx.lineWidth = 0.5 + rand() * 1.5
        ctx.beginPath()
        for (let x = 0; x <= SIZE; x += 8) {
          const y = base + Math.sin((x / SIZE) * Math.PI * 2 * freq + phase) * amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // Gap between rows.
      ctx.fillStyle = 'rgba(60,38,20,0.75)'
      ctx.fillRect(0, y0, SIZE, 2)
    }
  },

  tiles(ctx, rand) {
    const n = 4
    const cell = SIZE / n
    const grout = 4
    fill(ctx, '#dcd8d1')
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = Math.floor(238 + rand() * 12)
        const x = i * cell + grout / 2
        const y = j * cell + grout / 2
        const s = cell - grout
        ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`
        ctx.fillRect(x, y, s, s)
        // Soft glaze highlight.
        const g = ctx.createLinearGradient(x, y, x + s, y + s)
        g.addColorStop(0, 'rgba(255,255,255,0.35)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(x, y, s, s)
      }
    }
  },

  terrazzo(ctx, rand) {
    fill(ctx, '#e9e3d9')
    speckle(ctx, rand, 5000, 0.06)
    const chips = ['#b8afa2', '#8d8780', '#c98563', '#7d8b80', '#ffffff', '#d9c6a5']
    for (let i = 0; i < 900; i++) {
      const x = rand() * SIZE
      const y = rand() * SIZE
      const r = 2 + Math.pow(rand(), 2.5) * 14
      const color = chips[Math.floor(rand() * chips.length)]
      const sides = 4 + Math.floor(rand() * 3)
      const rot = rand() * Math.PI
      const jitter = Array.from({ length: sides }, () => 0.6 + rand() * 0.5)
      wrapped(x, y, r, (px, py) => {
        ctx.fillStyle = color
        ctx.beginPath()
        for (let k = 0; k < sides; k++) {
          const a = rot + (k / sides) * Math.PI * 2
          ctx.lineTo(px + Math.cos(a) * r * jitter[k], py + Math.sin(a) * r * jitter[k])
        }
        ctx.fill()
      })
    }
  },
}

// --- public API -----------------------------------------------------------

const canvasCache = new Map()
const textureCache = new Map()
const swatchCache = new Map()

export function getPatternCanvas(id) {
  if (!canvasCache.has(id)) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    painters[id](canvas.getContext('2d'), seededRandom(hash(id)))
    canvasCache.set(id, canvas)
  }
  return canvasCache.get(id)
}

/** Shared base texture. Clone it per surface to set an individual repeat. */
export function getPatternTexture(id) {
  if (!textureCache.has(id)) {
    const texture = new THREE.CanvasTexture(getPatternCanvas(id))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    textureCache.set(id, texture)
  }
  return textureCache.get(id)
}

export function getPatternSwatch(id) {
  if (!swatchCache.has(id)) swatchCache.set(id, getPatternCanvas(id).toDataURL('image/jpeg', 0.85))
  return swatchCache.get(id)
}

// --- drawing helpers ------------------------------------------------------

function fill(ctx, color) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, SIZE, SIZE)
}

function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// Draws a shape again on the opposite edges when it overlaps them, keeping the tile seamless.
function wrapped(x, y, r, draw) {
  for (const dx of [-SIZE, 0, SIZE]) {
    for (const dy of [-SIZE, 0, SIZE]) {
      const px = x + dx
      const py = y + dy
      if (px + r >= 0 && px - r <= SIZE && py + r >= 0 && py - r <= SIZE) draw(px, py)
    }
  }
}

function blotch(ctx, x, y, r, rgb, alpha) {
  wrapped(x, y, r, (px, py) => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, `rgba(${rgb},${alpha})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(px - r, py - r, r * 2, r * 2)
  })
}

function speckle(ctx, rand, count, alpha) {
  for (let i = 0; i < count; i++) {
    const light = rand() > 0.5
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(40,35,30,${alpha})`
    const s = rand() > 0.9 ? 2 : 1
    ctx.fillRect(Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), s, s)
  }
}

function seededRandom(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h
}
