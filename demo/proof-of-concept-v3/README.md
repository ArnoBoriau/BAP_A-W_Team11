# Proof of concept v3: Room, together

v3 is v2 with the A@W look of our styleboard: the black box (near-black page, off-white text, thin
rules, square shapes), agora. blue for the one action and the active turn, uppercase Poppins for
titles and labels, Manrope for running text (bundled with `@fontsource`, so it works offline at the
event). The house is a line drawing in light on the dark stage. The tokens match `BAP11_blog`
(`src/styles/global.css`). Gameplay is unchanged from v2; the rest of this README describes it.

### New in v3: particles screens

The material particles (`tests/material-particles`) are built in. A particles screen is one more
window, full screen, with no game. Each hall has its own: **side A** follows player A, **side B**
player B. Add as many of each as there are screens to fill:

- **This Mac:** on the launcher, **+ Particles hall A** / **+ Particles hall B** (one new window per
  click), or open `?screen=particles&side=A` (or `B`).
- **Two MacBooks:** the launcher's last step has the same buttons and the links to open on any other
  computer on the Wi-Fi (`https://<ip-of-macbook-1>:5173/?screen=particles&side=B`).

The particles answer every click, not just the moves (`src/particles/sides.js`):

| What happens | Giver's side | Placer's side |
| --- | --- | --- |
| The giver clicks a material (not sent yet) | that material, no form yet | the last move |
| The giver sends it | keeps it | receives it: the same field |
| The placer clicks a place (not placed yet) | the material | it takes that element's form |
| The placer places it | the move as placed | stays (it was already showing it) |

To make this work, a player window also sends its player's unsent pick (`preview` in
`GameState.jsx`). Particles screens only listen: they never count as a player and can be opened
or closed at any time. Opened late, one shows where its hall is straight away.

**Movement.** After a choice the particles gather into its form. When nothing happens, for example
while waiting for the other hall, they loosen and roam around that form, carried by a current shaped
by the material (after `tests/dots-lines`). Dots that drift close join with lines that come and go
(`src/particles/render/canvas.js`). Because the motion is simulated per screen, two screens of the
same hall are alike but not pixel-identical; what they show (the field) is.

Keys: `f` fullscreen, `h` hide the caption. The screen is `src/ui/ParticlesScreen.jsx`; the engine
is in `src/particles/` (see its README).

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

## Waiting for each other (the pulse)

The game only plays while **both players are standing at their screens**. Until then, and whenever one
of them walks away, a waiting screen covers the room (nothing is lost, the turn just pauses):

| Your screen shows | When |
| --- | --- |
| Waiting for player X's screen | the other window isn't open (or can't be reached) |
| Step in front of the screen | nobody here, nobody there |
| **Come closer**, with a pulse in the other player's colour | the other player is here, waiting for you |
| Waiting for player X… | you're here, they aren't (their screen is pulsing) |
| Both here, then it fades out | the game plays |

"Here" uses the rules from `tests/pulse-presence`: close to the screen, facing it, and standing still for
1.5 s, so someone walking past doesn't start the game. Looking away for less than 3 s doesn't pause
it. The ring on the waiting screen fills while it's making sure you're there. Without a camera
(blocked), a player always counts as here.

Press **P** in a window to pretend someone is standing there (for testing without a second person).

## Playing against the computer

Each window has a toggle under its header, **Player B: Person / Computer** (on B's screen:
Player A). On the computer setting, that window plays both sides: you make your moves, the computer
makes the other player's after a second or two, and only you need to stand in front of the screen. The
waiting screen also offers it ("Play against the computer instead") when the other player isn't there.
Each window remembers its choice.

If the real other window is open meanwhile, it shows "Player X is playing against the computer" and
waits (it can't play); when the computer is switched off, both windows continue the same game.

## How it works

- `src/state/game.js`: the game as pure data plus a reducer (giver/placer, turns, room config).
- `src/state/GameState.jsx`: runs the reducer in each window and broadcasts the full state
  after every change. The newest `version` wins. A window that opens or reloads says hello, and
  the other window sends it the current state. Same on a reconnect.
- `src/App.jsx`: picks the screen per turn: giver → `GiveScreen`, placer → the room + `PlacePanel`.
  The room stays mounted (paused, hidden) while giving, so swapping roles doesn't rebuild it.
- `src/ui/GiveScreen.jsx`: the giver's full-screen material picker, then "sent, they're placing it".
- `src/ui/PlacePanel.jsx`: the placer's panel: the material they got and where to put it.
- `src/ui/PlayerBits.jsx`: header, person/computer toggle, footer and "last turn", on both screens.
- `src/config/room.js`: the floor plan (rooms on wall centre lines, door openings). Every floor and
  wall face is generated from it. Every wall is two surfaces, one per side: between two rooms one per
  room, on an exterior wall one for the room (inside) and one for the façade (outside).
  Glass is the exception: it isn't a finish of one side but goes *through* the wall (`through: true`
  in `materials.js`). Placed on a side, it opens that span through both halves and fills it with one
  pane; the finishes stay underneath (`game.glazing` is kept apart from `game.config`), so covering
  either side closes the glass and the other side gets its own material back. The rules live in
  `applyPlacement` (`src/state/game.js`). Windows can later reuse this as a smaller glazed opening.
- `src/scene/`: the house. Only the placer can click surfaces, and only those in this turn's room
  that the material fits. Walls facing the camera fold down, and so do interior walls of rooms that
  aren't in focus, so the overview reads like a plan.
- `src/presence/presence.js`: decides whether the player is really standing at the screen (the pulse
  mechanism). Its result (`here`) goes along with every game message.
- `src/ui/WaitingScreen.jsx`: the waiting / paused screen with the pulse, over the room.
- `src/state/computer.js`: the computer's moves (a random material to give; a place where the
  material fits and changes something).
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
