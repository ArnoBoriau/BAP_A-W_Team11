// The giver's screen: full screen, no room. You choose three materials FOR the
// other hall, for one room of the house (you know which); they dress the house
// with one of them. You never see the house while you choose; after they've
// placed it, you see what they did (ui/Interlude.jsx).
//
//   material phase → choose PICKS, then "Send to hall X"
//   place phase    → "Your materials are on their way", while they design

import { useEffect, useState } from 'react'
import { MATERIALS, MATERIALS_BY_CATEGORY, MATERIALS_BY_ID } from '../config/materials'
import { CATEGORIES_BY_ID } from '../config/categories'
import { useGame } from '../state/GameState'
import { fitsRoom, hallName, materialsWord, picksFor, turnRoom } from '../state/game'
import { LastMove, PlayerFoot, PlayerHead } from './PlayerBits'
import { fitsLabel, swatchStyle } from './swatch'

export function GiveScreen() {
  const { game } = useGame()
  return (
    <div className="give">
      <aside className="give__side">
        <PlayerHead />
        <LastMove />
        <PlayerFoot />
      </aside>
      <section className="give__main">{game.phase === 'material' ? <Picker /> : <Sent />}</section>
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
  const shown = filter === 'all' ? MATERIALS : MATERIALS.filter((m) => m.category === filter)

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
      <span className="give__eyebrow">
        Your turn · {single ? 'A material' : 'Materials'} for {them}
      </span>
      <h2 className="give__title">It’s your turn to choose {single ? 'a material' : 'materials'}</h2>
      <p className="give__lead">
        {hallName(opponent)} is designing the {room} right now.{' '}
        {single
          ? 'Choose a material they can use there.'
          : `Choose ${needed} materials they can use there; they dress the house with one of them.`}
      </p>

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
                {[CATEGORIES_BY_ID[material.category].label, fitsLabel(material)].filter(Boolean).join(' · ')}
              </span>
            </button>
          )
        })}
      </div>

      <div className="give__action">
        <button type="button" className="primary" disabled={!full} onClick={() => sendMaterials(chosen)}>
          {full ? `Send to ${hallName(opponent)}` : `Choose ${materialsWord(needed)} to send`}
        </button>
        {!single && (
          <span className="give__count" aria-live="polite">
            {chosen.length} of {needed} selected
          </span>
        )}
      </div>
    </>
  )
}

function Sent() {
  const { game, opponent, computer } = useGame()
  return (
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
      <h2 className="give__title">Your {game.materialIds.length === 1 ? 'material is' : 'materials are'} on their way</h2>
      <p className="give__lead">Waiting for {hallName(opponent)} to design.</p>
      <span className="waiting__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  )
}
