// Pieces both screens share (the giver's full-screen picker and the placer's
// panel next to the room): who you are, the connection, the person/computer
// toggle, the footer and what happened last turn.

import { MATERIALS_BY_ID } from '../config/materials'
import { SURFACES_BY_ID, placeName } from '../config/room'
import { useGame } from '../state/GameState'
import { blanksIn, turnRoom } from '../state/game'
import { swatchStyle } from './swatch'

export function PlayerHead() {
  const { game, player, opponent, otherOnline, link, computer } = useGame()
  return (
    <header className="panel__head">
      <div className="panel__title">
        <h1>Player {player}</h1>
        <span className="round">
          <RoomProgress game={game} />
        </span>
      </div>
      <p className="presence" data-online={otherOnline}>
        {computer
          ? `Player ${opponent} is the computer`
          : link !== 'open'
            ? "Can't reach the server, retrying…"
            : otherOnline
              ? `Player ${opponent} is connected`
              : `Waiting for player ${opponent}'s window…`}
      </p>
    </header>
  )
}

// "Hallway · 3 to fill in", or "Finished" once the whole house is done.
function RoomProgress({ game }) {
  const room = turnRoom(game)
  if (!room) return 'Finished'
  return `${room.label} · ${blanksIn(game, room.id).length} to fill in`
}

// Play against the other person or against the computer.
export function OpponentToggle() {
  const { opponent, computer, playComputer } = useGame()
  return (
    <div className="opponent">
      <span>Player {opponent}</span>
      <div className="segmented segmented--small" role="radiogroup" aria-label={`Who plays player ${opponent}?`}>
        <button type="button" role="radio" aria-checked={!computer} onClick={() => playComputer(false)}>
          Person
        </button>
        <button type="button" role="radio" aria-checked={computer} onClick={() => playComputer(true)}>
          Computer
        </button>
      </div>
    </div>
  )
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

// Told from this player's side: "Player B put your oak planks on the floor."
export function LastMove() {
  const { game, player } = useGame()
  const move = game.lastMove
  if (!move) return null
  const place = placeName(SURFACES_BY_ID[move.surfaceId])
  const material = MATERIALS_BY_ID[move.materialId]
  const name = material.label.toLowerCase()
  const text =
    move.giver === player
      ? `Player ${move.placer} put your ${name} on ${place}.`
      : `You put player ${move.giver}'s ${name} on ${place}.`
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
