# Material particles (in the game)

Started as a copy of `tests/material-particles/src` (the data, the engine and the canvas renderer),
without its test page. `ui/ParticlesScreen.jsx` shows it full screen at
`?screen=particles&side=A|B`. How a move becomes particles is in `tests/material-particles/README.md`.

What's new here, not in the test (yet):

- `sides.js`: what each hall's screen shows as the turn goes (a picked material, a sent one, a
  place being tried, the placed move).
- A move without an element: a material that has no place yet. Its behaviour is `material`
  (`data/behaviours.js`), a pattern that fills the screen (`engine/patterns.js`), and
  `resolve`/`explain` accept it. `adapters.js` has `fromPocMaterial` for it.
- `render/canvas.js` moves the particles (after `tests/dots-lines`): a spring to their home plus a
  flow field, tight right after a choice and loose while nothing happens, and lines between dots
  that drift close. The constants at the top (`GATHER`, `LOOSEN`, `SPRING`, `DAMPING`, `FLOW`,
  `REACH`) are the ones to tune. `dispose()` lets React unmount it.

When you tune the test, port the changes by hand rather than copying the folders over, or these get
lost.
