// Settings shared between the two windows. Both windows run on the same
// origin, so localStorage is shared and the `storage` event tells the other
// window when something changed — no server or BroadcastChannel needed.

const KEY = 'window-poc:settings'

const DEFAULTS = {
  // deviceId of the camera mounted at each screen (films the person on that side)
  cameras: { inside: null, outside: null },
  // mirror the image shown on a given screen
  mirror: { inside: false, outside: false },
  // window opening, in % of the screen. Defined from the inside; the outside
  // screen mirrors x so the window lines up when the screens are back to back.
  frame: { x: 25, y: 15, w: 50, h: 62 },
  mullions: true,
}

export function load() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {}
  return {
    cameras: { ...DEFAULTS.cameras, ...stored.cameras },
    mirror: { ...DEFAULTS.mirror, ...stored.mirror },
    frame: { ...DEFAULTS.frame, ...stored.frame },
    mullions: stored.mullions ?? DEFAULTS.mullions,
  }
}

export function update(mutate) {
  const s = load()
  mutate(s)
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
  return s
}

export function onExternalChange(cb) {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) cb(load())
  })
}
