// The computer as the other player: for testing (or playing) with one screen.
// Pure: given the game, returns the action the computer takes, or null when
// it isn't its turn. GameState.jsx dispatches it after a short "thinking" pause.

import { activePlayer } from './game'
import { SURFACES } from '../config/room'
import { MATERIALS, MATERIALS_BY_ID } from '../config/materials'

export const THINK_MS = [1200, 2400] // min, max pause before a move

export function computerMove(game, player) {
  if (activePlayer(game) !== player) return null

  if (game.phase === 'material') {
    // Anything but the material it got last, so it doesn't repeat itself.
    const options = MATERIALS.filter((m) => m.id !== game.lastMove?.materialId)
    return { type: 'giveMaterial', player, materialId: pick(options).id }
  }

  // Somewhere the material fits and actually changes something.
  const material = MATERIALS_BY_ID[game.materialId]
  const fits = SURFACES.filter((s) => material.appliesTo.includes(s.kind))
  const changes = fits.filter((s) => game.config[s.id] !== material.id)
  return { type: 'placeMaterial', player, surfaceId: pick(changes.length ? changes : fits).id }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
