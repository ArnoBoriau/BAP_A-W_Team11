// Material catalogue: the rows from src/data/catalogue.js (one per material,
// see src/data/README.md), turned into what the rest of the app uses.
// scene/useSurfaceMaterial.js turns a material into a Three.js material,
// textures/patterns.js draws its texture from its family.
//
// A material here:
//   id, label             from the row (label = name)
//   categories            every category it belongs to (some fit two: cork
//                         is wood and a natural material)
//   category              the first of those, its main one: it decides the
//                         order under "All" and the particles' stand-in
//   family, row           which painter draws it, and the row it draws from
//   pattern               true when it has a drawn texture (glass doesn't)
//   swatch                CSS background for materials without a texture
//   tileSize              real-world size in metres that one texture repeat covers
//   bump                  relief strength derived from the texture
//   physical              use MeshPhysicalMaterial (transmission / clearcoat)
//   props                 Three.js material settings (roughness, metalness…)
//   appliesTo             which surface kinds may use this finish
//   through               not a finish of one side but a fill for the whole wall
//                         (glass): placed on a wall side, it opens that span
//                         through both halves of the wall and fills it (see
//                         DEFAULT_GLAZING in room.js)
//
// A surface nobody has filled in yet shows BLANK: an architectural line
// drawing of the house in 3D (scene/blueprintMaterial.js). It isn't in MATERIALS, so
// it can't be given or placed.

import { CATEGORIES } from './categories'
import { ROWS } from '../data/catalogue'
import { familySwatch, hasPattern } from '../textures/patterns'

function fromRow(row) {
  const params = row.params ?? {}
  const transmission = params.transmission ?? 0
  // The house stands in a dark room: a near-mirror metal reflects that
  // darkness and turns black. Metals keep a little of their own colour, a
  // slightly soft reflection and a stronger one of the room's light panels,
  // so copper reads as copper from any angle. (The row keeps the true values.)
  // A mirror (chrome, silver, mirrored glass) is the exception: it stays a
  // mirror and reflects the house itself (scene/MirrorProbe.jsx), not the room.
  const mirror = !!params.mirror
  const metal = (row.metalness ?? 0) >= 0.5 && !mirror
  const material = {
    id: row.id,
    label: row.name,
    categories: row.categories,
    category: row.categories[0],
    family: row.family,
    row: { ...row, params },
    appliesTo: row.surfaces,
    through: !!row.through,
    tileSize: row.tile ?? 1,
    bump: row.bump ?? 0,
    physical: !!(row.clearcoat || transmission || params.iridescence),
    castShadow: !transmission,
    props: {
      // a drawn texture carries the colour; without one, the row's colour is the colour
      color: '#ffffff',
      roughness: metal ? Math.max(row.roughness, 0.4) : (row.roughness ?? 0.6),
      metalness: metal ? Math.min(row.metalness, 0.7) : (row.metalness ?? 0),
      ...(metal ? { envMapIntensity: 0.55 } : {}),
      ...(row.clearcoat ? { clearcoat: row.clearcoat, clearcoatRoughness: params.clearcoatRoughness ?? 0.25 } : {}),
      ...(transmission ? { transmission, thickness: params.thickness ?? 0.15, ior: params.ior ?? 1.5 } : {}),
      // dichroic glass: a colour that shifts with the angle you look at it from
      ...(params.iridescence ? { iridescence: params.iridescence, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 800] } : {}),
    },
  }
  material.pattern = hasPattern(material)
  if (!material.pattern) {
    material.props.color = row.color
    material.swatch = familySwatch(material)
  }
  return material
}

// In category order, so "All" in the picker reads category by category.
const order = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]))
export const MATERIALS = ROWS.map(fromRow).sort((a, b) => order[a.category] - order[b.category])

export const MATERIALS_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

// Every category with its materials, in category order. A material in two
// categories is in both lists. Categories without materials (yet) are kept:
// the picker shows them, empty.
export const MATERIALS_BY_CATEGORY = CATEGORIES.map((category) => ({
  ...category,
  materials: MATERIALS.filter((m) => m.categories.includes(category.id)),
}))

export const BLANK = {
  id: 'blank',
  label: 'Not filled in',
  blank: true,
  appliesTo: [],
  pattern: null,
  castShadow: false,
  swatch: '#141413', // the dark face of the line drawing; the swatch's rule draws its outline
}

// A surface's material by id; no id (not filled in yet) is BLANK.
export const materialOf = (id) => (id ? MATERIALS_BY_ID[id] : BLANK)

export function materialsFor(kind) {
  return MATERIALS.filter((m) => m.appliesTo.includes(kind))
}
