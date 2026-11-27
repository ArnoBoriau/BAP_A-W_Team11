# Material catalogue

Every material is one row. Today the rows live in `materials/<category>.json` (by main category);
`catalogue.js` is the only file that reads them, so they can move to a database
table (e.g. Supabase) with the same columns later.

The textures are drawn in code (`src/textures/`), not stored as images: a row
says which **family** draws it (planks, osb, terrazzo…) and with which colour and
settings. Many materials share a family; their rows make them look different.

## Columns

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | text, unique | Stable id, lowercase with dashes (`douglas-fir`). Saved in games: don't rename. |
| `name` | text | Shown on screen (`Douglas fir`). |
| `categories` | text[] | One or more of `src/config/categories.js`: `stone`, `plastics`, `bioplastics`, `wood`, `concrete`, `glass`, `ceramics`, `metals`, `natural`. The first is the main one (order under "All", particles' stand-in); a material shows under each. Cork: `["wood", "natural"]`. |
| `family` | text | Which texture painter draws it (`src/textures/families.js`). |
| `surfaces` | text[] | Where it can go: `wall`, `floor`. |
| `through` | bool, optional | Fills the whole wall instead of one side (glass). |
| `tile` | number | Metres one repeat of the texture covers. |
| `color` | text | Base colour, hex. The family derives the other tones from it. |
| `roughness` | number 0…1 | 0 mirror, 1 matte. |
| `metalness` | number 0…1 | 1 for bare metals. |
| `clearcoat` | number 0…1 | A glossy layer on top (glaze, lacquer, polish). |
| `bump` | number | Relief strength from the texture. 0 = flat. |
| `params` | json | Any family: `rotate` (a quarter turn: stems standing up), `joints` ([columns, rows] of slabs), `sparkle`. Family settings, e.g. planks: `grain`, `knots`, `streaks`, `variance`; lamella: `lamellas`; glass: `transmission`, `thickness`, `ior`, `iridescence` (dichroic); glazing: `pattern` (`wired`, `fluted`, `hammered`, `rolled`, `channel`, `blocks`, `etched`, `fused`). |
| `particles` | text, optional | Which particles material to show (`src/particles/data/materials.js`). Default: by main category. |

## Adding a material

Add a row to the category's file. If an existing family fits (most woods are
`planks`), that's all. A new look needs a new family in `src/textures/families.js`.
