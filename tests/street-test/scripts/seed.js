// Fills the street with made-up homes, to test without an event.
//
//   npm run seed        → 8 homes
//   npm run seed -- 20  → 20 homes
//
// Each one is a finished game with random choices (one is left half done, the
// way a group that walked away mid-game would leave it). They are saved
// through the same code as the real endpoint, so they look exactly like real ones.

import { saveHome } from '../home-store.js'
import { normalizeHome } from '../src/house/homeData.js'
import { MATERIALS, MATERIALS_BY_ID } from '../src/house/config/materials.js'
import { AREAS, SURFACES, SURFACES_BY_ID, overlaps } from '../src/house/config/room.js'

const count = Number(process.argv[2]) || 8
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const finishes = (kind) => MATERIALS.filter((m) => !m.through && m.appliesTo.includes(kind)).map((m) => m.id)

function randomHome(unfinished) {
  // A home has a character: a few favourite materials it keeps coming back to.
  const favourites = { floor: pickSome(finishes('floor'), 2), wall: pickSome(finishes('wall'), 2) }
  const config = {}
  const glazing = {}
  const stopAt = unfinished ? 2 + Math.floor(Math.random() * 3) : AREAS.length

  AREAS.forEach((area, i) => {
    for (const s of SURFACES.filter((s) => s.roomId === area.id)) {
      config[s.id] = null
      if (i >= stopAt) continue
      config[s.id] = Math.random() < 0.75 ? pick(favourites[s.kind]) : pick(finishes(s.kind))
      // now and then a wall goes glass, unless the other side already has glass
      const blocked = Object.keys(glazing).some((g) => overlaps(SURFACES_BY_ID[g], s))
      if (s.kind === 'wall' && !blocked && Math.random() < 0.15) glazing[s.id] = 'glass'
    }
  })
  return { config, glazing, builtAt: randomTime() }
}

function pickSome(list, n) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n)
}

// a moment during the event: one afternoon, today
function randomTime() {
  const d = new Date()
  d.setHours(13 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString()
}

if (!MATERIALS_BY_ID.glass) throw new Error('expected a glass material')
const unfinishedAt = Math.floor(count / 2)
for (let i = 0; i < count; i++) {
  const home = await saveHome(normalizeHome({ ...randomHome(i === unfinishedAt), number: 0 }))
  console.log(`No. ${home.number}${i === unfinishedAt ? ' (left half done)' : ''}`)
}
