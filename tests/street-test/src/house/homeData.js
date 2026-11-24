// What a saved home is. Pure data, no React or Three.js: used by the street,
// by the save endpoint (home-store.js) and by the seed script.
//
//   {
//     "number": 3,                       // its place on the street (No. 3)
//     "builtAt": "2026-11-24T14:05:00Z",
//     "name": "…",                       // optional, if the players gave one
//     "config":  { surfaceId: materialId | null },   // = game.config  in the PoC
//     "glazing": { surfaceId: materialId }           // = game.glazing in the PoC
//   }
//
// config and glazing are exactly what demo/proof-of-concept-v2 keeps in its
// game state, so a finished game can be saved as is.

import { MATERIALS_BY_ID } from './config/materials.js'
import { AREAS, SURFACES, SURFACES_BY_ID } from './config/room.js'

// A home as the street can use it: every surface present, unknown surfaces
// and materials (from an older or newer floor plan) dropped.
export function normalizeHome(raw) {
  const config = {}
  for (const s of SURFACES) {
    const id = raw.config?.[s.id]
    config[s.id] = MATERIALS_BY_ID[id] && !MATERIALS_BY_ID[id].through ? id : null
  }
  const glazing = {}
  for (const [surfaceId, id] of Object.entries(raw.glazing ?? {})) {
    if (SURFACES_BY_ID[surfaceId] && MATERIALS_BY_ID[id]?.through) glazing[surfaceId] = id
  }
  return {
    number: Number(raw.number),
    builtAt: raw.builtAt ?? null,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 60) : null,
    config,
    glazing,
  }
}

// Is it worth putting on the street? At least one surface filled in.
export function hasAnything(home) {
  return Object.values(home.config).some(Boolean) || Object.keys(home.glazing).length > 0
}

// Per area (rooms, then the outside): which materials went on its floor and
// walls, for the house's description. Glass counts as a wall material.
export function describe(home) {
  return AREAS.map((area) => {
    const surfaces = SURFACES.filter((s) => s.roomId === area.id)
    const pick = (kind) => [
      ...new Set(
        surfaces
          .filter((s) => s.kind === kind)
          .map((s) => home.glazing[s.id] ?? home.config[s.id])
          .filter(Boolean),
      ),
    ]
    const blanks = surfaces.filter((s) => !(home.glazing[s.id] ?? home.config[s.id])).length
    return { area, floor: pick('floor'), walls: pick('wall'), blanks }
  })
}
