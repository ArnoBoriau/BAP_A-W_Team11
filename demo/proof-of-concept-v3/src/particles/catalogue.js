// Every material in the game gets its own particle reading (board step 3: "the
// material gives the characteristics"), read from how it looks: its texture
// family gives a base (veined stone branches and flows, a weave is woven,
// bricks are modular), the row's settings shift it (pores make it porous, a
// clear pane transparent, joints modular, brushed metal linear…).
//
// The materials tuned by hand in data/materials.js (oak, concrete, glass, cork,
// plaster, tiles, terrazzo, brick) keep their own versions. A row can still
// choose: `particles` with another material's id borrows that reading, an object
// of tags sets it outright (see src/data/README.md).
//
// The result is one version per material, added to data/materials.js so
// resolve() finds it like any other.

import { MATERIALS as GAME } from '../config/materials'
import { MATERIALS_BY_ID as TUNED, addMaterials } from './data/materials.js'

// family → [density, structure, character, movement, how the version is called]
const BASE = {
  planks: ['dense', 'linear', ['organic'], 'flowing', 'boards'],
  sheet: ['dense', 'linear', ['organic', 'soft'], 'flowing', 'sheet'],
  lamella: ['dense', 'modular', ['organic', 'geometric'], 'rhythmic', 'laminated'],
  bamboo: ['dense', 'linear', ['organic', 'geometric'], 'rhythmic', 'stems'],
  cork: ['porous', 'fragmented', ['organic', 'soft'], 'still', 'granules'],
  osb: ['dense', 'fragmented', ['organic', 'rigid'], 'dispersing', 'strands'],
  chipboard: ['dense', 'fragmented', ['organic'], 'dispersing', 'pressed'],
  mdf: ['solid', 'monolithic', ['soft'], 'still', 'board'],
  plaster: ['solid', 'monolithic', ['soft'], 'still', 'smooth'],
  concrete: ['solid', 'monolithic', ['rigid'], 'still', 'cast'],
  motif: ['dense', 'modular', ['geometric'], 'rhythmic', 'patterned'],
  terrazzo: ['dense', 'fragmented', ['geometric', 'organic'], 'still', 'chips'],
  tiles: ['dense', 'modular', ['geometric'], 'rhythmic', 'tiled'],
  veined: ['solid', 'branching', ['organic'], 'flowing', 'veined'],
  granular: ['dense', 'fragmented', ['rigid'], 'still', 'crystals'],
  sediment: ['dense', 'linear', ['organic'], 'still', 'layered'],
  cleft: ['dense', 'linear', ['rigid'], 'rhythmic', 'split'],
  flagstone: ['dense', 'modular', ['organic', 'rigid'], 'still', 'laid'],
  pebbles: ['open', 'fragmented', ['organic', 'soft'], 'dispersing', 'pebbles'],
  metal: ['solid', 'monolithic', ['rigid', 'geometric'], 'still', 'sheet'],
  rust: ['dense', 'fragmented', ['organic'], 'dispersing', 'weathered'],
  glass: ['open', 'monolithic', ['geometric'], 'flowing', 'pane'],
  glazing: ['open', 'monolithic', ['geometric'], 'still', 'patterned pane'],
  plastic: ['dense', 'monolithic', ['soft'], 'still', 'panel'],
  felt: ['porous', 'woven', ['soft', 'organic'], 'still', 'felt'],
  woven: ['dense', 'woven', ['soft', 'organic'], 'rhythmic', 'woven'],
  brick: ['dense', 'modular', ['rigid'], 'rhythmic', 'laid'],
  leather: ['dense', 'monolithic', ['organic', 'soft'], 'still', 'hide'],
}

// a glazing pattern → [structure, movement, character]
const GLAZING = {
  wired: ['woven', 'still', 'geometric'],
  fluted: ['linear', 'rhythmic', 'geometric'],
  channel: ['linear', 'rhythmic', 'geometric'],
  multiwall: ['linear', 'rhythmic', 'geometric'],
  blocks: ['modular', 'rhythmic', 'geometric'],
  hammered: ['fragmented', 'still', 'organic'],
  rolled: ['linear', 'flowing', 'soft'],
  etched: ['linear', 'still', 'geometric'],
  fused: ['branching', 'dispersing', 'organic'],
}

const add = (list, value) => (list.includes(value) ? list : [...list, value].slice(-2))

