import { load, update, onExternalChange } from './settings.js'
import { listCameras, openCamera, resolveCamera, stop } from './cameras.js'

const NAME = { inside: 'Inside', outside: 'Outside' }

export function mountView(root, side) {
  const other = side === 'inside' ? 'outside' : 'inside'
  document.title = `${NAME[side]} · Window`
  document.body.dataset.side = side

  root.innerHTML = `
    <main class="wall">
      <div class="window">
        <div class="opening">
          <video class="feed" autoplay playsinline muted></video>
          <p class="status">Starting camera…</p>
          <div class="glass"></div>
          <div class="mullions"><span class="v"></span><span class="h"></span></div>
        </div>
        <div class="sill"></div>
      </div>
    </main>

    <button class="gear" type="button" aria-label="Settings" title="Settings (S)">⚙</button>

    <aside class="panel" hidden>
      <header>
        <strong>${NAME[side]} screen</strong>
        <span>shows the ${other} camera</span>
      </header>

      <label>
        Camera at this screen <small>(films the ${side} person, shown on the ${other} screen)</small>
        <select data-k="camera"></select>
      </label>
      <video class="preview" autoplay playsinline muted></video>

      <label class="check"><input type="checkbox" data-k="mirror" /> Mirror the view on this screen</label>
      <label class="check"><input type="checkbox" data-k="mullions" /> Window bars</label>

      <fieldset>
        <legend>Window position (shared, mirrored on the outside)</legend>
        <label>Left <input type="range" data-k="x" min="0" max="95" /></label>
        <label>Top <input type="range" data-k="y" min="0" max="95" /></label>
        <label>Width <input type="range" data-k="w" min="5" max="100" /></label>
        <label>Height <input type="range" data-k="h" min="5" max="100" /></label>
      </fieldset>

      <footer>
        <button type="button" data-act="fullscreen">Fullscreen</button>
        <span><kbd>S</kbd> settings · <kbd>F</kbd> fullscreen</span>
      </footer>
    </aside>
  `

  const $ = (sel) => root.querySelector(sel)
  const win = $('.window')
  const feed = $('.feed')
  const status = $('.status')
  const panel = $('.panel')
  const preview = $('.preview')
  const select = $('[data-k="camera"]')

  let cams = []
  let settings = load()

  // ---- layout ------------------------------------------------------------

  function applyLayout() {
    const { x, y, w, h } = settings.frame
    const width = Math.min(w, 100 - x)
    const height = Math.min(h, 100 - y)
    // Back to back: what is on the left inside is on the right outside.
    const left = side === 'outside' ? 100 - x - width : x
    Object.assign(win.style, {
      left: `${left}%`,
      top: `${y}%`,
      width: `${width}%`,
      height: `${height}%`,
    })
    feed.classList.toggle('mirrored', settings.mirror[side])
    win.classList.toggle('no-mullions', !settings.mullions)
  }

  // ---- the feed: the other side's camera ----------------------------------

  let feedStream = null
  let feedId = null
  let feedToken = 0

  async function showFeed() {
    const id = resolveCamera(settings, other, cams)
    if (!id) return setStatus('No camera found')
    if (id === feedId && feedStream) return

    const token = ++feedToken
    feedId = id
    stop(feedStream)
    feedStream = null
    setStatus(`Opening ${other} camera…`)
    try {
      const stream = await openCamera(id)
      if (token !== feedToken) return stop(stream) // a newer request won
      feedStream = stream
      feed.srcObject = stream
      setStatus('')
    } catch (err) {
      if (token === feedToken) setStatus(`Can't open the ${other} camera: ${err.message}`)
    }
  }

  function setStatus(text) {
    status.textContent = text
    status.hidden = !text
  }

  // ---- panel: pick + preview this side's camera ---------------------------

  let previewStream = null
  let previewToken = 0

  async function showPreview() {
    const token = ++previewToken
    stop(previewStream)
    previewStream = null
    const id = resolveCamera(settings, side, cams)
    if (!id || panel.hidden) return
    // Same device as the feed (single-camera testing): reuse that stream.
    if (id === feedId && feedStream) {
      preview.srcObject = feedStream
      return
    }
    try {
      const stream = await openCamera(id)
      if (token !== previewToken || panel.hidden) return stop(stream)
      previewStream = stream
      preview.srcObject = stream
    } catch {}
  }

  function fillPanel() {
    const current = resolveCamera(settings, side, cams)
    select.innerHTML = cams
      .map((c, i) => `<option value="${c.deviceId}">${escapeHtml(c.label || `Camera ${i + 1}`)}</option>`)
      .join('')
    if (current) select.value = current
    $('[data-k="mirror"]').checked = settings.mirror[side]
    $('[data-k="mullions"]').checked = settings.mullions
    for (const k of ['x', 'y', 'w', 'h']) $(`[data-k="${k}"]`).value = settings.frame[k]
  }

  function togglePanel(open = panel.hidden) {
    panel.hidden = !open
    if (open) {
      fillPanel()
      showPreview()
    } else {
      ++previewToken
      stop(previewStream)
      previewStream = null
      preview.srcObject = null
    }
  }

  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.k
    if (!k) return
    settings = update((s) => {
      if (k === 'camera') s.cameras[side] = e.target.value
      else if (k === 'mirror') s.mirror[side] = e.target.checked
      else if (k === 'mullions') s.mullions = e.target.checked
      else s.frame[k] = Number(e.target.value)
    })
    applyLayout()
    if (k === 'camera') {
      showPreview()
      showFeed() // matters when both sides share a camera
    }
  })

  $('.gear').addEventListener('click', () => togglePanel())
  $('[data-act="fullscreen"]').addEventListener('click', toggleFullscreen)
  win.addEventListener('dblclick', toggleFullscreen)

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select')) return
    if (e.key === 's' || e.key === 'S') togglePanel()
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    else if (e.key === 'Escape' && !panel.hidden) togglePanel(false)
  })

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  // Hide cursor + gear when idle, so the installation looks clean.
  let idleTimer
  const wake = () => {
    document.body.classList.remove('idle')
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500)
  }
  window.addEventListener('pointermove', wake)
  window.addEventListener('keydown', wake)
  wake()

  // ---- sync with the other window ----------------------------------------

  onExternalChange((s) => {
    settings = s
    applyLayout()
    showFeed()
    if (!panel.hidden) fillPanel()
  })

  navigator.mediaDevices.addEventListener('devicechange', async () => {
    cams = await listCameras().catch(() => cams)
    showFeed()
    if (!panel.hidden) fillPanel()
  })

  // ---- start -------------------------------------------------------------

  applyLayout()
  listCameras()
    .then((list) => {
      cams = list
      showFeed()
    })
    .catch((err) => setStatus(`Camera access blocked: ${err.message}`))
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}
