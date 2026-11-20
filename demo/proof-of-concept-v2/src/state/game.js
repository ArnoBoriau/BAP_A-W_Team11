// The game itself, as pure data + a reducer. No React, no networking:
// GameState.jsx runs this in each window and keeps the windows in sync.
//
// Two players, two different screens. Each turn has two steps:
//   1. the "giver" picks a material for the other player (a full-screen
//      picker: the giver doesn't see the room)
//   2. the "placer" gets that material and chooses where it goes in the room
// Every turn is about one room of the house, or its outside (they take turns,
// see turnRoom):
// the giver knows which room the material is for, the placer places it there.
// Then the roles swap and the next turn starts (see SWAP_ROLES).

import { AREAS, DEFAULT_GLAZING, DEFAULT_ROOM_CONFIG, SURFACES_BY_ID, overlaps } from '../config/room'
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
  config: DEFAULT_ROOM_CONFIG, // each surface's finish: { [surfaceId]: materialId }
  glazing: DEFAULT_GLAZING, // glass through the wall: { [surfaceId]: materialId } (see room.js)
  lastMove: null, // { round, giver, placer, materialId, surfaceId }
}

export const placerOf = (game) => other(game.giver)

// The room this turn is about: the rooms take turns in plan order, then the outside.
export const turnRoom = (game) => AREAS[(game.round - 1) % AREAS.length]

// What a house looks like after a material goes on a surface. Pure; used for
// the real move and for the placer's preview, so the two always agree.
//   - a finish (oak, plaster…) goes on that side. Any glass in the same stretch
//     of wall, from either side, is closed: the finishes underneath come back.
//   - glass (a `through` material) opens that side's span through the whole
//     wall. It replaces glass that overlapped it, so there's one pane per spot.
//     The finishes stay as they were, underneath.
export function applyPlacement({ config, glazing }, surfaceId, materialId) {
  const surface = SURFACES_BY_ID[surfaceId]
  const sameWall = (id) => id === surfaceId || overlaps(surface, SURFACES_BY_ID[id])
  const rest = Object.fromEntries(Object.entries(glazing).filter(([id]) => !sameWall(id)))
  if (MATERIALS_BY_ID[materialId].through) return { config, glazing: { ...rest, [surfaceId]: materialId } }
  return { config: { ...config, [surfaceId]: materialId }, glazing: rest }
}

// The material you see on a surface: its glass if it has any, else its finish.
export const shownMaterialId = ({ config, glazing }, surfaceId) => glazing[surfaceId] ?? config[surfaceId]

// Who has to act right now.
export function activePlayer(game) {
  return game.phase === 'material' ? game.giver : placerOf(game)
}

export function reducer(game, action) {
  switch (action.type) {
    case 'giveMaterial':
      if (game.phase !== 'material' || action.player !== game.giver) return game
      return { ...game, version: game.version + 1, phase: 'place', materialId: action.materialId }

    case 'placeMaterial': {
      const placer = placerOf(game)
      if (game.phase !== 'place' || action.player !== placer) return game
      if (SURFACES_BY_ID[action.surfaceId]?.roomId !== turnRoom(game).id) return game
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
