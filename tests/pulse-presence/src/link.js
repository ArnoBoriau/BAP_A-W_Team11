// Tells the two windows about each other's presence. Both run on the same
// origin, so a BroadcastChannel is enough — no server.
//
// Each window repeats its state every second. If the other window goes
// quiet (closed, crashed), we treat its side as empty after a few seconds.

const channel = new BroadcastChannel('pulse-presence')
const STALE_MS = 3000

export function createLink(side, onOtherChange) {
  let mine = false
  let other = false
  let otherSeenAt = 0

  const send = (extra) => channel.postMessage({ side, present: mine, ...extra })

  const setOther = (v) => {
    if (v === other) return
    other = v
    onOtherChange(other)
  }

  channel.addEventListener('message', (e) => {
    const msg = e.data
    if (!msg || msg.side === side) return
    otherSeenAt = performance.now()
    setOther(!!msg.present)
    if (msg.hello) send() // a window just opened: tell it where we are
  })

  setInterval(() => {
    send()
    if (other && performance.now() - otherSeenAt > STALE_MS) setOther(false)
  }, 1000)

  send({ hello: true })

  return {
    setMine(v) {
      if (v === mine) return
      mine = v
      send()
    },
    get other() {
      return other
    },
  }
}
