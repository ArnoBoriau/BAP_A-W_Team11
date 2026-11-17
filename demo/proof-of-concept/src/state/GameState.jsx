// Shared game state across the two windows.
//
// Every window applies actions locally and sends the full resulting state;
// the receiver keeps it if its version is newer. A window that (re)connects
// says "hello" and the other window answers with its current state.
//
// The messages go over src/net/transport.js: a BroadcastChannel when both
// windows are on this Mac, or the WebSocket relay for two MacBooks. The
// messages are the same either way.

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { initialGame, reducer, activePlayer, other } from './game'
import { createTransport, netMode } from '../net/transport'

const CHANNEL = 'poc-room-game'
const STALE_MS = 3000

const GameContext = createContext(null)

export function GameProvider({ player, children }) {
  const [game, dispatch] = useReducer(reducer, initialGame)
  const [otherOnline, setOtherOnline] = useState(false)
  const [link, setLink] = useState('connecting') // connecting | open | offline
  const channel = useRef(null)
  const gameRef = useRef(game)

  // Broadcast every local change (and the state we adopted from a sync, harmless).
  useEffect(() => {
    gameRef.current = game
    channel.current?.send({ from: player, type: 'state', game })
  }, [game, player])

  useEffect(() => {
    let otherSeenAt = 0

    const ch = createTransport(CHANNEL, {
      onMessage: (msg) => {
        if (!msg || msg.from === player) return
        otherSeenAt = performance.now()
        setOtherOnline(true)
        if (msg.type === 'state') dispatch({ type: 'sync', game: msg.game })
        if (msg.type === 'hello') ch.send({ from: player, type: 'state', game: gameRef.current })
      },
      onStatus: (status) => {
        setLink(status)
        if (status !== 'open') return setOtherOnline(false)
        // (Re)connected: ask for the other side's state and offer ours.
        ch.send({ from: player, type: 'hello' })
        ch.send({ from: player, type: 'state', game: gameRef.current })
      },
    })
    channel.current = ch

    // Heartbeat, so each window knows whether the other one is still open.
    const beat = setInterval(() => {
      ch.send({ from: player, type: 'ping' })
      if (performance.now() - otherSeenAt > STALE_MS) setOtherOnline(false)
    }, 1000)

    return () => {
      clearInterval(beat)
      ch.close()
      channel.current = null
    }
  }, [player])

  const value = useMemo(
    () => ({
      game,
      player,
      opponent: other(player),
      otherOnline,
      link,
      net: netMode(),
      myTurn: activePlayer(game) === player,
      pickLocation: (surfaceId) => dispatch({ type: 'pickLocation', player, surfaceId }),
      pickMaterial: (materialId) => dispatch({ type: 'pickMaterial', player, materialId }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [game, player, otherOnline, link],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
