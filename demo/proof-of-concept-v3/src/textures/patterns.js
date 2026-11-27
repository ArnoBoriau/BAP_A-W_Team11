// Procedural, seamlessly tiling textures drawn on a canvas, one per material.
// No image assets needed, so the prototype runs offline and stays small.
// The look comes from the material's family (families.js) and its row's
// colour and settings. Each canvas is drawn the first time it's needed (a
// swatch on screen, a surface in the house) and cached.

import * as THREE from 'three'
import { FAMILIES, finish } from './families'
import { SIZE, hash, seededRandom } from './draw'

const canvasCache = new Map()
const textureCache = new Map()
const swatchCache = new Map()

// Does this material have a drawn texture (or only settings, like glass)?
export const hasPattern = (material) => !!FAMILIES[material.family]?.paint

export function getPatternCanvas(material) {
  if (!canvasCache.has(material.id)) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    const rand = seededRandom(hash(material.id))
    FAMILIES[material.family].paint(ctx, rand, material.row)
    finish(ctx, rand, material.row) // sparkle, slab joints: any family
    canvasCache.set(material.id, canvas)
  }
  return canvasCache.get(material.id)
}

/** Shared base texture. Clone it per surface to set an individual repeat. */
export function getPatternTexture(material) {
  if (!textureCache.has(material.id)) {
    const texture = new THREE.CanvasTexture(getPatternCanvas(material))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    textureCache.set(material.id, texture)
  }
  return textureCache.get(material.id)
}

export function getPatternSwatch(material) {
  if (!swatchCache.has(material.id)) swatchCache.set(material.id, getPatternCanvas(material).toDataURL('image/jpeg', 0.85))
  return swatchCache.get(material.id)
}

// CSS background for a family without a texture.
export const familySwatch = (material) => FAMILIES[material.family]?.swatch?.(material.row) ?? material.row.color
