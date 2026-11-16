// Shared game state across the two windows.
//
// Both windows run on the same origin, so a BroadcastChannel is enough, no
// server needed (same idea as tests/pulse-presence). Every window applies
// actions locally and broadcasts the full resulting state; the receiver keeps
// it if its version is newer. A window that opens (or reloads) says "hello"
// and the other window answers with its current state.
//
// To move to two machines later, swap the channel for the WebSocket relay
// from tests/websockets: the messages stay the same.

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { initialGame, reducer, activePlayer, other } from './game'

const CHANNEL = 'poc-room-game'
const STALE_MS = 3000

const GameContext = createContext(null)

export function GameProvider({ player, children }) {
  const [game, dispatch] = useReducer(reducer, initialGame)
  const [otherOnline, setOtherOnline] = useState(false)
  const channel = useRef(null)
  const gameRef = useRef(game)

  // Broadcast every local change (and the state we adopted from a sync, harmless).
  useEffect(() => {
    gameRef.current = game
    channel.current?.postMessage({ from: player, type: 'state', game })
  }, [game, player])

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL)
    channel.current = ch
    let otherSeenAt = 0

    ch.onmessage = ({ data: msg }) => {
      if (!msg || msg.from === player) return
      otherSeenAt = performance.now()
      setOtherOnline(true)
      if (msg.type === 'state') dispatch({ type: 'sync', game: msg.game })
      if (msg.type === 'hello') ch.postMessage({ from: player, type: 'state', game: gameRef.current })
    }

    ch.postMessage({ from: player, type: 'hello' })

    // Heartbeat, so each window knows whether the other one is still open.
    const beat = setInterval(() => {
      ch.postMessage({ from: player, type: 'ping' })
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
      myTurn: activePlayer(game) === player,
      pickLocation: (surfaceId) => dispatch({ type: 'pickLocation', player, surfaceId }),
      pickMaterial: (materialId) => dispatch({ type: 'pickMaterial', player, materialId }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [game, player, otherOnline],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
