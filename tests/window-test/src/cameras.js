// Until camera permission is granted, browsers hide device ids and labels.
// Ask once, close that stream right away, then list the devices.
export async function listCameras() {
  let cams = await videoInputs()
  if (cams.length === 0 || cams.some((c) => !c.deviceId || !c.label)) {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    stop(s)
    cams = await videoInputs()
  }
  return cams
}

async function videoInputs() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

export function openCamera(deviceId) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  })
}

export function stop(stream) {
  stream?.getTracks().forEach((t) => t.stop())
}

// Camera chosen for a side, or a default: inside → 1st camera, outside → 2nd.
// With only one camera, both sides use it (handy for testing on a laptop).
export function resolveCamera(settings, side, cams) {
  const chosen = settings.cameras[side]
  if (chosen && cams.some((c) => c.deviceId === chosen)) return chosen
  const fallback = side === 'inside' ? cams[0] : (cams[1] ?? cams[0])
  return fallback?.deviceId ?? null
}
