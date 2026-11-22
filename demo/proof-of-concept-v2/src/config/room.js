// The house: floor plan + default configuration.
// Pure data: no React, no Three.js. The renderer reads this, the UI reads this,
// and later a server / shared store can produce the same shape.
//
// The plan is drawn on the centre lines of the walls, in metres:
// x runs east, z runs south, and the house is centred on the origin.
// It doesn't have to be a rectangle: any set of rectangular rooms works, as
// long as each side of a room is either all outside wall or all shared with
// rooms next to it (buildSurfaces checks this).
//
//   z=-4.5 ┌──────────────┬────────┐
//          │   Bedroom    │Bathroom│
//          │              │        │
//   z=-0.5 ├──── ─────────┴── ─────┼────────────────┐
//          ╵    Hallway            ╵                │
//          ╷                       ╷                │
//   z= 1.5 ├────────── ────────────┤  Living room   │
//          │                                        │
//          │    Kitchen                             │
//   z= 4.5 └───────────────────────┴──────     ─────┘
//        x=-7          x=-2      x=1              x=7

export const WALL = {
  height: 2.8,
  thickness: 0.15,
  floorThickness: 0.12,
  doorWidth: 0.9,
}

// In the order the game goes through them (see turnRoom in state/game.js).
export const ROOMS = [
  { id: 'living', label: 'Living room', x: [1, 7], z: [-0.5, 4.5] },
  { id: 'bathroom', label: 'Bathroom', x: [-2, 1], z: [-4.5, -0.5] },
  { id: 'bedroom', label: 'Bedroom', x: [-7, -2], z: [-4.5, -0.5] },
  { id: 'kitchen', label: 'Kitchen', x: [-7, 1], z: [1.5, 4.5] },
  { id: 'hallway', label: 'Hallway', x: [-7, 1], z: [-0.5, 1.5] },
]

