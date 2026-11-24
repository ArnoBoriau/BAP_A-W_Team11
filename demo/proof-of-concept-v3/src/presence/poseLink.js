// Sends this player's pose to the other window and keeps the latest pose
// that came back. Its own channel, separate from the game state: poses
// arrive ~20× a second and are read straight from a plain object in the draw
// loop, so they never trigger a React render.
//
// A message is only numbers: { from, points: [x, y, c, …] | null, aspect, hidden }.
// Goes over src/net/transport.js (this Mac or the network), like the game state.

import { createTransport } from '../net/transport'

const CHANNEL = 'poc2-room-presence'
const SEND_EVERY_MS = 50

export function createPoseLink(player) {
  const remote = { points: null, aspect: 4 / 3, hidden: false, at: 0 }
  let lastSent = 0

  const transport = createTransport(CHANNEL, {
    onMessage: (msg) => {
      if (msg.from === player) return
      remote.points = msg.points
      remote.aspect = msg.aspect ?? remote.aspect
      remote.hidden = !!msg.hidden
      remote.at = performance.now()
    },
  })

  return {
    remote,
    send(points, aspect, hidden) {
      const now = performance.now()
      if (now - lastSent < SEND_EVERY_MS) return
      lastSent = now
      transport.send({
        from: player,
        points: hidden || !points ? null : Array.from(points, (v) => Math.round(v * 1000) / 1000),
        aspect,
        hidden,
      })
    },
    close: () => transport.close(),
  }
}
