// The street, after the event: every home the players built, in a row.
//
//   #/      the street
//   #/7     visiting No. 7 (a link someone can keep or share)
//
// On the street: ← → (or scroll, swipe, the numbers below) walk past the
// houses; click a house (or Enter) to step inside. Visiting: drag to look
// around, ← → to the neighbours, Esc back to the street.

import { useCallback, useEffect, useRef, useState } from 'react'
import { HOMES } from './homes'
import { Street } from './street/Street'
import { HouseCard } from './ui/HouseCard'

const WHEEL_STEP = 60 // scroll distance that walks one house
const SWIPE_STEP = 50 // px

function readRoute() {
  const n = Number(location.hash.match(/^#\/(\d+)/)?.[1])
  const index = HOMES.findIndex((h) => h.number === n)
  return index >= 0 ? index : null
}

export default function App() {
  const [visit, setVisit] = useState(readRoute) // index of the house being visited, or null
  const [focus, setFocus] = useState(() => readRoute() ?? 0) // house the camera is at

  useEffect(() => {
    const onHash = () => {
      const index = readRoute()
      setVisit(index)
      if (index !== null) setFocus(index)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((index) => {
    location.hash = index === null ? '#/' : `#/${HOMES[index].number}`
  }, [])

  const visiting = visit !== null
  const step = useCallback(
    (d) => {
      const next = Math.max(0, Math.min(HOMES.length - 1, focus + d))
      if (next === focus) return
      if (visiting) go(next)
      else setFocus(next)
    },
    [focus, visiting, go],
  )

  // keys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Enter' && !visiting && HOMES.length) go(focus)
      else if (e.key === 'Escape' && visiting) go(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, go, focus, visiting])

  // scroll and swipe walk along the street (visiting, they orbit the house instead)
  const wheel = useRef(0)
  const swipe = useRef(null)
  const viewport = {
    onWheel: (e) => {
      if (visiting) return
      wheel.current += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(wheel.current) < WHEEL_STEP) return
      step(Math.sign(wheel.current))
      wheel.current = 0
    },
    onPointerDown: (e) => (swipe.current = e.clientX),
    onPointerUp: (e) => {
      if (visiting || swipe.current === null) return
      const dx = e.clientX - swipe.current
      swipe.current = null
      if (Math.abs(dx) > SWIPE_STEP) step(dx < 0 ? 1 : -1)
    },
  }

  if (!HOMES.length) {
    return (
      <main className="empty">
        <h1>The street</h1>
        <p>No homes yet. Finish a house in the game, or run <code>npm run seed</code> for test homes.</p>
      </main>
    )
  }

  const home = HOMES[focus]
  return (
    <div className="app">
      <div className="viewport" {...viewport}>
        <Street homes={HOMES} focus={focus} visiting={visiting} onVisit={go} />
      </div>

      {visiting ? (
        <HouseCard
          home={home}
          prev={HOMES[focus - 1]}
          next={HOMES[focus + 1]}
          onStep={step}
          onBack={() => go(null)}
        />
      ) : (
        <>
          <header className="intro">
            <h1>The street</h1>
            <p>
              {HOMES.length} {HOMES.length === 1 ? 'home' : 'homes'}, each one built by two people
              at the event. Step inside one to see what they chose.
            </p>
          </header>

          <nav className="walk" aria-label="Houses">
            <button className="arrow" onClick={() => step(-1)} disabled={focus === 0} aria-label="Previous house">
              ‹
            </button>
            <button className="enter" onClick={() => go(focus)}>
              Step inside No. {home.number}
            </button>
            <button
              className="arrow"
              onClick={() => step(1)}
              disabled={focus === HOMES.length - 1}
              aria-label="Next house"
            >
              ›
            </button>
          </nav>
          <p className="hint">Scroll or swipe to walk down the street</p>
        </>
      )}
    </div>
  )
}
