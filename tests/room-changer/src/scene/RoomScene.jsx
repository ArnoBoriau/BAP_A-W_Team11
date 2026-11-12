// Canvas, lighting and staging. The room itself comes from <Room>.

import { useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { ROOM, SURFACES } from '../config/room'
import { useRoomState } from '../state/RoomState'
import { Room } from './Room'
import { CameraRig } from './CameraRig'

const BACKGROUND = '#e9e6e1'

export function RoomScene() {
  const { surfaces, selectedId, select } = useRoomState()

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [8.5, 7.5, 10.5], fov: 35 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
      }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 22, 40]} />

      <Lighting />
      <Plinth />

      <Room surfaces={SURFACES} config={surfaces} selectedId={selectedId} onSelect={select} />

      <CameraRig surfaces={SURFACES} selectedId={selectedId} />
      <PanelOffset />
    </Canvas>
  )
}

// Shift the projection so the room is centred in the free space next to the side panel.
const PANEL_SPACE = 312 // panel width + margins, px (see .panel in index.css)

function PanelOffset() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    // Wide: panel on the left. Narrow: panel is a bottom sheet (~half the height).
    const [x, y] = size.width > 640 ? [-PANEL_SPACE / 2, 0] : [0, size.height * 0.22]
    camera.setViewOffset(size.width, size.height, x, y, size.width, size.height)
  }, [camera, size])
  return null
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#d8d0c4', 1.2]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={2.2}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Studio-style reflections without downloading an HDRI. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[8, 2, -4]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="ring" color="#ffe8cc" intensity={1.5} position={[4, 5, 8]} scale={3} />
      </Environment>
    </>
  )
}

// A raised base under the room, like a physical architecture model.
function Plinth() {
  const margin = 1.4
  const height = 0.35
  const { width, depth, wallThickness, floorThickness } = ROOM
  return (
    <mesh position-y={-floorThickness - height / 2} receiveShadow>
      <boxGeometry args={[width + 2 * wallThickness + margin, height, depth + 2 * wallThickness + margin]} />
      <meshStandardMaterial color="#f6f4f0" roughness={0.9} />
    </mesh>
  )
}
