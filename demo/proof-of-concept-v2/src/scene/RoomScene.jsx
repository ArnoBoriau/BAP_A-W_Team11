// Canvas, lighting and staging (from tests/room-changer).
// Only the placer sees the house (the giver gets the full-screen material
// picker). The placer's screen passes in what to show: the house (finishes +
// glass) with the received material previewed on the selected surface, and which
// surfaces can be clicked (the ones in this turn's room that material fits).

import { useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { FOOTPRINT, SURFACES, SURFACES_BY_ID, WALL } from '../config/room'
import { Room } from './Room'
import { CameraRig } from './CameraRig'

const BACKGROUND = '#e9e6e1'

export function RoomScene({ config, glazing, selectedId, focusId, onSelect, canSelect, active = true }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [9.5, 8.5, 11.5], fov: 35 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
      }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 22, 40]} />

      <Lighting />
      <Plinth />

      <Room
        surfaces={SURFACES}
        config={config}
        glazing={glazing}
        selectedId={selectedId}
        onSelect={onSelect}
        canSelect={canSelect}
        focusRoomId={SURFACES_BY_ID[focusId]?.roomId}
      />

      <CameraRig surfaces={SURFACES} selectedId={focusId} />
      <PanelOffset />
    </Canvas>
  )
}

// Shift the projection so the room is centred in the free space next to the side panel.
const PANEL_SPACE = 352 // panel width + margins, px (see .panel in index.css)

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
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
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

// A raised base under the house, like a physical architecture model.
function Plinth() {
  const margin = 1.4
  const height = 0.35
  return (
    <mesh position-y={-WALL.floorThickness - height / 2} receiveShadow>
      <boxGeometry args={[FOOTPRINT.width + margin, height, FOOTPRINT.depth + margin]} />
      <meshStandardMaterial color="#f6f4f0" roughness={0.9} />
    </mesh>
  )
}
