// Decides whether someone is *actually there* in front of a screen, rather
// than just walking past it. Fed with MoveNet poses every frame.
//
// A person counts as a candidate when they are:
//   close   – shoulders take up enough of the frame width
//   facing  – nose visible and between the shoulders (side-on walkers fail
//             this, and their shoulders overlap so they also look narrow)
//   still   – their torso isn't sliding sideways through the frame
//
// Being a candidate fills a "dwell" timer. Only after ENTER seconds of that do
// we flip to present, so a passer-by who glances over never triggers it.
// Once present, we only drop back after LEAVE seconds without a candidate,
// so a quick turn of the head doesn't kill the pulse.

export const TUNING = {
  confidence: 0.3, // minimum keypoint confidence
  minShoulder: 0.1, // shoulder width as a fraction of frame width (≈ distance)
  maxSpeed: 0.35, // frame widths per second; faster than this = passing by
  enter: 1.5, // seconds of steady presence before we call it "present"
  leave: 2, // seconds without a candidate before we call it "gone"
}

export function createPresence(tuning = TUNING) {
  const t = { ...tuning }
  const state = {
    present: false,
    dwell: 0, // seconds of qualifying presence, capped at `enter`
    speed: 0, // smoothed sideways speed, frame widths / second
    person: null, // the measured closest person (or null)
    candidate: false,
  }
  let lastTime = null
  let lastX = null
  let lastCandidateAt = -Infinity

  function update(poses, width, now = performance.now()) {
    const dt = lastTime == null ? 0 : Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now

    const person = closest(poses, width, t.confidence)
    state.person = person

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

  return { state, tuning: t, update }
}

// The person nearest the camera = widest shoulders. Positions are normalised
// to the frame width so they don't depend on the camera resolution.
function closest(poses, width, minConf) {
  let best = null
  for (const pose of poses ?? []) {
    const ls = pose.left_shoulder
    const rs = pose.right_shoulder
    if (!ls || !rs || ls.confidence < minConf || rs.confidence < minConf) continue

    const size = Math.abs(ls.x - rs.x) / width
    if (best && size <= best.size) continue

    const nose = pose.nose
    const lo = Math.min(ls.x, rs.x)
    const hi = Math.max(ls.x, rs.x)
    const facing = !!nose && nose.confidence >= minConf && nose.x > lo && nose.x < hi

    best = { pose, size, facing, x: (ls.x + rs.x) / 2 / width }
  }
  return best
}
