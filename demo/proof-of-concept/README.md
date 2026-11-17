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

Step-by-step for a test session (checklist and troubleshooting): see [TESTME.md](TESTME.md).

```bash
npm install
```

The launcher has a toggle: **This Mac** or **Two MacBooks**.

### This Mac (split screen)

```bash
npm run dev
```

Open the printed URL, keep **This Mac** selected and click **Open both windows**, or open
`?player=A` and `?player=B` yourself. The windows talk through a `BroadcastChannel`, no server.
Put them side by side or drag each to its own screen, and press `F` for fullscreen.

### Two MacBooks

On MacBook 1 (the one running the code):

```bash
npm run dev:lan
```

1. Put both MacBooks on the same Wi-Fi. School or guest networks sometimes block devices from
   seeing each other; a phone hotspot always works.
2. On MacBook 1, open the printed `https://localhost:5173`, pick **Two MacBooks** and click
   **Open player A**.
3. On MacBook 2, open the link the launcher shows (`https://<ip-of-macbook-1>:5173/?player=B`).
   Nothing to install there; it's just a browser.

Both browsers warn that the connection isn't private. That's the self-signed certificate for
testing: choose *Advanced → Proceed* (Chrome) or *Show details → visit this website* (Safari).
https is needed because browsers only allow the camera on https or `localhost`.

The left panel shows "Over the network" at the bottom, and "Can't reach the server, retrying…" if
the connection drops. It reconnects on its own.

## How it works

- `src/state/game.js`: the game as pure data plus a reducer (turns, roles, room config).
- `src/state/GameState.jsx`: runs the reducer in each window and broadcasts the full state
  after every change. The newest `version` wins. A window that opens or reloads says hello, and
  the other window sends it the current state. Same on a reconnect.
- `src/scene/`: the room. Only the player who picks the location can click surfaces.
- `src/ui/TurnPanel.jsx`: shows each player what to do, or what they're waiting for.
- `src/ui/PresenceTile.jsx`: a video-call style tile (top right) that shows the other player
  as an abstract, faceless figure, plus a small inset of yourself as they see you.

## The other player, abstracted

Each window tracks its own player with the webcam (ml5 MoveNet, as in `tests/pulse-presence`).
The video never leaves the window. Only 17 joint positions (`[x, y, confidence]`, 0…1) are sent
to the other window, about 20 times a second, on a channel of their own. The receiver
draws a round head, a soft torso and rounded limbs from those points and blurs them into a glow.
You can read posture and gestures (waving, nodding, leaning in), but not who it is: there is no
face, skin, clothing or background to send.

- `src/presence/tracking.js`: camera + pose model → 17 points per frame.
- `src/presence/poseLink.js`: sends and receives those points between windows.
- `src/presence/figure.js`: smooths the points and draws the abstract figure.

**Hide me** stops sending your points (the other side sees "Player X is hidden"). Both windows on
one laptop share the same webcam, so for a real test use one camera per screen.

- `src/net/transport.js`: one small interface over both transports, the `BroadcastChannel`
  (this Mac) and a WebSocket (two MacBooks). The mode comes from `?net=network` on the URL; a page
  opened from another machine always uses the network.
- `relay.js`: the WebSocket relay from `tests/websockets`, as a Vite plugin, so it runs inside the
  dev server (`wss://<host>/relay/<channel>`). It forwards every message to the other clients on
  the same channel. The game state and the poses each have their own channel.
