// Webcam → hand landmarks → one gesture state that the rest of the app reads.
// Plain JS (no React, no Three.js) so the same tracker can drive other tests.
//
// Gestures (kept to what's easy to do in the air):
//   one hand           move cursor
//   pinch + release    tap: press the button / select the surface under the cursor
//   pinch + drag       orbit the camera
//   pinch both hands   zoom: move the hands apart / together

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { HANDS, MODEL_URL, WASM_URL } from './config'

// MediaPipe landmark indices
const WRIST = 0
const THUMB_TIP = 4
const INDEX_MCP = 5
const INDEX_TIP = 8
const MIDDLE_MCP = 9
const PINKY_MCP = 17

export const handInput = {
  status: 'off', // off | loading | ready | error
  error: null,
  present: false, // is a hand in view
  cursor: { x: 0, y: 0 }, // viewport px
  pinching: false,
  hands: [], // raw landmarks (mirrored, 0..1) for the preview
  stats: { fps: 0, inferenceMs: 0 }, // camera frames processed per second, model time per frame
  // Current gesture. Readers compare `id` to notice a new gesture starting.
  gesture: { id: 0, kind: 'none', start: { x: 0, y: 0 }, spread: 1, startSpread: 1 },
}

const listeners = new Set()
// Events: 'status', 'tap' ({x, y}), 'frame'
export function onHandEvent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function emit(type, detail) {
  for (const fn of listeners) fn(type, detail)
}

function setStatus(status, error = null) {
  handInput.status = status
  handInput.error = error
  emit('status')
}

// --- tracker lifecycle -----------------------------------------------------

// Starts the camera + model. Returns `stop`, safe to call at any time (also mid-load).
export function startHandTracking(video) {
  let stopped = false
  let landmarker = null
  let stream = null
  let cancelFrame = () => {}

  const stop = () => {
    if (stopped) return
    stopped = true
    cancelFrame()
    stream?.getTracks().forEach((t) => t.stop())
    landmarker?.close()
    resetGesture()
    handInput.present = false
    handInput.hands = []
    setStatus('off')
  }

  const run = async () => {
    setStatus('loading')
    stream = await navigator.mediaDevices.getUserMedia({
      // Higher frame rate = less time between your hand moving and the frame
      // that shows it. Most webcams do 30, some 60 at this resolution.
      video: { width: 640, height: 480, frameRate: { ideal: 60 }, facingMode: 'user' },
      audio: false,
    })
    if (stopped) return stream.getTracks().forEach((t) => t.stop())
    video.srcObject = stream
    await video.play()

    const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
    const lm = await createLandmarker(fileset, 'GPU').catch(() => createLandmarker(fileset, 'CPU'))
    if (stopped) return lm.close()
    landmarker = lm
    setStatus('ready')

    const process = () => {
      const t0 = performance.now()
      const result = landmarker.detectForVideo(video, t0)
      const t1 = performance.now()
      update(result, video.videoWidth / video.videoHeight)
      updateStats(t0, t1 - t0)
      emit('frame')
    }

    // Run as soon as the camera delivers a new frame, instead of waiting for
    // the next animation frame (saves up to one screen refresh, ~16 ms).
    if ('requestVideoFrameCallback' in video) {
      let handle = 0
      const onFrame = () => {
        handle = video.requestVideoFrameCallback(onFrame)
        process()
      }
      handle = video.requestVideoFrameCallback(onFrame)
      cancelFrame = () => video.cancelVideoFrameCallback(handle)
    } else {
      let raf = 0
      let lastVideoTime = -1
      const loop = () => {
        raf = requestAnimationFrame(loop)
        if (video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime
        process()
      }
      loop()
      cancelFrame = () => cancelAnimationFrame(raf)
    }
  }

  run().catch((err) => {
    if (stopped) return
    console.error(err)
    stream?.getTracks().forEach((t) => t.stop())
    setStatus('error', describeError(err))
  })

  return stop
}

function createLandmarker(fileset, delegate) {
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  })
}

function describeError(err) {
  if (err?.name === 'NotAllowedError') return 'Camera access was blocked'
  if (err?.name === 'NotFoundError') return 'No camera found'
  return 'Hand tracking could not start'
}

let lastFrameAt = 0
function updateStats(now, inferenceMs) {
  const s = handInput.stats
  const dt = lastFrameAt ? now - lastFrameAt : 0
  lastFrameAt = now
  if (dt > 0) s.fps += (1000 / dt - s.fps) * 0.1
  s.inferenceMs += (inferenceMs - s.inferenceMs) * 0.1
}

// --- per-frame interpretation ---------------------------------------------

const filterX = oneEuro()
const filterY = oneEuro()
let pinched = [false, false] // per hand, in the same order as `hands`

