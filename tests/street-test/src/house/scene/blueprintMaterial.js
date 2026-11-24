// The look of a surface nobody has filled in yet (BLANK in config/materials.js):
// a clean architectural line drawing of the house in 3D. Flat white faces,
// no texture and no shading, with crisp dark outlines (drawn in Surface.jsx)
// and the dark wall tops of a section cut. The faces are see-through: lines
// behind them show through, faded, like a drawing on tracing paper.

import * as THREE from 'three'

export const LINE_COLOR = '#1d1c1a'
export const LINE_WIDTH = 1.25 // pixels
const FACE_OPACITY = 0.45 // 1 = solid white, lower = more see-through

export function createBlueprintMaterial(overrides) {
  return new THREE.MeshBasicMaterial({
    color: '#ffffff',
    toneMapped: false, // stays paper-white under the scene's tone mapping
    transparent: true,
    opacity: FACE_OPACITY,
    depthWrite: false, // lines behind it stay visible through it
    // Pushed back a hair, so the outlines on its edges never sink into it.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    ...overrides,
    userData: { baseOpacity: FACE_OPACITY }, // the fade (Surface.jsx) fades from here
  })
}

// A blank surface's outline, as line segments ([x, y, z] pairs). For a wall,
// without the edges on its back face: every wall is two half-thickness slabs
// that meet on the wall's centre line, and the line between them isn't part
// of the drawing.
export function blueprintEdges(geometry, { wall = false } = {}) {
  const edges = new THREE.EdgesGeometry(geometry, 15)
  const from = edges.attributes.position.array
  edges.dispose()
  let back = -Infinity
  if (wall) {
    geometry.computeBoundingBox()
    back = geometry.boundingBox.min.z
  }
  const points = []
  for (let i = 0; i < from.length; i += 6) {
    const onBack = Math.abs(from[i + 2] - back) < 1e-4 && Math.abs(from[i + 5] - back) < 1e-4
    if (!onBack) points.push([from[i], from[i + 1], from[i + 2]], [from[i + 3], from[i + 4], from[i + 5]])
  }
  return points
}
