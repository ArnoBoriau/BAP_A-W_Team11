// A mirror's own reflection: a small cube camera just in front of the surface
// captures the house around it, and the surface's material reflects that
// instead of the dark room. For materials whose row says `mirror` (mirrored
// glass, chrome, silver).
//
// The capture runs a few times a second, not every frame: the house only
// changes when a material is placed or a wall folds. The mirror itself is
// hidden while capturing, so it doesn't reflect its own back. Behind the house
// it sees the room's lighting (the light panels of <Environment>) instead of
// the dark background: a mirror of a dark room would only show black.

/* eslint-disable react-hooks/immutability -- the material and the mirror's group are
   three.js objects, changed in place on purpose (its envMap, hiding it while capturing) */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCubeCamera } from '@react-three/drei'

const EVERY = 8 // frames between captures

export function MirrorProbe({ material, position, hide }) {
  const { fbo, camera } = useCubeCamera({ resolution: 256, near: 0.05, far: 60 })
  const { gl, scene } = useThree()
  const frame = useRef(0)

  useEffect(() => {
    const before = { envMap: material.envMap, envMapIntensity: material.envMapIntensity }
    material.envMap = fbo.texture
    material.envMapIntensity = 1
    material.needsUpdate = true
    return () => {
      Object.assign(material, before)
      material.needsUpdate = true
    }
  }, [material, fbo])

  useFrame(() => {
    if (frame.current++ % EVERY) return
    const own = hide.current
    const background = scene.background
    if (own) own.visible = false
    scene.background = scene.environment ?? background
    camera.update(gl, scene)
    // the material reads a pre-blurred copy (PMREM); rebuild it from this capture
    fbo.texture.needsPMREMUpdate = true
    scene.background = background
    if (own) own.visible = true
  })

  return <primitive object={camera} position={position} />
}
