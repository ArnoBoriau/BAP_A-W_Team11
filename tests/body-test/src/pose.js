import ml5 from 'ml5'

// Starts the camera + ml5 bodyPose and keeps `tracker.poses` up to date.
// Keypoints are in video pixels, mirrored (so it behaves like a mirror/window).
//
// Model: MoveNet (default) is fast and tracks several people.
//        BlazePose is single person but more detailed (open with ?model=BlazePose).
export async function startTracking(video, onStatus) {
  const modelName =
    new URLSearchParams(location.search).get('model') === 'BlazePose' ? 'BlazePose' : 'MoveNet'

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
  })
  video.srcObject = stream
  await new Promise((r) => (video.readyState >= 1 ? r() : video.addEventListener('loadedmetadata', r, { once: true })))
  await video.play()
  // ml5 scales/mirrors keypoints using the element's width/height attributes.
  video.width = video.videoWidth
  video.height = video.videoHeight

  onStatus(`Loading ${modelName}…`)
  // Without p5.js, ml5 returns a Promise that resolves to the loaded model.
  const bodyPose = await ml5.bodyPose(modelName, { flipped: true })

  const tracker = {
    modelName,
    poses: [],
    connections: bodyPose.getSkeleton(),
    get width() {
      return video.videoWidth
    },
    get height() {
      return video.videoHeight
    },
  }

  bodyPose.detectStart(video, (results) => {
    tracker.poses = results
  })

  return tracker
}
