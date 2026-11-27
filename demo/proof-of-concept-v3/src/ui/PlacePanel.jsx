// The placer's panel, next to the room: "It's your turn to design".
//   material phase → the house is yours to look around; waiting for the
//                    materials the other hall is choosing for you
//   place phase    → the materials have arrived: pick one, pick a part of this
//                    turn's room (here or in the house), see it previewed,
//                    "Apply my selection"
//   finished       → the whole house is filled in (both halls see this)
// The selection is owned by the screen (App.jsx) so the room can preview it.

import { MATERIALS_BY_ID, materialOf } from '../config/materials'
import { SURFACES } from '../config/room'
import { useGame } from '../state/GameState'
import { PICKS, fits, hallName, isFinished, shownMaterialId, turnRoom } from '../state/game'
import { LastMove, PlayerFoot, PlayerHead } from './PlayerBits'
import { fitsLabel, swatchStyle } from './swatch'

export function PlacePanel({ selection }) {
  const { game } = useGame()
  return (
    <aside className="panel">
      <PlayerHead />
      {isFinished(game) ? <Finished /> : game.phase === 'material' ? <Waiting /> : <Place selection={selection} />}
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
      <span className="status__role">It’s your turn to design</span>
      <p>
        Waiting for {PICKS === 1 ? 'a material' : 'materials'} from {hallName(opponent)}
        {computer ? ' (computer)' : ''}… They’re choosing {PICKS === 1 ? 'it' : 'them'} for the{' '}
        {turnRoom(game).label.toLowerCase()}. Look around the house meanwhile.
      </p>
    </section>
  )
}

function Place({ selection }) {
  const { game, opponent, placeMaterial } = useGame()
  const room = turnRoom(game)
  const material = selection.materialId ? MATERIALS_BY_ID[selection.materialId] : null
  const surfaces = SURFACES.filter((s) => s.roomId === room.id)
  const selected = surfaces.find((s) => s.id === selection.surfaceId)
  const single = game.materialIds.length === 1 // nothing to choose: App.jsx picks it

  return (
    <>
      <section className="status" data-active="true">
        <span className="status__role">It’s your turn to design</span>
        {single ? (
          <div className="received__body">
            <span className="received__swatch" style={swatchStyle(material)} />
            <p>
              {hallName(opponent)} sent you <strong>{material.label.toLowerCase()}</strong> for the{' '}
              {room.label.toLowerCase()}. Where does it go?
            </p>
          </div>
        ) : (
          <p>
            {game.materialIds.length} materials from {hallName(opponent)} for the {room.label.toLowerCase()}. Use one
            of them.
          </p>
        )}
      </section>

      <section hidden={single}>
        <h2>Materials</h2>
        <ul className="elements">
          {game.materialIds.map((id) => {
            const m = MATERIALS_BY_ID[id]
            return (
              <li key={id}>
                <button
                  type="button"
                  className="element"
                  aria-pressed={id === selection.materialId}
                  onClick={() => selection.chooseMaterial(id)}
                >
                  <span className="element__swatch" style={swatchStyle(m)} />
                  <span className="element__label">{m.label}</span>
                  <span className="element__value">{fitsLabel(m) ?? ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>Parts · {room.label}</h2>
        <ul className="elements">
          {surfaces.map((surface) => {
            const current = materialOf(shownMaterialId(game, surface.id))
            return (
              <li key={surface.id}>
                <button
                  type="button"
                  className="element"
                  aria-pressed={surface.id === selection.surfaceId}
                  disabled={!material || !fits(game, material, surface)}
                  onClick={() => selection.chooseSurface(surface.id)}
                >
                  <span className="element__swatch" style={swatchStyle(current)} />
                  <span className="element__label">{surface.label}</span>
                  <span className="element__value">{current.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hint-inline">{material ? 'Or click a part in the house.' : 'Pick a material first.'}</p>
      </section>

      <button
        type="button"
        className="primary"
        disabled={!material || !selected}
        onClick={() => placeMaterial(material.id, selected.id)}
      >
        Apply my selection
      </button>
    </>
  )
}
