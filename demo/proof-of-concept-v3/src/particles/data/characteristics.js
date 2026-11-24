// The characteristics library (board: "characteristics library"), and what
// each value becomes in code (board step 4: "the characteristics become
// numbers"). Five categories; every material version picks one value per
// category, except character, where it can pick several (they're averaged).
//
//   density       how many particles, and how much space between them
//   structure     how the particles are arranged (engine/structures.js)
//   character     the shape of particles and lines: curved or straight, round or sharp
//   movement      how it moves: smooth, in a beat, growing, spreading, barely moving
//   transparency  how much light and glow comes through
//
// The numbers are first guesses, tune them by eye.

export const CATEGORIES = ['density', 'structure', 'character', 'movement', 'transparency']

export const LIBRARY = {
  density: {
    porous: { count: 0.55, gap: 0.8 },
    open: { count: 0.35, gap: 0.6 },
    dense: { count: 0.85, gap: 0.25 },
    solid: { count: 1, gap: 0.05 },
  },
  // the arrangement itself lives in engine/structures.js, one generator per value
  structure: {
    linear: {},
    modular: {},
    woven: {},
    branching: {},
    monolithic: {},
    fragmented: {},
  },
  character: {
    organic: { curve: 1, round: 0.8, wobble: 0.7 },
    geometric: { curve: 0, round: 0, wobble: 0 },
    soft: { curve: 0.6, round: 1, wobble: 0.3 },
    rigid: { curve: 0, round: 0.1, wobble: 0 },
  },
  movement: {
    flowing: { speed: 0.6, drift: 1, pulse: 0, grow: 0, spread: 0 },
    rhythmic: { speed: 0.5, drift: 0, pulse: 1, grow: 0, spread: 0 },
    expanding: { speed: 0.4, drift: 0, pulse: 0, grow: 1, spread: 0 },
    dispersing: { speed: 0.5, drift: 0.2, pulse: 0, grow: 0, spread: 1 },
    still: { speed: 0.1, drift: 0.1, pulse: 0, grow: 0, spread: 0 },
  },
  transparency: {
    opaque: { opacity: 1, glow: 0, outline: 0 },
    translucent: { opacity: 0.55, glow: 0.8, outline: 0 },
    transparent: { opacity: 0.35, glow: 0.2, outline: 1 },
  },
}

// A material version's tags → the numbers the engine uses.
export function toSettings(tags) {
  const characters = [].concat(tags.character)
  const character = average(characters.map((c) => LIBRARY.character[c]))
  return {
    ...LIBRARY.density[tags.density],
    structure: tags.structure,
    ...character,
    ...LIBRARY.movement[tags.movement],
    ...LIBRARY.transparency[tags.transparency],
  }
}

function average(list) {
  const out = {}
  for (const item of list) for (const [k, v] of Object.entries(item)) out[k] = (out[k] ?? 0) + v / list.length
  return out
}
