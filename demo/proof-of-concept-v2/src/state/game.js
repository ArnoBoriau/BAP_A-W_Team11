// The game itself, as pure data + a reducer. No React, no networking:
// GameState.jsx runs this in each window and keeps the windows in sync.
//
// Two players, two different screens. Each turn has two steps:
//   1. the "giver" picks a material for the other player (a full-screen
//      picker: the giver doesn't see the room)
//   2. the "placer" gets that material and chooses where it goes in the room
// The house starts as a drawing: no surface is filled in. The game works
// through it room per room, in plan order and then the outside: it stays in a
// room until every surface there is filled in, then moves on (see turnRoom).
// When the outside is done too, the house is finished.
// The giver knows which room the material is for, the placer places it there.
// Then the roles swap and the next turn starts (see SWAP_ROLES).

import { AREAS, DEFAULT_GLAZING, DEFAULT_ROOM_CONFIG, SURFACES, SURFACES_BY_ID, overlaps } from '../config/room'
import { MATERIALS_BY_ID } from '../config/materials'

export const PLAYERS = ['A', 'B']

export const other = (player) => (player === 'A' ? 'B' : 'A')

// true: giver and placer swap every turn, so both players get to do both.
// false: player A always gives, player B always places in their room.
export const SWAP_ROLES = true

// Each player's colour: their figure in the tile, and the pulse that calls
// the other player over.
export const COLORS = { A: '#ff6a3d', B: '#6f9fd8' }

export const initialGame = {
  version: 0, // bumped on every change; the highest version wins between windows
  round: 1,
  giver: 'A', // who picks the material this turn
  phase: 'material', // 'material' | 'place'
  materialId: null, // the material given this turn
  config: DEFAULT_ROOM_CONFIG, // each surface's finish: { [surfaceId]: materialId | null }
  glazing: DEFAULT_GLAZING, // glass through the wall: { [surfaceId]: materialId } (see room.js)
  lastMove: null, // { round, giver, placer, materialId, surfaceId }
}

export const placerOf = (game) => other(game.giver)

// The material you see on a surface: its glass if it has any, else its
// finish; null while it isn't filled in yet.
export const shownMaterialId = ({ config, glazing }, surfaceId) => glazing[surfaceId] ?? config[surfaceId] ?? null

// The surfaces of an area that aren't filled in yet.
export const blanksIn = (game, areaId) =>
  SURFACES.filter((s) => s.roomId === areaId && !shownMaterialId(game, s.id))

// The room this turn is about: the first one (plan order, then the outside)
// that still has surfaces to fill in. null once the whole house is done.
export const turnRoom = (game) => AREAS.find((area) => blanksIn(game, area.id).length > 0) ?? null

export const isFinished = (game) => turnRoom(game) === null

// Glass from another room in the same wall (e.g. a window seen from the
// façade side): a finish here goes around it, but there's no room for a
// second pane over it.
const glassFromElsewhere = ({ glazing }, surface) =>
  Object.keys(glazing).some((id) => {
    const glazed = SURFACES_BY_ID[id]
    return glazed.roomId !== surface.roomId && overlaps(surface, glazed)
  })

// Can this material go on this surface?
export function fits(game, material, surface) {
  if (!material.appliesTo.includes(surface.kind)) return false
  return !(material.through && glassFromElsewhere(game, surface))
}

// Can this material go anywhere in this turn's room? (The giver only gets to
// give materials the placer can actually use.)
export function fitsRoom(game, material) {
  const room = turnRoom(game)
  return !!room && SURFACES.some((s) => s.roomId === room.id && fits(game, material, s))
}

// What a house looks like after a material goes on a surface. Pure; used for
// the real move and for the placer's preview, so the two always agree.
//   - a finish (oak, plaster…) goes on that side, closing that side's own glass.
//   - glass (a `through` material) opens that side's span through the whole
//     wall and fills it. The finish stays as it was, underneath.
// Glass from another room in the same wall is left alone: a room that's done
// stays done. A finish goes around it (see glassOpenings in room.js), and
// glass can't go over it (see fits).
export function applyPlacement({ config, glazing }, surfaceId, materialId) {
  const rest = { ...glazing }
  delete rest[surfaceId]
  if (MATERIALS_BY_ID[materialId].through) return { config, glazing: { ...rest, [surfaceId]: materialId } }
  return { config: { ...config, [surfaceId]: materialId }, glazing: rest }
}

// Who has to act right now (nobody once the house is finished).
export function activePlayer(game) {
  if (isFinished(game)) return null
  return game.phase === 'material' ? game.giver : placerOf(game)
}

export function reducer(game, action) {
  switch (action.type) {
    case 'giveMaterial': {
      if (game.phase !== 'material' || action.player !== game.giver) return game
      const material = MATERIALS_BY_ID[action.materialId]
      if (!material || !fitsRoom(game, material)) return game
      return { ...game, version: game.version + 1, phase: 'place', materialId: action.materialId }
    }

    case 'placeMaterial': {
      const placer = placerOf(game)
      if (game.phase !== 'place' || action.player !== placer) return game
      const surface = SURFACES_BY_ID[action.surfaceId]
      if (!surface || surface.roomId !== turnRoom(game)?.id) return game
      if (!fits(game, MATERIALS_BY_ID[game.materialId], surface)) return game
      // Placing the material ends the turn.
      return {
        ...game,
        ...applyPlacement(game, action.surfaceId, game.materialId),
        version: game.version + 1,
        round: game.round + 1,
        giver: SWAP_ROLES ? placer : game.giver,
        phase: 'material',
        materialId: null,
        lastMove: {
          round: game.round,
          giver: game.giver,
          placer,
          materialId: game.materialId,
          surfaceId: action.surfaceId,
        },
      }
    }

    case 'reset':
      return { ...initialGame, version: game.version + 1 }

    // A newer state arrived from the other window.
    case 'sync':
      return action.game.version > game.version ? action.game : game

    default:
      return game
  }
}
