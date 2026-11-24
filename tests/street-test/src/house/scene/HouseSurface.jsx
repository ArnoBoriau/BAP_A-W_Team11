// One element of a house (a floor, or one face of a wall), read-only.
// Adapted from Surface.jsx in demo/proof-of-concept-v2: no clicking, no fade,
// and the house doesn't have to stand at the origin (there's a whole street).
//
//   closed  (on the street)   every wall stands: you see the façades
//   open    (visiting a house) walls between you and the room fold down to a
//                              low stub, so you look inside like a dollhouse
//
// A surface nobody filled in (a house left unfinished) is drawn like the
// PoC's line drawing: see-through white with dark outlines.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useSurfaceMaterial } from './useSurfaceMaterial'
import { LINE_COLOR, LINE_WIDTH, blueprintEdges } from './blueprintMaterial'
import { solidPieces } from '../config/room'

const CUT_HEIGHT = 0.12 // fraction of wall height left when folded
const CUT_THRESHOLD = 0.3 // how far the camera must be "behind" a wall before it folds
const WORLD_UV = [1, 1] // wall UVs are already in metres (see wallGeometries)

const outward = new THREE.Vector3()
const toCamera = new THREE.Vector3()

export function HouseSurface({ surface, definition, glazed = false, openings = [], open, houseRef }) {
  const isWall = surface.kind === 'wall'

  const openingsKey = JSON.stringify(openings)
  const shape = useMemo(() => {
    if (!isWall) return null
    const { length, thickness, doorCuts } = surface
    return glazed
      ? { pieces: solidPieces(length, doorCuts), depth: 2 * thickness, offset: -thickness / 2 }
      : { pieces: solidPieces(length, [...doorCuts, ...JSON.parse(openingsKey)]), depth: thickness, offset: 0 }
  }, [surface, isWall, glazed, openingsKey])

  const geometries = useMemo(
    () => (shape ? wallGeometries(shape, surface.height) : [new THREE.BoxGeometry(...surface.size)]),
    [shape, surface],
  )
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])

  const uvSize = isWall ? WORLD_UV : [surface.size[0], surface.size[2]]
  const material = useSurfaceMaterial(definition, uvSize)

  const blank = !!definition.blank
  const outlines = useMemo(
    () => (blank ? geometries.map((g) => blueprintEdges(g, { wall: isWall })) : null),
    [blank, geometries, isWall],
  )

  const scaleRef = useRef()
  const capRef = useRef()

  useFrame(({ camera }, delta) => {
    if (!isWall || !scaleRef.current) return
    let target = 1
    if (open && houseRef.current) {
      // the camera, in this house's own coordinates
      toCamera.copy(camera.position)
      houseRef.current.worldToLocal(toCamera)
      toCamera.y = 0
      toCamera.normalize()
      const away = surface.facade ? 1 : -1
      outward.set(away * Math.sin(surface.rotationY), 0, away * Math.cos(surface.rotationY))
      if (toCamera.dot(outward) > CUT_THRESHOLD) target = CUT_HEIGHT
    }
    const s = THREE.MathUtils.damp(scaleRef.current.scale.y, target, 8, delta)
    scaleRef.current.scale.y = s
    capRef.current.position.y = surface.height * s
  })

  const lines =
    outlines &&
    outlines.map((points, i) => (
      <Line key={`line-${i}`} points={points} segments color={LINE_COLOR} lineWidth={LINE_WIDTH} raycast={() => null} />
    ))
  const meshes = geometries.map((geometry, i) => (
    <mesh key={i} geometry={geometry} material={material} castShadow={isWall && definition.castShadow !== false} receiveShadow />
  ))

  if (!isWall) {
    return (
      <group position={surface.position}>
        {meshes}
        {lines}
      </group>
    )
  }

  return (
    <group position={surface.position} rotation-y={surface.rotationY}>
      <group ref={scaleRef}>
        {meshes}
        {lines}
      </group>
      {/* Dark top cap: the poché of an architectural section cut. */}
      <group ref={capRef} position-y={surface.height}>
        {shape.pieces.map(([from, to], i) => (
          <mesh key={i} position={[(from + to) / 2, 0, shape.offset]}>
            <boxGeometry args={[to - from, 0.012, shape.depth + 0.002]} />
            <meshStandardMaterial color="#2d2b29" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// One solid piece of wall per stretch between openings, with UVs in metres.
function wallGeometries({ pieces, depth, offset }, height) {
  return pieces.map(([from, to]) => {
    const shape = new THREE.Shape()
    shape.moveTo(from, 0)
    shape.lineTo(to, 0)
    shape.lineTo(to, height)
    shape.lineTo(from, height)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
    geometry.translate(0, 0, offset - depth / 2)
    return geometry
  })
}
