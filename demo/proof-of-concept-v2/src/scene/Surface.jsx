// One configurable element of the house (a room's floor, or one face of a wall).
// Walls facing the camera fold down to a low stub ("dollhouse" cutaway), and so
// do interior walls of rooms other than the one in focus: the inside of the
// rooms stays visible from every angle, and the overview reads like a plan.
// A façade folds along with the room wall behind it. With the outside in
// focus nothing folds: the house is shown closed, façades and all.
// A new material doesn't snap in: the previous one fades out on top of it.
// Glass is a pane through the whole wall: a glazed surface draws the pane
// (both halves' thickness), and the other half of the wall is opened behind it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useSurfaceMaterial } from './useSurfaceMaterial'
import { OUTSIDE_ID, solidPieces } from '../config/room'

const CUT_HEIGHT = 0.12 // fraction of wall height left when cut away
const CUT_THRESHOLD = 0.3 // how far the camera must be "behind" a wall before it folds
const SELECT_COLOR = '#ff6a3d'
const HOVER_COLOR = '#8a8a8a'
const FADE_SECONDS = 0.6
const FADE_MATERIAL = { transparent: true, depthWrite: false }
const FADE_GROW = 0.004 // the fading copy is 4 mm larger, so it never z-fights the surface
const WORLD_UV = [1, 1] // wall UVs are already in metres (see wallGeometries)

const outward = new THREE.Vector3()
const toCamera = new THREE.Vector3()

export function Surface({ surface, definition, glazed = false, openings = [], selected, onSelect, focusRoomId }) {
  const isWall = surface.kind === 'wall'

  // A wall's solid shape: around its doors, and around glass from the other
  // side; or, glazed, a pane through the whole wall (around its doors only).
  const openingsKey = JSON.stringify(openings) // stable memo key for a fresh array
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

  // When the material changes, keep the old one around just long enough to fade it out.
  const [shown, setShown] = useState(definition)
  const [outgoing, setOutgoing] = useState(null) // { id, definition }
  if (shown !== definition) {
    setShown(definition)
    setOutgoing({ id: (outgoing?.id ?? 0) + 1, definition: shown })
  }
  const [gx, gy, gz] = isWall ? [surface.length, surface.height, shape.depth] : surface.size
  const fade = outgoing && (
    <FadeOut
      key={outgoing.id}
      definition={outgoing.definition}
      geometries={geometries}
      uvSize={uvSize}
      scale={[1 + FADE_GROW / gx, 1 + FADE_GROW / gy, 1 + FADE_GROW / gz]}
      onDone={() => setOutgoing(null)}
    />
  )

  const scaleRef = useRef()
  const capRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(({ camera }, delta) => {
    if (!isWall || !scaleRef.current) return
    // The visible face points along local +z. A room wall's outside is the
    // opposite way; a façade's visible face *is* the outside.
    const away = surface.facade ? 1 : -1
    outward.set(away * Math.sin(surface.rotationY), 0, away * Math.cos(surface.rotationY))
    toCamera.set(camera.position.x, 0, camera.position.z).normalize()
    const facesCamera = toCamera.dot(outward) > CUT_THRESHOLD
    const outOfFocus = !surface.exterior && surface.roomId !== focusRoomId
    const closed = focusRoomId === OUTSIDE_ID
    const target = !closed && (facesCamera || outOfFocus) ? CUT_HEIGHT : 1

    const s = THREE.MathUtils.damp(scaleRef.current.scale.y, target, 8, delta)
    scaleRef.current.scale.y = s
    capRef.current.position.y = surface.height * s
  })

  // No onSelect = can't place here (not this player's turn, another room, or
  // the material doesn't fit this surface): the surface is inert.
  const handlers = onSelect && {
    onClick: (e) => {
      if (e.delta > 4) return // was an orbit drag, not a click
      e.stopPropagation()
      setHovered(false)
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

  // Drop a stale hover when the surfaces become inert mid-hover.
  // (The outline already ignores `hovered` then; only the cursor needs a reset.)
  useEffect(() => {
    if (!onSelect) document.body.style.cursor = ''
  }, [onSelect])

  const outline = selected || (hovered && onSelect)
  const meshes = geometries.map((geometry, i) => (
    <mesh
      key={i}
      geometry={geometry}
      material={material}
      castShadow={isWall && definition.castShadow !== false}
      receiveShadow
      {...handlers}
    >
      {outline && (
        <Edges threshold={15} color={selected ? SELECT_COLOR : HOVER_COLOR} lineWidth={selected ? 2.5 : 1} />
      )}
    </mesh>
  ))

  if (!isWall) {
    return (
      <group position={surface.position}>
        {meshes}
        {fade}
      </group>
    )
  }

  return (
    <group position={surface.position} rotation-y={surface.rotationY}>
      <group ref={scaleRef}>
        {meshes}
        {fade}
      </group>
      {/* Dark top cap: reads like the poché of an architectural section cut. */}
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

// One solid piece of wall per stretch between openings, standing on y = 0,
// `depth` thick and centred on `offset` (local z). Extruded with world-space
// UVs (in metres), so the texture runs on across the pieces as if the wall
// were one slab.
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

// The previous material, drawn just over the surface and faded to nothing.
function FadeOut({ definition, geometries, uvSize, scale, onDone }) {
  const material = useSurfaceMaterial(definition, uvSize, FADE_MATERIAL)
  const groupRef = useRef()
  const progress = useRef(0)

  useFrame((_, delta) => {
    if (progress.current >= 1 || !groupRef.current) return
    progress.current = Math.min(1, progress.current + delta / FADE_SECONDS)
    const opacity = 1 - THREE.MathUtils.smoothstep(progress.current, 0, 1)
    groupRef.current.children.forEach((mesh) => (mesh.material.opacity = opacity))
    if (progress.current >= 1) onDone()
  })

  return (
    <group ref={groupRef} scale={scale}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} receiveShadow raycast={() => null} />
      ))}
    </group>
  )
}
