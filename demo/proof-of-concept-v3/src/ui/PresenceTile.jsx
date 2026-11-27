// FaceTime-style tile, top right: the other player, abstracted.
//
//   big canvas   → the other player as a soft figure (from their 17 points)
//   small inset  → yourself, drawn the same way: exactly what they see of you
//   "Hide me"    → stop sending your pose; the camera keeps running locally
//
// Everything moves in a requestAnimationFrame loop outside React. React only
// re-renders when the caption changes (someone steps in or out of view).
//
// The same poses also feed the presence detector (the pulse mechanism): is
// this player really standing here? That goes to GameState, which pauses the
// game until both players are.

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameState'
import { COLORS, hallName, other } from '../state/game'
import { startTracking } from '../presence/tracking'
import { createPoseLink } from '../presence/poseLink'
import { createFigure } from '../presence/figure'
import { createPresence } from '../presence/presence'

const BACKGROUND = '#1d1d1b'
const STALE_MS = 1000 // no pose for this long = nobody there

export function PresenceTile() {
  const { player, opponent, otherOnline, computer, setSeen, meter } = useGame()
  const [camera, setCamera] = useState('starting') // starting | loading | tracking | blocked
  const [hidden, setHidden] = useState(false)
  const [remote, setRemote] = useState('away') // here | away | hidden
  const [selfInView, setSelfInView] = useState(false)
  const remoteCanvas = useRef(null)
  const selfCanvas = useRef(null)
  const hiddenRef = useRef(hidden)
  const computerRef = useRef(computer)

  useEffect(() => {
    hiddenRef.current = hidden
    computerRef.current = computer
  }, [hidden, computer])

  useEffect(() => {
    const link = createPoseLink(player)
    const mine = { points: null, aspect: 4 / 3 }
    const them = createFigure()
    const me = createFigure()
    const presence = createPresence()

    const stop = startTracking({
      onStatus: (status) => {
        setCamera(status)
        // No camera, no way to tell: don't lock this player out of the game.
        if (status === 'blocked') setSeen(true)
      },
      onPose: (points, aspect) => {
        mine.points = points
        mine.aspect = aspect
        link.send(points, aspect, hiddenRef.current)
        presence.update(points)
        meter.progress = presence.progress()
        setSeen(presence.state.present) // React skips it when nothing changed
      },
    })

    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const r = link.remote
      // Playing the computer: whoever is at the other screen isn't in this game.
      const fresh = now - r.at < STALE_MS && !computerRef.current
      const points = fresh && !r.hidden ? r.points : null

      them.update(points, r.aspect, dt)
      me.update(mine.points, mine.aspect, dt)

      const t = now / 1000
      if (remoteCanvas.current) {
        them.draw(remoteCanvas.current, {
          color: COLORS[other(player)],
          background: BACKGROUND,
          idle: 1 - them.presence(),
          time: t,
        })
      }
      if (selfCanvas.current) {
        me.draw(selfCanvas.current, { color: COLORS[player], background: BACKGROUND })
      }

      setRemote(fresh && r.hidden ? 'hidden' : points ? 'here' : 'away')
      setSelfInView(!!mine.points)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      stop()
      link.close()
      setSeen(false)
    }
  }, [player, setSeen, meter])

  let caption = null
  if (computer) caption = `${hallName(opponent)} · computer`
  else if (!otherOnline) caption = `${hallName(opponent)} · empty`
  else if (remote === 'hidden') caption = `${hallName(opponent)} is hidden`
  else if (remote === 'away') caption = `Nobody in view in ${hallName(opponent)}`

  let selfNote = { starting: 'Camera…', loading: 'Loading…', blocked: 'No camera' }[camera]
  if (hidden) selfNote = 'Hidden'
  else if (camera === 'tracking' && !selfInView) selfNote = 'Not in view'

  return (
    <section className="tile" aria-label={`${hallName(opponent)}, abstracted`}>
      <div className="tile__screen">
        <canvas ref={remoteCanvas} className="tile__remote" />
        {caption && <p className="tile__caption">{caption}</p>}
        <span className="tile__name">{hallName(opponent)}</span>

        <div className="tile__self" data-hidden={hidden} title="What the other hall sees of you">
          <canvas ref={selfCanvas} />
          {selfNote && <span>{selfNote}</span>}
        </div>
      </div>

      <div className="tile__bar">
        <span>Only body points are shared, never video.</span>
        <button type="button" className="link" aria-pressed={hidden} onClick={() => setHidden((h) => !h)}>
          {hidden ? 'Show me' : 'Hide me'}
        </button>
      </div>
    </section>
  )
}
