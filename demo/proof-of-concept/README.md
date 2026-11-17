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
- `src/ui/PresenceTile.jsx`: a video-call style tile (top right) that shows the other player
  as an abstract, faceless figure, plus a small inset of yourself as they see you.

## The other player, abstracted

Each window tracks its own player with the webcam (ml5 MoveNet, as in `tests/pulse-presence`).
The video never leaves the window. Only 17 joint positions (`[x, y, confidence]`, 0…1) are sent
to the other window, about 20 times a second, on a separate `BroadcastChannel`. The receiver
draws a round head, a soft torso and rounded limbs from those points and blurs them into a glow.
You can read posture and gestures (waving, nodding, leaning in), but not who it is: there is no
face, skin, clothing or background to send.

- `src/presence/tracking.js`: camera + pose model → 17 points per frame.
- `src/presence/poseLink.js`: sends and receives those points between windows.
- `src/presence/figure.js`: smooths the points and draws the abstract figure.

**Hide me** stops sending your points (the other side sees "Player X is hidden"). Both windows on
one laptop share the same webcam, so for a real test use one camera per screen.

To run on two machines later, replace the `BroadcastChannel` with the WebSocket relay from
`tests/websockets`. The messages can stay the same.
