import { getPatternSwatch } from '../textures/patterns'

const SHEEN =
  'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3) 100%)'

// CSS background for a material's swatch: its procedural pattern, or a flat/gradient fill.
export function swatchStyle(material) {
  return {
    background: [
      // A metal reflects in the room; on a flat card a soft sheen stands in for that.
      (material.props?.metalness ?? 0) >= 0.5 && SHEEN, // BLANK has no props
      material.pattern ? `center / cover url(${getPatternSwatch(material)})` : material.swatch,
    ]
      .filter(Boolean)
      .join(', '),
  }
}

// Where a material can go, in words ("Walls only"), or null when it fits everywhere.
export function fitsLabel(material) {
  if (material.appliesTo.includes('wall') && material.appliesTo.includes('floor')) return null
  return material.appliesTo.includes('wall') ? 'Walls only' : 'Floor only'
}
