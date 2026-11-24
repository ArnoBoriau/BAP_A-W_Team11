// One home from the street: the PoC's house plan, with the finishes the
// players chose, on a plinth (like a physical architecture model).
// `open` folds the walls that face the camera, to look inside.

import { useMemo, useRef } from 'react'
import { materialOf } from '../config/materials'
import { FOOTPRINT, SURFACES, WALL, glassOpenings } from '../config/room'
import { HouseSurface } from './HouseSurface'

export const PLINTH_MARGIN = 1.4
const PLINTH_HEIGHT = 0.35

export function House({ home, open = false, ...groupProps }) {
  const houseRef = useRef()
  const openings = useMemo(() => glassOpenings(home.glazing), [home.glazing])

  return (
    <group ref={houseRef} {...groupProps}>
      {SURFACES.map((surface) => (
        <HouseSurface
          key={surface.id}
          surface={surface}
          definition={materialOf(home.glazing[surface.id] ?? home.config[surface.id])}
          glazed={!!home.glazing[surface.id]}
          openings={openings[surface.id]}
          open={open}
          houseRef={houseRef}
        />
      ))}
      <mesh position-y={-WALL.floorThickness - PLINTH_HEIGHT / 2} receiveShadow castShadow>
        <boxGeometry args={[FOOTPRINT.width + PLINTH_MARGIN, PLINTH_HEIGHT, FOOTPRINT.depth + PLINTH_MARGIN]} />
        <meshStandardMaterial color="#f6f4f0" roughness={0.9} />
      </mesh>
    </group>
  )
}
