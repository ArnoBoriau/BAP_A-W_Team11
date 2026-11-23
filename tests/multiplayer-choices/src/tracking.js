import ml5 from 'ml5'

// Starts the camera + ml5 bodyPose (MoveNet multipose) and keeps
// `tracker.poses` up to date with everyone the camera sees (max 6).
//
// MULTIPOSE_LIGHTNING + enableTracking gives every pose a stable `id`, so a
// person keeps the same id while they walk from one side to the other.
// Keypoints are in video pixels, mirrored (the screen behaves like a mirror:
// you step to your left, your figure moves left).
export async function startTracking(video, onStatus) {
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

  onStatus('Loading body tracking…')
  const bodyPose = await ml5.bodyPose('MoveNet', {
    modelType: 'MULTIPOSE_LIGHTNING',
    enableTracking: true,
    enableSmoothing: true,
    minPoseScore: 0.25,
    flipped: true,
  })

  const tracker = {
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