// Openings, as a point on a wall's centre line. Every wall face through that
// point gets the opening, so a shared wall is cut on both sides.
// Openings are full height (no lintel), so the cutaway walls stay simple.
// Exterior doors cut through the room's wall and the façade alike.
export const DOORS = [
  { at: [-7, 0.5] }, // front door, into the hallway
  { at: [-4.5, -0.5] }, // hallway ↔ bedroom
  { at: [-0.5, -0.5] }, // hallway ↔ bathroom
  { at: [-3, 1.5] }, // hallway ↔ kitchen
  { at: [1, 0.5] }, // hallway ↔ living room
  { at: [1, 3], width: 1.6 }, // kitchen ↔ living room, a wide opening
  { at: [4.5, 4.5], width: 1.8 }, // garden door, from the living room
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
//   - the façades: the outer half of the exterior walls, one per straight
//     stretch of the outline (an L-shaped house has more than four)
// So every wall is two surfaces (half the thickness each): between two rooms
// one per room, on the outside one for the room and one for the façade.
export function buildSurfaces(rooms, doors, { height, thickness: t, floorThickness, doorWidth }) {
  const half = t / 2
  const lineOf = (area, side) => area[side.axis][side.end]
  const alongOf = (side) => (side.axis === 'z' ? 'x' : 'z')
  const side = Object.fromEntries(SIDES.map((s) => [s.id, s]))
  const outward = (s) => (s.end === 0 ? -1 : 1) // along the side's axis
  const overlap = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]))

  // Is a point (strictly) inside one of the rooms?
  const inside = (x, z) => rooms.some((r) => x > r.x[0] && x < r.x[1] && z > r.z[0] && z < r.z[1])

  // A room's side is an outside wall when no other room is on the other side
  // of it. Partly shared sides aren't supported: split the room instead.
  const isExterior = (room, s) => {
    const along = alongOf(s)
    const shared = rooms
      .filter((r) => r !== room && Math.abs(r[s.axis][1 - s.end] - lineOf(room, s)) < EPS)
      .reduce((sum, r) => sum + overlap(r[along], room[along]), 0)
    const length = room[along][1] - room[along][0]
    if (shared > EPS && shared < length - EPS) {
      throw new Error(`room.js: the ${s.id} side of the ${room.id} is partly an outside wall; split the room`)
    }
    return shared < EPS
  }

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
      const along = alongOf(s)
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

  // The façades: the outer half of the exterior walls. Exterior sides of
  // rooms on the same line that touch are one façade.
  const facades = SIDES.flatMap((s) => {
    const along = alongOf(s)
    const stretches = []
    const sides = rooms
      .filter((room) => isExterior(room, s))
      .map((room) => ({ line: lineOf(room, s), span: [...room[along]], rooms: [room] }))
      .sort((a, b) => a.line - b.line || a.span[0] - b.span[0])
    for (const next of sides) {
      const last = stretches.at(-1)
      if (last && Math.abs(last.line - next.line) < EPS && Math.abs(last.span[1] - next.span[0]) < EPS) {
        last.span[1] = next.span[1]
        last.rooms.push(...next.rooms)
      } else stretches.push(next)
    }

    // North/south façades cover the corners: at an outside corner they run on
    // over it, at an inside corner (where the outline turns outward, as in
    // the crook of an L) they stop short and the east/west façade covers it.
    const point = (u, v) => (s.axis === 'z' ? [u, v] : [v, u]) // (along, across) → (x, z)
    const insideCorner = (u, line) => inside(...point(u, line - outward(s) * 1e-3))

    const name = s.label.split(' ')[0]
    return stretches.map(({ line, span, rooms: behind }, i) => {
      if (s.axis === 'z') {
        span = [
          span[0] + (insideCorner(span[0] - 1e-3, line) ? half : -half),
          span[1] + (insideCorner(span[1] + 1e-3, line) ? -half : half),
        ]
      }
      const several = stretches.length > 1
      return wall(s, {
        id: several ? `${OUTSIDE_ID}-${s.id}-${i + 1}` : `${OUTSIDE_ID}-${s.id}`,
        roomId: OUTSIDE_ID,
        label: several
          ? `${name} façade (${behind.map((r) => r.label.toLowerCase()).join(' and ')})`
          : `${name} façade`,
        line,
        across: line + (outward(s) * half) / 2,
        span,
        rotationY: Math.atan2(Math.sin(s.rotationY + Math.PI), Math.cos(s.rotationY + Math.PI)),
        exterior: true,
        facade: true,
      })
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

// Where the camera goes for an area: a room's floor, or the (longest) south façade.
const FRONT_FACADE = SURFACES.filter((s) => s.id.startsWith(`${OUTSIDE_ID}-south`)).sort((a, b) => b.length - a.length)[0]
export const areaFocusId = (areaId) => (areaId === OUTSIDE_ID ? FRONT_FACADE.id : `${areaId}-floor`)

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

// Each surface's own finish. The house starts as a blueprint: nothing filled in
// yet (null), the players fill it in room per room. Glass isn't in here: see
// DEFAULT_GLAZING.
export const DEFAULT_ROOM_CONFIG = Object.fromEntries(SURFACES.map((s) => [s.id, null]))

// Glass goes *through* a wall (an opening filled with a pane), so it isn't a
// finish of one side: it's kept apart, as { surfaceId: materialId }, and the
// finishes underneath stay as they were. The glass fills that surface's whole
// span, through both halves of the wall. Windows will later be the same thing
// over a smaller opening.
export const DEFAULT_GLAZING = {}

// Where glass on *another* half of the same wall opens this surface, as
// [from, to] ranges in its local x: { [surfaceId]: [[from, to], ...] }.
export function glassOpenings(glazing) {
  const glazed = Object.keys(glazing).map((id) => SURFACES_BY_ID[id])
  return Object.fromEntries(
    SURFACES.map((s) => [s.id, glazed.filter((g) => overlaps(s, g)).map((g) => localRange(s, g))]),
  )
}
