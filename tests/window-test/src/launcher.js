export function mountLauncher(root) {
  document.body.dataset.side = 'launcher'
  root.innerHTML = `
    <main class="launcher">
      <h1>Window</h1>
      <p>One computer, two screens back to back on one wall. Each screen is a window
        that shows a live feed of the person on the other side.</p>

      <div class="sides">
        <a href="?side=inside" target="inside"><strong>Inside screen</strong><span>shows the outside camera</span></a>
        <a href="?side=outside" target="outside"><strong>Outside screen</strong><span>shows the inside camera</span></a>
      </div>

      <button type="button" id="open-both">Open both windows</button>
      <p class="note">Each window opens on its own screen when the browser can place it.
        If not, drag them over yourself. In each window, press <kbd>F</kbd> for fullscreen and <kbd>S</kbd> for settings.</p>
    </main>
  `

  const note = root.querySelector('.note')

  root.querySelector('#open-both').addEventListener('click', async () => {
    // Chromium's Window Management API tells us where the screens are.
    let screens = []
    if ('getScreenDetails' in window) {
      try {
        screens = (await window.getScreenDetails()).screens
      } catch {}
    }
    const place = (i) => {
      const s = screens[i] ?? screens[0]
      return s
        ? `left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`
        : `left=${i * 80},top=${i * 80},width=960,height=600`
    }

    const a = window.open('?side=inside', 'inside', `popup,${place(0)}`)
    const b = window.open('?side=outside', 'outside', `popup,${place(1)}`)
    if (!a || !b) {
      note.textContent =
        'The browser blocked a pop-up. Allow pop-ups for this site and try again, or use the two links above.'
    } else if (screens.length < 2) {
      note.textContent = 'Only one screen detected. Drag each window to its screen, then press F in each one.'
    }
  })
}
