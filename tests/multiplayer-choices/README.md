# Multiplayer choices

The screen asks a question with two answers. Everyone in front of it answers by **where they
stand**: the left half of the room is **A**, the right half is **B**.

Body tracking is ml5 MoveNet in multipose mode: up to 6 people at once, each with a stable id
so they keep their answer while they move. Only the skeleton is drawn; the camera image is never
shown (press `V` to check it).

## How a question works

1. Nobody there → the question waits ("Step in front of the screen").
2. People walk to a side. Each figure takes the colour of its side; the counts update live.
   A strip around the middle line is a dead zone: standing on the line doesn't flip your vote,
   you keep your side until you clearly cross over.
3. The answer locks when **everyone** is on a side and nobody moved for 3 s (but never in the
   first 6 s, so there's time to read), or after 20 s.
4. The result shows for 5 s (winning side comes forward), then the next question.

If everyone walks away mid-question, it starts over for the next group.

## Run

```bash
npm install --ignore-scripts   # ml5's postinstall needs a dev-only tool
npm run dev
```

`?sim=3` → three fake people walking around instead of the camera, to test the flow alone.

Keys: `space` lock now / next question · `r` restart · `v` camera preview · `f` fullscreen.

## Files

- `src/questions.js`: the questions. A new question = a new entry.
- `src/tracking.js`: camera + ml5 MoveNet multipose.
- `src/players.js`: poses → players (smoothed position, side A/B, dead zone, forgetting).
- `src/round.js`: waiting → asking → result loop, timings at the top.
- `src/sim.js`: fake people for `?sim=N`.
- `src/main.js`: drawing, text, keys.