function update(result, aspect) {
  // Mirror x so the screen behaves like a mirror.
  const hands = result.landmarks.map((lm) => lm.map((p) => ({ x: 1 - p.x, y: p.y })))
  handInput.hands = hands

  if (hands.length === 0) {
    handInput.present = false
    handInput.pinching = false
    pinched = [false, false]
    filterX.reset()
    filterY.reset()
    if (handInput.gesture.kind !== 'none') endGesture(false)
    return
  }

  // Primary hand = the one nearest to where the cursor already is, so the
  // cursor doesn't jump when a second hand enters the frame.
  if (hands.length > 1 && handInput.present) {
    const d = (h) => dist2(toScreen(palm(h)), handInput.cursor)
    if (d(hands[1]) < d(hands[0])) {
      hands.reverse()
      pinched.reverse()
    }
  }

  const now = performance.now() / 1000
  const raw = toScreen(palm(hands[0]))
  handInput.cursor = { x: filterX(raw.x, now), y: filterY(raw.y, now) }
  handInput.present = true

  pinched = hands.map((h, i) => {
    const ratio = pinchRatio(h, aspect)
    return pinched[i] ? ratio < HANDS.pinchOff : ratio < HANDS.pinchOn
  })
  if (hands.length < 2) pinched[1] = false
  handInput.pinching = pinched[0]

  const both = pinched[0] && pinched[1]
  const g = handInput.gesture

  if (both) {
    const spread = Math.sqrt(dist2(toScreen(pinchPoint(hands[0])), toScreen(pinchPoint(hands[1]))))
    if (g.kind !== 'zoom') {
      if (g.kind !== 'none') endGesture(false)
      beginGesture('zoom')
      g.startSpread = Math.max(spread, 1)
    }
    g.spread = Math.max(spread, 1)
    return
  }

  if (g.kind === 'zoom') {
    // One hand let go: stop zooming, wait for a fresh pinch.
    endGesture(false)
    g.kind = 'cooldown'
  }
  if (g.kind === 'cooldown') {
    if (!pinched[0]) g.kind = 'none'
    return
  }

  if (pinched[0] && g.kind === 'none') beginGesture('pinch')
  else if (!pinched[0] && g.kind !== 'none') endGesture(true)
  else if (g.kind === 'pinch' && movedFromStart() > HANDS.tapMaxMove) {
    g.kind = 'drag'
    g.start = { ...handInput.cursor } // orbit from here, so the tap dead zone doesn't jump
  }
}

function beginGesture(kind) {
  const g = handInput.gesture
  g.id++
  g.kind = kind
  g.start = { ...handInput.cursor }
}

function endGesture(allowTap) {
  const g = handInput.gesture
  if (allowTap && g.kind === 'pinch') emit('tap', { ...g.start })
  g.kind = 'none'
}

function resetGesture() {
  handInput.gesture.kind = 'none'
  pinched = [false, false]
}

function movedFromStart() {
  return Math.sqrt(dist2(handInput.cursor, handInput.gesture.start))
}

// --- geometry --------------------------------------------------------------

// Palm centre: doesn't move when the fingers pinch, so the cursor stays put.
function palm(h) {
  const pts = [h[WRIST], h[INDEX_MCP], h[MIDDLE_MCP], h[PINKY_MCP]]
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}

function pinchPoint(h) {
  return { x: (h[THUMB_TIP].x + h[INDEX_TIP].x) / 2, y: (h[THUMB_TIP].y + h[INDEX_TIP].y) / 2 }
}

// Thumb-index distance divided by palm size, so it works near and far from the camera.
function pinchRatio(h, aspect) {
  const d = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y)
  return d(h[THUMB_TIP], h[INDEX_TIP]) / Math.max(d(h[WRIST], h[MIDDLE_MCP]), 1e-6)
}

// Camera space (0..1) → viewport px, through the active area.
function toScreen(p) {
  const a = HANDS.activeArea
  const nx = clamp01((p.x - a.left) / (a.right - a.left))
  const ny = clamp01((p.y - a.top) / (a.bottom - a.top))
  return { x: nx * window.innerWidth, y: ny * window.innerHeight }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

// One Euro filter (Casiez et al.): smooths jitter at rest, stays responsive when moving.
function oneEuro() {
  let prev = null
  let dPrev = 0
  let tPrev = 0
  const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt))

  const filter = (value, t) => {
    if (prev === null) {
      prev = value
      tPrev = t
      return value
    }
    const dt = Math.max(t - tPrev, 1e-3)
    tPrev = t
    const d = (value - prev) / dt
    dPrev += alpha(1, dt) * (d - dPrev)
    const cutoff = HANDS.minCutoff + HANDS.beta * Math.abs(dPrev)
    prev += alpha(cutoff, dt) * (value - prev)
    return prev
  }
  filter.reset = () => {
    prev = null
    dPrev = 0
  }
  return filter
}
