// The giver's screen: full screen, no room. You choose three materials FOR the
// other hall, for one room of the house (you know which); they dress the house
// with one of them. You never see the house while you choose; after they've
// placed it, you see what they did (ui/Interlude.jsx).
//
//   material phase → choose PICKS, then "Send to hall X"
//   place phase    → "Your material is on its way", while they design
//
// Built for the full screen (1920 × 1080, or a 4K TV: the sizes are in rem and
// the root size follows the screen, see index.css). Four rows, only the grid
// scrolls: a header as tall as the presence tile (top right), the category
// tabs, the materials over the full width, and a bar with what you picked and
// the send button.

import { useEffect, useState } from 'react'
import { MATERIALS, MATERIALS_BY_CATEGORY, MATERIALS_BY_ID } from '../config/materials'
import { CATEGORIES_BY_ID } from '../config/categories'
import { useGame } from '../state/GameState'
import { fitsRoom, hallName, materialsWord, picksFor, turnRoom } from '../state/game'
import { LastMove, PresenceText, RoomProgress } from './PlayerBits'
import { fitsLabel, swatchStyle } from './swatch'

export function GiveScreen() {
  const { game } = useGame()
  const picking = game.phase === 'material'
  return <div className={picking ? 'give' : 'give give--sent'}>{picking ? <Picker /> : <Sent />}</div>
}

// The top line: which hall you are, where the house is at, the other hall,
// and the quiet testing bits (restart, how the windows are connected).
function Meta() {
  const { game, player, otherOnline, net, reset } = useGame()
  return (
    <div className="give__meta">
      <strong>{hallName(player)}</strong>
      <span>
        <RoomProgress game={game} />
      </span>
      <span className="presence" data-online={otherOnline}>
        <PresenceText />
      </span>
      <span className="give__meta-end">
        <button type="button" className="link" onClick={reset}>
          Restart game
        </button>
        <span>{net === 'network' ? 'Over the network' : 'On this Mac'}</span>
      </span>
    </div>
  )
}

