// Where moves come from. A move is board step 1: only ids, nothing else.
//
//   { room: 'hallway', element: 'opening', material: 'cork', version: 'natural', seed: 42 }
//
// Sources (all end up in the same onMove callback):
//   - the URL: ?room=hallway&element=opening&material=cork&version=natural&seed=42
//   - a BroadcastChannel 'agora-moves': any window on this computer (the game,
//     or another tab of this test) can send { type: 'move', move }
//   - this test's own picker (sendMove)
//
// Between the two halls this will go over the network (like the PoC's relay);
// the message stays the same.

const CHANNEL = 'agora-moves'
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null

export function moveFromUrl() {
  const p = new URLSearchParams(location.search)
  if (!p.get('material') || !p.get('element')) return null
  return {
    room: p.get('room') ?? 'hallway',
    element: p.get('element'),
    material: p.get('material'),
    version: p.get('version') ?? undefined,
    seed: p.has('seed') ? Number(p.get('seed')) : undefined,
  }
}

export function onMove(callback) {
  channel?.addEventListener('message', (e) => {
    if (e.data?.type === 'move') callback(e.data.move)
  })
}

// Show it here, and in every other window listening (the other "hall").
export function sendMove(move, callback) {
  channel?.postMessage({ type: 'move', move })
  callback(move)
}
