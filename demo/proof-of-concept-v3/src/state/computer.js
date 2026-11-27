// The computer as the other hall: it steps in when nobody is there (see
// GameState.jsx). Pure: given the game, returns the action the computer takes,
// or null when it isn't its turn. GameState.jsx dispatches it after a short
// "thinking" pause.

import { activePlayer, fits, fitsRoom, picksFor, shownMaterialId, turnRoom } from './game'
import { SURFACES } from '../config/room'
import { MATERIALS, MATERIALS_BY_ID } from '../config/materials'

export const THINK_MS = [1200, 2400] // min, max pause before a move

export function computerMove(game, player) {
  if (activePlayer(game) !== player) return null

  if (game.phase === 'material') {
    // Materials that fit this room, preferring ones it didn't just get, so it doesn't repeat itself.
    const usable = shuffle(MATERIALS.filter((m) => fitsRoom(game, m)))
    const fresh = usable.filter((m) => !game.lastMove?.materialIds?.includes(m.id))
    const stale = usable.filter((m) => !fresh.includes(m))
    const materialIds = [...fresh, ...stale].slice(0, picksFor(game)).map((m) => m.id)
    return { type: 'sendMaterials', player, materialIds }
  }

  // One of the materials it got, somewhere in this turn's room where it fits:
  // a surface that isn't filled in yet if there is one, else one it actually changes.
  const room = turnRoom(game).id
  const options = game.materialIds.flatMap((materialId) =>
    SURFACES.filter((s) => s.roomId === room && fits(game, MATERIALS_BY_ID[materialId], s)).map((s) => ({ materialId, s })),
  )
  const blanks = options.filter(({ s }) => !shownMaterialId(game, s.id))
  const changes = options.filter(({ materialId, s }) => shownMaterialId(game, s.id) !== materialId)
  const { materialId, s } = pick(blanks.length ? blanks : changes.length ? changes : options)
  return { type: 'placeMaterial', player, materialId, surfaceId: s.id }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => list.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x)