// how light a colour is, 0 (black) … 1 (white)
function lightness(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
const DENSER = { porous: 'open', open: 'dense', dense: 'solid', solid: 'solid' }
const LIGHTER = { solid: 'dense', dense: 'open', open: 'porous', porous: 'porous' }

export function readMaterial({ family, row }) {
  const p = row.params ?? {}
  let [density, structure, character, movement, label] = BASE[family] ?? ['dense', 'monolithic', ['soft'], 'still', 'surface']
  let transparency = 'opaque'

  // per family
  if (family === 'glazing' && GLAZING[p.pattern]) {
    const [s, m, c] = GLAZING[p.pattern]
    structure = s; movement = m; character = [c]; label = `${p.pattern} pane`
  }
  if (family === 'concrete') {
    if (p.aggregate) { structure = 'fragmented'; label = 'polished' }
    if (p.fibres) { structure = 'woven'; label = 'fibre-reinforced' }
    if (p.stains || p.trowel) { movement = 'flowing'; character = add(character, 'soft') }
    if (p.bugholes) density = 'dense'
    if (p.holes !== false && !p.aggregate && !p.fibres) { structure = 'modular'; movement = 'rhythmic'; label = 'formwork' }
  }
  if (family === 'metal') {
    if (p.brushed >= 0.3) { structure = 'linear'; movement = 'flowing'; label = 'brushed' }
    if (p.hammered) { character = ['organic', 'rigid']; movement = 'rhythmic'; label = 'hammered' }
    if (p.patina) { character = add(character, 'organic'); movement = 'dispersing'; label = 'patinated' }
  }
  if (family === 'plastic') {
    if (p.finish === 'textured') { structure = 'fragmented'; label = 'textured' }
    if (p.finish === 'speckled') { structure = 'fragmented'; movement = 'dispersing'; label = 'speckled' }
    if (p.finish === 'printed') { structure = 'linear'; movement = 'rhythmic'; character = ['geometric']; label = 'printed' }
  }
  if (family === 'tiles') {
    if ((p.tiles ?? 4) >= 10) label = 'mosaic'
    if ((p.variance ?? 1) >= 3) { character = add(character, 'organic'); label = 'handmade' }
    if (p.glaze === 0) { character = add(character, 'soft'); label = 'unglazed' }
  }
  if (family === 'woven') {
    if ((p.threads ?? 48) < 30) density = 'open'
    if (row.roughness <= 0.3) movement = 'flowing'
  }
  if (family === 'planks') {
    if ((p.grain ?? 1) >= 1.3) movement = 'rhythmic'
    if ((p.grain ?? 1) <= 0.5) movement = 'still'
  }
  if (family === 'veined' && p.bands) { structure = 'linear'; label = 'banded' }
  if (family === 'sediment' && p.elongated) structure = 'linear'
  if (family === 'pebbles' && p.rim) character = add(character, 'rigid')
  if (family === 'granular' && p.bands) { structure = 'linear'; label = 'banded' }

  // any family
  if (p.pores >= 2) { density = 'porous'; structure = 'fragmented'; movement = 'expanding'; label = 'porous' }
  else if (p.pores) density = 'porous'
  if (p.layers >= 1.5) { structure = 'linear'; label = 'layered' }
  if (p.knots) character = add(character, 'organic')
  if (p.streaks >= 0.5) movement = 'rhythmic'
  if (p.joints && structure === 'monolithic') { structure = 'modular'; movement = movement === 'still' ? 'rhythmic' : movement }
  if (row.metalness >= 0.5) character = add(character, 'rigid')
  if (row.clearcoat >= 0.5 && row.roughness <= 0.2 && movement === 'still') movement = 'flowing'
  if (p.transmission) {
    transparency = p.transmission >= 0.8 && row.roughness < 0.2 ? 'transparent' : 'translucent'
    if (row.roughness >= 0.3) { character = add(character, 'soft'); label = 'frosted' }
  }
  if (p.iridescence) { movement = 'expanding'; label = 'iridescent' }
  if (row.roughness >= 0.95 && density === 'dense') density = 'porous'
  // a heavy, dark material reads denser; a light, matte one more open (ebony vs balsa)
  const light = lightness(row.color)
  if (light < 0.25) density = DENSER[density]
  else if (light > 0.82 && row.roughness >= 0.6) density = LIGHTER[density]

  return { label, tags: { density, structure, character, movement, transparency } }
}

function particleMaterialOf(material) {
  const { label, tags } = readMaterial(material)
  const own = typeof material.row.particles === 'object' ? material.row.particles : tags
  return { id: material.id, category: material.category, label: material.label, versions: [{ id: 'own', label, tags: own }] }
}

// Register every game material the hand-tuned list doesn't have.
addMaterials(GAME.filter((m) => !TUNED[m.id]).map(particleMaterialOf))

// The particle material to show for a game material: its own (or the one its row borrows).
export function particleMaterial(materialId) {
  const borrowed = GAME.find((m) => m.id === materialId)?.row.particles
  return typeof borrowed === 'string' && TUNED[borrowed] ? borrowed : materialId
}
