// Short messages in the middle of the screen that don't stop the game:
//
//   the other hall left            → "Hall B left · The computer takes over"
//   someone stepped up over there  → "A real person joined · Hall B takes over from the computer"
//   the materials arrived (placer) → "Materials have arrived · 3 materials from hall A"
//
// The first two come from GameState (`notice`), the last one from this turn.

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameState'
import { hallName } from '../state/game'

const ARRIVED_MS = 3500

export function Notices({ placing }) {
  const { game, opponent, notice } = useGame()

  // "Materials have arrived": when this turn's materials reach the placer.
  const [arrived, setArrived] = useState(false)
  const was = useRef(placing)
  useEffect(() => {
    if (placing && !was.current) setArrived(true)
    was.current = placing
  }, [placing])
  useEffect(() => {
    if (!arrived) return
    const timer = setTimeout(() => setArrived(false), ARRIVED_MS)
    return () => clearTimeout(timer)
  }, [arrived])

  const them = hallName(opponent)
  let title, text
  if (notice === 'left') {
    title = `${them} left`
    text = 'The computer takes over'
  } else if (notice === 'joined') {
    title = 'A real person joined'
    text = `${them} takes over from the computer`
  } else if (arrived && placing) {
    const n = game.materialIds.length
    title = n === 1 ? 'A material has arrived' : 'Materials have arrived'
    text = `${n === 1 ? 'From' : `${n} materials from`} ${them}`
  } else return null

  return (
    <div className="notice" role="status" key={title}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}
