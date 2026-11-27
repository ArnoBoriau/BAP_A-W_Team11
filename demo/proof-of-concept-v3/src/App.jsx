// One page, four roles:
//   /?player=A          → player A's screen
//   /?player=B          → player B's screen
//   /?screen=particles&side=A  → hall A's particles: what player A's choices do
//   /?screen=particles&side=B  → hall B's (as many of each as you like, they only listen)
//   /                   → launcher to open them
//
// The flow, per hall (as in the designer's wireframes):
//   waiting for the other hall → "Hall B has joined!" + how a round works
//   giver:  choose 3 materials → send → "on their way" → see what the other
//           hall changed → "your turn to design"
//   placer: the house, waiting for materials → "materials have arrived" →
//           pick one + a part → apply → "your turn to choose materials"
// Each turn the two screens are different: the giver gets a full-screen
// material picker (no room), the placer gets the room. Roles swap per turn.
// Nobody in the other hall: the computer plays it (state/GameState.jsx).

import { useEffect, useState } from 'react'
import { PLAYERS, applyPlacement, fits, hallName, isFinished, turnRoom } from './state/game'
import { MATERIALS_BY_ID } from './config/materials'
import { SURFACES_BY_ID, areaFocusId } from './config/room'
import { GameProvider } from './state/GameState'
import { RoomScene } from './scene/RoomScene'
import { GiveScreen } from './ui/GiveScreen'
import { PlacePanel } from './ui/PlacePanel'
import { PresenceTile } from './ui/PresenceTile'
import { Launcher } from './ui/Launcher'
import { WaitingScreen } from './ui/WaitingScreen'
import { useGame } from './state/GameState'
import { ParticlesScreen } from './ui/ParticlesScreen'
import { Interlude } from './ui/Interlude'
import { useInterlude } from './ui/useInterlude'
import { Notices } from './ui/Notices'

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
  const { game, role, playing, toggleFake, preview } = useGame()
  const finished = isFinished(game)
  const step = useInterlude(game, player) // 'reveal' | 'switch' | null, after each placement
  const placing = !finished && role === 'placer' && game.phase === 'place'
  // Once the house is finished, both see it. While revealing what the other
  // hall did with your materials, you see the room too.
  const giving = !finished && role === 'giver' && step !== 'reveal'

  // What the placer is trying: one of the materials they got, and a place for
  // it. Local until they apply it, and only for this turn (tied to the round,
  // so it clears itself).
  const [pick, setPick] = useState({ round: 0, materialId: null, surfaceId: null })
  const mine = placing && pick.round === game.round ? { ...pick } : { materialId: null, surfaceId: null }
  // Only one material came: nothing to choose, it's the one.
  if (placing && game.materialIds.length === 1) mine.materialId = game.materialIds[0]
  const material = mine.materialId ? MATERIALS_BY_ID[mine.materialId] : null
  const room = turnRoom(game)?.id
  const canSelect = (surface) => !!material && surface.roomId === room && fits(game, material, surface)
  const selectedId = mine.surfaceId
  const selection = {
    materialId: mine.materialId,
    surfaceId: selectedId,
    // Another material: keep the place if it fits there too.
    chooseMaterial: (materialId) => {
      const keep = selectedId && fits(game, MATERIALS_BY_ID[materialId], SURFACES_BY_ID[selectedId])
      setPick({ round: game.round, materialId, surfaceId: keep ? selectedId : null })
    },
    chooseSurface: (surfaceId) => setPick({ round: game.round, materialId: mine.materialId, surfaceId }),
  }

  // This player's hall sees the material on the picked place already (their
  // particles screen), before it's applied.
  useEffect(() => {
    if (placing) preview({ round: game.round, materialId: mine.materialId, surfaceId: selectedId })
  }, [preview, placing, game.round, mine.materialId, selectedId])

  // Preview the chosen material on the selected surface.
  const house = material && selectedId ? applyPlacement(game, selectedId, material.id) : game

  // Where the camera looks: the picked surface; else, while placing, the
  // turn's room; else where the last material went; finished: the whole house.
  const focusId = finished ? null : (selectedId ?? (placing ? areaFocusId(room) : (game.lastMove?.surfaceId ?? null)))

  useEffect(() => {
    document.title = hallName(player)
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

  // Until the game plays (both halls here, brief over), the room and the
  // panel can't be used: the waiting screen covers them and `inert` keeps
  // keyboard focus out too. Same for the panel during an interlude; during the
  // reveal the camera points to the change, but you can already look around
  // (not select a part: that waits for the panel). The room stays mounted
  // (paused) while giving, so swapping roles doesn't rebuild the scene; the
  // giver just never sees it.
  const live = playing && !step
  const lookable = playing && step !== 'switch'
  return (
    <main className="app">
      <div className="viewport" inert={!lookable || giving} hidden={giving}>
        <RoomScene
          active={!giving}
          config={house.config}
          glazing={house.glazing}
          selectedId={selectedId}
          focusId={focusId}
          onSelect={placing && live ? selection.chooseSurface : undefined}
          canSelect={canSelect}
        />
      </div>
      {!step && (
        <div className="contents" inert={!live}>
          {giving ? <GiveScreen /> : <PlacePanel selection={selection} />}
        </div>
      )}
      {!giving && !step && <p className="hint">Drag to rotate · Scroll or pinch to zoom · Click to select a part</p>}
      <Interlude step={step} />
      <Notices placing={placing} />
      <WaitingScreen />
      <PresenceTile />
    </main>
  )
}
