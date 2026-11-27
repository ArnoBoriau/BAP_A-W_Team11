// Where the material catalogue comes from: plain rows, one per material, in
// the shape of a database table (see README.md in this folder).
//
// For now the rows are the JSON files in ./materials (one per category), so
// the prototype runs offline. To move to a database (e.g. Supabase), replace
// these imports with a fetch of the same rows before the app starts (main.jsx),
// and keep the columns: config/materials.js turns rows into materials and
// doesn't care where they came from.

import stone from './materials/stone.json'
import wood from './materials/wood.json'
import concrete from './materials/concrete.json'
import glass from './materials/glass.json'
import ceramics from './materials/ceramics.json'
import metals from './materials/metals.json'

export const ROWS = [...stone, ...wood, ...concrete, ...glass, ...ceramics, ...metals]
