// Turns raw poses into players: one per person, with a smoothed position and
// the side they stand on.
//
// The answer is where you stand. The room is split down the middle:
//   left half  → answer A
//   right half → answer B
// A strip in the middle is a dead zone, so someone standing on the line
// doesn't flicker between A and B. You keep your side until you clearly
// cross over to the other one.

export const KEYPOINTS = 17
const MIN_CONFIDENCE = 0.3
const DEAD_ZONE = 0.06 // half-width of the middle strip, in 0…1 of the frame
const FORGET_AFTER = 0.8 // seconds a player may be lost before they're dropped
const FOLLOW = 10 // smoothing speed (higher = snappier)

// The point we read a person's place from: between the hips, else between
// the shoulders, else the average of whatever we see.
const ANCHORS = [
  [11, 12],
  [5, 6],
]

export function createPlayers() {
  const players = new Map() // id → player

  function anchorX(keypoints) {
    for (const [a, b] of ANCHORS) {
      const ka = keypoints[a]
      const kb = keypoints[b]
      if (ka?.confidence > MIN_CONFIDENCE && kb?.confidence > MIN_CONFIDENCE) return (ka.x + kb.x) / 2
    }
    let sum = 0
    let n = 0
    for (const k of keypoints) {
      if (k.confidence > MIN_CONFIDENCE) {
        sum += k.x
        n++
      }
    }
    return n ? sum / n : null
  }

  function sideFor(x, previous) {
    if (x < 0.5 - DEAD_ZONE) return 'A'
    if (x > 0.5 + DEAD_ZONE) return 'B'
    return previous // in the strip: keep what you had (or nothing yet)
  }

  // poses: ml5 results, in video pixels. w/h: video size.
  function update(poses, w, h, now, dt) {
    const k = 1 - Math.exp(-dt * FOLLOW)

    poses.forEach((pose, i) => {
      const id = pose.id ?? `i${i}`
      const raw = anchorX(pose.keypoints)
      if (raw == null) return
      const x = raw / w

      let p = players.get(id)
      if (!p) {
        p = { id, x, side: null, joints: new Float32Array(KEYPOINTS * 3), born: now, seen: now, fresh: true }
        players.set(id, p)
      }
      p.x += (x - p.x) * k
      p.seen = now
      p.side = sideFor(p.x, p.side)

      pose.keypoints.slice(0, KEYPOINTS).forEach((kp, j) => {
        const o = j * 3
        const jx = kp.x / w
        const jy = kp.y / h
        if (p.fresh) {
          p.joints[o] = jx
          p.joints[o + 1] = jy
        } else {
          p.joints[o] += (jx - p.joints[o]) * k
          p.joints[o + 1] += (jy - p.joints[o + 1]) * k
        }
        p.joints[o + 2] = kp.confidence
      })
      p.fresh = false
    })

    for (const [id, p] of players) {
      if (now - p.seen > FORGET_AFTER) players.delete(id)
    }
  }

  return {
    update,
    get list() {
      return [...players.values()]
    },
    get count() {
      return players.size
    },
    tally() {
      const t = { A: 0, B: 0, none: 0 }
      for (const p of players.values()) t[p.side ?? 'none']++
      return t
    },
    DEAD_ZONE,
    MIN_CONFIDENCE,
  }
}
