// Which interlude step this screen is in, after a placement (see ui/Interlude.jsx):
//   the giver  → 'reveal' (it ends on the house, where they design next)
//   the placer → 'switch' (from the house to the picker)
// Only local timing: the game itself has already moved on.

import { useEffect, useState } from 'react'
import { isFinished } from '../state/game'

export const REVEAL_MS = 6000
const SWITCH_MS = 3500
const DURATION = { reveal: REVEAL_MS, switch: SWITCH_MS }

export function useInterlude(game, player) {
  const [state, setState] = useState(null) // { steps, i }
  const [prev, setPrev] = useState(game) // the state this window saw before this one

  // Adjusted while rendering, when a new game state comes in.
  if (game !== prev) {
    setPrev(game)
    const move = game.lastMove
    if (!move) setState(null) // a new house
    // Only a turn this window saw happen: not the state a window gets when it
    // opens mid-game (it starts from version 0).
    else if (prev.version > 0 && prev.round === move.round && game.round !== prev.round) {
      const steps = []
      if (move.giver === player) steps.push('reveal')
      // Both end the turn looking at the house (the giver through the
      // reveal), so the "your turn to …" card only comes when the screen
      // really changes: to the picker. Going on to design, you're already there.
      if (!isFinished(game) && game.giver === player) steps.push('switch')
      setState(steps.length ? { steps, i: 0 } : null)
    }
  }

  const step = state?.steps[state.i] ?? null
  useEffect(() => {
    if (!step) return
    const timer = setTimeout(
      () => setState((s) => (s && s.i + 1 < s.steps.length ? { ...s, i: s.i + 1 } : null)),
      DURATION[step],
    )
    return () => clearTimeout(timer)
  }, [step, state])

  return step
}
