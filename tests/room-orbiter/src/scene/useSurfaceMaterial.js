// Turns a material definition (config/materials.js) into a Three.js material
// sized for one surface, so texture scale stays consistent in real-world metres.

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getPatternTexture } from '../textures/patterns'

export function useSurfaceMaterial(definition, [width, height]) {
  const material = useMemo(() => {
    const MaterialClass = definition.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial
    const material = new MaterialClass({ ...definition.props, envMapIntensity: 0.9 })

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
  }, [definition, width, height])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.dispose()
    },
    [material],
  )

  return material
}
