import { getPatternSwatch } from './textures/patterns'

// CSS background for a material's swatch: its procedural pattern, or a flat/gradient fill.
export function swatchStyle(material) {
  return {
    background: material.pattern ? `center / cover url(${getPatternSwatch(material.pattern)})` : material.swatch,
  }
}

// Where a material can go, in words ("Walls only"), or null when it fits everywhere.
export function fitsLabel(material) {
  if (material.appliesTo.includes('wall') && material.appliesTo.includes('floor')) return null
  return material.appliesTo.includes('wall') ? 'Walls only' : 'Floor only'
}
