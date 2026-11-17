// FaceTime-style tile, top right: the other player, abstracted.
//
//   big canvas   → the other player as a soft figure (from their 17 points)
//   small inset  → yourself, drawn the same way: exactly what they see of you
//   "Hide me"    → stop sending your pose; the camera keeps running locally
//
// Everything moves in a requestAnimationFrame loop outside React. React only
// re-renders when the caption changes (someone steps in or out of view).

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameState'
import { other } from '../state/game'
import { startTracking } from '../presence/tracking'
import { createPoseLink } from '../presence/poseLink'
import { createFigure } from '../presence/figure'

const COLORS = { A: '#ff6a3d', B: '#6f9fd8' }
const BACKGROUND = '#2a2826'
const STALE_MS = 1000 // no pose for this long = nobody there

export function PresenceTile() {
  const { player, opponent, otherOnline } = useGame()
  const [camera, setCamera] = useState('starting') // starting | loading | tracking | blocked
  const [hidden, setHidden] = useState(false)
  const [remote, setRemote] = useState('away') // here | away | hidden
  const [selfInView, setSelfInView] = useState(false)
  const remoteCanvas = useRef(null)
  const selfCanvas = useRef(null)
  const hiddenRef = useRef(hidden)

  useEffect(() => {
    hiddenRef.current = hidden
  }, [hidden])

  useEffect(() => {
    const link = createPoseLink(player)
    const mine = { points: null, aspect: 4 / 3 }
    const them = createFigure()
    const me = createFigure()

    const stop = startTracking({
      onStatus: setCamera,
      onPose: (points, aspect) => {
        mine.points = points
        mine.aspect = aspect
        link.send(points, aspect, hiddenRef.current)
      },
    })

    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const r = link.remote
      const fresh = now - r.at < STALE_MS
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
    }
  }, [player])

  let caption = null
  if (!otherOnline) caption = `Waiting for player ${opponent}…`
  else if (remote === 'hidden') caption = `Player ${opponent} is hidden`
  else if (remote === 'away') caption = `Player ${opponent} isn't in view`

  let selfNote = { starting: 'Camera…', loading: 'Loading…', blocked: 'No camera' }[camera]
  if (hidden) selfNote = 'Hidden'
  else if (camera === 'tracking' && !selfInView) selfNote = 'Not in view'

  return (
    <section className="tile" aria-label={`Player ${opponent}, abstracted`}>
      <div className="tile__screen">
        <canvas ref={remoteCanvas} className="tile__remote" />
        {caption && <p className="tile__caption">{caption}</p>}
        <span className="tile__name">Player {opponent}</span>

        <div className="tile__self" data-hidden={hidden} title="What the other player sees of you">
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
