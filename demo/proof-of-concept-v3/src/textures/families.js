// Texture families: one painter per kind of look. A material's row (see
// src/data/README.md) names its family and gives the colour and settings, so
// thirty woods share one `planks` painter and still each look like themselves.
//
//   paint(ctx, rand, row)  draws one seamless tile; `row.color` is the base
//                          colour, `row.params` the family's settings
//   swatch(row)            optional: a CSS background for families without a
//                          texture (glass)
//
// To add a family: add a painter here and use its name in a row's `family`.

import { SIZE, blotch, chip, circle, fill, grain, rgbOf, rgba, shade, speckle, wrapped } from './draw'

const pick = (rand, list) => list[Math.floor(rand() * list.length)]

// A few tones around the base colour, so boards and chips don't all look the same.
const tonesOf = (color, variance = 1, count = 5) =>
  Array.from({ length: count }, (_, i) => shade(color, ((i / (count - 1)) * 2 - 1) * 0.05 * variance))

export const FAMILIES = {
  // --- wood -----------------------------------------------------------------

  // Boards in rows, staggered joints, grain. params: boards (rows per tile),
  // grain (contrast), knots (0…1, how many), streaks (0…1, dark bands:
  // wenge, ebony), variance (tone difference between boards).
  planks: {
    paint(ctx, rand, { color, params: p }) {
      const boards = p.boards ?? 6
      const h = SIZE / boards
      const tones = tonesOf(color, p.variance ?? 1)
      const joint = rgba(shade(color, -0.65), 0.75)
      for (let b = 0; b < boards; b++) {
        const y0 = b * h
        const start = Math.floor(rand() * SIZE)
        for (const s of [start, start + SIZE / 2]) {
          ctx.fillStyle = pick(rand, tones)
          ctx.fillRect(s % SIZE, y0, SIZE / 2, h)
          ctx.fillRect((s % SIZE) - SIZE, y0, SIZE / 2, h) // wrap-around part
          ctx.fillStyle = joint
          ctx.fillRect(s % SIZE, y0, 2, h)
        }
        streaks(ctx, rand, y0, h, color, p.streaks ?? 0)
        grain(ctx, rand, y0, h, color, { strength: p.grain ?? 1 })
        knots(ctx, rand, y0, h, color, p.knots ?? 0)
        ctx.fillStyle = joint
        ctx.fillRect(0, y0, SIZE, 2)
      }
    },
  },

  // Large sheets (plywood, veneer): one wide face with flowing grain, the
  // sheet edge on the tile border. params: figure (how wavy the grain is).
  sheet: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      const figure = p.figure ?? 1
      for (let i = 0; i < 8; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 60 + rand() * 120, '255,240,215', 0.06)
      grain(ctx, rand, 0, SIZE, color, { lines: 90, strength: 1.2, amp: 4 + figure * 10 })
      ctx.fillStyle = rgba(shade(color, -0.6), 0.6)
      ctx.fillRect(0, 0, SIZE, 2)
      ctx.fillRect(0, 0, 2, SIZE)
    },
  },

  // Glued lamellas (glulam, CLT, laminated wood): narrow strips stacked,
  // each its own tone, with finger joints. params: lamellas (strips per tile).
  lamella: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.lamellas ?? 8
      const h = SIZE / n
      const tones = tonesOf(color, 1.6)
      for (let i = 0; i < n; i++) {
        const y0 = i * h
        ctx.fillStyle = pick(rand, tones)
        ctx.fillRect(0, y0, SIZE, h)
        grain(ctx, rand, y0, h, color, { lines: 6, strength: 1, amp: 1.5 })
        // a finger joint somewhere along the strip
        const x = Math.floor(rand() * SIZE)
        ctx.strokeStyle = rgba(shade(color, -0.5), 0.35)
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let k = 0; k <= 6; k++) ctx.lineTo(x + (k % 2 ? 6 : 0), y0 + (k / 6) * h)
        ctx.stroke()
        ctx.fillStyle = rgba(shade(color, -0.55), 0.5)
        ctx.fillRect(0, y0, SIZE, 1)
      }
    },
  },

  // Bamboo strips: narrow boards with the nodes as lighter bands. Thin and
  // many of them, the same painter draws reed and thatch. params: strips
  // (per tile, 12 by default).
  bamboo: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.strips ?? 12
      const h = SIZE / n
      const tones = tonesOf(color, 1.2)
      for (let i = 0; i < n; i++) {
        const y0 = i * h
        ctx.fillStyle = pick(rand, tones)
        ctx.fillRect(0, y0, SIZE, h)
        grain(ctx, rand, y0, h, color, { lines: 5, strength: 0.6, amp: 0.5 })
        // nodes: two per strip, wrapping
        for (let k = 0; k < 2; k++) {
          const x = (rand() * SIZE) | 0
          for (const dx of [0, -SIZE]) {
            ctx.fillStyle = rgba(shade(color, -0.35), 0.5)
            ctx.fillRect(x + dx, y0, 3, h)
            ctx.fillStyle = rgba(shade(color, 0.3), 0.4)
            ctx.fillRect(x + dx + 3, y0, 5, h)
          }
        }
        ctx.fillStyle = rgba(shade(color, -0.6), 0.6)
        ctx.fillRect(0, y0, SIZE, 1)
      }
    },
  },

  // Cork: dense granules in a few tones.
  cork: {
    paint(ctx, rand, { color }) {
      fill(ctx, shade(color, -0.1))
      const tones = [shade(color, -0.3), shade(color, -0.12), color, shade(color, 0.12), shade(color, 0.25)]
      for (let i = 0; i < 6000; i++) {
        chip(ctx, rand, rand() * SIZE, rand() * SIZE, 1.5 + rand() * 4, pick(rand, tones), { sides: 5 })
      }
    },
  },

  // OSB: large flat strands, every which way, in a few tones.
  osb: {
    paint(ctx, rand, { color }) {
      fill(ctx, shade(color, -0.15))
      const tones = [shade(color, -0.2), shade(color, -0.08), color, shade(color, 0.1), shade(color, 0.2)]
      for (let i = 0; i < 700; i++) {
        const x = rand() * SIZE
        const y = rand() * SIZE
        const len = 25 + rand() * 45
        const w = 6 + rand() * 10
        const a = rand() * Math.PI
        const tone = pick(rand, tones)
        wrapped(x, y, len, (px, py) => {
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(a)
          ctx.fillStyle = tone
          ctx.fillRect(-len / 2, -w / 2, len, w)
          ctx.strokeStyle = rgba(shade(color, -0.55), 0.25)
          ctx.lineWidth = 0.6
          ctx.strokeRect(-len / 2, -w / 2, len, w)
          ctx.restore()
        })
      }
    },
  },

  // Particleboard: fine chips pressed together.
  chipboard: {
    paint(ctx, rand, { color }) {
      fill(ctx, color)
      const tones = [shade(color, -0.25), shade(color, -0.1), shade(color, 0.1), shade(color, 0.2)]
      for (let i = 0; i < 9000; i++) {
        chip(ctx, rand, rand() * SIZE, rand() * SIZE, 1 + rand() * 3.5, pick(rand, tones), { sides: 4, stretch: 1 + rand() * 1.5 })
      }
    },
  },

  // MDF: smooth and even, only a fine fibre texture and the sheet edge.
  mdf: {
    paint(ctx, rand, { color }) {
      fill(ctx, color)
      for (let i = 0; i < 30; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 50 + rand() * 100, '255,240,220', 0.04)
      speckle(ctx, rand, 20000, 0.06)
      ctx.fillStyle = rgba(shade(color, -0.5), 0.5)
      ctx.fillRect(0, 0, SIZE, 2)
      ctx.fillRect(0, 0, 2, SIZE)
    },
  },

  // --- mineral ----------------------------------------------------------------

  plaster: {
    paint(ctx, rand, { color }) {
      fill(ctx, color)
      for (let i = 0; i < 40; i++) {
        blotch(ctx, rand() * SIZE, rand() * SIZE, 40 + rand() * 90, rand() > 0.5 ? '255,255,255' : '180,170,160', 0.035)
      }
      speckle(ctx, rand, 7000, 0.05)
    },
  },

  // Cast concrete: cloudy and speckled. params: clouds, speckle (0…, how
  // strong), seams (formwork panel edges, default on), holes (tie holes:
  // [columns, rows], default [3, 2]; false for none), bugholes (0…, small air
  // holes), fibres (0…, short fibres), trowel (arcs of a trowelled floor),
  // stains (colours: acid-stained patches), aggregate (colours: polished-off
  // stone specks).
  concrete: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      const cloud = p.clouds ?? 1
      for (let i = 0; i < 70; i++) {
        blotch(ctx, rand() * SIZE, rand() * SIZE, 30 + rand() * 110, rand() > 0.5 ? '230,228,222' : '110,106,100', 0.08 * cloud)
      }
      for (const stain of p.stains ?? []) {
        for (let i = 0; i < 12; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 60 + rand() * 120, rgbOf(stain).join(','), 0.22)
      }
      if (p.trowel) {
        for (let i = 0; i < 140; i++) {
          const r = 30 + rand() * 80
          const a = rand() * Math.PI * 2
          ctx.strokeStyle = rgba(shade(color, rand() > 0.5 ? 0.25 : -0.2), 0.16)
          ctx.lineWidth = 2 + rand() * 6
          wrapped(rand() * SIZE, rand() * SIZE, r, (px, py) => {
            ctx.beginPath()
            ctx.arc(px, py, r, a, a + 0.6 + rand() * 0.8)
            ctx.stroke()
          })
        }
      }
      speckle(ctx, rand, 14000 * (p.speckle ?? 1), 0.18)
      if (p.aggregate) {
        for (let i = 0; i < 2500; i++) chip(ctx, rand, rand() * SIZE, rand() * SIZE, 0.8 + Math.pow(rand(), 3) * 4, pick(rand, p.aggregate), { sides: 4 })
      }
      if (p.fibres) {
        ctx.strokeStyle = rgba(shade(color, -0.45), 0.7)
        ctx.lineWidth = 1.2
        for (let i = 0; i < 600 * p.fibres; i++) {
          const len = 10 + rand() * 18
          const a = rand() * Math.PI
          wrapped(rand() * SIZE, rand() * SIZE, len, (px, py) => {
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len)
            ctx.stroke()
          })
        }
      }
      if (p.bugholes) {
        for (let i = 0; i < 300 * p.bugholes; i++) {
          const x = rand() * SIZE
          const y = rand() * SIZE
          const r = 0.8 + Math.pow(rand(), 2) * 2.5
          ctx.fillStyle = rgba(shade(color, 0.3), 0.5)
          circle(ctx, x, y + 0.8, r)
          ctx.fillStyle = rgba(shade(color, -0.5), 0.8)
          circle(ctx, x, y, r)
        }
      }
      if (p.seams ?? true) {
        ctx.fillStyle = rgba(shade(color, -0.4), 0.35)
        ctx.fillRect(0, 0, SIZE, 2)
        ctx.fillRect(0, 0, 2, SIZE)
      }
      const holes = p.holes ?? [3, 2]
      if (holes) {
        const [cols, rows] = holes
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = ((i + 0.5) / cols) * SIZE
            const y = ((j + 0.5) / rows) * SIZE
            ctx.fillStyle = rgba(shade(color, 0.35), 0.6)
            circle(ctx, x, y, 9)
            ctx.fillStyle = rgba(shade(color, -0.55), 0.85)
            circle(ctx, x, y, 6)
          }
        }
      }
    },
  },

  // Patterned cement tiles (encaustic tiles): a motif in two colours on a
  // light base, quarter circles that join into rings across tiles and a
  // diamond in the middle. params: colors ([rings, diamond]), tiles (per row).
  motif: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.tiles ?? 4
      const cell = SIZE / n
      const [ring, centre] = p.colors ?? [shade(color, -0.5), shade(color, -0.3)]
      fill(ctx, color)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = i * cell
          const y = j * cell
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, cell, cell)
          ctx.clip()
          ctx.fillStyle = ring
          for (const [cx, cy] of [[x, y], [x + cell, y], [x, y + cell], [x + cell, y + cell]]) {
            ctx.beginPath()
            ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = color
          for (const [cx, cy] of [[x, y], [x + cell, y], [x, y + cell], [x + cell, y + cell]]) {
            ctx.beginPath()
            ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = centre
          ctx.beginPath()
          ctx.moveTo(x + cell / 2, y + cell * 0.22)
          ctx.lineTo(x + cell * 0.78, y + cell / 2)
          ctx.lineTo(x + cell / 2, y + cell * 0.78)
          ctx.lineTo(x + cell * 0.22, y + cell / 2)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }
      // cement: soft clouds, worn specks, and the joints
      for (let i = 0; i < 40; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 30 + rand() * 80, '255,255,255', 0.06)
      speckle(ctx, rand, 8000, 0.08)
      ctx.fillStyle = rgba(shade(color, -0.35), 0.7)
      for (let i = 0; i < n; i++) {
        ctx.fillRect(i * cell, 0, 2, SIZE)
        ctx.fillRect(0, i * cell, SIZE, 2)
      }
    },
  },

  terrazzo: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      speckle(ctx, rand, 5000, 0.06)
      // params: chips (colours), count, size (largest chip radius, px). Big
      // chips and few of them read as breccia.
      const chips = p.chips ?? ['#b8afa2', '#8d8780', '#c98563', '#7d8b80', '#ffffff', '#d9c6a5']
      const size = p.size ?? 14
      for (let i = 0; i < (p.count ?? 900); i++) {
        chip(ctx, rand, rand() * SIZE, rand() * SIZE, 2 + Math.pow(rand(), 2.5) * size, pick(rand, chips), { sides: 4 })
      }
    },
  },

  // Square tiles with grout. params: tiles (per row), grout (colour), gap
  // (joint width, px), variance (how much the tiles differ in tone: 4 for
  // handmade zellige), glaze (0…1, the shine across each tile: 0 for
  // unglazed), speckle (0…, specks in the clay: stoneware, terracotta).
  tiles: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.tiles ?? 4
      const cell = SIZE / n
      const gap = p.gap ?? 4
      const glaze = p.glaze ?? 1
      fill(ctx, p.grout ?? shade(color, -0.1))
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = i * cell + gap / 2
          const y = j * cell + gap / 2
          const s = cell - gap
          ctx.fillStyle = shade(color, (rand() - 0.5) * 0.06 * (p.variance ?? 1))
          ctx.fillRect(x, y, s, s)
          if (glaze > 0) {
            const g = ctx.createLinearGradient(x, y, x + s, y + s)
            g.addColorStop(0, `rgba(255,255,255,${0.35 * glaze})`)
            g.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.fillStyle = g
            ctx.fillRect(x, y, s, s)
          }
        }
      }
      if (p.speckle) speckle(ctx, rand, 9000 * p.speckle, 0.12)
    },
  },

  // Bricks in running bond with mortar joints (brick, clinker, fire brick,
  // clay blocks). params: courses (rows per tile), perCourse (bricks per row),
  // mortar (colour), variance (tone difference between bricks).
  brick: {
    paint(ctx, rand, { color, params: p }) {
      const courses = p.courses ?? 8
      const per = p.perCourse ?? 4
      const h = SIZE / courses
      const w = SIZE / per
      const joint = 5
      fill(ctx, p.mortar ?? shade(color, 0.35))
      speckle(ctx, rand, 4000, 0.1)
      for (let r = 0; r < courses; r++) {
        const offset = r % 2 ? w / 2 : 0
        // one tone per brick; the brick cut by the tile edge (c = -1 and c = per - 1)
        // is the same brick on both sides, so the texture repeats without a seam
        const tones = Array.from({ length: per }, () => shade(color, (rand() - 0.5) * 0.12 * (p.variance ?? 1)))
        for (let c = -1; c < per; c++) {
          const x = c * w + offset + joint / 2
          const y = r * h + joint / 2
          const bw = w - joint
          const bh = h - joint
          const tone = tones[(c + per) % per]
          ctx.fillStyle = tone
          ctx.fillRect(x, y, bw, bh)
          // a burnt edge and a few specks, so a brick isn't a flat block
          ctx.fillStyle = rgba(shade(color, -0.35), 0.25)
          ctx.fillRect(x, y + bh - 3, bw, 3)
          for (let k = 0; k < 40; k++) {
            ctx.fillStyle = rgba(shade(tone, rand() > 0.5 ? 0.25 : -0.3), 0.5)
            ctx.fillRect(x + rand() * bw, y + rand() * bh, 1.5, 1.5)
          }
        }
      }
    },
  },

  // --- stone ------------------------------------------------------------------

  // Veins on a cloudy base (marble, soapstone, alabaster). params: vein
  // (colour), veins (how many), soft (wider, fainter veins), bands (onyx:
  // flowing parallel bands instead of a calm base).
  veined: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 1)
      const vein = p.vein ?? shade(color, -0.4)
      if (p.bands) {
        const n = 22
        for (let i = 0; i < n; i++) {
          const tone = rand() > 0.5 ? shade(color, 0.08 + rand() * 0.1) : rgba(vein, 0.25 + rand() * 0.3)
          wave(ctx, rand, (i / n) * SIZE, tone, { width: 6 + rand() * 18, amp: 26, slope: 0 })
        }
      }
      // Veins run one way through the stone, like in a real slab: one main
      // direction, a few strong veins and many faint hairlines.
      const slope = pick(rand, [-1, 1, -0.5, 0.5])
      const n = p.veins ?? 6
      for (let i = 0; i < n * 3; i++) {
        const main = i < n
        const width = main ? (p.soft ? 3 : 1.8) * (0.6 + rand() * 0.8) : 0.5 + rand() * 0.6
        const strength = main ? (p.soft ? 0.4 : 0.7) : 0.2 + rand() * 0.15
        veinLine(ctx, rand, rand() * SIZE, vein, { width, strength, slope, halo: main })
      }
    },
  },

  // Crystals in a few colours (granite, basalt, porphyry). params: crystals
  // (colours), size (crystal size), density (0…1), bands (gneiss: crystals
  // gather in stretched bands), fossils (bluestone: small light specks).
  granular: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 0.6)
      const crystals = p.crystals ?? [shade(color, -0.4), shade(color, 0.3)]
      const size = p.size ?? 1
      const count = Math.round((p.density ?? 1) * Math.min(14000, 6000 / (size * size)))
      for (let i = 0; i < count; i++) {
        const x = rand() * SIZE
        const y = rand() * SIZE
        if (p.bands && rand() > 0.5 + 0.5 * Math.sin((y / SIZE) * Math.PI * 2 * 3 + Math.sin((x / SIZE) * Math.PI * 2) * 0.8)) continue
        chip(ctx, rand, x, y, (0.8 + rand() * 2.4) * size, pick(rand, crystals), { sides: 4, stretch: p.bands ? 2 : 1 })
      }
      if (p.fossils) specks(ctx, rand, shade(color, 0.35), 160 * p.fossils, 1.2)
    },
  },

  // Sedimentary stone (limestone, sandstone, travertine, pumice). params:
  // layers (bedding, 0…), pores (0…, how many holes), elongated (travertine:
  // long horizontal voids), fossils (small shells and specks).
  sediment: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 1)
      const layers = p.layers ?? 0
      for (let i = 0; i < Math.round(layers * 14); i++) {
        const tone = rgba(shade(color, rand() > 0.5 ? 0.12 : -0.12), 0.12 + rand() * 0.12)
        wave(ctx, rand, rand() * SIZE, tone, { width: 3 + rand() * 18, amp: 6, slope: 0 })
      }
      speckle(ctx, rand, 9000, 0.08)
      if (p.fossils) {
        for (let i = 0; i < 50 * p.fossils; i++) {
          const x = rand() * SIZE
          const y = rand() * SIZE
          const r = 2 + rand() * 5
          ctx.strokeStyle = rgba(shade(color, -0.3), 0.35)
          ctx.lineWidth = 1
          wrapped(x, y, r, (px, py) => {
            ctx.beginPath()
            ctx.arc(px, py, r, rand() * Math.PI, Math.PI * (1.2 + rand()))
            ctx.stroke()
          })
        }
        specks(ctx, rand, shade(color, 0.3), 120 * p.fossils, 1)
      }
      if (p.pores) {
        const hole = rgba(shade(color, -0.5), 0.75)
        const rim = rgba(shade(color, 0.3), 0.5)
        for (let i = 0; i < 260 * p.pores; i++) {
          const x = rand() * SIZE
          const y = rand() * SIZE
          const rx = p.elongated ? 3 + rand() * 12 : 0.8 + Math.pow(rand(), 2) * 5
          const ry = p.elongated ? 0.8 + rand() * 2 : rx * (0.7 + rand() * 0.3)
          wrapped(x, y, rx + 2, (px, py) => {
            ctx.fillStyle = rim
            ctx.beginPath()
            ctx.ellipse(px, py + 1, rx, ry, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = hole
            ctx.beginPath()
            ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2)
            ctx.fill()
          })
        }
      }
    },
  },

  // Split stone (slate, schist): fine layers and uneven steps where it cleft.
  cleft: {
    paint(ctx, rand, { color }) {
      fill(ctx, color)
      for (let i = 0; i < 30; i++) {
        blotch(ctx, rand() * SIZE, rand() * SIZE, 40 + rand() * 120, rand() > 0.5 ? '255,255,255' : '0,0,0', 0.07)
      }
      for (let i = 0; i < 140; i++) {
        const tone = rgba(shade(color, rand() > 0.5 ? 0.15 : -0.2), 0.12 + rand() * 0.2)
        wave(ctx, rand, rand() * SIZE, tone, { width: 0.6 + rand() * 4, amp: 3, slope: 0 })
      }
      speckle(ctx, rand, 6000, 0.07)
    },
  },

  // Irregular stones laid with joints (flagstone, crazy paving), or angular
  // fragments in a matrix (breccia). params: stones (per tile), variance
  // (tone difference), tones (colours, instead of shades of the base),
  // joint (mortar or matrix colour), gap (joint width, px).
  flagstone: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.stones ?? 14
      const tone = () => (p.tones ? pick(rand, p.tones) : shade(color, (rand() - 0.5) * 0.3 * (p.variance ?? 1)))
      const points = Array.from({ length: n }, () => [rand() * SIZE, rand() * SIZE, tone()])
      const gap = p.gap ?? 5
      const tones = points.map(([, , c]) => rgbOf(c))
      const mortar = rgbOf(p.joint ?? shade(color, -0.45))
      const image = ctx.createImageData(SIZE, SIZE)
      const d = image.data
      const near = (a, b) => {
        const t = Math.abs(a - b)
        return Math.min(t, SIZE - t)
      }
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          let best = Infinity
          let second = Infinity
          let k = 0
          for (let i = 0; i < n; i++) {
            const dx = near(x, points[i][0])
            const dy = near(y, points[i][1])
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < best) {
              second = best
              best = dist
              k = i
            } else if (dist < second) second = dist
          }
          const [r, g, b] = second - best < gap ? mortar : tones[k]
          const o = (y * SIZE + x) * 4
          d[o] = r
          d[o + 1] = g
          d[o + 2] = b
          d[o + 3] = 255
        }
      }
      ctx.putImageData(image, 0, 0)
      clouds(ctx, rand, color, 1)
      speckle(ctx, rand, 9000, 0.1)
    },
  },

  // Rounded stones in a matrix (river stone, flint, conglomerate). params:
  // matrix (colour between), tones (stone colours), count, size, rim (a
  // light crust around each stone: flint).
  pebbles: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, p.matrix ?? shade(color, -0.25))
      speckle(ctx, rand, 12000, 0.12)
      const tones = p.tones ?? tonesOf(color, 3)
      const size = p.size ?? 1
      for (let i = 0; i < (p.count ?? 220); i++) {
        const x = rand() * SIZE
        const y = rand() * SIZE
        const r = (9 + rand() * 16) * size
        const ratio = 0.6 + rand() * 0.4
        const rot = rand() * Math.PI
        const tone = pick(rand, tones)
        wrapped(x, y, r + 3, (px, py) => {
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(rot)
          ctx.fillStyle = 'rgba(0,0,0,0.25)' // shadow
          ctx.beginPath()
          ctx.ellipse(1.5, 2, r, r * ratio, 0, 0, Math.PI * 2)
          ctx.fill()
          if (p.rim) {
            ctx.fillStyle = p.rim
            ctx.beginPath()
            ctx.ellipse(0, 0, r, r * ratio, 0, 0, Math.PI * 2)
            ctx.fill()
          }
          const inner = p.rim ? 0.8 : 1
          const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3 * ratio, 0, 0, 0, r)
          g.addColorStop(0, shade(tone, 0.12))
          g.addColorStop(0.6, tone)
          g.addColorStop(1, shade(tone, -0.25))
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.ellipse(0, 0, r * inner, r * ratio * inner, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
      }
    },
  },

  // --- plastics and fabrics -------------------------------------------------

  // A plastic sheet or panel: an even colour. params: finish ('smooth' by
  // default, 'textured' for an orange-peel surface, 'speckled' for vinyl or
  // rubber flooring, 'printed' for the layer lines of a 3D print), flecks
  // (speckled: the fleck colours).
  plastic: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 0.25)
      if (p.finish === 'textured') {
        for (let i = 0; i < 2600; i++) {
          const rgb = rgbOf(shade(color, rand() > 0.5 ? 0.18 : -0.18)).join(',')
          blotch(ctx, rand() * SIZE, rand() * SIZE, 2 + rand() * 4, rgb, 0.32)
        }
      } else if (p.finish === 'printed') {
        // 3D-printed: fine layer lines, each one catching the light on top
        for (let y = 0; y < SIZE; y += 4) {
          ctx.fillStyle = rgba(shade(color, 0.3), 0.5); ctx.fillRect(0, y, SIZE, 1.2)
          ctx.fillStyle = rgba(shade(color, -0.3), 0.35); ctx.fillRect(0, y + 2.6, SIZE, 1.2)
        }
      } else if (p.finish === 'speckled') {
        const flecks = p.flecks ?? [shade(color, -0.3), shade(color, 0.3)]
        for (let i = 0; i < 2400; i++) chip(ctx, rand, rand() * SIZE, rand() * SIZE, 1 + rand() * 3, pick(rand, flecks), { sides: 4, stretch: 1 + rand() })
      } else {
        speckle(ctx, rand, 3000, 0.03)
      }
    },
  },

  // Felt (pressed fibres: PET acoustic felt, wool felt): short curly fibres
  // over a mottled base.
  felt: {
    paint(ctx, rand, { color }) {
      fill(ctx, shade(color, -0.05))
      clouds(ctx, rand, color, 1.2)
      for (let i = 0; i < 9000; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, len = 8 + rand() * 18, a = rand() * Math.PI * 2, bend = (rand() - 0.5) * 10
        ctx.strokeStyle = rgba(shade(color, rand() > 0.5 ? 0.4 : -0.4), 0.5)
        ctx.lineWidth = 1.2
        wrapped(x, y, len, (px, py) => {
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.quadraticCurveTo(px + Math.cos(a) * len / 2 - Math.sin(a) * bend, py + Math.sin(a) * len / 2 + Math.cos(a) * bend, px + Math.cos(a) * len, py + Math.sin(a) * len)
          ctx.stroke()
        })
      }
    },
  },

  // A woven fabric: threads over and under in a plain weave. params: threads
  // (per tile, each way).
  woven: {
    paint(ctx, rand, { color, params: p }) {
      const n = p.threads ?? 48
      const c = SIZE / n
      fill(ctx, shade(color, -0.35))
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = i * c, y = j * c, across = (i + j) % 2 === 0
          const g = across ? ctx.createLinearGradient(x, y, x, y + c) : ctx.createLinearGradient(x, y, x + c, y)
          const tone = shade(color, (rand() - 0.5) * 0.12)
          g.addColorStop(0, shade(tone, -0.25)); g.addColorStop(0.5, shade(tone, 0.15)); g.addColorStop(1, shade(tone, -0.25))
          ctx.fillStyle = g
          ctx.fillRect(x + 0.5, y + 0.5, c - 1, c - 1)
        }
      }
    },
  },

  // Leather: a pebbled grain and a few soft creases.
  leather: {
    paint(ctx, rand, { color }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 1)
      for (let i = 0; i < 7000; i++) {
        const rgb = rgbOf(shade(color, rand() > 0.5 ? 0.12 : -0.18)).join(',')
        blotch(ctx, rand() * SIZE, rand() * SIZE, 2.5 + rand() * 4.5, rgb, 0.6)
      }
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = rgba(shade(color, -0.35), 0.25)
        ctx.lineWidth = 1 + rand()
        const x = rand() * SIZE, y = rand() * SIZE, len = 40 + rand() * 90, a = rand() * Math.PI
        wrapped(x, y, len, (px, py) => {
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.quadraticCurveTo(px + Math.cos(a) * len / 2 + 12, py + Math.sin(a) * len / 2 - 8, px + Math.cos(a) * len, py + Math.sin(a) * len)
          ctx.stroke()
        })
      }
    },
  },

  // --- metal ------------------------------------------------------------------
  //
  // A metal's look is mostly in its row: metalness, roughness and colour (the
  // room's environment does the reflecting). The texture adds the surface.

  // params: clouds (uneven tone, 0…), brushed (0…1, fine directional lines),
  // hammered (0…1, dimples), patina (colour) + amount (0…1: verdigris on
  // bronze, white bloom on zinc and lead). Standing seams: the `joints` finish.
  metal: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      clouds(ctx, rand, color, 0.5 * (p.clouds ?? 1))
      if (p.brushed) {
        for (let i = 0; i < 900; i++) {
          const y = rand() * SIZE
          ctx.fillStyle = rgba(shade(color, rand() > 0.5 ? 0.25 : -0.2), (0.05 + rand() * 0.1) * p.brushed)
          ctx.fillRect(0, y, SIZE, 0.5 + rand())
        }
      }
      if (p.hammered) {
        for (let i = 0; i < 700 * p.hammered; i++) {
          const x = rand() * SIZE
          const y = rand() * SIZE
          const r = 5 + rand() * 9
          wrapped(x, y, r, (px, py) => {
            const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r)
            g.addColorStop(0, rgba(shade(color, 0.35), 0.35))
            g.addColorStop(0.7, rgba(color, 0))
            g.addColorStop(1, rgba(shade(color, -0.4), 0.3))
            ctx.fillStyle = g
            circle(ctx, px, py, r)
          })
        }
      }
      if (p.patina) {
        const rgb = rgbOf(p.patina).join(',')
        for (let i = 0; i < 60 * (p.amount ?? 0.3); i++) {
          blotch(ctx, rand() * SIZE, rand() * SIZE, 20 + rand() * 90, rgb, 0.35 + rand() * 0.3)
        }
        for (let i = 0; i < 3000 * (p.amount ?? 0.3); i++) {
          ctx.fillStyle = rgba(p.patina, 0.3 + rand() * 0.4)
          ctx.fillRect(rand() * SIZE, rand() * SIZE, 1 + rand() * 2, 1 + rand() * 2)
        }
      }
    },
  },

  // Rusted weathering steel (Corten): mottled oxide in browns and oranges,
  // with darker runs where water flowed down. params: runs (0…, how many
  // streaks), fresh (younger, brighter orange instead of the deep brown).
  rust: {
    paint(ctx, rand, { color, params: p }) {
      fill(ctx, color)
      const tones = p.fresh
        ? [shade(color, 0.2), shade(color, -0.2), '#b8652e', '#7c3b1e']
        : [shade(color, 0.15), shade(color, -0.25), '#8a4a2a', '#4f2a1a', '#6b3b2a']
      for (let i = 0; i < 160; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 10 + rand() * 70, rgbOf(pick(rand, tones)).join(','), 0.25)
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = rgba(pick(rand, tones), 0.5)
        ctx.fillRect(rand() * SIZE, rand() * SIZE, 1 + rand() * 2, 1 + rand() * 2)
      }
      // runs: thin streaks downward, fading out, wrapping top to bottom
      for (let i = 0; i < 60 * (p.runs ?? 0.6); i++) {
        const x = rand() * SIZE
        const y = rand() * SIZE
        const len = 40 + rand() * 160
        const g = ctx.createLinearGradient(0, y, 0, y + len)
        g.addColorStop(0, rgba(shade(color, -0.4), 0.35))
        g.addColorStop(1, rgba(shade(color, -0.4), 0))
        ctx.fillStyle = g
        for (const dy of [0, -SIZE]) ctx.fillRect(x, y + dy, 1.5 + rand() * 3, len)
      }
    },
  },

  // --- glass ------------------------------------------------------------------

  // No texture: the look is transmission, tint and roughness (see config/materials.js).
  // A rough (frosted, milky) pane gets a flatter, whiter swatch.
  glass: {
    swatch: ({ color, roughness, params }) =>
      params?.iridescence
        ? `linear-gradient(135deg, #cfe3ff 0%, #f2c9f0 30%, #c9f2e4 55%, #f6e6b8 80%, #cfd8f0 100%)` // dichroic: the colours it shifts through
        : roughness > 0.3
        ? `linear-gradient(135deg, ${shade(color, 0.25)} 0%, ${shade(color, 0.05)} 60%, ${shade(color, 0.35)} 100%)`
        : `linear-gradient(135deg, ${shade(color, 0.4)} 0%, ${shade(color, -0.12)} 55%, ${shade(color, 0.6)} 100%)`,
  },

  // A pane with a pattern in it. The texture tints the light through the pane,
  // so it stays near the glass's own light colour; the pattern is drawn in
  // slightly lighter and darker tones. params: pattern ('wired', 'fluted',
  // 'hammered', 'rolled', 'channel', 'multiwall', 'blocks', 'etched', 'fused'), strength
  // (how strong, 1 by default), colors (fused: the coloured pieces).
  glazing: {
    paint(ctx, rand, { color, params: p }) {
      const k = p.strength ?? 1
      const g0 = ctx.createLinearGradient(0, 0, SIZE, SIZE)
      g0.addColorStop(0, shade(color, 0.3)); g0.addColorStop(0.5, color); g0.addColorStop(1, shade(color, 0.2))
      ctx.fillStyle = g0
      ctx.fillRect(0, 0, SIZE, SIZE)
      const dark = (a) => rgba(shade(color, -0.45), a * k)
      const light = (a) => rgba('#ffffff', a * k)
      switch (p.pattern) {
        case 'wired': {
          // a square mesh of thin steel wire in the pane
          ctx.strokeStyle = dark(0.75)
          ctx.lineWidth = 1.4
          for (let i = 0; i < SIZE; i += 32) {
            ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, SIZE); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(SIZE, i + 0.5); ctx.stroke()
          }
          break
        }
        case 'fluted': {
          // vertical reeds: each one lit on one side, shaded on the other
          const w = 16
          for (let x = 0; x < SIZE; x += w) {
            const g = ctx.createLinearGradient(x, 0, x + w, 0)
            g.addColorStop(0, light(0.5)); g.addColorStop(0.45, light(0)); g.addColorStop(1, dark(0.35))
            ctx.fillStyle = g; ctx.fillRect(x, 0, w, SIZE)
          }
          break
        }
        case 'multiwall': {
          // multiwall sheet: narrow cells side by side, a thin wall between each
          for (let x = 0; x < SIZE; x += 24) {
            const g = ctx.createLinearGradient(x, 0, x + 24, 0)
            g.addColorStop(0, light(0.35)); g.addColorStop(0.5, light(0.05)); g.addColorStop(1, light(0.25))
            ctx.fillStyle = g; ctx.fillRect(x, 0, 24, SIZE)
            ctx.fillStyle = dark(0.35); ctx.fillRect(x, 0, 1.5, SIZE)
          }
          break
        }
        case 'channel': {
          // U-profile channels standing side by side: wide, with a seam and lit flanges
          const w = 64
          for (let x = 0; x < SIZE; x += w) {
            const g = ctx.createLinearGradient(x, 0, x + w, 0)
            g.addColorStop(0, dark(0.4)); g.addColorStop(0.12, light(0.45)); g.addColorStop(0.5, light(0.1)); g.addColorStop(0.88, light(0.3)); g.addColorStop(1, dark(0.45))
            ctx.fillStyle = g; ctx.fillRect(x, 0, w, SIZE)
            ctx.fillStyle = dark(0.6); ctx.fillRect(x, 0, 2, SIZE)
          }
          break
        }
        case 'blocks': {
          // glass blocks: square units, a bevelled rim, a soft lens in the middle, mortar between
          const n = 4, c = SIZE / n
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              const x = i * c, y = j * c
              const g = ctx.createRadialGradient(x + c / 2, y + c / 2, 4, x + c / 2, y + c / 2, c * 0.7)
              g.addColorStop(0, light(0.5)); g.addColorStop(0.6, light(0.05)); g.addColorStop(1, dark(0.35))
              ctx.fillStyle = g; ctx.fillRect(x, y, c, c)
              ctx.strokeStyle = light(0.5); ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, c - 16, c - 16)
            }
          }
          ctx.fillStyle = rgba('#d8d4cc', 0.95)
          for (let i = 0; i <= n; i++) { ctx.fillRect(i * c - 4, 0, 8, SIZE); ctx.fillRect(0, i * c - 4, SIZE, 8) }
          break
        }
        case 'hammered': {
          // a hammered or cast surface: dimples that catch the light
          for (let i = 0; i < 1400; i++) {
            const x = rand() * SIZE, y = rand() * SIZE, r = 5 + rand() * 9
            wrapped(x, y, r, (px, py) => {
              const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r)
              g.addColorStop(0, light(0.35)); g.addColorStop(0.7, light(0)); g.addColorStop(1, dark(0.18))
              ctx.fillStyle = g; circle(ctx, px, py, r)
            })
          }
          break
        }
        case 'rolled': {
          // rolled glass: soft horizontal ripples
          for (let i = 0; i < 40; i++) {
            const y0 = rand() * SIZE, a = 2 + rand() * 5, f = 1 + Math.floor(rand() * 3), ph = rand() * 6.28
            ctx.strokeStyle = rand() > 0.5 ? light(0.4) : dark(0.18)
            ctx.lineWidth = 1 + rand() * 3
            for (const dy of [-SIZE, 0, SIZE]) {
              ctx.beginPath()
              for (let x = 0; x <= SIZE; x += 8) {
                const y = y0 + dy + Math.sin((x / SIZE) * Math.PI * 2 * f + ph) * a
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
              }
              ctx.stroke()
            }
          }
          break
        }
        case 'etched': {
          // etched: a frosted pane with clear bands left in it
          ctx.fillStyle = light(0.45)
          ctx.fillRect(0, 0, SIZE, SIZE)
          ctx.fillStyle = rgba(color, 0.9)
          for (const [y, h] of [[60, 18], [96, 6], [300, 30], [350, 6], [452, 12]]) ctx.fillRect(0, y, SIZE, h)
          speckle(ctx, rand, 6000, 0.05)
          break
        }
        case 'fused': {
          // fused: coloured glass pieces melted into the pane
          const colors = p.colors ?? [shade(color, -0.4)]
          for (let i = 0; i < 26; i++) {
            const rgb = rgbOf(pick(rand, colors)).join(',')
            blotch(ctx, rand() * SIZE, rand() * SIZE, 30 + rand() * 70, rgb, 0.55)
          }
          for (let i = 0; i < 120; i++) chip(ctx, rand, rand() * SIZE, rand() * SIZE, 4 + rand() * 10, rgba(pick(rand, colors), 0.7), { sides: 5 })
          break
        }
      }
    },
  },
}

