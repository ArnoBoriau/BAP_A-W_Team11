// Where everything stands on the street, in metres.
// The road runs along x. The houses stand in a row on the north side (−z),
// each turned so its front door (the west side of the PoC plan) faces the road.
//
//        house 1      house 2      house 3   …
//      ┌─────────┐  ┌─────────┐  ┌─────────┐
//      │         │  │         │  │         │      z = HOUSE_Z
//      └────▯────┘  └────▯────┘  └────▯────┘      ▯ front door
//  ───────────────────────────────────────────    pavement
//  ═══════════════════════════════════════════    road (z = 0)
//  ───────────────────────────────────────────    pavement
//                       ▲ camera

import { FOOTPRINT } from '../house/config/room'
import { PLINTH_MARGIN } from '../house/scene/House'

export const LOT = FOOTPRINT.depth + PLINTH_MARGIN + 2.5 // width of one plot along the street
export const HOUSE_ROTATION = Math.PI / 2 // plan west → faces the road (+z)
const FRONT_GAP = 1.2 // between the pavement and the plinth
export const ROAD = { width: 6, pavement: 2 }
const PAVEMENT_EDGE = -ROAD.width / 2 - ROAD.pavement
export const HOUSE_Z = PAVEMENT_EDGE - FRONT_GAP - (FOOTPRINT.width + PLINTH_MARGIN) / 2

export const houseX = (index) => index * LOT
export const housePosition = (index) => [houseX(index), 0, HOUSE_Z]

// The front of a house (its façade line), where the number plate goes.
export const FRONT_Z = HOUSE_Z + FOOTPRINT.width / 2

// Camera on the street: on the far pavement, a bit above eye height, looking
// at the house slightly from the side, so the row reads as a row.
export const streetView = (index) => {
  const x = houseX(index)
  return { position: [x + 9, 9, 19], target: [x + 2, 1.2, HOUSE_Z + 2] }
}

// Camera visiting a house: above the front garden, looking down into it.
export const visitView = (index) => {
  const x = houseX(index)
  return { position: [x + 11, 15, HOUSE_Z + 17], target: [x, 0.6, HOUSE_Z] }
}
