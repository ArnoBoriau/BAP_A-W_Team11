// DOM side of hand input: starts the camera, draws the hand cursor and a small
// camera preview, and lets a pinch "press" any regular <button> on the page.
// The 3D side (orbit, zoom, picking a surface) lives in scene/HandControls.jsx.

import { useEffect, useRef, useState } from 'react'
import { handInput, onHandEvent, startHandTracking } from './handTracker'

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

const STATUS_TEXT = {
  loading: 'Starting camera…',
  ready: 'Raise a hand to start',
}

export function HandInput() {
  const videoRef = useRef()
  const previewRef = useRef()
  const cursorRef = useRef()
  const [status, setStatus] = useState(handInput.status)
  const [present, setPresent] = useState(false)

  useEffect(() => startHandTracking(videoRef.current), [])

  useEffect(() => {
    let hovered = null

    const setHovered = (button) => {
      if (hovered === button) return
      hovered?.removeAttribute('data-hand-hover')
      hovered = button
      hovered?.setAttribute('data-hand-hover', '')
    }

    const off = onHandEvent((type, detail) => {
      if (type === 'status') setStatus(handInput.status)

      if (type === 'tap') {
        const button = buttonAt(detail.x, detail.y)
        button?.click()
      }

      if (type === 'frame') {
        setPresent(handInput.present) // React bails out when unchanged
        const { x, y } = handInput.cursor
        const cursor = cursorRef.current
        cursor.style.transform = `translate(${x}px, ${y}px)`
        cursor.dataset.pinching = handInput.pinching
        cursor.dataset.zoom = handInput.gesture.kind === 'zoom'

        setHovered(handInput.present ? buttonAt(x, y) : null)
        if (hovered) hovered.toggleAttribute('data-hand-press', handInput.pinching)

        drawPreview(previewRef.current, videoRef.current)
      }
    })

    return () => {
      off()
      setHovered(null)
    }
  }, [])

  const message = status === 'error' ? `${handInput.error} · mouse still works` : !present && STATUS_TEXT[status]

  return (
    <>
      <div className="hand-preview" hidden={status !== 'ready'}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={previewRef} />
      </div>
      <div ref={cursorRef} className="hand-cursor" hidden={!present} />
      {message && <p className="hand-status">{message}</p>}
    </>
  )
}

function buttonAt(x, y) {
  return document.elementFromPoint(x, y)?.closest('button:not(:disabled)') ?? null
}

// Skeleton over the (mirrored) camera image, so people see they're being tracked.
function drawPreview(canvas, video) {
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio)
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio)
  if (!w || !h || !video.videoWidth) return

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 2 * devicePixelRatio
  ctx.lineCap = 'round'

  handInput.hands.forEach((hand, i) => {
    const primary = i === 0
    ctx.strokeStyle = primary ? '#ff6a3d' : 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    for (const [a, b] of BONES) {
      ctx.moveTo(hand[a].x * w, hand[a].y * h)
      ctx.lineTo(hand[b].x * w, hand[b].y * h)
    }
    ctx.stroke()
  })

  // Camera fps + model time: shows whether the webcam or the computer is the bottleneck.
  const { fps, inferenceMs } = handInput.stats
  ctx.font = `${11 * devicePixelRatio}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(`${Math.round(fps)} fps · ${inferenceMs.toFixed(1)} ms`, 6 * devicePixelRatio, 16 * devicePixelRatio)
}
