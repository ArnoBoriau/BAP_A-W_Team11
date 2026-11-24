// The placer's panel, next to the room.
//   material phase → waiting: the other player is picking a material for you
//   place phase    → the material you got, and where to put it in this
//                    turn's room: pick a surface (here or in the house), see
//                    it previewed, place it
//   finished       → the whole house is filled in (both players see this)
// The selection is owned by the screen (App.jsx) so the room can preview it.

import { MATERIALS_BY_ID, materialOf } from '../config/materials'
import { SURFACES, placeName } from '../config/room'
import { useGame } from '../state/GameState'
import { fits, isFinished, shownMaterialId, turnRoom } from '../state/game'
import { LastMove, OpponentToggle, PlayerFoot, PlayerHead } from './PlayerBits'
import { fitsLabel, swatchStyle } from './swatch'

export function PlacePanel({ selectedId, onSelect }) {
  const { game } = useGame()
  return (
    <aside className="panel">
      <PlayerHead />
      <OpponentToggle />
      {isFinished(game) ? (
        <Finished />
      ) : game.phase === 'material' ? (
        <Waiting />
      ) : (
        <Place selectedId={selectedId} onSelect={onSelect} />
      )}
      <LastMove />
      <PlayerFoot />
    </aside>
  )
}

function Finished() {
  const { reset } = useGame()
  return (
    <section className="status" data-active="true">
      <span className="status__role">Finished</span>
      <p>Every room and the outside are filled in. This is the house you made together.</p>
      <button type="button" className="primary" onClick={reset}>
        Start a new house
      </button>
    </section>
  )
}

function Waiting() {
  const { game, opponent, computer } = useGame()
  return (
    <section className="status" data-active="false">
      <span className="status__role">Waiting · Material</span>
      <p>
        Player {opponent}
        {computer ? ' (computer)' : ''} is picking a material for the {turnRoom(game).label.toLowerCase()}…
      </p>
    </section>
  )
}

function Place({ selectedId, onSelect }) {
  const { game, opponent, placeMaterial } = useGame()
  const material = MATERIALS_BY_ID[game.materialId]
  const room = turnRoom(game)
  const surfaces = SURFACES.filter((s) => s.roomId === room.id)
  const selected = surfaces.find((s) => s.id === selectedId)

  return (
    <>
      <section className="status received" data-active="true">
        <span className="status__role">Your turn · Place it</span>
        <div className="received__body">
          <span className="received__swatch" style={swatchStyle(material)} />
          <p>
            Player {opponent} gave you <strong>{material.label.toLowerCase()}</strong> for the{' '}
            {room.label.toLowerCase()}. Where does it go?
          </p>
        </div>
      </section>

      <section>
        <h2>
          {room.label}
          {fitsLabel(material) ? ` · ${fitsLabel(material).toLowerCase()}` : ''}
        </h2>
        <ul className="elements">
          {surfaces.map((surface) => {
            const current = materialOf(shownMaterialId(game, surface.id))
            return (
              <li key={surface.id}>
                <button
                  type="button"
                  className="element"
                  aria-pressed={surface.id === selectedId}
                  disabled={!fits(game, material, surface)}
                  onClick={() => onSelect(surface.id)}
                >
                  <span className="element__swatch" style={swatchStyle(current)} />
                  <span className="element__label">{surface.label}</span>
                  <span className="element__value">{current.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hint-inline">Or click a surface in the room.</p>
      </section>

      <button type="button" className="primary" disabled={!selected} onClick={() => placeMaterial(selected.id)}>
        {selected ? `Place it on ${placeName(selected)}` : 'Pick a place first'}
      </button>
    </>
  )
}
