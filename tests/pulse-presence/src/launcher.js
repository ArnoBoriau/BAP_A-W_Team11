export function mountLauncher(root) {
  document.body.dataset.side = 'launcher'
  root.innerHTML = `
    <main class="launcher">
      <h1>Pulse</h1>
      <p>Two screens back to back, a camera at each. When someone stops at one screen
        (not just walking past), the <em>other</em> screen starts to pulse, inviting
        whoever is on that side to come closer.</p>

      <div class="sides">
        <a href="?side=inside" target="inside"><strong>Inside screen</strong><span>pulses when someone stands outside</span></a>
        <a href="?side=outside" target="outside"><strong>Outside screen</strong><span>pulses when someone stands inside</span></a>
      </div>

      <button type="button" id="open-both">Open both windows</button>
      <p class="note">In each window: <kbd>F</kbd> fullscreen, <kbd>D</kbd> debug view and camera choice,
        <kbd>P</kbd> fake someone standing at that screen.</p>
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