// --- finish: on top of any family ---------------------------------------------
//
// params: sparkle (0…1, glinting mineral flecks), joints ([columns, rows] of
// slabs per tile: the joint lines of a laid floor or cladding).

export function finish(ctx, rand, { color, params: p }) {
  if (p.sparkle) specks(ctx, rand, '#ffffff', 1400 * p.sparkle, 0.9, 0.75)
  if (p.joints) {
    const [cols, rows] = p.joints
    ctx.fillStyle = rgba(shade(color, -0.55), 0.6)
    for (let i = 0; i < cols; i++) ctx.fillRect((i / cols) * SIZE, 0, 2, SIZE)
    for (let j = 0; j < rows; j++) ctx.fillRect(0, (j / rows) * SIZE, SIZE, 2)
    ctx.fillStyle = rgba(shade(color, 0.3), 0.35)
    for (let i = 0; i < cols; i++) ctx.fillRect((i / cols) * SIZE + 2, 0, 1, SIZE)
    for (let j = 0; j < rows; j++) ctx.fillRect(0, (j / rows) * SIZE + 2, SIZE, 1)
  }
}

// --- stone details --------------------------------------------------------------

// Soft lighter and darker clouds over the base.
function clouds(ctx, rand, color, strength) {
  for (let i = 0; i < 45; i++) {
    const rgb = rgbOf(shade(color, rand() > 0.5 ? 0.15 : -0.15)).join(',')
    blotch(ctx, rand() * SIZE, rand() * SIZE, 40 + rand() * 120, rgb, 0.08 * strength)
  }
}

