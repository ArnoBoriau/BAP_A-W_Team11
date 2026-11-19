// Shared game state across the two windows.
//
// Every window applies actions locally and sends the full resulting state;
// the receiver keeps it if its version is newer. A window that (re)connects
// says "hello" and the other window answers with its current state.
//
// The messages go over src/net/transport.js: a BroadcastChannel when both
// windows are on this Mac, or the WebSocket relay for two MacBooks. The
// messages are the same either way.
//
// Presence (the pulse mechanism, see src/presence/presence.js): every message
// also says whether this window's player is actually standing at the screen
// (`here`). The game only plays while both players are here; otherwise
// <WaitingScreen> covers the room.
//
// The computer (src/state/computer.js): a window can replace the other player
// with the computer. That window then plays both sides on its own: the
// computer is always "here", and its moves are made locally. Every message
// says so (`computer`), so if the real other window is open it knows it has
// been replaced: it keeps watching the room but can't play, and its state
// updates are ignored, until the computer is switched off again.

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { initialGame, reducer, activePlayer, other } from './game'
import { computerMove, THINK_MS } from './computer'
import { createTransport, netMode } from '../net/transport'

const CHANNEL = 'poc2-room-game' // not v1's: the game state has a different shape
const STALE_MS = 3000

const GameContext = createContext(null)

const computerKey = (player) => `poc2-room:computer:${player}`

function savedComputer(player) {
  try {
    return localStorage.getItem(computerKey(player)) === 'on'
  } catch {
    return false
  }
}

export function GameProvider({ player, children }) {
  const opponent = other(player)
  const [game, dispatch] = useReducer(reducer, initialGame)
  const [otherOnline, setOtherOnline] = useState(false)
  const [link, setLink] = useState('connecting') // connecting | open | offline
  const [seen, setSeen] = useState(false) // the camera sees this player (PresenceTile)
  const [faked, setFaked] = useState(false) // P key: pretend someone is here, for testing
  const [otherHere, setOtherHere] = useState(false)
  const [computer, setComputer] = useState(() => savedComputer(player)) // the opponent is the computer
  const [otherComputer, setOtherComputer] = useState(false) // the other window replaced us
  const here = seen || faked
  const channel = useRef(null)
  const gameRef = useRef(game)
  // What every message says about this window, for the transport callbacks.
  const meRef = useRef({ here, computer })
  // How far "we see you, hold on" is (0…1), written every frame by the
  // PresenceTile and read by the WaitingScreen without re-rendering React.
  const [meter] = useState(() => ({ progress: 0 }))

  // Replaced by the other window's computer (and not playing the computer
  // ourselves: then both windows simply play their own game).
  const replaced = otherComputer && !computer
  const opponentOnline = computer || otherOnline
  const opponentHere = computer || otherHere
  const together = here && !replaced && (computer || (link === 'open' && otherOnline && otherHere))

  // Broadcast every local change (and the state we adopted from a sync, harmless).
  useEffect(() => {
    gameRef.current = game
    channel.current?.send({ from: player, type: 'state', game, ...meRef.current })
  }, [game, player])

  // Tell the other window right away when this player arrives or leaves, or
  // the computer takes over.
  useEffect(() => {
    meRef.current = { here, computer }
    channel.current?.send({ from: player, type: 'ping', here, computer })
  }, [here, computer, player])

  useEffect(() => {
    let otherSeenAt = 0
    const say = (type, extra) => ch.send({ from: player, type, ...meRef.current, ...extra })

    const ch = createTransport(CHANNEL, {
      onMessage: (msg) => {
        if (!msg || msg.from === player) return
        otherSeenAt = performance.now()
        setOtherOnline(true)
        if (typeof msg.here === 'boolean') setOtherHere(msg.here)
        setOtherComputer(!!msg.computer)
        // While the computer plays the other side, the real other window
        // only watches: don't let it change our game.
        if (msg.type === 'state' && !meRef.current.computer) dispatch({ type: 'sync', game: msg.game })
        if (msg.type === 'hello') say('state', { game: gameRef.current })
      },
      onStatus: (status) => {
        setLink(status)
        if (status !== 'open') {
          setOtherOnline(false)
          setOtherHere(false)
          setOtherComputer(false)
          return
        }
        // (Re)connected: ask for the other side's state and offer ours.
        say('hello')
        say('state', { game: gameRef.current })
      },
    })
    channel.current = ch

    // Heartbeat, so each window knows whether the other one is still open.
    const beat = setInterval(() => {
      say('ping')
      if (performance.now() - otherSeenAt > STALE_MS) {
        setOtherOnline(false)
        setOtherHere(false)
        setOtherComputer(false)
      }
    }, 1000)

    return () => {
      clearInterval(beat)
      ch.close()
      channel.current = null
    }
  }, [player])

  // The computer's turn: think for a moment, then move. Only while the game
  // plays, so it waits too when this player walks away.
  useEffect(() => {
    if (!computer || !together) return
    const action = computerMove(game, opponent)
    if (!action) return
    const [min, max] = THINK_MS
    const timer = setTimeout(() => dispatch(action), min + Math.random() * (max - min))
    return () => clearTimeout(timer)
  }, [computer, together, game, opponent])

  const toggleFake = useCallback(() => setFaked((f) => !f), [])

  const playComputer = useCallback(
    (on) => {
      setComputer(on)
      try {
        localStorage.setItem(computerKey(player), on ? 'on' : 'off')
      } catch {
        // private window: just don't remember
      }
    },
    [player],
  )

  const value = useMemo(
    () => ({
      game,
      player,
      opponent,
      // "the other player", whether that's a person or the computer
      otherOnline: opponentOnline,
      otherHere: opponentHere,
      link,
      net: netMode(),
      here,
      faked,
      computer, // the opponent is the computer (in this window)
      replaced, // the other window plays this player with the computer
      together, // both players are here (or the computer): the game plays
      meter,
      setSeen,
      toggleFake,
      playComputer,
      myTurn: activePlayer(game) === player,
      // This turn's role decides the whole screen: the giver gets the
      // full-screen material picker, the placer gets the room.
      role: game.giver === player ? 'giver' : 'placer',
      giveMaterial: (materialId) => dispatch({ type: 'giveMaterial', player, materialId }),
      placeMaterial: (surfaceId) => dispatch({ type: 'placeMaterial', player, surfaceId }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [game, player, opponent, opponentOnline, opponentHere, link, here, faked, computer, replaced, together, meter, toggleFake, playComputer],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
