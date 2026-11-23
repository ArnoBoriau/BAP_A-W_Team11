// ?sim=3 → three fake people instead of the camera, to test the flow alone.
// They produce the same shape as ml5 poses (video pixels, keypoints with
// x/y/confidence, an id), so everything after this is the real pipeline.

// A standing figure, 0…1 around its centre (x) and the frame height (y).
const BODY = [
  [0, 0.2], // nose
  [-0.012, 0.185], [0.012, 0.185], // eyes
  [-0.025, 0.2], [0.025, 0.2], // ears
  [-0.06, 0.3], [0.06, 0.3], // shoulders
  [-0.08, 0.45], [0.08, 0.45], // elbows
  [-0.085, 0.58], [0.085, 0.58], // wrists
  [-0.04, 0.58], [0.04, 0.58], // hips
  [-0.045, 0.76], [0.045, 0.76], // knees
  [-0.05, 0.93], [0.05, 0.93], // ankles
]

export function createSim(count, w = 1280, h = 720) {
  const people = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    phase: Math.random() * Math.PI * 2,
    speed: 0.08 + Math.random() * 0.12,
    scale: 0.85 + Math.random() * 0.3,
  }))

  return {
    width: w,
    height: h,
    connections: [[0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]],
    get poses() {
      const t = performance.now() / 1000
      return people.map((p) => {
        // wander, and now and then cross to the other side
        const cx = 0.5 + Math.sin(t * p.speed + p.phase) * 0.38
        const bob = Math.sin(t * 3 + p.phase) * 0.004
        return {
          id: p.id,
          keypoints: BODY.map(([x, y]) => ({
            x: (cx + x * p.scale) * w,
            y: (1 - (1 - y) * p.scale + bob) * h,
            confidence: 0.9,
          })),
        }
      })
    },
  }
}
