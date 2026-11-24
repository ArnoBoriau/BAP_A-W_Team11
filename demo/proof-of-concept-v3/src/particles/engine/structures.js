// How particles are arranged: one generator per structure value.
// Each fills the area (x 0…width, y 0…1) with STRANDS: lists of points that
// belong together. Dots go on the points, lines run between consecutive
// points of a strand. The behaviour's pattern then decides which points stay
// (engine/build.js).
//
//   linear      long parallel lines
//   modular     repeating blocks (each block is a closed strand)
//   woven       two sets of wavy lines that cross, over and under
//   branching   trees that split into more directions
//   monolithic  one packed mass: short, tight rows
//   fragmented  broken pieces: short strands, scattered
//
// `spacing` is the distance between neighbouring points (from density).

export const STRUCTURES = {
  linear(random, width, spacing) {
    const strands = []
    const rowGap = spacing * 1.6
    const tilt = (random() - 0.5) * 0.25
    for (let y = rowGap / 2; y < 1; y += rowGap) {
      const strand = []
      for (let x = 0; x <= width; x += spacing) strand.push([x, y + (x - width / 2) * tilt * 0.2])
      strands.push(strand)
    }
    return strands
  },

  modular(random, width, spacing) {
    const strands = []
    const size = spacing * 4 // one block
    const gap = spacing * 0.9
    for (let y = gap; y + size < 1; y += size + gap) {
      const offset = (Math.round(y / (size + gap)) % 2) * (size / 2) // running bond
      for (let x = gap - offset; x + size < width; x += size + gap) {
        if (x < 0) continue
        const block = []
        const steps = 4
        for (let k = 0; k < steps; k++) block.push([x + (size * k) / steps, y])
        for (let k = 0; k < steps; k++) block.push([x + size, y + (size * k) / steps])
        for (let k = 0; k < steps; k++) block.push([x + size - (size * k) / steps, y + size])
        for (let k = 0; k <= steps; k++) block.push([x, y + size - (size * k) / steps])
        strands.push(block)
      }
    }
    return strands
  },

  woven(random, width, spacing) {
    const strands = []
    const gap = spacing * 2.4
    const amp = gap * 0.35
    for (let y = gap / 2; y < 1; y += gap) {
      const strand = []
      for (let x = 0; x <= width; x += spacing) strand.push([x, y + Math.sin((x / gap) * Math.PI) * amp])
      strands.push(strand)
    }
    for (let x = gap / 2; x < width; x += gap) {
      const strand = []
      for (let y = 0; y <= 1; y += spacing) strand.push([x + Math.sin((y / gap) * Math.PI + Math.PI) * amp, y])
      strands.push(strand)
    }
    return strands
  },

  branching(random, width, spacing) {
    const strands = []
    const trees = Math.max(3, Math.round((width * 0.07) / spacing))
    const grow = (x, y, angle, length, depth) => {
      const strand = [[x, y]]
      const steps = Math.max(2, Math.round(length / spacing))
      for (let k = 1; k <= steps; k++) {
        angle += (random() - 0.5) * 0.3
        x += Math.cos(angle) * spacing
        y += Math.sin(angle) * spacing
        strand.push([x, y])
      }
      strands.push(strand)
      if (depth > 0) {
        const spread = 0.35 + random() * 0.4
        grow(x, y, angle - spread, length * 0.72, depth - 1)
        grow(x, y, angle + spread, length * 0.72, depth - 1)
      }
    }
    for (let t = 0; t < trees; t++) {
      grow(((t + 0.5) / trees) * width, 1.02, -Math.PI / 2 + (random() - 0.5) * 0.3, 0.28, 4)
    }
    return strands
  },

  monolithic(random, width, spacing) {
    const strands = []
    const tight = spacing
    for (let y = tight / 2, row = 0; y < 1; y += tight * 0.87, row++) {
      const strand = []
      for (let x = (row % 2) * (tight / 2); x <= width; x += tight) strand.push([x, y])
      strands.push(strand)
    }
    return strands
  },

  fragmented(random, width, spacing) {
    const strands = []
    const pieces = Math.round((width / (spacing * spacing)) * 0.22)
    for (let p = 0; p < pieces; p++) {
      let x = random() * width
      let y = random()
      let angle = random() * Math.PI * 2
      const strand = [[x, y]]
      const length = 1 + Math.floor(random() * 4)
      for (let k = 0; k < length; k++) {
        angle += (random() - 0.5) * 1.2
        x += Math.cos(angle) * spacing
        y += Math.sin(angle) * spacing
        strand.push([x, y])
      }
      strands.push(strand)
    }
    return strands
  },
}
