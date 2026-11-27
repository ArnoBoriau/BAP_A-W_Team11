// Between two turns, on each screen, before the roles swap:
//
//   the giver   → 'reveal': the room, where the other hall put one of your
//                 materials ("This is what hall B changed with your materials",
//                 "Next up: your turn to design"), then straight on: they
//                 already see the house they design in
//   the placer  → 'switch': "It's your turn to choose materials"
//   'switch'    → a short full-screen card, only when the screen really
//                 changes (from the house to the picker)
//
// Only local timing (ui/useInterlude.js): the game itself has already moved
// on, so if the other hall is quick, their materials are simply there when it ends.

import { MATERIALS_BY_ID } from '../config/materials'
import { SURFACES_BY_ID, placeName } from '../config/room'
import { useGame } from '../state/GameState'
import { PICKS, hallName, isFinished, materialsWord } from '../state/game'
import { REVEAL_MS } from './useInterlude'

export function Interlude({ step }) {
  const { game, role, opponent } = useGame()
  if (!step) return null
  const them = hallName(opponent)
  const finished = isFinished(game)
  const next = role === 'placer' ? 'design' : PICKS === 1 ? 'choose a material' : 'choose materials'

  if (step === 'reveal') {
    const move = game.lastMove
    const material = MATERIALS_BY_ID[move.materialId].label.toLowerCase()
    return (
      <div className="interlude interlude--reveal" role="status">
        <header className="interlude__top">
          <span className="give__eyebrow">{hallName(move.placer)}</span>
          <h2>This is what {hallName(move.placer)} changed with your {move.materialIds.length === 1 ? 'material' : 'materials'}</h2>
          <p>
            They used your {material} on {placeName(SURFACES_BY_ID[move.surfaceId])}.
          </p>
        </header>
        <footer className="interlude__next">
          <span>{finished ? 'The house is finished' : `Next up: your turn to ${next}`}</span>
          <span className="interlude__bar" style={{ '--duration': `${REVEAL_MS}ms` }} />
        </footer>
      </div>
    )
  }

  return (
    <div className="interlude interlude--switch" role="status">
      <div className="waiting__card">
        <span className="waiting__eyebrow">{hallName(opponent)}</span>
        <h2>It’s your turn to {next}</h2>
        <p>
          {role === 'placer'
            ? `${hallName(opponent)} will choose ${materialsWord(PICKS)} for you. Now it’s your turn to design.`
            : `Your material is on the house. Now choose ${materialsWord(PICKS)} for ${them}.`}
        </p>
        <p className="interlude__changing">Changing interfaces…</p>
      </div>
    </div>
  )
}