function Picker() {
  const { game, opponent, computer, sendMaterials, preview } = useGame()
  const needed = picksFor(game)
  // Local until they're sent: the other hall only sees the final choice.
  // Tied to the round, so a new turn starts without a choice.
  const [choice, setChoice] = useState({ round: 0, ids: [], last: null })
  const current = choice.round === game.round ? choice : { round: game.round, ids: [], last: null }
  const chosen = current.ids
  const full = chosen.length >= needed
  const single = needed === 1

  // Which category the grid shows ('all' or a category id). What's chosen
  // stays chosen when you switch.
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? MATERIALS : MATERIALS.filter((m) => m.categories.includes(filter))
  const filterLabel = MATERIALS_BY_CATEGORY.find((c) => c.id === filter)?.label

  // One to send: a click picks it (another click picks another, nothing to
  // undo). Several: a click adds it, or takes it off again.
  const toggle = (id) => {
    if (single) setChoice({ round: game.round, ids: [id], last: id })
    else if (chosen.includes(id)) setChoice({ round: game.round, ids: chosen.filter((x) => x !== id), last: null })
    else if (!full) setChoice({ round: game.round, ids: [...chosen, id], last: id })
  }

  // This hall sees the material clicked last already (their particles screen), before it's sent.
  const shownId = current.last ?? chosen.at(-1) ?? null
  useEffect(() => {
    preview({ round: game.round, materialId: shownId })
  }, [preview, game.round, shownId])

  const them = hallName(opponent) + (computer ? ' (computer)' : '')
  const room = turnRoom(game).label.toLowerCase()

  return (
    <>
      <header className="give__head">
        <Meta />
        <span className="give__eyebrow">
          Your turn · {single ? 'A material' : 'Materials'} for {them}
        </span>
        <h2 className="give__title">It’s your turn to choose {single ? 'a material' : 'materials'}</h2>
        <div className="give__sub">
          <p className="give__lead">
            {hallName(opponent)} is designing the {room} right now.{' '}
            {single
              ? 'Choose a material they can use there.'
              : `Choose ${needed} materials they can use there; they dress the house with one of them.`}
          </p>
          <LastMove inline />
        </div>
      </header>

      <div className="categories" role="tablist" aria-label="Categories">
        {[{ id: 'all', label: 'All' }, ...MATERIALS_BY_CATEGORY].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="give__grid">
        {shown.length === 0 ? (
          <p className="gifts__empty">No materials in {filterLabel?.toLowerCase()} yet.</p>
        ) : (
          <div className="gifts" role={single ? 'radiogroup' : 'group'} aria-label={`Materials, choose ${materialsWord(needed)}`}>
            {shown.map((material) => {
              const order = chosen.indexOf(material.id) + 1
              const usable = fitsRoom(game, material)
              return (
                <button
                  key={material.id}
                  type="button"
                  className="gift"
                  role={single ? 'radio' : undefined}
                  aria-checked={single ? order > 0 : undefined}
                  aria-pressed={single ? undefined : order > 0}
                  disabled={!usable}
                  data-full={!single && full && !order}
                  onClick={() => toggle(material.id)}
                >
                  <span className="gift__swatch" style={swatchStyle(material)}>
                    {!single && order > 0 && <span className="gift__order">{order}</span>}
                  </span>
                  <span className="gift__label">{material.label}</span>
                  <span className="gift__note">
                    {[categoryNote(material, filter), fitsLabel(material)].filter(Boolean).join(' · ')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <footer className="give__bar">
        <div className="give__picked" aria-live="polite">
          {chosen.length === 0 ? (
            <span className="give__hint">
              Pick {materialsWord(needed)} for the {room}. Tap a card to choose.
            </span>
          ) : (
            chosen.map((id) => (
              <span key={id} className="give__chip">
                <span className="give__chip-swatch" style={swatchStyle(MATERIALS_BY_ID[id])} />
                <span>
                  <strong>{MATERIALS_BY_ID[id].label}</strong>
                  <small>{categoryNote(MATERIALS_BY_ID[id], 'all')}</small>
                </span>
              </span>
            ))
          )}
          {!single && (
            <span className="give__count">
              {chosen.length} of {needed} selected
            </span>
          )}
        </div>
        <button type="button" className="primary give__send" disabled={!full} onClick={() => sendMaterials(chosen)}>
          {full ? `Send to ${hallName(opponent)}` : `Choose ${materialsWord(needed)} to send`}
        </button>
      </footer>
    </>
  )
}

// Under a card: its categories under "All"; in a category, the other one(s)
// it's also in ("Also natural materials"), or nothing.
function categoryNote(material, filter) {
  const labels = (ids) => ids.map((id) => CATEGORIES_BY_ID[id].label.toLowerCase())
  if (filter === 'all') {
    const [first, ...rest] = labels(material.categories)
    return [first[0].toUpperCase() + first.slice(1), ...rest].join(', ')
  }
  const others = labels(material.categories.filter((id) => id !== filter))
  return others.length ? `Also ${others.join(', ')}` : null
}

function Sent() {
  const { game, opponent, computer } = useGame()
  const one = game.materialIds.length === 1
  return (
    <>
      <header className="give__head give__head--short">
        <Meta />
      </header>
      <div className="give__body">
        <div className="sent" role="status">
          <div className="sent__swatches">
            {game.materialIds.map((id) => (
              <span key={id} className="sent__swatch" style={swatchStyle(MATERIALS_BY_ID[id])} title={MATERIALS_BY_ID[id].label} />
            ))}
          </div>
          <span className="give__eyebrow">
            Sent to {hallName(opponent)}
            {computer ? ' (computer)' : ''}
          </span>
          <h2 className="give__title">{one ? 'Your material is on its way' : 'Your materials are on their way'}</h2>
          <p className="give__lead">Waiting for {hallName(opponent)} to design.</p>
          <span className="waiting__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </>
  )
}
