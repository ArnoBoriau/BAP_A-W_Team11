// Orbit camera. When the selection changes, it glides to a view that faces
// the selected wall (or looks down onto the floor).

import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'

const TARGET = [0, 0.9, 0]
const WALL_POLAR = 1.05 // radians from straight up
const FLOOR_POLAR = 0.5

export function CameraRig({ surfaces, selectedId }) {
  const controls = useRef()
  const previousId = useRef(selectedId)

  useEffect(() => {
    controls.current?.setTarget(...TARGET, false)
  }, [])

  useEffect(() => {
    const c = controls.current
    if (!c || previousId.current === selectedId) return
    previousId.current = selectedId

    const surface = surfaces.find((s) => s.id === selectedId)
    if (!surface) return
    if (surface.kind === 'floor') {
      c.rotatePolarTo(FLOOR_POLAR, true)
    } else {
      // Take the shortest way round instead of unwinding accumulated turns.
      const delta =
        THREE.MathUtils.euclideanModulo(surface.rotationY - c.azimuthAngle + Math.PI, Math.PI * 2) - Math.PI
      c.rotateTo(c.azimuthAngle + delta, WALL_POLAR, true)
    }
  }, [selectedId, surfaces])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={5}
      maxDistance={18}
      minPolarAngle={0.15}
      maxPolarAngle={1.42}
      smoothTime={0.35}
    />
  )
}
