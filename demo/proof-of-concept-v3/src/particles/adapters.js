// From the game's last move to a particles move.
// (Copied from tests/material-particles, where this file is the bridge.)
//
// The PoC doesn't have elements or material versions yet: a turn puts a
// material on a surface (a floor, a wall, a façade). Until the game uses the
// board's rooms and elements, this translates its last move:
//
//   PoC room   living, bathroom, bedroom, kitchen, hallway, outside
//   surface    floor → floor · wall → wall · façade → outside_wall
//              glass on a wall → the room's window (or opening): it filters
//   material   the PoC id, first version (the ids are the same in data/materials.js)
//
// Used by ui/ParticlesScreen.jsx on every new placement. The seed comes from
// the move itself, so every particles screen shows exactly the same thing.

import { ROOMS_BY_ID } from './data/rooms.js'
import { hashSeed } from './engine/random.js'

const ROOM = { living: 'living', bathroom: 'bathroom', bedroom: 'master', kitchen: 'kitchen', hallway: 'hallway', outside: 'exterior' }

// v3: a material that has no place yet (picked, sent or received), for the
// turn's room. Same seed on both sides, so the giver's "sent" and the placer's
// "received" are the same field.
export function fromPocMaterial(materialId, roomId, round) {
  return { room: ROOM[roomId] ?? null, material: materialId, seed: hashSeed('poc-material', round, materialId) }
}

export function fromPocMove(lastMove, surface) {
  const room = ROOM[surface.roomId] ?? 'living'
  let element = surface.kind === 'floor' ? 'floor' : surface.facade ? 'outside_wall' : 'wall'
  if (lastMove.materialId === 'glass') {
    // glass goes through the wall: the room's filtering opening
    const opening = ROOMS_BY_ID[room].elements.find((e) => e.behaviour === 'filtering' && e.type === 'architectural')
    if (opening) element = opening.id
  }
  return {
    room,
    element,
    material: lastMove.materialId,
    seed: hashSeed('poc', lastMove.round, lastMove.surfaceId),
  }
}
