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
import { MATERIALS_BY_ID as PARTICLE_MATERIALS } from './data/materials.js'
import { hashSeed } from './engine/random.js'
import { MATERIALS_BY_ID } from '../config/materials'

// The game has far more materials than the particles have characteristics
// for. A material the particles don't know shows a stand-in from its
// category (a row can name its own with `particles`, see src/data/README.md).
const STAND_IN = { wood: 'oak', natural: 'cork', stone: 'terrazzo', concrete: 'concrete', glass: 'glass', ceramics: 'tiles', metals: 'steel', plastics: 'plastic', bioplastics: 'plastic' }

export function particleMaterial(materialId) {
  if (PARTICLE_MATERIALS[materialId]) return materialId
  const material = MATERIALS_BY_ID[materialId]
  return material?.row.particles ?? STAND_IN[material?.category] ?? materialId
}

const ROOM = { living: 'living', bathroom: 'bathroom', bedroom: 'master', kitchen: 'kitchen', hallway: 'hallway', outside: 'exterior' }

// v3: a material that has no place yet (picked, sent or received), for the
// turn's room. Same seed on both sides, so the giver's "sent" and the placer's
// "received" are the same field.
export function fromPocMaterial(materialId, roomId, round) {
  return { room: ROOM[roomId] ?? null, material: particleMaterial(materialId), seed: hashSeed('poc-material', round, materialId) }
}

export function fromPocMove(lastMove, surface) {
  const room = ROOM[surface.roomId] ?? 'living'
  let element = surface.kind === 'floor' ? 'floor' : surface.facade ? 'outside_wall' : 'wall'
  if (MATERIALS_BY_ID[lastMove.materialId]?.through) {
    // glass goes through the wall: the room's filtering opening
    const opening = ROOMS_BY_ID[room].elements.find((e) => e.behaviour === 'filtering' && e.type === 'architectural')
    if (opening) element = opening.id
  }
  return {
    room,
    element,
    material: particleMaterial(lastMove.materialId),
    seed: hashSeed('poc', lastMove.round, lastMove.surfaceId),
  }
}
