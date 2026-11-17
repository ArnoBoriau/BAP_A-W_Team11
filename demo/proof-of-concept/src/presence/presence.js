// Decides whether the player is *actually there* in front of this screen,
// rather than just walking past it. Same rules as tests/pulse-presence, fed
// with the 17 points from tracking.js (x, y normalised to 0…1).
//
// A person counts as a candidate when they are:
//   close   – shoulders take up enough of the frame width
//   facing  – nose visible and between the shoulders (side-on walkers fail
//             this, and their shoulders overlap so they also look narrow)
//   still   – their torso isn't sliding sideways through the frame
//
// Being a candidate fills a "dwell" timer. Only after ENTER seconds of that do
// we flip to present, so a passer-by who glances over never starts the game.
// Once present, we only drop back after LEAVE seconds without a candidate,
// so looking away for a moment doesn't pause it.

const NOSE = 0
const LS = 5
const RS = 6

export const TUNING = {
  confidence: 0.3, // minimum keypoint confidence
  minShoulder: 0.1, // shoulder width as a fraction of frame width (≈ distance)
  maxSpeed: 0.35, // frame widths per second; faster than this = passing by
  enter: 1.5, // seconds of steady presence before we call it "present"
  leave: 3, // seconds without a candidate before we call it "gone"
}

export function createPresence(tuning = TUNING) {
  const t = { ...tuning }
  const state = {
    present: false,
    dwell: 0, // seconds of qualifying presence, capped at `enter`
    speed: 0, // smoothed sideways speed, frame widths / second
    candidate: false,
  }
  let lastTime = null
  let lastX = null
  let lastCandidateAt = -Infinity

  // points: Float32Array of 17 × [x, y, confidence], or null (nobody in view)
  function update(points, now = performance.now()) {
    const dt = lastTime == null ? 0 : Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now

    const person = measure(points, t.confidence)

    if (person) {
      if (lastX != null && dt > 0) {
        const v = Math.abs(person.x - lastX) / dt
        state.speed += (v - state.speed) * 0.3 // smooth out keypoint jitter
      }
      lastX = person.x
    } else {
      lastX = null
      state.speed = 0
    }

    state.candidate = !!person && person.size >= t.minShoulder && person.facing && state.speed <= t.maxSpeed

    if (state.candidate) {
      state.dwell = Math.min(t.enter, state.dwell + dt)
      lastCandidateAt = now
    } else {
      // Drain faster than it fills: walking past twice doesn't add up.
      state.dwell = Math.max(0, state.dwell - dt * 2)
    }

    if (!state.present && state.dwell >= t.enter) state.present = true
    else if (state.present && now - lastCandidateAt > t.leave * 1000) state.present = false

    return state
  }

  // 0…1: how far along "we see you, hold on" is. 1 while present.
  const progress = () => (state.present ? 1 : state.dwell / t.enter)

  return { state, tuning: t, update, progress }
}

function measure(points, minConf) {
  if (!points) return null
  const c = (i) => points[i * 3 + 2]
  const x = (i) => points[i * 3]
  if (c(LS) < minConf || c(RS) < minConf) return null

  const lo = Math.min(x(LS), x(RS))
  const hi = Math.max(x(LS), x(RS))
  const facing = c(NOSE) >= minConf && x(NOSE) > lo && x(NOSE) < hi
  return { size: hi - lo, facing, x: (lo + hi) / 2 }
}
