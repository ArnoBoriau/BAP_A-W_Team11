// One page, four roles:
//   /?player=A          → player A's screen
//   /?player=B          → player B's screen
//   /?screen=particles&side=A  → hall A's particles: what player A's choices do
//   /?screen=particles&side=B  → hall B's (as many of each as you like, they only listen)
//   /                   → launcher to open them
//
// Each turn the two screens are different: the giver gets a full-screen
// material picker (no room), the placer gets the room. Roles swap per turn.

import { useEffect, useState } from 'react'
import { PLAYERS, applyPlacement, fits, isFinished, turnRoom } from './state/game'
import { MATERIALS_BY_ID } from './config/materials'
import { areaFocusId } from './config/room'
import { GameProvider } from './state/GameState'
import { RoomScene } from './scene/RoomScene'
import { GiveScreen } from './ui/GiveScreen'
import { PlacePanel } from './ui/PlacePanel'
import { PresenceTile } from './ui/PresenceTile'
import { Launcher } from './ui/Launcher'
import { WaitingScreen } from './ui/WaitingScreen'
import { useGame } from './state/GameState'
import { ParticlesScreen } from './ui/ParticlesScreen'

const params = new URLSearchParams(location.search)
const player = params.get('player')?.toUpperCase()
const screen = params.get('screen')
const side = params.get('side')?.toUpperCase() === 'B' ? 'B' : 'A'

export default function App() {
  if (screen === 'particles') return <ParticlesScreen side={side} />
  if (!PLAYERS.includes(player)) return <Launcher />

  return (
    <GameProvider player={player}>
      <PlayerScreen player={player} />
    </GameProvider>
  )
}

function PlayerScreen({ player }) {
  const { game, role, together, toggleFake, preview } = useGame()
  const finished = isFinished(game)
  const placing = !finished && role === 'placer' && game.phase === 'place'
  const giving = !finished && role === 'giver' // once the house is finished, both see it

  // Where the placer wants the material: local until they place it, and only
  // for this turn (tied to the round, so it clears itself).
  const [pick, setPick] = useState({ round: 0, id: null })
  const selectedId = placing && pick.round === game.round ? pick.id : null
  const select = (id) => setPick({ round: game.round, id })

  // This player's hall sees the material on the picked place already (their
  // particles screen), before it's placed.
  useEffect(() => {
    if (placing) preview({ round: game.round, materialId: game.materialId, surfaceId: selectedId })
  }, [preview, placing, game.round, game.materialId, selectedId])

  // Preview the received material on the selected surface.
  const material = placing ? MATERIALS_BY_ID[game.materialId] : null
  const house = selectedId ? applyPlacement(game, selectedId, game.materialId) : game
  const room = turnRoom(game)?.id
  const canSelect = (surface) => !!material && surface.roomId === room && fits(game, material, surface)

  // Where the camera looks: the picked surface; else, while placing, the
  // turn's room; else where the last material went; finished: the whole house.
  const focusId = finished ? null : (selectedId ?? (placing ? areaFocusId(room) : (game.lastMove?.surfaceId ?? null)))

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
  // The room stays mounted (paused) while giving, so swapping roles doesn't
  // rebuild the scene; the giver just never sees it.
  return (
    <main className="app">
      <div className="viewport" inert={!together || giving} hidden={giving}>
        <RoomScene
          active={!giving}
          config={house.config}
          glazing={house.glazing}
          selectedId={selectedId}
          focusId={focusId}
          onSelect={placing ? select : undefined}
          canSelect={canSelect}
        />
      </div>
      <div className="contents" inert={!together}>
        {giving ? <GiveScreen /> : <PlacePanel selectedId={selectedId} onSelect={select} />}
      </div>
      {!giving && <p className="hint">Drag to orbit · Scroll to zoom · F for fullscreen</p>}
      <WaitingScreen />
      <PresenceTile />
    </main>
  )
}
