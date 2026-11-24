// Board steps 1–4: from a move to a recipe.
//
//   step 1  a move: the two votes, as ids only (this is all that's sent between halls)
//             { room, element, material, version, seed }
//           v3: without an element (a material picked or sent, not placed yet),
//           the behaviour is 'material': no form, only the characteristics
//   step 2  the element gives the behaviour        (data/rooms.js)
//   step 3  the material gives the characteristics (data/materials.js)
//   step 4  the characteristics become numbers     (data/characteristics.js)
//
// Pure: the same move always gives the same recipe.

import { BEHAVIOURS } from '../data/behaviours.js'
import { toSettings } from '../data/characteristics.js'
import { findVersion } from '../data/materials.js'
import { ROOMS_BY_ID, findElement } from '../data/rooms.js'
import { hashSeed } from './random.js'

export function resolve(move) {
  const room = ROOMS_BY_ID[move.room] ?? null
  const element = move.element ? findElement(move.room, move.element) : null
  const found = findVersion(move.material, move.version)
  if (!found || (move.element && !element)) {
    throw new Error(`Unknown move: ${JSON.stringify(move)}`)
  }
  const { material, version } = found
  return {
    move,
    room,
    element,
    behaviour: element ? { id: element.behaviour, ...BEHAVIOURS[element.behaviour] } : { id: 'material', ...BEHAVIOURS.material },
    material,
    version,
    tags: version.tags,
    settings: toSettings(version.tags),
    // no seed sent → derive one from the move, so it's still the same everywhere
    seed: move.seed ?? hashSeed(move.room, move.element, move.material, version.id),
  }
}

// One line that explains the result, for the screen: "why does it look like this?"
export function explain(recipe) {
  const t = recipe.tags
  return {
    input: [recipe.room?.label, recipe.element?.label.toLowerCase(), `${recipe.material.label}, ${recipe.version.label.toLowerCase()}`]
      .filter(Boolean)
      .join(' · '),
    behaviour: recipe.element
      ? `${recipe.element.label.toLowerCase()} → ${recipe.behaviour.label.toLowerCase()}`
      : recipe.behaviour.label.toLowerCase(),
    expression: [t.density, t.structure, [].concat(t.character).join(' + '), t.movement, t.transparency].join(' · '),
  }
}
