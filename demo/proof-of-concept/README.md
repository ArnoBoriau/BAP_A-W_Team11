# Proof of concept: Room, together

Two players, two screens, one shared 3D room. They take turns:

1. One player picks a **location** (the floor or a wall).
2. The other player picks the **material** for that location.
3. The roles swap automatically and the next turn starts.

Built on these tests:

- `tests/room-changer`: the React Three Fiber room, materials, procedural textures and camera.
- `tests/pulse-presence`: two windows kept in sync with a `BroadcastChannel` (no server).
- `tests/window-test`: a launcher that opens one window per screen.

## Run

```bash
npm install
npm run dev
```

Open the printed URL and click **Open both windows**, or open `?player=A` and `?player=B` yourself.
Drag each window to its own screen and press `F` for fullscreen.

## How it works

- `src/state/game.js`: the game as pure data plus a reducer (turns, roles, room config).
- `src/state/GameState.jsx`: runs the reducer in each window and broadcasts the full state
  after every change. The newest `version` wins. A window that opens or reloads says hello, and
  the other window sends it the current state.
- `src/scene/`: the room. Only the player who picks the location can click surfaces.
- `src/ui/TurnPanel.jsx`: shows each player what to do, or what they're waiting for.

To run on two machines later, replace the `BroadcastChannel` with the WebSocket relay from
`tests/websockets`. The messages can stay the same.
