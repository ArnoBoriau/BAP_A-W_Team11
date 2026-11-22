// The computer as the other player: for testing (or playing) with one screen.
// Pure: given the game, returns the action the computer takes, or null when
// it isn't its turn. GameState.jsx dispatches it after a short "thinking" pause.

import { activePlayer, fits, fitsRoom, shownMaterialId, turnRoom } from './game'
import { SURFACES } from '../config/room'
import { MATERIALS, MATERIALS_BY_ID } from '../config/materials'

export const THINK_MS = [1200, 2400] // min, max pause before a move

export function computerMove(game, player) {
  if (activePlayer(game) !== player) return null

  if (game.phase === 'material') {
    // Something that fits this room, and not the material it got last, so it doesn't repeat itself.
    const usable = MATERIALS.filter((m) => fitsRoom(game, m))
    const options = usable.filter((m) => m.id !== game.lastMove?.materialId)
    return { type: 'giveMaterial', player, materialId: pick(options.length ? options : usable).id }
  }

  // Somewhere in this turn's room where the material fits: a surface that
  // isn't filled in yet if there is one, else one it actually changes.
  const material = MATERIALS_BY_ID[game.materialId]
  const room = turnRoom(game).id
  const fitting = SURFACES.filter((s) => s.roomId === room && fits(game, material, s))
  const blanks = fitting.filter((s) => !shownMaterialId(game, s.id))
  const changes = fitting.filter((s) => shownMaterialId(game, s.id) !== material.id)
  return { type: 'placeMaterial', player, surfaceId: pick(blanks.length ? blanks : changes.length ? changes : fitting).id }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
