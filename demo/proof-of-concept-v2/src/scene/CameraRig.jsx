// Orbit camera. When the focus changes, it glides to the room the surface is
// in, facing the selected wall (or looking down onto the floor). No focus:
// back to an overview of the whole house.

import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AREAS_BY_ID, OUTSIDE } from '../config/room'

const EYE_HEIGHT = 0.9 // height of the point the camera looks at
const WALL_POLAR = 1.05 // radians from straight up
const FLOOR_POLAR = 0.5
// How far to stand back from a room: bigger rooms need more distance.
const roomDistance = (room) => 5 + 1.4 * Math.max(room.x[1] - room.x[0], room.z[1] - room.z[0])
const OVERVIEW_DISTANCE = roomDistance(OUTSIDE) // the whole house
// The distances above suit a wide screen; a narrower window (e.g. two side by
// side) sees less across, so the camera stands further back.
const WIDE_ASPECT = 1.5

export function CameraRig({ surfaces, selectedId }) {
  const controls = useRef()
  const previousId = useRef(selectedId)
  const { size } = useThree()
  const fit = Math.max(1, WIDE_ASPECT / (size.width / size.height))

  useEffect(() => {
    controls.current?.setTarget(0, EYE_HEIGHT, 0, false)
  }, [])

  useEffect(() => {
    const c = controls.current
    if (!c || previousId.current === selectedId) return
    previousId.current = selectedId

    const surface = surfaces.find((s) => s.id === selectedId)
    if (!surface) {
      c.moveTo(0, EYE_HEIGHT, 0, true)
      c.dollyTo(OVERVIEW_DISTANCE * fit, true)
      return
    }

    const room = AREAS_BY_ID[surface.roomId]
    c.moveTo((room.x[0] + room.x[1]) / 2, EYE_HEIGHT, (room.z[0] + room.z[1]) / 2, true)
    c.dollyTo(roomDistance(room) * fit, true)
    if (surface.kind === 'floor') {
      c.rotatePolarTo(FLOOR_POLAR, true)
    } else {
      // Take the shortest way round instead of unwinding accumulated turns.
      const delta =
        THREE.MathUtils.euclideanModulo(surface.rotationY - c.azimuthAngle + Math.PI, Math.PI * 2) - Math.PI
      c.rotateTo(c.azimuthAngle + delta, WALL_POLAR, true)
    }
  }, [selectedId, surfaces, fit])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={4}
      maxDistance={48}
      minPolarAngle={0.15}
      maxPolarAngle={1.42}
      smoothTime={0.35}
    />
  )
}
