// Hand gestures → camera + selection. Works next to the mouse: it drives the
// same <CameraControls> (made default in CameraRig) instead of replacing it.
//   pinch + drag      orbit
//   both hands pinch  zoom (spread = closer)
//   pinch tap         select the surface under the hand cursor

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HANDS } from '../hands/config'
import { handInput, onHandEvent } from '../hands/handTracker'

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

export function HandControls({ onSelect }) {
  const { camera, scene, gl } = useThree()
  const start = useRef({ id: -1, kind: 'none', azimuth: 0, polar: 0, distance: 0 })

  // Tap → raycast from the cursor, like a mouse click on the canvas.
  useEffect(
    () =>
      onHandEvent((type, { x, y } = {}) => {
        if (type !== 'tap' || document.elementFromPoint(x, y) !== gl.domElement) return
        const rect = gl.domElement.getBoundingClientRect()
        ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        const hit = raycaster.intersectObjects(scene.children, true).find((h) => h.object.isMesh)
        const surfaceId = hit && findSurfaceId(hit.object)
        if (surfaceId) onSelect(surfaceId)
      }),
    [camera, scene, gl, onSelect],
  )

  useFrame(({ controls }) => {
    if (!controls) return
    const g = handInput.gesture
    const s = start.current

    // Remember where the camera was when this gesture (or phase of it) began.
    if (g.id !== s.id || g.kind !== s.kind) {
      // Snappy camera while the hand drives it; the normal glide otherwise.
      const handDriven = g.kind === 'drag' || g.kind === 'zoom'
      if (handDriven && s.smoothTime === undefined) {
        s.smoothTime = controls.smoothTime
        controls.smoothTime = HANDS.cameraSmoothTime
      } else if (!handDriven && s.smoothTime !== undefined) {
        controls.smoothTime = s.smoothTime
        s.smoothTime = undefined
      }
      Object.assign(s, {
        id: g.id,
        kind: g.kind,
        azimuth: controls.azimuthAngle,
        polar: controls.polarAngle,
        distance: controls.distance,
      })
    }

    if (g.kind === 'drag') {
      const { x, y } = handInput.cursor
      const k = HANDS.orbitSpeed / window.innerHeight
      controls.rotateTo(s.azimuth - (x - g.start.x) * k, s.polar - (y - g.start.y) * k, true)
    }

    if (g.kind === 'zoom') {
      controls.dollyTo(s.distance * (g.startSpread / g.spread), true)
    }
  })

  return null
}

function findSurfaceId(object) {
  for (let o = object; o; o = o.parent) if (o.userData.surfaceId) return o.userData.surfaceId
  return null
}
