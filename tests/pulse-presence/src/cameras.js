// Until camera permission is granted, browsers hide device ids and labels.
// Ask once, close that stream right away, then list the devices.
export async function listCameras() {
  let cams = await videoInputs()
  if (cams.length === 0 || cams.some((c) => !c.deviceId || !c.label)) {
    stop(await navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
    cams = await videoInputs()
  }
  return cams
}

async function videoInputs() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

// Pose detection doesn't need more than 720p.
export function openCamera(deviceId) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  })
}

export function stop(stream) {
  stream?.getTracks().forEach((t) => t.stop())
}

// The camera mounted at this side's screen. Remembered per side; defaults to
// 1st camera inside, 2nd outside (or the only one, for laptop testing).
const key = (side) => `pulse-presence:camera:${side}`

export function chosenCamera(side, cams) {
  let id = null
  try {
    id = localStorage.getItem(key(side))
  } catch {}
  if (id && cams.some((c) => c.deviceId === id)) return id
  const fallback = side === 'inside' ? cams[0] : (cams[1] ?? cams[0])
  return fallback?.deviceId ?? null
}

export function rememberCamera(side, id) {
  try {
    localStorage.setItem(key(side), id)
  } catch {}
}
