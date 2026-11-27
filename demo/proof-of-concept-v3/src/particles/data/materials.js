// Materials and their versions (board: "4 versions per material"). Each version
// has its own tags from the characteristics library, so four versions of wood
// can look different (board step 3: "the material gives the characteristics").
//
// PLACEHOLDER: the real list comes from the client (the exhibitors' materials).
// These are the PoC's materials plus the board's cork and brick examples, with
// tags that are a first guess. The ids of oak, concrete, glass, plaster, tiles
// and terrazzo match demo/proof-of-concept-v2, so a PoC move can be shown as is
// (see adapters.js).
//
// Each material has a category from config/categories.js (the same as in the game).
//
// Tags: density · structure · character (one or more) · movement · transparency

const v = (id, label, density, structure, character, movement, transparency) => ({
  id,
  label,
  tags: { density, structure, character, movement, transparency },
})

export const MATERIALS = [
  {
    id: 'cork',
    category: 'natural',
    label: 'Cork',
    versions: [
      v('natural', 'Natural', 'porous', 'fragmented', ['organic', 'soft'], 'still', 'opaque'),
      v('expanded', 'Expanded', 'open', 'fragmented', ['organic'], 'expanding', 'opaque'),
      v('pressed', 'Pressed', 'dense', 'modular', ['soft'], 'still', 'opaque'),
      v('panel', 'Acoustic panel', 'porous', 'modular', ['soft', 'geometric'], 'rhythmic', 'opaque'),
    ],
  },
  {
    id: 'oak',
    category: 'wood',
    label: 'Oak',
    versions: [
      v('natural', 'Natural', 'dense', 'linear', ['organic'], 'flowing', 'opaque'),
      v('smoked', 'Smoked', 'solid', 'linear', ['organic', 'rigid'], 'still', 'opaque'),
      v('slatted', 'Slatted', 'open', 'linear', ['geometric'], 'rhythmic', 'opaque'),
      v('translucent', 'Translucent', 'porous', 'linear', ['organic', 'soft'], 'flowing', 'translucent'),
    ],
  },
  {
    id: 'concrete',
    category: 'concrete',
    label: 'Concrete',
    versions: [
      v('raw', 'Raw', 'solid', 'monolithic', ['rigid'], 'still', 'opaque'),
      v('polished', 'Polished', 'solid', 'monolithic', ['geometric'], 'flowing', 'opaque'),
      v('precast', 'Precast', 'dense', 'modular', ['geometric', 'rigid'], 'rhythmic', 'opaque'),
      v('perforated', 'Perforated', 'porous', 'modular', ['geometric'], 'still', 'opaque'),
    ],
  },
  {
    id: 'glass',
    category: 'glass',
    label: 'Glass',
    versions: [
      v('clear', 'Clear', 'open', 'monolithic', ['geometric'], 'flowing', 'transparent'),
      v('frosted', 'Frosted', 'open', 'monolithic', ['soft'], 'still', 'translucent'),
      v('laminated', 'Laminated', 'dense', 'linear', ['geometric'], 'still', 'transparent'),
      v('fluted', 'Fluted', 'open', 'linear', ['soft', 'geometric'], 'rhythmic', 'translucent'),
    ],
  },
  {
    id: 'brick',
    category: 'ceramics',
    label: 'Brick',
    versions: [
      v('stretcher', 'Stretcher bond', 'dense', 'modular', ['rigid'], 'still', 'opaque'),
      v('perforated', 'Perforated bond', 'porous', 'modular', ['geometric'], 'rhythmic', 'opaque'),
      v('handmade', 'Handmade', 'dense', 'modular', ['organic', 'rigid'], 'still', 'opaque'),
      v('glazed', 'Glazed', 'dense', 'modular', ['geometric'], 'flowing', 'translucent'),
    ],
  },
  {
    id: 'textile',
    category: 'natural',
    label: 'Textile',
    versions: [
      v('linen', 'Linen', 'open', 'woven', ['soft', 'organic'], 'flowing', 'translucent'),
      v('felt', 'Felt', 'solid', 'woven', ['soft'], 'still', 'opaque'),
      v('mesh', 'Mesh', 'porous', 'woven', ['geometric'], 'rhythmic', 'transparent'),
      v('rope', 'Rope', 'open', 'branching', ['organic'], 'expanding', 'opaque'),
    ],
  },
  {
    id: 'plaster',
    category: 'stone',
    label: 'Plaster',
    versions: [v('lime', 'Lime', 'solid', 'monolithic', ['soft'], 'still', 'opaque')],
  },
  {
    id: 'tiles',
    category: 'ceramics',
    label: 'Ceramic tiles',
    versions: [v('glazed', 'Glazed', 'dense', 'modular', ['geometric'], 'rhythmic', 'opaque')],
  },
  {
    id: 'terrazzo',
    category: 'concrete',
    label: 'Terrazzo',
    versions: [v('classic', 'Classic', 'dense', 'fragmented', ['geometric', 'organic'], 'still', 'opaque')],
  },
]

export const MATERIALS_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

export function findVersion(materialId, versionId) {
  const material = MATERIALS_BY_ID[materialId]
  if (!material) return null
  const version = material.versions.find((x) => x.id === versionId) ?? material.versions[0]
  return { material, version }
}
