# Proof of concept v3: Room, together

v3 is v2 with the A@W look of our styleboard: the black box (near-black page, off-white text, thin
rules, square shapes), agora. blue for the one action and the active turn, uppercase Poppins for
titles and labels, Manrope for running text (bundled with `@fontsource`, so it works offline at the
event). The house is a line drawing in light on the dark stage. The tokens match `BAP11_blog`
(`src/styles/global.css`).

### The flow (from the designer's wireframes)

The screens follow the user flow of the wireframes in Figma (*BAP - Design → Wireframes*); only the
flow and the copy, not their look. Each player stands in a **hall** (Hall A, Hall B):

| Step | Giver (chooses materials) | Placer (designs the house) |
| --- | --- | --- |
| 1 | Waiting for the other person (the other hall is empty) | same |
| 2 | "Hall B has joined!" + how a round works (5 s) | same |
| 3 | "It's your turn to choose a material": pick one (by category), "Send to Hall B" | "It's your turn to design": the house, waiting for a material |
| 4 | "Your material is on its way" | "A material has arrived": pick a part, "Apply my selection" |
| 5 | "This is what Hall B changed with your material": the room (6 s, you can look around), "Next up: your turn to design" | "It's your turn to choose a material" (changing interfaces) |
| 6 | the roles have swapped: the design panel appears on the house they're already looking at | the picker |

Steps 5 and 6 are local timing (`src/ui/useInterlude.js`, `Interlude.jsx`): the game has already
moved on, so a quick other hall's material is simply there when they end.

`PICKS` in `src/state/game.js` is how many materials the giver sends: **1** now. Set it to 3 for the
wireframes' "choose three, the other hall uses one of them": the picker then numbers your choices
and the designer picks one of the three. All the copy follows `PICKS`.

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
| The giver sends it (or them, with `PICKS` > 1) | keeps the last one clicked | receives it: the same field |
| The placer picks one and a place (not applied yet) | the material | it takes that element's form |
| The placer applies it | the move as placed | stays (it was already showing it) |

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

The game plays while **someone stands at each screen** (or the computer fills in, below). Until
then a waiting screen covers the room (nothing is lost, the turn just pauses):

| Your screen shows | When |
| --- | --- |
| Step in front of the screen | nobody here |
| **Come closer**, with a pulse in the other hall's colour | the other hall is here, waiting for you |
| Waiting for the other person | you're here, the other hall is empty |
| **Jump in! Hall X is playing alone**, with a pulse | the other hall plays with the computer |
| Hall X has joined! / The computer has joined! + how a round works | both playing; it fades out after 5 s |

"Here" uses the rules from `tests/pulse-presence`: close to the screen, facing it, and standing still for
1.5 s, so someone walking past doesn't start the game. Looking away for less than 3 s doesn't pause
it. The ring on the waiting screen fills while it's making sure you're there. Without a camera
(blocked), a player always counts as here.

Press **P** in a window to pretend someone is standing there (for testing without a second person).

## The computer fills in an empty hall

There is no switch: the computer comes and goes on its own (`src/state/GameState.jsx`).

- **Nobody in the other hall** for 6 s while you're here: "The computer has joined!" and it plays
  the other hall (chooses materials, or uses one of yours), after a second or two per move.
- **The other hall walks away mid-game**: "Hall B left · The computer takes over", straight away,
  no waiting screen.
- **Someone steps up in the other hall**: their screen said "Jump in! Hall A is playing alone";
  once they're standing there, the computer steps aside ("A real person joined · Hall B takes over
  from the computer") and they carry on with the same game ("You're in!").

## How it works

- `src/state/game.js`: the game as pure data plus a reducer (giver/placer, turns, room config).
- `src/state/GameState.jsx`: runs the reducer in each window and broadcasts the full state
  after every change. The newest `version` wins. A window that opens or reloads says hello, and
  the other window sends it the current state. Same on a reconnect.
- `src/App.jsx`: picks the screen per turn: giver → `GiveScreen`, placer → the room + `PlacePanel`.
  The room stays mounted (paused, hidden) while giving, so swapping roles doesn't rebuild it.
- `src/ui/GiveScreen.jsx`: the giver's full-screen picker (category tabs, `PICKS` materials), then
  "on its way".
- `src/ui/PlacePanel.jsx`: the placer's panel: the material they got (with `PICKS` > 1: which one to
  use) and where.
- `src/ui/Interlude.jsx` + `useInterlude.js`: between turns, the reveal and "your turn to …".
- `src/ui/Notices.jsx`: "Materials have arrived", "Hall B left", "A real person joined".
- `src/ui/PlayerBits.jsx`: header, footer and "last turn", on both screens.
- `src/data/`: the material catalogue as rows, one JSON file per category (columns in
  `src/data/README.md`, ready to move to a database like Supabase). `src/config/categories.js`
  holds the categories, `src/config/materials.js` turns rows into materials, and
  `src/textures/families.js` draws them: one painter per family (planks, osb, terrazzo…),
  coloured and set up per row. Particles show a stand-in from the material's category
  (`particleMaterial` in `src/particles/adapters.js`).
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
- `src/state/computer.js`: the computer's moves (`PICKS` random materials that fit; one of the
  materials it got, on a place where it fits and changes something).
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
