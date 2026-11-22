// Renders the house from data: a list of surfaces, each surface's finish
// ({ surfaceId: materialId }, null = not filled in yet) and the glass through the walls (same shape).
// Stateless on purpose, so several houses can later be rendered side by side.

import { useMemo } from 'react'
import { materialOf } from '../config/materials'
import { glassOpenings } from '../config/room'
import { Surface } from './Surface'

const NO_GLAZING = {}

export function Room({
  surfaces,
  config,
  glazing = NO_GLAZING,
  selectedId,
  onSelect,
  canSelect = () => true,
  focusRoomId,
  ...groupProps
}) {
  const openings = useMemo(() => glassOpenings(glazing), [glazing])
  return (
    <group {...groupProps}>
      {surfaces.map((surface) => (
        <Surface
          key={surface.id}
          surface={surface}
          definition={materialOf(glazing[surface.id] ?? config[surface.id])}
          glazed={!!glazing[surface.id]}
          openings={openings[surface.id]}
          selected={surface.id === selectedId}
          onSelect={canSelect(surface) ? onSelect : undefined}
          focusRoomId={focusRoomId}
        />
      ))}
    </group>
  )
}
