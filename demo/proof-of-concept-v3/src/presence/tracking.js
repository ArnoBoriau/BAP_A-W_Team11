// Tracks the player in front of THIS screen with the webcam (ml5 MoveNet,
// same setup as tests/pulse-presence) and turns each frame into 17 points.
//
// Privacy by design: the video never leaves this window. What we hand on is
// a flat list of numbers [x, y, confidence] × 17, normalised to 0…1. No
// face, no skin, no clothes, no background: just where the joints are.

// MoveNet keypoint order (ml5 keeps it):
// 0 nose · 1–2 eyes · 3–4 ears · 5–6 shoulders · 7–8 elbows · 9–10 wrists
// 11–12 hips · 13–14 knees · 15–16 ankles
export const KEYPOINTS = 17

// The pose model is heavy: load it once per window, even when React's
// StrictMode mounts the tile twice.
let modelPromise = null
function loadModel() {
  modelPromise ??= import('ml5').then(({ default: ml5 }) => ml5.bodyPose('MoveNet', { flipped: true }))
  return modelPromise
}

// Starts the camera + model and calls onPose(points | null) for every frame.
// `points` is a Float32Array of KEYPOINTS × 3 (x, y, confidence), mirrored
// like a selfie view. `aspect` of the camera is passed along so the other
// side can draw the figure without stretching it.
// Returns a stop() function.
export function startTracking({ onPose, onStatus }) {
  let stopped = false
  let stream = null
  let model = null
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true

  const status = (s) => !stopped && onStatus(s)

  ;(async () => {
    status('starting')
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 480 } }, // plenty for 17 points
      })
    } catch {
      status('blocked')
      return
    }
    if (stopped) return stopTracks(stream)

    video.srcObject = stream
    await new Promise((r) => (video.readyState >= 1 ? r() : video.addEventListener('loadedmetadata', r, { once: true })))
    // ml5 mirrors keypoints using the element's width/height attributes.
    video.width = video.videoWidth
    video.height = video.videoHeight
    await video.play().catch(() => {})

    status('loading')
    model = await loadModel()
    if (stopped) return
    status('tracking')

    const w = video.videoWidth
    const h = video.videoHeight
    const aspect = w / h
    model.detectStart(video, (poses) => {
      if (stopped) return
      onPose(toPoints(closest(poses), w, h), aspect)
    })
  })().catch(() => status('blocked'))

  return () => {
    stopped = true
    model?.detectStop()
    stopTracks(stream)
    video.srcObject = null
  }
}

function stopTracks(stream) {
  stream?.getTracks().forEach((t) => t.stop())
}

// The person nearest to the camera = widest shoulders.
function closest(poses) {
  let best = null
  let bestSize = -1
  for (const pose of poses ?? []) {
    const [, , , , , ls, rs] = pose.keypoints
    const size = ls && rs ? Math.abs(ls.x - rs.x) : 0
    if (size > bestSize) {
      best = pose
      bestSize = size
    }
  }
  return best
}

function toPoints(pose, w, h) {
  if (!pose) return null
  const out = new Float32Array(KEYPOINTS * 3)
  pose.keypoints.slice(0, KEYPOINTS).forEach((k, i) => {
    out[i * 3] = k.x / w
    out[i * 3 + 1] = k.y / h
    out[i * 3 + 2] = k.confidence
  })
  return out
}
