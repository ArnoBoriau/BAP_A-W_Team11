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
// Particles screens (ui/ParticlesScreen.jsx) listen on the same channel. They
// say hello and get the state, but never count as the other player. A window
// also sends what its player picked but didn't send yet (`preview`: a material
// on the picker, a place in the room), so their hall's particles answer every
// click, not just the moves.
//
// The computer (src/state/computer.js) fills in for an empty hall, on its own:
//   - you're here and the other hall stays empty for FALLBACK_MS → the computer joins
//   - the other hall's player walks away mid-game → the computer takes over at once
//   - someone steps up in the other hall → the computer steps aside, they play on
// The window with the computer plays both sides: the computer is always
// "here", and its moves are made locally. Every message says so (`computer`),
// so the real other window knows it has been replaced: it shows "Jump in!" and
// keeps its player's presence going, which is what hands the game back.
//
// Joining shows a short brief (who joined, how a round works) before the game
// is playable: `brief`. A handover in the middle of a game doesn't: a short
// `notice` says what happened and the game carries on.

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { GAME_CHANNEL, initialGame, reducer, activePlayer, other } from './game'
import { computerMove, THINK_MS } from './computer'
import { createTransport, netMode } from '../net/transport'

const STALE_MS = 3000
const FALLBACK_MS = 6000 // alone this long, the computer joins
const BRIEF_MS = 5000 // "Hall B has joined!" and how a round works
const NOTICE_MS = 4000 // "Hall B left, the computer takes over"

const GameContext = createContext(null)

export function GameProvider({ player, children }) {
  const opponent = other(player)
  const [game, dispatch] = useReducer(reducer, initialGame)
  const [otherOnline, setOtherOnline] = useState(false)
  const [link, setLink] = useState('connecting') // connecting | open | offline
  const [seen, setSeen] = useState(false) // the camera sees this player (PresenceTile)
  const [faked, setFaked] = useState(false) // P key: pretend someone is here, for testing
  const [otherHere, setOtherHere] = useState(false)
  const [computer, setComputer] = useState(false) // the opponent is the computer
  const [brief, setBrief] = useState(null) // null | 'person' | 'computer' | 'arrived': shown before playing
  const [notice, setNotice] = useState(null) // null | 'left' | 'joined': a handover mid-game
  const [otherComputer, setOtherComputer] = useState(false) // the other window replaced us
  const here = seen || faked
  const channel = useRef(null)
  const gameRef = useRef(game)
  const previewRef = useRef(null) // this player's latest unsent pick, for particles screens
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
  // A real person in each hall, both at their screen.
  const people = here && link === 'open' && otherOnline && otherHere
  const together = here && !replaced && (computer || people)
  // The game takes input once the brief is over.
  const playing = together && !brief

  // The computer steps in and out (see the top of this file). Adjusted while
  // rendering, not in an effect, so a handover never flashes the waiting
  // screen for a frame.
  const [last, setLast] = useState({ people, together, replaced })
  if (computer && otherOnline && otherHere && link === 'open') {
    setComputer(false) // a real person stepped up in the other hall
    setNotice('joined')
  } else if (!computer && !replaced && last.people && !people && here) {
    setComputer(true) // they walked away mid-game
    setNotice('left')
    setLast({ people, together: true, replaced }) // still together: no brief
  } else if (last.people !== people || last.together !== together || last.replaced !== replaced) {
    // Joining (not a handover): show who joined and how a round works.
    if (together && !last.together) setBrief(computer ? 'computer' : last.replaced ? 'arrived' : 'person')
    if (!together) setBrief(null)
    setLast({ people, together, replaced })
  }

  // Alone at the screen for a while: the computer joins.
  useEffect(() => {
    if (computer || replaced || !here || people) return
    const timer = setTimeout(() => setComputer(true), FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [computer, replaced, here, people])

  useEffect(() => {
    if (!brief) return
    const timer = setTimeout(() => setBrief(null), BRIEF_MS)
    return () => clearTimeout(timer)
  }, [brief])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

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

    const ch = createTransport(GAME_CHANNEL, {
      onMessage: (msg) => {
        if (!msg || msg.from === player) return
        // Anyone else (a particles screen) only listens: give it the state,
        // but it isn't the other player, so it doesn't count for presence.
        if (msg.from !== other(player)) {
          if (msg.type === 'hello') {
            say('state', { game: gameRef.current })
            say('preview', { preview: previewRef.current })
          }
          return
        }
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
    if (!computer || !playing) return
    const action = computerMove(game, opponent)
    if (!action) return
    const [min, max] = THINK_MS
    const timer = setTimeout(() => dispatch(action), min + Math.random() * (max - min))
    return () => clearTimeout(timer)
  }, [computer, playing, game, opponent])

  const toggleFake = useCallback(() => setFaked((f) => !f), [])

  // What this player picked but didn't send yet: { round, materialId, surfaceId }
  // (the giver: the material they clicked last; the placer: the one they use).
  // Only particles screens use it; the other player's window ignores it.
  const preview = useCallback(
    (pick) => {
      previewRef.current = pick
      channel.current?.send({ from: player, type: 'preview', ...meRef.current, preview: pick })
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
      together, // both players are here (or the computer)
      playing, // together, and the brief is over: the game takes input
      brief,
      notice,
      meter,
      setSeen,
      toggleFake,
      preview,
      myTurn: activePlayer(game) === player,
      // This turn's role decides the whole screen: the giver gets the
      // full-screen material picker, the placer gets the room.
      role: game.giver === player ? 'giver' : 'placer',
      sendMaterials: (materialIds) => dispatch({ type: 'sendMaterials', player, materialIds }),
      placeMaterial: (materialId, surfaceId) => dispatch({ type: 'placeMaterial', player, materialId, surfaceId }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [game, player, opponent, opponentOnline, opponentHere, link, here, faked, computer, replaced, together, playing, brief, notice, meter, toggleFake, preview],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
