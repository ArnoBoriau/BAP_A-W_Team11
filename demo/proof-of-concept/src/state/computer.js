// The computer as the other player: for testing (or playing) with one screen.
// Pure: given the game, returns the action the computer takes, or null when
// it isn't its turn. GameState.jsx dispatches it after a short "thinking" pause.

import { activePlayer } from './game'
import { SURFACES } from '../config/room'
import { materialsFor } from '../config/materials'

export const THINK_MS = [1200, 2400] // min, max pause before a move

export function computerMove(game, player) {
  if (activePlayer(game) !== player) return null

  if (game.phase === 'location') {
    // Anything but the place that was just changed, so it doesn't repeat itself.
    const options = SURFACES.filter((s) => s.id !== game.lastMove?.surfaceId)
    return { type: 'pickLocation', player, surfaceId: pick(options).id }
  }

  const surface = SURFACES.find((s) => s.id === game.surfaceId)
  const options = materialsFor(surface.kind).filter((m) => m.id !== game.config[surface.id])
  return { type: 'pickMaterial', player, materialId: pick(options).id }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
