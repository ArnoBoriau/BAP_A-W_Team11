// The context object + its hook live in their own file (no components), so a
// hot reload of RoomState.jsx never creates a second context. Without this,
// a save during `npm run dev` could leave the provider and the readers on
// different context objects ("useRoomState must be used inside <RoomStateProvider>").

import { createContext, useContext } from 'react'

export const RoomStateContext = createContext(null)

export function useRoomState() {
  const ctx = useContext(RoomStateContext)
  if (!ctx) throw new Error('useRoomState must be used inside <RoomStateProvider>')
  return ctx
}
