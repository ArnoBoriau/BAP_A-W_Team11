// Room state: which surface is selected and which finish each surface has.
// Kept behind a context + reducer so it can later be swapped for a shared /
// networked store (one store per room) without touching the scene or the UI.

import { createContext, useContext, useMemo, useReducer } from 'react'
import { DEFAULT_ROOM_CONFIG } from '../config/room'

const RoomStateContext = createContext(null)

const initialState = {
  selectedId: 'floor',
  surfaces: DEFAULT_ROOM_CONFIG, // { [surfaceId]: materialId }
}

function reducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.surfaceId }
    case 'setMaterial':
      return {
        ...state,
        surfaces: { ...state.surfaces, [action.surfaceId]: action.materialId },
      }
    case 'reset':
      return { ...state, surfaces: DEFAULT_ROOM_CONFIG }
    default:
      return state
  }
}

export function RoomStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(
    () => ({
      ...state,
      select: (surfaceId) => dispatch({ type: 'select', surfaceId }),
      setMaterial: (surfaceId, materialId) => dispatch({ type: 'setMaterial', surfaceId, materialId }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state],
  )

  return <RoomStateContext.Provider value={value}>{children}</RoomStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoomState() {
  const ctx = useContext(RoomStateContext)
  if (!ctx) throw new Error('useRoomState must be used inside <RoomStateProvider>')
  return ctx
}
