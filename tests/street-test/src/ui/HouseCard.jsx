// The panel next to a house you're visiting: its number, when it was built,
// and what went where, room by room.

import { MATERIALS_BY_ID } from '../house/config/materials'
import { describe } from '../house/homeData'
import { swatchStyle } from '../house/swatch'

const TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export function HouseCard({ home, prev, next, onStep, onBack }) {
  const rooms = describe(home)
  const unfinished = rooms.some((r) => r.blanks > 0)

  return (
    <aside className="card">
      <button className="back" onClick={onBack}>
        ← The street
      </button>

      <header>
        <h1>No. {home.number}</h1>
        {home.name && <p className="name">{home.name}</p>}
        <p className="meta">
          {home.builtAt ? `Built ${TIME.format(new Date(home.builtAt))}` : 'Built at the event'}
          {unfinished && ' · left unfinished'}
        </p>
      </header>

      <ul className="rooms">
        {rooms.map(({ area, floor, walls, blanks }) => (
          <li key={area.id}>
            <h2>{area.label}</h2>
            {floor.length + walls.length === 0 ? (
              <p className="none">Never got to it</p>
            ) : (
              <>
                <dl>
                  {floor.length > 0 && <Row label="Floor" ids={floor} />}
                  {walls.length > 0 && <Row label={area.id === 'outside' ? 'Façades' : 'Walls'} ids={walls} />}
                </dl>
                {blanks > 0 && <p className="none">{blanks} left blank</p>}
              </>
            )}
          </li>
        ))}
      </ul>

      <nav className="neighbours">
        <button onClick={() => onStep(-1)} disabled={!prev}>
          {prev ? `‹ No. ${prev.number}` : '‹'}
        </button>
        <button onClick={() => onStep(1)} disabled={!next}>
          {next ? `No. ${next.number} ›` : '›'}
        </button>
      </nav>
      <p className="hint-inline">Drag to look around · scroll to zoom</p>
    </aside>
  )
}

function Row({ label, ids }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd>
        {ids.map((id) => (
          <span key={id} className="material">
            <span className="swatch" style={swatchStyle(MATERIALS_BY_ID[id])} />
            {MATERIALS_BY_ID[id].label}
          </span>
        ))}
      </dd>
    </div>
  )
}
