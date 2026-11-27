// The main material categories. Every material (config/materials.js, and the
// particles' particles/data/materials.js) belongs to exactly one, by id.
// Labels in English; `nl` is the client's original Dutch name, for reference.
// The order here is the order on screen (the giver's picker).

export const CATEGORIES = [
  { id: 'stone', label: 'Stone', nl: 'Gesteente(n)' },
  { id: 'plastics', label: 'Plastics', nl: 'Kunststoffen' },
  { id: 'bioplastics', label: 'Bioplastics', nl: 'Biokunststoffen' },
  { id: 'wood', label: 'Wood', nl: 'Hout' },
  { id: 'concrete', label: 'Concrete', nl: 'Beton' },
  { id: 'glass', label: 'Glass', nl: 'Glas' },
  { id: 'ceramics', label: 'Ceramics', nl: 'Keramiek' },
  { id: 'metals', label: 'Metals', nl: 'Metalen' },
  { id: 'natural', label: 'Natural materials', nl: 'Natuurlijke materialen' },
]

export const CATEGORIES_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
