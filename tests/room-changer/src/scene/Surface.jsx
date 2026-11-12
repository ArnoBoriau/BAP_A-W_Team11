// One configurable room element (a wall or the floor).
// Walls facing the camera fold down to a low stub ("dollhouse" cutaway),
// so the inside of the room stays visible from every angle.

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useSurfaceMaterial } from './useSurfaceMaterial'

const CUT_HEIGHT = 0.12 // fraction of wall height left when cut away
const CUT_THRESHOLD = 0.3 // how far the camera must be "behind" a wall before it folds
const SELECT_COLOR = '#ff6a3d'
const HOVER_COLOR = '#8a8a8a'

const outward = new THREE.Vector3()
const toCamera = new THREE.Vector3()

export function Surface({ surface, definition, selected, onSelect }) {
  const [w, h, d] = surface.size
  const isWall = surface.kind === 'wall'
  const material = useSurfaceMaterial(definition, isWall ? [w, h] : [w, d])

  const scaleRef = useRef()
  const capRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(({ camera }, delta) => {
    if (!isWall || !scaleRef.current) return
    // Inner face points along local +z; outward is the opposite.
    outward.set(-Math.sin(surface.rotationY), 0, -Math.cos(surface.rotationY))
    toCamera.set(camera.position.x, 0, camera.position.z).normalize()
    const target = toCamera.dot(outward) > CUT_THRESHOLD ? CUT_HEIGHT : 1

    const s = THREE.MathUtils.damp(scaleRef.current.scale.y, target, 8, delta)
    scaleRef.current.scale.y = s
    capRef.current.position.y = h * s
  })

  const handlers = {
    onClick: (e) => {
      if (e.delta > 4) return // was an orbit drag, not a click
      e.stopPropagation()
      onSelect(surface.id)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      setHovered(true)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHovered(false)
      document.body.style.cursor = ''
    },
  }

  const edges = (selected || hovered) && (
    <Edges threshold={15} color={selected ? SELECT_COLOR : HOVER_COLOR} lineWidth={selected ? 2.5 : 1} />
  )

  if (!isWall) {
    return (
      <mesh position={surface.position} material={material} receiveShadow {...handlers}>
        <boxGeometry args={surface.size} />
        {edges}
      </mesh>
    )
  }

  return (
    <group position={surface.position} rotation-y={surface.rotationY}>
      <group ref={scaleRef}>
        <mesh
          position-y={h / 2}
          material={material}
          castShadow={definition.castShadow !== false}
          receiveShadow
          {...handlers}
        >
          <boxGeometry args={[w, h, d]} />
          {edges}
        </mesh>
      </group>
      {/* Dark top cap: reads like the poché of an architectural section cut. */}
      <mesh ref={capRef} position-y={h}>
        <boxGeometry args={[w, 0.012, d + 0.002]} />
        <meshStandardMaterial color="#2d2b29" roughness={0.8} />
      </mesh>
    </group>
  )
}
