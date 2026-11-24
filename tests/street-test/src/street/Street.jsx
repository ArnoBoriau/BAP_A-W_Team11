// The street: every saved home in a row along a road.
//
//   on the street   the camera stands across the road from one house (focus)
//                   and glides to the next one; you don't steer it freely
//   visiting        the camera orbits one house, whose walls fold away on the
//                   side you look from (drag to turn, scroll to zoom)

import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { WALL } from '../house/config/room'
import { House } from '../house/scene/House'
import { FRONT_Z, HOUSE_ROTATION, LOT, ROAD, houseX, housePosition, streetView, visitView } from './layout'

const BACKGROUND = '#e9e6e1'
const GROUND_Y = -WALL.floorThickness - 0.35 // the bottom of the plinths

export function Street({ homes, focus, visiting, onVisit }) {
  const plates = useRef([])
  return (
    <>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ position: streetView(focus).position, fov: 35 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <fog attach="fog" args={[BACKGROUND, 35, 85]} />

        <Lighting x={houseX(focus)} />
        <Ground count={homes.length} />

        {homes.map((home, i) => (
          <group key={home.number}>
            <House
              home={home}
              open={visiting && i === focus}
              position={housePosition(i)}
              rotation-y={HOUSE_ROTATION}
              onClick={(e) => {
                if (e.delta > 4) return // a drag, not a click
                e.stopPropagation()
                onVisit(i)
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                if (!(visiting && i === focus)) document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => (document.body.style.cursor = '')}
            />
          </group>
        ))}

        <CameraRig focus={focus} visiting={visiting} />
        <PlateTracker plates={plates} />
      </Canvas>

      {/* house numbers over the front doors, placed by PlateTracker */}
      <div className={`plates ${visiting ? 'is-hidden' : ''}`}>
        {homes.map((home, i) => (
          <span
            key={home.number}
            ref={(el) => (plates.current[i] = el)}
            className={`plate ${i === focus ? 'is-focus' : ''}`}
          >
            {home.number}
          </span>
        ))}
      </div>
    </>
  )
}

// Moves each house number to where its front door is on screen.
const plateAt = new THREE.Vector3()
function PlateTracker({ plates }) {
  useFrame(({ camera, size }) => {
    plates.current.forEach((el, i) => {
      if (!el) return
      plateAt.set(houseX(i), WALL.height + 0.7, FRONT_Z).project(camera)
      const visible = plateAt.z < 1 && Math.abs(plateAt.x) < 1.2
      el.style.visibility = visible ? 'visible' : 'hidden'
      if (!visible) return
      const x = ((plateAt.x + 1) / 2) * size.width
      const y = ((1 - plateAt.y) / 2) * size.height
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
    })
  })
  return null
}

function CameraRig({ focus, visiting }) {
  const controls = useRef()
  const first = useRef(true)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const view = visiting ? visitView(focus) : streetView(focus)
    c.setLookAt(...view.position, ...view.target, !first.current)
    first.current = false
  }, [focus, visiting])

  // On the street the camera is placed, not steered. Visiting, you orbit the house.
  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={visiting}
      minDistance={7}
      maxDistance={40}
      minPolarAngle={0.15}
      maxPolarAngle={1.42}
      smoothTime={0.45}
    />
  )
}

// The sun follows the house in focus, so its shadows stay sharp without one
// enormous shadow map for the whole street.
function Lighting({ x }) {
  const light = useRef()
  const reach = LOT * 1.8

  useFrame((_, delta) => {
    const l = light.current
    if (!l) return
    const lx = THREE.MathUtils.damp(l.target.position.x, x, 3, delta)
    l.target.position.set(lx, 0, -8)
    l.target.updateMatrixWorld()
    l.position.set(lx + 8, 14, 0)
  })

  return (
    <>
      <hemisphereLight args={['#ffffff', '#d8d0c4', 1.2]} />
      <directionalLight
        ref={light}
        intensity={2.2}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-far={60}
      />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[8, 2, -4]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="ring" color="#ffe8cc" intensity={1.5} position={[4, 5, 8]} scale={3} />
      </Environment>
    </>
  )
}

// The ground, the road and its two pavements, running past every house.
function Ground({ count }) {
  const from = houseX(0) - LOT * 2
  const to = houseX(Math.max(0, count - 1)) + LOT * 2
  const length = to - from
  const mid = (from + to) / 2
  const pavementZ = ROAD.width / 2 + ROAD.pavement / 2

  // dashes down the middle of the road
  const dashes = []
  for (let x = from; x < to; x += 4) dashes.push(x)

  return (
    <group position-y={GROUND_Y}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[length + 200, 200]} />
        <meshStandardMaterial color="#e3dfd8" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[mid, 0.005, 0]} receiveShadow>
        <planeGeometry args={[length, ROAD.width]} />
        <meshStandardMaterial color="#cfcac2" roughness={1} />
      </mesh>
      {[-pavementZ, pavementZ].map((z) => (
        <mesh key={z} position={[mid, 0.06, z]} receiveShadow>
          <boxGeometry args={[length, 0.12, ROAD.pavement]} />
          <meshStandardMaterial color="#f1eee9" roughness={0.95} />
        </mesh>
      ))}
      {dashes.map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x + 1, 0.01, 0]}>
          <planeGeometry args={[1.6, 0.12]} />
          <meshBasicMaterial color="#f6f4f0" />
        </mesh>
      ))}
    </group>
  )
}
