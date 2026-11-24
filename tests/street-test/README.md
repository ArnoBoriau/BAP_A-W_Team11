# The street

Every home built at the event, in a row along a road. It's for **after** the event: people walk
down the street at home, step inside a house and see what its two builders chose, room by room.

The houses are the house from `demo/proof-of-concept-v2`: the same floor plan, materials and
textures. A home is stored as the game state at the end of a game, so nothing has to be translated.

## Run

```bash
npm install
npm run seed      # 8 made-up homes to test with (npm run seed -- 20 for more)
npm run dev
```

- **On the street**: ← → / scroll / swipe / the ‹ › buttons walk from house to house. Click a
  house (or Enter, or *Step inside*) to visit it.
- **Visiting**: drag to look around, scroll to zoom. The walls on your side fold down
  (dollhouse view, as in the PoC). ← → go to the neighbours, Esc goes back to the street.
- Every house has its own link: `#/7` opens No. 7. That's the link to give the builders, e.g.
  as a QR code on the screen when their house is done (see `tests/qr-test`).

## A home

One file per home in `homes/`, e.g. `homes/home-007.json`:

```json
{
  "number": 7,
  "builtAt": "2026-11-24T14:05:00.000Z",
  "name": "optional",
  "config":  { "living-floor": "oak", "living-north": "plaster", "…": null },
  "glazing": { "living-east": "glass" }
}
```

`config` and `glazing` are exactly `game.config` and `game.glazing` from the PoC. A surface that's
`null` was never filled in, and the street draws it as the PoC's line drawing, so a group that
walked away halfway still gets its (half) house on the street.

## Saving a home during the event

`npm run dev` also runs a small endpoint (`home-store.js`, a Vite plugin like the relay in the PoC):

```
POST /api/homes   { config, glazing, name? }   →   201 { number, url }
```

It checks the data against the floor plan, gives the home the next number and writes the file.
The street picks it up right away: a screen at the event can show the street growing.

From the game, when `isFinished(game)` becomes true:

```js
fetch('http://<street-laptop>:5173/api/homes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config: game.config, glazing: game.glazing }),
})
```

Use `npm run dev:lan` when the game runs on another laptop on the same Wi-Fi. (The PoC's
`dev:lan` is https and this one is http. If the browser blocks that request as mixed content,
run the street with https too, using `@vitejs/plugin-basic-ssl` as in the PoC.)

## Putting it online after the event

```bash
npm run build     # → dist/: a static site with every home in homes/ baked in
```

Upload `dist/` to any static host (Netlify, Vercel, GitHub Pages, the school server). No server or
database is needed, and nothing can be added or broken from outside. To add a home later, add its
file to `homes/` and build again. Paths are relative (`base: './'`), so a sub-folder works too.

## Files

- `src/homes.js`: reads `homes/*.json` (in dev, live; in a build, baked in).
- `src/house/homeData.js`: what a home is: checking and cleaning one, describing it room by room.
- `src/house/config/`, `src/house/textures/`: copied from the PoC v2 (floor plan, materials,
  procedural textures). Keep them in sync if the PoC's plan changes, or old homes lose surfaces
  (unknown surfaces are dropped, missing ones are blank).
- `src/house/scene/House.jsx`, `HouseSurface.jsx`: a read-only house that can stand anywhere and
  fold open its walls for a visit (adapted from the PoC's `Surface.jsx`).
- `src/street/layout.js`: where houses, road and camera go.
- `src/street/Street.jsx`: the 3D street: houses, road, light that follows you, camera, number plates.
- `src/App.jsx`: routes (`#/`, `#/7`) and walking. `src/ui/HouseCard.jsx`: the visit panel.
- `home-store.js`: the save endpoint. `scripts/seed.js`: test homes.
