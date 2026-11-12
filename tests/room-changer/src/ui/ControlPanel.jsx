import { MATERIALS_BY_ID, materialsFor } from '../config/materials'
import { SURFACES } from '../config/room'
import { useRoomState } from '../state/RoomState'
import { getPatternSwatch } from '../textures/patterns'

function swatchStyle(material) {
  return {
    background: material.pattern ? `center / cover url(${getPatternSwatch(material.pattern)})` : material.swatch,
  }
}

export function ControlPanel() {
  const { surfaces, selectedId, select, setMaterial, reset } = useRoomState()
  const selected = SURFACES.find((s) => s.id === selectedId)

  return (
    <aside className="panel">
      <header className="panel__head">
        <h1>Room configurator</h1>
        <p>Pick an element, then a finish.</p>
      </header>

      <section>
        <h2>Element</h2>
        <ul className="elements">
          {SURFACES.map((surface) => {
            const material = MATERIALS_BY_ID[surfaces[surface.id]]
            return (
              <li key={surface.id}>
                <button
                  type="button"
                  className="element"
                  aria-pressed={surface.id === selectedId}
                  onClick={() => select(surface.id)}
                >
                  <span className="element__swatch" style={swatchStyle(material)} />
                  <span className="element__label">{surface.label}</span>
                  <span className="element__value">{material.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>Finish · {selected.label}</h2>
        <div className="finishes">
          {materialsFor(selected.kind).map((material) => (
            <button
              key={material.id}
              type="button"
              className="finish"
              aria-pressed={surfaces[selected.id] === material.id}
              onClick={() => setMaterial(selected.id, material.id)}
            >
              <span className="finish__swatch" style={swatchStyle(material)} />
              <span className="finish__label">{material.label}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="panel__foot">
        <button type="button" className="link" onClick={reset}>
          Reset room
        </button>
      </footer>
    </aside>
  )
}
