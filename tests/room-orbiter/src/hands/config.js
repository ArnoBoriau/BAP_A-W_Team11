// Tunables for hand input. Everything that "feels" wrong is probably fixed here.

// Model + runtime. Both load from the web; for an offline setup, copy
// node_modules/@mediapipe/tasks-vision/wasm and the .task file into /public
// and point these at the local copies (e.g. '/mediapipe/wasm').
export const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export const HANDS = {
  // Part of the camera image that maps to the full screen (0..1, after mirroring).
  // Smaller box = less arm movement needed to reach the screen edges.
  activeArea: { left: 0.2, right: 0.8, top: 0.15, bottom: 0.75 },

  // Pinch = thumb tip close to index tip, relative to hand size.
  // Two thresholds (hysteresis) so a pinch doesn't flicker on and off.
  pinchOn: 0.28,
  pinchOff: 0.42,

  // A pinch that moves less than this (px) is a "tap" (select), more is a drag (orbit).
  tapMaxMove: 20,

  // Cursor smoothing (One Euro filter): lower minCutoff = steadier but laggier,
  // higher beta = catches up faster on quick moves.
  // Lag vs. jitter trade-off: if the cursor shakes at rest, lower minCutoff;
  // if it trails behind, raise beta (then minCutoff).
  minCutoff: 1.6,
  beta: 0.06,

  // Orbit speed: radians per screen height of hand travel.
  orbitSpeed: Math.PI * 1.5,

  // Camera easing (seconds) while a hand drags or zooms. The mouse/selection
  // glide uses 0.35 s, which feels like the room is trailing behind the hand.
  cameraSmoothTime: 0.06,
}
