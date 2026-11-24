# Material particles

The side-screen animation for a move in the game. A visitor picks a material, the other hall
places it on an element, and the particles show what that material *does* there: the same
material looks different on a window than on a floor, and two materials on the same window
filter in their own way.

This is the structure from the FigJam board (BAP - Jam, "Step by step", steps 1–8), with one file
per step. It runs end to end, but the data and the numbers are first guesses.

## Run

```bash
npm install
npm run dev
```

Pick a room, element, material and version at the bottom left and press **Send**, or press `n` for a
random move. The top left says why it looks like this:

```
Hallway · opening · Cork, natural          ← the move
opening → filtering                        ← the behaviour (from the element)
porous · fragmented · organic + soft · still · opaque   ← the expression (from the material)
```

Open a second tab: a move sent in one shows in both, identically. That's step 8 (both halls show
the same thing).

URL: `?room=hallway&element=opening&material=cork&version=natural&seed=42` starts on a move,
`&at=8` shows it 8 s in (skips the morph). Keys: `n` random move · `space` pause · `f` fullscreen ·
`h` hide everything.

## The pipeline

```
 move (ids only)          { room, element, material, version, seed }            step 1   input.js
   │
   ├─ element ─────────►  behaviour   (filtering, enclosing, …)                 step 2   data/rooms.js
   ├─ material version ►  tags        (density, structure, character, …)        step 3   data/materials.js
   │                        │
   │                        ▼
   │                      settings    (numbers: count, curve, speed, glow, …)   step 4   data/characteristics.js
   │                                                                                     engine/resolve.js
   ▼
 behaviour ───────────►  pattern: WHERE the particles go                        step 5   engine/patterns.js
 structure ───────────►  strands: HOW they're arranged                                   engine/structures.js
                           │
                           ▼
                         field: every particle's home + lines between them      step 6   engine/build.js
                           │
                           ▼
                         positions at time t (movement + behaviour motion)      step 7   engine/motion.js
                           │
                           ▼
                         canvas (black, white, blue)                                     render/canvas.js
```

Step 8: everything random in the engine comes from the move's seed (`engine/random.js`), never
from `Math.random()`. Same move + same seed → the same field, the same motion, on every screen.
Only the move (a few ids) needs to travel between the halls.

### What each part decides

| Comes from | Decides | Values |
| --- | --- | --- |
| element → **behaviour** | the pattern, and an extra motion | filtering (a wall with gaps), enclosing (a ring around an empty space), connecting (clusters with corridors), directing (streams converging on a point), supporting (a base with columns), reflecting (a form and its mirror image), layering (bands at different depths) |
| material → **density** | how many particles, how many drop out | porous · open · dense · solid |
| material → **structure** | how they're arranged (the strands the lines follow) | linear · modular · woven · branching · monolithic · fragmented |
| material → **character** | lines curved or straight, dots round or square, how far off-grid | organic · geometric · soft · rigid (one or more) |
| material → **movement** | how it moves | flowing · rhythmic · expanding · dispersing · still |
| material → **transparency** | dot opacity, blue haze, outlined dots | opaque · translucent · transparent |

## What's a placeholder

- **Materials** (`data/materials.js`): the PoC's materials plus the board's cork, brick and textile
  examples, with 4 versions each where it made sense. The tags are guesses. The real list comes from
  the client. A new material is a new entry with its tags, and nothing else changes.
- **Numbers** (`data/characteristics.js`, the constants in `engine/`): tune by eye.
- **Renderer**: a 2D canvas, like `tests/dots-lines`. The engine doesn't know about it, so it can
  be swapped for react-three-fiber (the board's step 7 mentions `useFrame`) without touching the
  steps before it.
- **Between the halls**: here a `BroadcastChannel` (`input.js`). Over the network it's the same
  message through the relay (as in `demo/proof-of-concept-v2`).

## Linking it to the game

The game sends a move on the `agora-moves` channel:

```js
new BroadcastChannel('agora-moves').postMessage({
  type: 'move',
  move: { room: 'hallway', element: 'opening', material: 'cork', version: 'natural', seed: 42 },
})
```

The PoC doesn't have elements or versions yet. `adapters.js` translates its moves for now:
floor → floor, wall → wall, façade → outside_wall, glass → the room's window. The PoC's material
ids are the same as the ones here.

## Files

- `src/data/`: the board's tables as data: rooms and elements, behaviours, characteristics, materials.
- `src/engine/`: the steps, pure (no DOM): `resolve`, `patterns`, `structures`, `build`, `motion`, `random`.
- `src/render/canvas.js`: draws a field, morphs from the previous one.
- `src/input.js`: where moves come from. `src/adapters.js`: PoC move → move.
- `src/main.js`: wiring, the test picker, keys.
