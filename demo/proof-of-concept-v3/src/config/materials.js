// Material catalogue. Pure data describing how a finish should look;
// scene/useSurfaceMaterial.js turns an entry into a Three.js material.
//
// To add a finish: add an entry here (and a pattern in textures/patterns.js if it needs one).
//
//   pattern     id of a procedural texture, or null for a flat finish
//   tileSize    real-world size in metres that one texture repeat covers
//   bump        relief strength derived from the pattern (grout, plank gaps, ...)
//   physical    use MeshPhysicalMaterial (needed for transmission / clearcoat)
//   appliesTo   which surface kinds may use this finish
//   through     not a finish of one side but a fill for the whole wall (glass):
//               placed on a wall side, it opens that span through both halves
//               of the wall and fills it (see DEFAULT_GLAZING in room.js)
//
// A surface nobody has filled in yet shows BLANK: an architectural line
// drawing of the house in 3D (scene/blueprintMaterial.js). It isn't in MATERIALS, so
// it can't be given or placed.

export const MATERIALS = [
  {
    id: 'plaster',
    label: 'White plaster',
    appliesTo: ['wall', 'floor'],
    pattern: 'plaster',
    tileSize: 2,
    bump: 0.6,
    props: { color: '#ffffff', roughness: 0.95, metalness: 0 },
  },
  {
    id: 'concrete',
    label: 'Concrete',
    appliesTo: ['wall', 'floor'],
    pattern: 'concrete',
    tileSize: 1.2,
    bump: 1.5,
    props: { color: '#ffffff', roughness: 0.85, metalness: 0 },
  },
  {
    id: 'oak',
    label: 'Oak planks',
    appliesTo: ['wall', 'floor'],
    pattern: 'wood',
    tileSize: 1.2,
    bump: 1.2,
    props: { color: '#ffffff', roughness: 0.6, metalness: 0 },
  },
  {
    id: 'tiles',
    label: 'Ceramic tiles',
    appliesTo: ['wall', 'floor'],
    pattern: 'tiles',
    tileSize: 0.8,
    bump: 1.5,
    physical: true,
    props: { color: '#ffffff', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  },
  {
    id: 'terrazzo',
    label: 'Terrazzo',
    appliesTo: ['wall', 'floor'],
    pattern: 'terrazzo',
    tileSize: 1,
    bump: 0.3,
    physical: true,
    props: { color: '#ffffff', roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 },
  },
  {
    id: 'glass',
    label: 'Glass',
    appliesTo: ['wall'],
    through: true,
    pattern: null,
    physical: true,
    castShadow: false,
    swatch: 'linear-gradient(135deg, #e6f1f3 0%, #bcd5da 55%, #f4fafb 100%)',
    props: {
      color: '#dbeef0',
      roughness: 0.04,
      metalness: 0,
      transmission: 1,
      thickness: 0.15,
      ior: 1.5,
    },
  },
]

export const MATERIALS_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

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