// Small dots of one colour.
function specks(ctx, rand, color, count, size, alpha = 0.6) {
  ctx.fillStyle = rgba(color, alpha)
  for (let i = 0; i < count; i++) {
    const s = size * (0.6 + rand() * 1.2)
    ctx.fillRect(rand() * SIZE, rand() * SIZE, s, s)
  }
}

// A wavy line across the tile that tiles seamlessly: periodic in x, and
// `slope` (−1, −0.5, 0, 0.5, 1) tiles high it climbs over the width; drawn
// again one tile up and down so it continues across the top and bottom edge.
function wave(ctx, rand, y0, style, { width = 1, amp = 10, slope = 0 } = {}) {
  const terms = [1, 2, 3].map((k) => [k * (1 + Math.floor(rand() * 2)), amp / k, rand() * Math.PI * 2])
  const yAt = (x) => y0 + slope * x + terms.reduce((sum, [f, a, ph]) => sum + Math.sin((x / SIZE) * Math.PI * 2 * f + ph) * a, 0)
  ctx.strokeStyle = style
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  for (const dy of [-2 * SIZE, -SIZE, 0, SIZE]) {
    ctx.beginPath()
    for (let x = 0; x <= SIZE; x += 4) {
      const y = yAt(x) + dy
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

// A vein: mostly straight along `slope`, jagged at small scale, thicker and
// thinner along its length, sometimes splitting off a short branch. Seamless
// like wave(): periodic in x, drawn again one tile up and down.
function veinLine(ctx, rand, y0, color, { width, strength, slope, halo }) {
  const drift = [[1, 6 + rand() * 8, rand() * 7], [2, 3 + rand() * 4, rand() * 7]]
  const jag = [[5 + Math.floor(rand() * 4), 1 + rand() * 2, rand() * 7], [11 + Math.floor(rand() * 6), 0.6 + rand(), rand() * 7]]
  const swell = [1 + Math.floor(rand() * 3), rand() * 7]
  const yAt = (x) =>
    y0 + slope * x + [...drift, ...jag].reduce((sum, [f, a, ph]) => sum + Math.sin((x / SIZE) * Math.PI * 2 * f + ph) * a, 0)
  const wAt = (x) => width * (0.25 + 0.75 * Math.abs(Math.sin((x / SIZE) * Math.PI * swell[0] + swell[1])))
  ctx.lineCap = 'round'
  const layers = halo ? [[4, 0.05], [1, strength]] : [[1, strength]]
  for (const [scale, alpha] of layers) {
    ctx.strokeStyle = rgba(color, alpha)
    for (const dy of [-2 * SIZE, -SIZE, 0, SIZE]) {
      for (let x = 0; x < SIZE; x += 4) {
        ctx.lineWidth = wAt(x) * scale
        ctx.beginPath()
        ctx.moveTo(x, yAt(x) + dy)
        ctx.lineTo(x + 4, yAt(x + 4) + dy)
        ctx.stroke()
      }
    }
  }
  // a few short branches leaving the vein at an angle
  if (!halo) return
  for (let b = 0; b < 3; b++) {
    const x0 = rand() * SIZE
    const len = 30 + rand() * 70
    const angle = Math.atan(slope) + (rand() > 0.5 ? 1 : -1) * (0.4 + rand() * 0.6)
    ctx.strokeStyle = rgba(color, strength * 0.6)
    ctx.lineWidth = wAt(x0) * 0.5
    wrapped(x0, yAt(x0), len, (px, py) => {
      ctx.beginPath()
      ctx.moveTo(px, py)
      let x = px
      let y = py
      for (let t = 0; t < len; t += 6) {
        x += Math.cos(angle) * 6 + (rand() - 0.5) * 3
        y += Math.sin(angle) * 6 + (rand() - 0.5) * 3
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
  }
}

// --- wood details -------------------------------------------------------------

function knots(ctx, rand, y0, h, color, amount) {
  const count = Math.floor(amount * 2 + rand() * amount * 1.5)
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE
    const y = y0 + h * (0.25 + rand() * 0.5)
    const r = 3 + rand() * 6
    wrapped(x, y, r * 2.5, (px, py) => {
      for (let ring = 3; ring >= 0; ring--) {
        ctx.fillStyle = rgba(shade(color, -0.25 - ring * 0.1), 0.25 + (3 - ring) * 0.15)
        ctx.beginPath()
        ctx.ellipse(px, py, r * (1 + ring * 0.45) * 1.6, r * (1 + ring * 0.45) * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }
}

function streaks(ctx, rand, y0, h, color, amount) {
  if (amount <= 0) return
  const lines = Math.round(4 + amount * 8)
  for (let i = 0; i < lines; i++) {
    const y = y0 + rand() * h
    ctx.fillStyle = rgba(shade(color, -0.55), 0.18 * amount + rand() * 0.15)
    ctx.fillRect(0, y, SIZE, 1 + rand() * 2.5)
  }
}
