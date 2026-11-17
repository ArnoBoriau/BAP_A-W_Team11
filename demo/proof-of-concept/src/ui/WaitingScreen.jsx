// Covers the room until both players are standing at their screens, and
// again whenever one of them walks away (the game pauses, nothing is lost).
//
// The pulse (from tests/pulse-presence): when the OTHER player is here and
// nobody is at this screen, it breathes in their colour: an invitation to
// come closer, because someone is waiting on the other side.
//
//   replaced by the computer  → the other window plays this side for now
//   other screen not open     → waiting for their screen
//   nobody here, they are     → PULSE: player X is waiting for you
//   nobody on either side     → step in front of the screen
//   you're here, they aren't  → waiting for player X (their screen pulses)
//   both here                 → fades out, the game plays
//
// With the computer as the other player, it's always "here": only this
// player has to step up.

import { useEffect, useRef } from 'react'
import { useGame } from '../state/GameState'
import { COLORS } from '../state/game'

export function WaitingScreen() {
  const {
    game,
    player,
    opponent,
    link,
    net,
    otherOnline,
    otherHere,
    here,
    faked,
    computer,
    replaced,
    together,
    meter,
    playComputer,
  } = useGame()
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

  const started = game.round > 1 || game.phase !== 'location'
  const pulsing = !together && !computer && !replaced && otherOnline && otherHere && !here

  let eyebrow = started ? 'Paused' : `Player ${player}`
  let title, text
  let showRing = false
  if (together) {
    eyebrow = started ? 'Back together' : computer ? 'You and the computer' : 'Both here'
    title = started ? 'Carry on' : "Let's start"
  } else if (replaced) {
    eyebrow = `Player ${player}`
    title = `Player ${opponent} is playing against the computer`
    text = `Their window plays you for now. You're back in the game when they switch the computer off.`
  } else if (!computer && link !== 'open') {
    title = "Can't reach the other MacBook"
    text = 'Retrying… Are both MacBooks on the same Wi-Fi?'
  } else if (!otherOnline) {
    title = `Waiting for player ${opponent}'s screen`
    text = net === 'network' ? 'Open the link from the launcher on the other MacBook.' : `Open player ${opponent}'s window.`
  } else if (!here && computer) {
    title = 'Step in front of the screen'
    text = `You're playing against the computer. Stand still, facing the screen, and it starts.`
    showRing = true
  } else if (!here && otherHere) {
    eyebrow = `Player ${opponent} is here`
    title = 'Come closer'
    text = `Player ${opponent} is waiting for you on the other screen. Stand in front of this one, facing it.`
    showRing = true
  } else if (!here) {
    title = 'Step in front of the screen'
    text = started
      ? 'The game carries on when both players are back.'
      : 'Stand still, facing the screen. The room opens when both players are here.'
    showRing = true
  } else {
    title = `Waiting for player ${opponent}…`
    text = `You're here. Player ${opponent}'s screen is pulsing to call them over.`
  }

  // Nobody on the other side? Offer the computer instead.
  const offerComputer = !together && !computer && !replaced && !otherHere

  return (
    <div
      className="waiting"
      data-open={!together}
      data-pulsing={pulsing}
      style={{ '--glow': COLORS[opponent], '--me': COLORS[player] }}
      aria-hidden={together}
      inert={together}
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
          !together && (
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
        {offerComputer && (
          <button type="button" className="link waiting__action" onClick={() => playComputer(true)}>
            Play against the computer instead
          </button>
        )}
        {computer && !together && (
          <button type="button" className="link waiting__action" onClick={() => playComputer(false)}>
            Play against player {opponent} again
          </button>
        )}
      </div>
      <p className="waiting__foot">
        {faked ? 'Pretending someone is here · ' : ''}
        <kbd>P</kbd> {faked ? 'stop pretending' : 'pretend someone is here (testing)'}
      </p>
    </div>
  )
}
