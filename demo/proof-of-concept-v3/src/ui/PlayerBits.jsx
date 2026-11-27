// Pieces both screens share (the giver's full-screen picker and the placer's
// panel next to the room): which hall you are, the connection, the footer and
// what happened last turn.

import { MATERIALS_BY_ID } from '../config/materials'
import { SURFACES_BY_ID, placeName } from '../config/room'
import { useGame } from '../state/GameState'
import { blanksIn, hallName, turnRoom } from '../state/game'
import { swatchStyle } from './swatch'

export function PlayerHead() {
  const { game, player, otherOnline } = useGame()
  return (
    <header className="panel__head">
      <div className="panel__title">
        <h1>{hallName(player)}</h1>
        <span className="round">
          <RoomProgress game={game} />
        </span>
      </div>
      <p className="presence" data-online={otherOnline}>
        <PresenceText />
      </p>
    </header>
  )
}

// The other hall: connected, empty, the computer, or no connection.
export function PresenceText() {
  const { opponent, otherOnline, link, computer } = useGame()
  if (computer) return `${hallName(opponent)} · computer`
  if (link !== 'open') return "Can't reach the server, retrying…"
  return otherOnline ? `${hallName(opponent)} is connected` : `${hallName(opponent)} · empty`
}

// "Hallway · 3 to fill in", or "Finished" once the whole house is done.
export function RoomProgress({ game }) {
  const room = turnRoom(game)
  if (!room) return 'Finished'
  return `${room.label} · ${blanksIn(game, room.id).length} to fill in`
}

export function PlayerFoot() {
  const { net, reset } = useGame()
  return (
    <footer className="panel__foot">
      <button type="button" className="link" onClick={reset}>
        Restart game
      </button>
      <span>{net === 'network' ? 'Over the network' : 'On this Mac'}</span>
    </footer>
  )
}

// Told from this hall's side: "Hall B used your oak planks on the floor."
// `inline`: one quiet line ("Last turn: …"), for the giver's header.
export function LastMove({ inline = false }) {
  const { game, player } = useGame()
  const move = game.lastMove
  if (!move) return null
  const place = placeName(SURFACES_BY_ID[move.surfaceId])
  const material = MATERIALS_BY_ID[move.materialId]
  const name = material.label.toLowerCase()
  const text =
    move.giver === player
      ? `${hallName(move.placer)} used your ${name} on ${place}.`
      : `You used ${hallName(move.giver)}’s ${name} on ${place}.`
  if (inline) {
    return (
      <p className="last-move last-move--inline">
        <span className="element__swatch" style={swatchStyle(material)} />
        <span>Last turn: {text}</span>
      </p>
    )
  }
  return (
    <section className="last-move">
      <h2>Last turn</h2>
      <p>
        <span className="element__swatch" style={swatchStyle(material)} />
        <span>{text}</span>
      </p>
    </section>
  )
}
