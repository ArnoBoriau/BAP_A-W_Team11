// The giver's screen: full screen, no room. You pick a material FOR the
// other player, for one room of the house (you know which); they decide where
// in that room it goes. You never see the house yourself, only what they did
// with your material (last turn).
//
//   material phase → pick one, then "Give it to player X"
//   place phase    → sent; waiting while they choose where it goes

import { useState } from 'react'
import { MATERIALS, MATERIALS_BY_ID } from '../config/materials'
import { useGame } from '../state/GameState'
import { turnRoom } from '../state/game'
import { LastMove, OpponentToggle, PlayerFoot, PlayerHead } from './PlayerBits'
import { fitsLabel, swatchStyle } from './swatch'

export function GiveScreen() {
  const { game } = useGame()
  return (
    <div className="give">
      <aside className="give__side">
        <PlayerHead />
        <OpponentToggle />
        <LastMove />
        <PlayerFoot />
      </aside>
      <section className="give__main">{game.phase === 'material' ? <Picker /> : <Sent />}</section>
    </div>
  )
}

function Picker() {
  const { game, opponent, computer, giveMaterial } = useGame()
  // Local until it's given: the other player only sees the final choice.
  // Tied to the round, so a new turn starts without a choice.
  const [choice, setChoice] = useState({ round: 0, id: null })
  const chosen = choice.round === game.round ? MATERIALS_BY_ID[choice.id] : null
  const them = computer ? `player ${opponent} (computer)` : `player ${opponent}`
  const room = turnRoom(game).label.toLowerCase()

  return (
    <>
      <span className="give__eyebrow">Your turn · A material for {them}</span>
      <h2 className="give__title">Pick a material for the {room}</h2>
      <p className="give__lead">
        Player {opponent} will choose where it goes in the {room}. You won't see the house, only where they put it.
      </p>

      <div className="gifts" role="radiogroup" aria-label="Materials">
        {MATERIALS.map((material) => (
          <button
            key={material.id}
            type="button"
            role="radio"
            className="gift"
            aria-checked={chosen?.id === material.id}
            onClick={() => setChoice({ round: game.round, id: material.id })}
          >
            <span className="gift__swatch" style={swatchStyle(material)} />
            <span className="gift__label">{material.label}</span>
            {fitsLabel(material) && <span className="gift__note">{fitsLabel(material)}</span>}
          </button>
        ))}
      </div>

      <div className="give__action">
        <button type="button" className="primary" disabled={!chosen} onClick={() => giveMaterial(chosen.id)}>
          {chosen ? `Give ${chosen.label.toLowerCase()} to player ${opponent}` : 'Pick a material first'}
        </button>
      </div>
    </>
  )
}

function Sent() {
  const { game, opponent, computer } = useGame()
  const material = MATERIALS_BY_ID[game.materialId]
  return (
    <div className="sent" role="status">
      <span className="sent__swatch" style={swatchStyle(material)} />
      <span className="give__eyebrow">Sent to player {opponent}{computer ? ' (computer)' : ''}</span>
      <h2 className="give__title">{material.label}</h2>
      <p className="give__lead">Player {opponent} is choosing where it goes in the {turnRoom(game).label.toLowerCase()}…</p>
      <span className="waiting__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  )
}
