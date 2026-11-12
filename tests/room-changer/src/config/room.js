// Room layout + default configuration.
// Pure data: no React, no Three.js. The renderer reads this, the UI reads this,
// and later a server / shared store can produce the same shape.

export const ROOM = {
  width: 6, // x, metres
  depth: 5, // z, metres
  height: 2.8,
  wallThickness: 0.15,
  floorThickness: 0.12,
}

// Each surface is an independently configurable element of the room.
// `rotationY` turns a wall so its inner face points into the room;
// it doubles as the camera azimuth that looks straight at that face.
export function buildSurfaces({ width, depth, height, wallThickness: t, floorThickness }) {
  return [
    {
      id: 'floor',
      label: 'Floor',
      kind: 'floor',
      size: [width + 2 * t, floorThickness, depth + 2 * t],
      position: [0, -floorThickness / 2, 0],
      rotationY: 0,
    },
    wall('wall-north', 'North wall', [0, 0, -(depth / 2 + t / 2)], 0, width + 2 * t),
    wall('wall-east', 'East wall', [width / 2 + t / 2, 0, 0], -Math.PI / 2, depth),
    wall('wall-south', 'South wall', [0, 0, depth / 2 + t / 2], Math.PI, width + 2 * t),
    wall('wall-west', 'West wall', [-(width / 2 + t / 2), 0, 0], Math.PI / 2, depth),
  ]

  function wall(id, label, position, rotationY, length) {
    return { id, label, kind: 'wall', size: [length, height, t], position, rotationY }
  }
}

export const SURFACES = buildSurfaces(ROOM)

export const DEFAULT_ROOM_CONFIG = {
  floor: 'oak',
  'wall-north': 'concrete',
  'wall-east': 'plaster',
  'wall-south': 'plaster',
  'wall-west': 'glass',
}
