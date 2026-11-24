// A particles screen (?screen=particles&side=A): no game, only what the
// materials do, for one hall. Side A follows player A, side B player B (see
// particles/sides.js for what it shows when). Open as many per side as you
// like, on this Mac or on any computer on the network.
//
// It only listens to the game. On opening it says hello, the player windows
// answer with their state and their player's unsent pick, and from then on it
// gets everything they send. The particles answer the players' choices,
// nothing else: no mouse, no keys that change them.
// Keys: f fullscreen · h hide the caption.

import { useEffect, useRef, useState } from 'react'
import { GAME_CHANNEL } from '../state/game'
import { createTransport } from '../net/transport'
import { sideView } from '../particles/sides'
import { explain, resolve } from '../particles/engine/resolve'
import { createRenderer } from '../particles/render/canvas'

export function ParticlesScreen({ side }) {
  const canvas = useRef(null)
  const [trace, setTrace] = useState(null) // why it looks like this
  const [status, setStatus] = useState(null) // where the turn is, for this hall
  const [link, setLink] = useState('connecting')
  const [bare, setBare] = useState(false)

  useEffect(() => {
    document.title = `Particles · Hall ${side}`
    const renderer = createRenderer(canvas.current)
    let clock = 0
    let game = null // the newest game state seen (both player windows send theirs)
    let preview = null // this side's player's latest unsent pick
    let shown = null // the key of the view on screen

    function update() {
      if (!game) return
      const view = sideView(side, game, preview)
      setStatus(view.status)
      if (!view.key || view.key === shown) return
      shown = view.key
      try {
        const recipe = resolve(view.move)
        renderer.show(recipe, clock)
        setTrace(explain(recipe))
      } catch (err) {
        console.warn(err.message) // a material or room the particles don't know yet
      }
    }

    const ch = createTransport(GAME_CHANNEL, {
      onMessage: (msg) => {
        if (msg?.type === 'state' && msg.game && (!game || msg.game.version > game.version)) {
          game = msg.game
          update()
        } else if (msg?.type === 'preview' && msg.from === side) {
          preview = msg.preview
          update()
        }
      },
      onStatus: (s) => {
        setLink(s)
        if (s === 'open') ch.send({ from: `particles-${side}`, type: 'hello' })
      },
    })

    let raf
    let last = performance.now()
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      clock += Math.min(0.05, (now - last) / 1000)
      last = now
      renderer.frame(clock)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
      } else if (key === 'h') setBare((b) => !b)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      ch.close()
      renderer.dispose()
    }
  }, [side])

  return (
    <main className="particles" data-bare={bare}>
      <canvas ref={canvas} />
      <section className="particles__trace" aria-live="polite">
        <p className="particles__hall">
          Hall {side}
          {status ? ` · ${status}` : ''}
        </p>
        {trace && (
          <>
            <p>{trace.input}</p>
            <p>{trace.behaviour}</p>
            <p>{trace.expression}</p>
          </>
        )}
      </section>
      {!trace && (
        <p className="particles__empty">
          {link === 'offline' ? "Can't reach the server, retrying…" : 'Waiting for the first material'}
        </p>
      )}
    </main>
  )
}
