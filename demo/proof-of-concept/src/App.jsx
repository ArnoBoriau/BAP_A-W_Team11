// One page, three roles:
//   /?player=A  → player A's screen
//   /?player=B  → player B's screen
//   /           → launcher to open both

import { useEffect } from 'react'
import { PLAYERS } from './state/game'
import { GameProvider } from './state/GameState'
import { RoomScene } from './scene/RoomScene'
import { TurnPanel } from './ui/TurnPanel'
import { Launcher } from './ui/Launcher'

const player = new URLSearchParams(location.search).get('player')?.toUpperCase()

export default function App() {
  if (!PLAYERS.includes(player)) return <Launcher />

  return (
    <GameProvider player={player}>
      <PlayerScreen player={player} />
    </GameProvider>
  )
}

function PlayerScreen({ player }) {
  useEffect(() => {
    document.title = `Player ${player}`
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'f' || e.target.closest?.('input, textarea')) return
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player])

  return (
    <main className="app">
      <div className="viewport">
        <RoomScene />
      </div>
      <TurnPanel />
      <p className="hint">Drag to orbit · Scroll to zoom · F for fullscreen</p>
    </main>
  )
}
