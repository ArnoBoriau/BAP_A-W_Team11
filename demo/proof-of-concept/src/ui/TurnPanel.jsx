// Side panel of one player's window. What it shows depends on the turn:
//   my turn, location phase  → list of surfaces to pick from
//   my turn, material phase  → finishes for the picked surface
//   other player's turn      → what we're waiting for

import { MATERIALS_BY_ID, materialsFor } from '../config/materials'
import { SURFACES } from '../config/room'
import { useGame } from '../state/GameState'
import { getPatternSwatch } from '../textures/patterns'

const SURFACES_BY_ID = Object.fromEntries(SURFACES.map((s) => [s.id, s]))

function swatchStyle(material) {
  return {
    background: material.pattern ? `center / cover url(${getPatternSwatch(material.pattern)})` : material.swatch,
  }
}

export function TurnPanel() {
  const { game, player, opponent, otherOnline, myTurn, reset } = useGame()
  const surface = game.surfaceId && SURFACES_BY_ID[game.surfaceId]

  return (
    <aside className="panel">
      <header className="panel__head">
        <div className="panel__title">
          <h1>Player {player}</h1>
          <span className="round">Turn {game.round}</span>
        </div>
        <p className="presence" data-online={otherOnline}>
          {otherOnline ? `Player ${opponent} is connected` : `Waiting for player ${opponent}'s window…`}
        </p>
      </header>

      <Status />

      {myTurn && game.phase === 'location' && <LocationPicker />}
      {myTurn && game.phase === 'material' && <MaterialPicker surface={surface} />}

      <LastMove />

      <footer className="panel__foot">
        <button type="button" className="link" onClick={reset}>
          Restart game
        </button>
      </footer>
    </aside>
  )
}

function Status() {
  const { game, opponent, myTurn } = useGame()
  const surface = game.surfaceId && SURFACES_BY_ID[game.surfaceId]

  let role, text
  if (game.phase === 'location') {
    role = 'Location'
    text = myTurn ? 'Pick a place in the room to change.' : `Player ${opponent} is picking a place…`
  } else {
    role = 'Material'
    text = myTurn
      ? `Player ${opponent} picked the ${surface.label.toLowerCase()}. Choose its material.`
      : `You picked the ${surface.label.toLowerCase()}. Player ${opponent} is choosing a material…`
  }

  return (
    <section className="status" data-active={myTurn}>
      <span className="status__role">{myTurn ? `Your turn · ${role}` : `Waiting · ${role}`}</span>
      <p>{text}</p>
    </section>
  )
}

function LocationPicker() {
  const { game, pickLocation } = useGame()
  return (
    <section>
      <h2>Location</h2>
      <ul className="elements">
        {SURFACES.map((surface) => {
          const material = MATERIALS_BY_ID[game.config[surface.id]]
          return (
            <li key={surface.id}>
              <button type="button" className="element" onClick={() => pickLocation(surface.id)}>
                <span className="element__swatch" style={swatchStyle(material)} />
                <span className="element__label">{surface.label}</span>
                <span className="element__value">{material.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="hint-inline">Or click a surface in the room.</p>
    </section>
  )
}

function MaterialPicker({ surface }) {
  const { game, pickMaterial } = useGame()
  return (
    <section>
      <h2>Material · {surface.label}</h2>
      <div className="finishes">
        {materialsFor(surface.kind).map((material) => (
          <button
            key={material.id}
            type="button"
            className="finish"
            aria-current={game.config[surface.id] === material.id}
            onClick={() => pickMaterial(material.id)}
          >
            <span className="finish__swatch" style={swatchStyle(material)} />
            <span className="finish__label">{material.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function LastMove() {
  const { game } = useGame()
  const move = game.lastMove
  if (!move) return null
  const surface = SURFACES_BY_ID[move.surfaceId]
  const material = MATERIALS_BY_ID[move.materialId]
  return (
    <section className="last-move">
      <h2>Last turn</h2>
      <p>
        <span className="element__swatch" style={swatchStyle(material)} />
        <span>
          {move.locator} picked the {surface.label.toLowerCase()}, {move.chooser} made it{' '}
          {material.label.toLowerCase()}.
        </span>
      </p>
    </section>
  )
}
