// The game itself, as pure data + a reducer. No React, no networking:
// GameState.jsx runs this in each window and keeps the windows in sync.
//
// Two players, two different screens. Each turn has two steps:
//   1. the "giver" picks a material for the other player (a full-screen
//      picker: the giver doesn't see the room)
//   2. the "placer" gets that material and chooses where it goes in the room
// Then the roles swap and the next turn starts (see SWAP_ROLES).

import { DEFAULT_ROOM_CONFIG } from '../config/room'

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
  config: DEFAULT_ROOM_CONFIG, // { [surfaceId]: materialId }
  lastMove: null, // { round, giver, placer, materialId, surfaceId }
}

export const placerOf = (game) => other(game.giver)

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
      // Placing the material ends the turn.
      return {
        ...game,
        version: game.version + 1,
        round: game.round + 1,
        giver: SWAP_ROLES ? placer : game.giver,
        phase: 'material',
        materialId: null,
        config: { ...game.config, [action.surfaceId]: game.materialId },
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
