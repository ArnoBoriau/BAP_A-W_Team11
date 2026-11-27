// Covers the room until both halls are playing, and again whenever one of
// them walks away (the game pauses, nothing is lost). The copy follows the
// designer's wireframes:
//
//   the other hall plays with the computer → "Jump in! Hall A is playing alone" (pulse)
//   nobody here, the other hall is         → PULSE: come closer, they're waiting
//   nobody here                            → step in front of the screen
//   you're here, the other hall is empty   → "Waiting for the other person"
//                                            (the computer joins after a while)
//   both here (or the computer joined)     → the brief: "Hall B has joined!" /
//                                            "The computer has joined!" and how a
//                                            round works, then it fades out
//
// The pulse (from tests/pulse-presence) breathes in the other hall's colour:
// an invitation to come closer, because someone is waiting on the other side.

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameState'
import { COLORS, HOW_IT_WORKS, hallName } from '../state/game'

const HOW = HOW_IT_WORKS

export function WaitingScreen() {
  const { player, opponent, link, here, otherHere, faked, computer, replaced, together, meter } = useGame()
  // The brief that was on last: it stays while the screen fades out, so the
  // text doesn't jump to "Waiting…" on the way out.
  const live = useGame().brief
  const [last, setLast] = useState(live)
  if (live && live !== last) setLast(live)
  const brief = live ?? (together ? last : null)
  const ring = useRef(null)

  // The "we see you, hold still" ring fills with the dwell timer. Straight
  // to the DOM every frame, no React render.
  useEffect(() => {
    let raf
    const loop = () => {
      ring.current?.style.setProperty('--progress', meter.progress.toFixed(3))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [meter])

  const them = hallName(opponent)
  const open = !together || !!live
  let eyebrow = them
  let title, text
  let showRing = false
  let pulsing = false

  if (brief === 'computer') {
    eyebrow = `${them} · computer`
    title = 'The computer has joined!'
    text = `Nobody in ${them}, the computer will help you. ${HOW}`
  } else if (brief === 'arrived') {
    title = 'You’re in!'
    text = `You take over from the computer and build with ${them}. ${HOW}`
  } else if (brief) {
    title = `${them} has joined!`
    text = HOW
  } else if (replaced) {
    title = `Jump in! ${them} is playing alone`
    text = `${them} is building a house with the computer. Step up and help.`
    showRing = !here
    pulsing = !here
  } else if (!computer && link !== 'open' && here) {
    title = "Can't reach the other hall"
    text = 'Retrying… Are both MacBooks on the same Wi-Fi?'
  } else if (!here && otherHere && !computer) {
    title = 'Come closer'
    text = `${them} is waiting for you. Stand in front of this screen, facing it.`
    showRing = true
    pulsing = true
  } else if (!here) {
    eyebrow = hallName(player)
    title = 'Step in front of the screen'
    text = 'Stand still, facing the screen, and the game starts.'
    showRing = true
  } else {
    eyebrow = `${them} · empty`
    title = 'Waiting for the other person'
    text = `${them} is empty right now. The game starts as soon as someone steps up.`
  }

  return (
    <div
      className="waiting"
      data-open={open}
      data-pulsing={pulsing}
      style={{ '--glow': COLORS[opponent], '--me': COLORS[player] }}
      aria-hidden={!open}
      inert={!open}
      role="status"
    >
      <div className="waiting__pulse" />
      <div className="waiting__card">
        {showRing ? (
          <svg ref={ring} className="waiting__ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" pathLength="1" />
            <circle cx="24" cy="24" r="20" pathLength="1" />
          </svg>
        ) : (
          !brief && (
            <span className="waiting__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )
        )}
        <span className="waiting__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      <p className="waiting__foot">
        {faked ? 'Pretending someone is here · ' : ''}
        <kbd>P</kbd> {faked ? 'stop pretending' : 'pretend someone is here (testing)'}
      </p>
    </div>
  )
}
