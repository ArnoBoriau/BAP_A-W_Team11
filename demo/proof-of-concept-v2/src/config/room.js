// The house: floor plan + default configuration.
// Pure data: no React, no Three.js. The renderer reads this, the UI reads this,
// and later a server / shared store can produce the same shape.
//
// The plan is drawn on the centre lines of the walls, in metres:
// x runs east, z runs south, and the house is centred on the origin.
//
//   z=-3  ┌────────────┬────────┐
//         │            │  Bath  │
//         │   Living   ├── ─────┤ z=0.4
//         │            ╵ Hallway│
//         │            ╷        │
//   z= 3  └────────────┴─── ────┘
//       x=-4        x=1.2     x=4

export const WALL = {
  height: 2.8,
  thickness: 0.15,
  floorThickness: 0.12,
  doorWidth: 0.9,
}

export const ROOMS = [
  { id: 'living', label: 'Living room', x: [-4, 1.2], z: [-3, 3] },
  { id: 'hallway', label: 'Hallway', x: [1.2, 4], z: [0.4, 3] },
  { id: 'bathroom', label: 'Bathroom', x: [1.2, 4], z: [-3, 0.4] },
]

// Openings, as a point on a wall's centre line. Every wall face through that
// point gets the opening, so a shared wall is cut on both sides.
// Openings are full height (no lintel), so the cutaway walls stay simple.
// Exterior doors cut through the room's wall and the façade alike.
export const DOORS = [
  { at: [1.2, 1.7] }, // living room ↔ hallway
  { at: [2.6, 0.4] }, // hallway ↔ bathroom
  { at: [2.6, 3] }, // front door
]

const SIDES = [
  // rotationY turns a wall so its inner face points into the room; it doubles
  // as the camera azimuth that looks straight at that face.
  { id: 'north', label: 'North wall', axis: 'z', end: 0, rotationY: 0 },
  { id: 'east', label: 'East wall', axis: 'x', end: 1, rotationY: -Math.PI / 2 },
  { id: 'south', label: 'South wall', axis: 'z', end: 1, rotationY: Math.PI },
  { id: 'west', label: 'West wall', axis: 'x', end: 0, rotationY: Math.PI / 2 },
]

const EPS = 1e-6

// The plan's outer lines (the centre lines of the exterior walls).
export function boundsOf(rooms) {
  return {
    x: [Math.min(...rooms.map((r) => r.x[0])), Math.max(...rooms.map((r) => r.x[1]))],
    z: [Math.min(...rooms.map((r) => r.z[0])), Math.max(...rooms.map((r) => r.z[1]))],
  }
}

// Each surface is an independently configurable element:
//   - one floor per room
//   - one wall face per side of each room: the inner half of that wall
//   - one façade per side of the house: the outer half of the exterior walls
// So every wall is two surfaces (half the thickness each): between two rooms
// one per room, on the outside one for the room and one for the façade.
export function buildSurfaces(rooms, doors, { height, thickness: t, floorThickness, doorWidth }) {
  const half = t / 2
  const bounds = boundsOf(rooms)
  const lineOf = (area, side) => area[side.axis][side.end]
  const isExterior = (room, side) => Math.abs(lineOf(room, side) - bounds[side.axis][side.end]) < EPS
  const side = Object.fromEntries(SIDES.map((s) => [s.id, s]))
  const outward = (s) => (s.end === 0 ? -1 : 1) // along the side's axis

  const roomSurfaces = rooms.flatMap((room) => {
    const grow = (s) => (isExterior(room, s) ? half : 0) // floors run under the façades
    const fx = [room.x[0] - grow(side.west), room.x[1] + grow(side.east)]
    const fz = [room.z[0] - grow(side.north), room.z[1] + grow(side.south)]
    const floor = {
      id: `${room.id}-floor`,
      roomId: room.id,
      kind: 'floor',
      label: 'Floor',
      size: [fx[1] - fx[0], floorThickness, fz[1] - fz[0]],
      position: [(fx[0] + fx[1]) / 2, -floorThickness / 2, (fz[0] + fz[1]) / 2],
      rotationY: 0,
    }

    const walls = SIDES.map((s) => {
      // The room's half of the wall: from its inner face up to the centre line.
      // North/south walls run on to the cross walls' centre lines (covering
      // the corners); east/west walls stop at the inner faces.
      const along = s.axis === 'z' ? 'x' : 'z'
      const span = s.axis === 'z' ? room[along] : [room[along][0] + half, room[along][1] - half]
      return wall(s, {
        id: `${room.id}-${s.id}`,
        roomId: room.id,
        label: s.label,
        line: lineOf(room, s),
        across: lineOf(room, s) - (outward(s) * half) / 2,
        span,
        rotationY: s.rotationY,
        exterior: isExterior(room, s),
      })
    })
    return [floor, ...walls]
  })

  // The façades: the outer half of each side of the house. They face outward,
  // so they're turned half round compared with the room walls on that side.
  // North/south façades run on over the outer corners.
  const facades = SIDES.map((s) => {
    const along = s.axis === 'z' ? 'x' : 'z'
    const span = s.axis === 'z' ? [bounds[along][0] - half, bounds[along][1] + half] : bounds[along]
    return wall(s, {
      id: `${OUTSIDE_ID}-${s.id}`,
      roomId: OUTSIDE_ID,
      label: `${s.label.split(' ')[0]} façade`,
      line: lineOf(bounds, s),
      across: lineOf(bounds, s) + (outward(s) * half) / 2,
      span,
      rotationY: Math.atan2(Math.sin(s.rotationY + Math.PI), Math.cos(s.rotationY + Math.PI)),
      exterior: true,
      facade: true,
    })
  })

  return [...roomSurfaces, ...facades]

  // A half-thickness wall slab with the door openings cut out of it.
  function wall(s, { line, across, span, ...props }) {
    const mid = (span[0] + span[1]) / 2
    const length = span[1] - span[0]

    // World direction of the wall's local x axis (see rotationY).
    const dir = [Math.cos(props.rotationY), -Math.sin(props.rotationY)]
    const position = s.axis === 'z' ? [mid, 0, across] : [across, 0, mid]
    const localX = ([x, z]) => (x - position[0]) * dir[0] + (z - position[2]) * dir[1]

    // Openings on this face, as [from, to] along local x.
    const cuts = doors
      .filter(({ at }) => {
        const [x, z] = at
        const onLine = Math.abs((s.axis === 'x' ? x : z) - line) < EPS
        const along = s.axis === 'x' ? z : x
        return onLine && along > span[0] && along < span[1]
      })
      .map((door) => {
        const u = localX(door.at)
        const w = door.width ?? doorWidth
        return [u - w / 2, u + w / 2]
      })
      .sort((a, b) => a[0] - b[0])

    return {
      kind: 'wall',
      facade: false,
      ...props,
      position,
      length,
      height,
      thickness: half,
      line: { axis: s.axis, at: line }, // the centre line this half-wall sits on
      span, // world range along that line
      doorCuts: cuts,
      pieces: solidPieces(length, cuts),
    }
  }
}

