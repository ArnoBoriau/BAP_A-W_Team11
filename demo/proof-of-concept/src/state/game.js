// The game itself, as pure data + a reducer. No React, no networking:
// GameState.jsx runs this in each window and keeps the windows in sync.
//
// Two players take turns. Each turn has two steps:
//   1. the "locator" picks a location (a surface of the room)
//   2. the other player picks the material for that surface
// Then the roles swap and the next turn starts.

import { DEFAULT_ROOM_CONFIG } from '../config/room'

export const PLAYERS = ['A', 'B']

export const other = (player) => (player === 'A' ? 'B' : 'A')

export const initialGame = {
  version: 0, // bumped on every change; the highest version wins between windows
  round: 1,
  locator: 'A', // who picks the location this turn
  phase: 'location', // 'location' | 'material'
  surfaceId: null, // the location picked this turn
  config: DEFAULT_ROOM_CONFIG, // { [surfaceId]: materialId }
  lastMove: null, // { round, locator, chooser, surfaceId, materialId }
}

// Who has to act right now.
export function activePlayer(game) {
  return game.phase === 'location' ? game.locator : other(game.locator)
}

export function reducer(game, action) {
  switch (action.type) {
    case 'pickLocation':
      if (game.phase !== 'location' || action.player !== game.locator) return game
      return { ...game, version: game.version + 1, phase: 'material', surfaceId: action.surfaceId }

    case 'pickMaterial': {
      const chooser = other(game.locator)
      if (game.phase !== 'material' || action.player !== chooser) return game
      // Applying the material ends the turn: roles swap automatically.
      return {
        ...game,
        version: game.version + 1,
        round: game.round + 1,
        locator: chooser,
        phase: 'location',
        surfaceId: null,
        config: { ...game.config, [game.surfaceId]: action.materialId },
        lastMove: {
          round: game.round,
          locator: game.locator,
          chooser,
          surfaceId: game.surfaceId,
          materialId: action.materialId,
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
