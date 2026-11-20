// Turns a material definition (config/materials.js) into a Three.js material
// sized for one surface, so texture scale stays consistent in real-world metres.

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getPatternTexture } from '../textures/patterns'

// `overrides` are extra material parameters (e.g. transparency for a fade);
// pass a stable object, it is part of the memo key.
export function useSurfaceMaterial(definition, [width, height], overrides) {
  const material = useMemo(() => {
    const MaterialClass = definition.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial
    const material = new MaterialClass({ ...definition.props, envMapIntensity: 0.9, ...overrides })

    if (definition.pattern) {
      const texture = getPatternTexture(definition.pattern).clone()
      texture.repeat.set(width / definition.tileSize, height / definition.tileSize)
      texture.needsUpdate = true
      material.map = texture
      if (definition.bump) {
        material.bumpMap = texture
        material.bumpScale = definition.bump
      }
    }
    return material
  }, [definition, width, height, overrides])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.dispose()
    },
    [material],
  )

  return material
}
