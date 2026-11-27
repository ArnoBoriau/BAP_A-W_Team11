// v3: what one hall's particles screen shows (?screen=particles&side=A).
// Each player has their own side, and it follows the turn as it happens:
//
//   giver picks a material     → the giver's side: that material, no form yet
//                                (of the three, the one clicked last)
//   giver sends them           → the placer's side receives them: the first
//                                one shows (the giver's keeps its last)
//   placer picks one, a place  → the placer's side: that material, in that element's form
//   placer places it           → both sides: the move as placed
//   nothing going on           → the last thing shown stays, and roams (render/canvas.js)
//
// `preview` is the latest pick this side's player made but didn't send yet
// ({ round, materialId, surfaceId }), sent by their window (GameState preview()).
// A view is { key, move, status }: the screen only builds a new field when the
// key changes, so sending what you picked doesn't restart it.

import { SURFACES_BY_ID } from '../config/room'
import { hallName, isFinished, other, turnRoom } from '../state/game'
import { fromPocMaterial, fromPocMove } from './adapters'

export function sideView(side, game, preview) {
  const me = hallName(side)
  const them = hallName(other(side))
  const last = game.lastMove
  const placed = last
    ? {
        key: `placed|${last.round}|${last.surfaceId}|${last.materialId}`,
        move: fromPocMove(last, SURFACES_BY_ID[last.surfaceId]),
      }
    : { key: null, move: null }

  const room = turnRoom(game)
  if (isFinished(game) || !room) return { ...placed, status: 'The house is finished' }

  const giving = game.giver === side
  const pick = preview?.round === game.round ? preview : null
  const material = (id) => ({ key: `material|${game.round}|${id}`, move: fromPocMaterial(id, room.id, game.round) })

  if (game.phase === 'material') {
    if (giving && pick?.materialId) return { ...material(pick.materialId), status: `${me} is choosing materials` }
    return { ...placed, status: giving ? `${me} picks materials` : `Waiting for materials from ${them}` }
  }

  // place phase: the materials are on their way to the placer
  if (giving) return { ...material(pick?.materialId ?? game.materialIds[0]), status: `Sent to ${them}` }
  const chosen = game.materialIds.includes(pick?.materialId) ? pick.materialId : game.materialIds[0]
  const surface = pick?.surfaceId && SURFACES_BY_ID[pick.surfaceId]
  if (surface) {
    const move = fromPocMove({ round: game.round, materialId: chosen, surfaceId: surface.id }, surface)
    // the same key as when it's placed there: placing it doesn't restart the field
    return { key: `placed|${game.round}|${surface.id}|${chosen}`, move, status: `${me} is trying a place` }
  }
  return { ...material(chosen), status: pick?.materialId ? `${me} is trying a material` : `Received from ${them}` }
}
