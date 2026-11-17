// One page, three roles:
//   /?player=A  → player A's screen
//   /?player=B  → player B's screen
//   /           → launcher to open both

import { useEffect } from 'react'
import { PLAYERS } from './state/game'
import { GameProvider } from './state/GameState'
import { RoomScene } from './scene/RoomScene'
import { TurnPanel } from './ui/TurnPanel'
import { PresenceTile } from './ui/PresenceTile'
import { Launcher } from './ui/Launcher'
import { WaitingScreen } from './ui/WaitingScreen'
import { useGame } from './state/GameState'

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
  const { together, toggleFake } = useGame()

  useEffect(() => {
    document.title = `Player ${player}`
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
      } else if (key === 'p') {
        toggleFake() // test without standing in front of the camera
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, toggleFake])

  // Until both players are here, the room and the panel can't be used:
  // the waiting screen covers them and `inert` keeps keyboard focus out too.
  return (
    <main className="app">
      <div className="viewport" inert={!together}>
        <RoomScene />
      </div>
      <div className="contents" inert={!together}>
        <TurnPanel />
      </div>
      <p className="hint">Drag to orbit · Scroll to zoom · F for fullscreen</p>
      <WaitingScreen />
      <PresenceTile />
    </main>
  )
}
