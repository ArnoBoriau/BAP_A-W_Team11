import ml5 from 'ml5'
import { listCameras, openCamera, chosenCamera, rememberCamera, stop } from './cameras.js'
import { createPresence } from './presence.js'
import { createLink } from './link.js'

const NAME = { inside: 'Inside', outside: 'Outside' }

// Each window watches the person at ITS screen with its own camera, and
// pulses when someone is standing at the OTHER screen — an invitation to
// come closer, because someone is waiting on the other side.
export function mountView(root, side) {
  const other = side === 'inside' ? 'outside' : 'inside'
  document.title = `${NAME[side]} · Pulse`
  document.body.dataset.side = side

  root.innerHTML = `
    <main class="surface"><div class="pulse"></div></main>

    <aside class="debug" hidden>
      <header>
        <strong>${NAME[side]} screen</strong>
        <span>pulses when someone stands ${other}</span>
      </header>
      <label>Camera at this screen <select data-k="camera"></select></label>
      <div class="cam"><video autoplay playsinline muted></video><canvas></canvas></div>
      <dl>
        <dt>Here (${side})</dt><dd data-v="mine">–</dd>
        <dt>Other side</dt><dd data-v="other">–</dd>
        <dt>Distance</dt><dd data-v="size">–</dd>
        <dt>Facing</dt><dd data-v="facing">–</dd>
        <dt>Sideways speed</dt><dd data-v="speed">–</dd>
      </dl>
      <div class="dwell"><span></span></div>
      <p class="status"></p>
      <footer><kbd>D</kbd> debug · <kbd>F</kbd> fullscreen · <kbd>P</kbd> fake presence here</footer>
    </aside>
  `

  const $ = (sel) => root.querySelector(sel)
  const panel = $('.debug')
  const video = $('video')
  const canvas = $('canvas')
  const select = $('[data-k="camera"]')
  const status = $('.status')
  const out = (k) => $(`[data-v="${k}"]`)

  const presence = createPresence()
  let faked = false

  const link = createLink(side, (otherPresent) => {
    document.body.classList.toggle('pulsing', otherPresent)
    render()
  })

  // ---- camera + pose model ------------------------------------------------

  let cams = []
  let stream = null
  let token = 0

  async function useCamera(id) {
    const t = ++token
    stop(stream)
    stream = null
    setStatus('Opening camera…')
    try {
      const s = await openCamera(id)
      if (t !== token) return stop(s)
      stream = s
      video.srcObject = s
      await new Promise((r) =>
        video.readyState >= 1 ? r() : video.addEventListener('loadedmetadata', r, { once: true }),
      )
      // ml5 mirrors keypoints using the element's width/height attributes.
      video.width = canvas.width = video.videoWidth
      video.height = canvas.height = video.videoHeight
      await video.play().catch(() => {})
      setStatus('')
    } catch (err) {
      if (t === token) setStatus(`Can't open camera: ${err.message}`)
    }
  }

  function onPoses(poses) {
    if (!video.videoWidth) return
    presence.update(poses, video.videoWidth)
    link.setMine(faked || presence.state.present)
    if (!panel.hidden) render()
  }

  async function start() {
    cams = await listCameras()
    if (!cams.length) return setStatus('No camera found')
    fillSelect()
    await useCamera(chosenCamera(side, cams))
    setStatus('Loading pose model…')
    const bodyPose = await ml5.bodyPose('MoveNet', { flipped: true })
    setStatus('')
    bodyPose.detectStart(video, onPoses)
  }

  // ---- debug panel ----------------------------------------------------------

  function fillSelect() {
    select.innerHTML = cams
      .map((c, i) => `<option value="${c.deviceId}">${escapeHtml(c.label || `Camera ${i + 1}`)}</option>`)
      .join('')
    select.value = chosenCamera(side, cams) ?? ''
  }

  function render() {
    const s = presence.state
    const p = s.person
    const t = presence.tuning
    out('mine').textContent = faked ? 'present (faked)' : s.present ? 'present' : 'nobody'
    out('other').textContent = link.other ? 'present → pulsing' : 'nobody'
    out('size').textContent = p ? `${pct(p.size)} ${p.size >= t.minShoulder ? '✓' : `(need ${pct(t.minShoulder)})`}` : '–'
    out('facing').textContent = p ? (p.facing ? '✓' : 'no') : '–'
    out('speed').textContent = p ? `${s.speed.toFixed(2)} ${s.speed <= t.maxSpeed ? '✓' : '(passing by)'}` : '–'
    $('.dwell span').style.width = `${(s.dwell / t.enter) * 100}%`
    panel.classList.toggle('is-present', s.present || faked)
    drawSkeleton(p)
  }

  function drawSkeleton(person) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!person) return
    ctx.fillStyle = presence.state.candidate ? '#7ddc8f' : '#e8a25b'
    for (const k of person.pose.keypoints) {
      if (k.confidence < presence.tuning.confidence) continue
      ctx.beginPath()
      ctx.arc(k.x, k.y, canvas.width / 160, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function setStatus(text) {
    status.textContent = text
    status.hidden = !text
  }

  select.addEventListener('change', () => {
    rememberCamera(side, select.value)
    useCamera(select.value)
  })

  // ---- keys -------------------------------------------------------------------

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('select')) return
    const k = e.key.toLowerCase()
    if (k === 'd') {
      panel.hidden = !panel.hidden
      if (!panel.hidden) render()
    } else if (k === 'f') {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen().catch(() => {})
    } else if (k === 'p') {
      // Test the other screen without anyone standing here.
      faked = !faked
      link.setMine(faked || presence.state.present)
      render()
    }
  })

  // Hide the cursor when idle so the installation looks clean.
  let idleTimer
  const wake = () => {
    document.body.classList.remove('idle')
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500)
  }
  window.addEventListener('pointermove', wake)
  wake()

  navigator.mediaDevices.addEventListener('devicechange', async () => {
    cams = await listCameras().catch(() => cams)
    fillSelect()
  })

  start().catch((err) => setStatus(`Camera access blocked: ${err.message}`))
  render()
}

const pct = (v) => `${Math.round(v * 100)}%`

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}
