// Renders a room from data: a list of surfaces + a { surfaceId: materialId } map.
// Stateless on purpose, so several rooms can later be rendered side by side.

import { MATERIALS_BY_ID } from '../config/materials'
import { Surface } from './Surface'

export function Room({ surfaces, config, selectedId, onSelect, canSelect = () => true, ...groupProps }) {
  return (
    <group {...groupProps}>
      {surfaces.map((surface) => (
        <Surface
          key={surface.id}
          surface={surface}
          definition={MATERIALS_BY_ID[config[surface.id]]}
          selected={surface.id === selectedId}
          onSelect={canSelect(surface) ? onSelect : undefined}
        />
      ))}
    </group>
  )
}