// The solid stretches of a wall (local x, centred) between the given openings.
export function solidPieces(length, cuts) {
  const pieces = []
  let from = -length / 2
  for (const [a, b] of [...cuts].sort((p, q) => p[0] - q[0])) {
    if (a > from) pieces.push([from, Math.min(a, length / 2)])
    from = Math.max(from, b)
  }
  if (from < length / 2) pieces.push([from, length / 2])
  return pieces
}

// Two wall halves are part of the same wall where they sit on the same centre
// line and their spans overlap (a room's side and the façade or the
// neighbouring room's side behind it).
export function overlaps(a, b) {
  if (a.kind !== 'wall' || b.kind !== 'wall' || a.id === b.id) return false
  if (a.line.axis !== b.line.axis || Math.abs(a.line.at - b.line.at) > EPS) return false
  return Math.min(a.span[1], b.span[1]) - Math.max(a.span[0], b.span[0]) > EPS
}

// Another wall half's span, as a [from, to] range in this one's local x.
export function localRange(surface, other) {
  const dir = surface.line.axis === 'z' ? Math.cos(surface.rotationY) : -Math.sin(surface.rotationY)
  const centre = surface.line.axis === 'z' ? surface.position[0] : surface.position[2]
  const ends = other.span.map((v) => (v - centre) * dir)
  return [Math.min(...ends), Math.max(...ends)]
}

// The outside of the house takes its turn like a room. Its "room" is the
// whole plan, so the camera frames the whole house for it.
export const OUTSIDE_ID = 'outside'
export const OUTSIDE = { id: OUTSIDE_ID, label: 'Outside', ...boundsOf(ROOMS) }

// Everything a turn can be about: the rooms, then the outside.
export const AREAS = [...ROOMS, OUTSIDE]
export const AREAS_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]))

export const SURFACES = buildSurfaces(ROOMS, DOORS, WALL)
export const SURFACES_BY_ID = Object.fromEntries(SURFACES.map((s) => [s.id, s]))

// Where the camera goes for an area: a room's floor, or the front façade.
export const areaFocusId = (areaId) => (areaId === OUTSIDE_ID ? `${OUTSIDE_ID}-south` : `${areaId}-floor`)

// Footprint of the whole house, façades included.
export const FOOTPRINT = {
  width: OUTSIDE.x[1] - OUTSIDE.x[0] + WALL.thickness,
  depth: OUTSIDE.z[1] - OUTSIDE.z[0] + WALL.thickness,
}

// "the bathroom floor", "the north wall of the living room", "the south façade"
export function placeName(surface) {
  if (surface.facade) return `the ${surface.label.toLowerCase()}`
  const room = AREAS_BY_ID[surface.roomId].label.toLowerCase()
  return surface.kind === 'floor' ? `the ${room} floor` : `the ${surface.label.toLowerCase()} of the ${room}`
}

const DEFAULT_FLOORS = { living: 'oak', hallway: 'terrazzo', bathroom: 'tiles' }
const DEFAULT_WALLS = { 'living-north': 'concrete' }
const DEFAULT_FACADE = 'concrete'

// Each surface's own finish. Glass isn't in here: see DEFAULT_GLAZING.
export const DEFAULT_ROOM_CONFIG = Object.fromEntries(
  SURFACES.map((s) => [
    s.id,
    s.kind === 'floor' ? DEFAULT_FLOORS[s.roomId] : (DEFAULT_WALLS[s.id] ?? (s.facade ? DEFAULT_FACADE : 'plaster')),
  ]),
)

// Glass goes *through* a wall (an opening filled with a pane), so it isn't a
// finish of one side: it's kept apart, as { surfaceId: materialId }, and the
// finishes underneath stay as they were. The glass fills that surface's whole
// span, through both halves of the wall. Windows will later be the same thing
// over a smaller opening.
export const DEFAULT_GLAZING = { 'living-west': 'glass' }

// Where glass on *another* half of the same wall opens this surface, as
// [from, to] ranges in its local x: { [surfaceId]: [[from, to], ...] }.
export function glassOpenings(glazing) {
  const glazed = Object.keys(glazing).map((id) => SURFACES_BY_ID[id])
  return Object.fromEntries(
    SURFACES.map((s) => [s.id, glazed.filter((g) => overlaps(s, g)).map((g) => localRange(s, g))]),
  )
}
