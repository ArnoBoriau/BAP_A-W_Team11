// Every saved home (homes/*.json), in street order.
// import.meta.glob: in dev a new file shows up on the street by itself; in a
// build they're all baked in, so the hosted street needs no server.

import { hasAnything, normalizeHome } from './house/homeData'

const files = import.meta.glob('../homes/*.json', { eager: true, import: 'default' })

export const HOMES = Object.values(files)
  .map(normalizeHome)
  .filter(hasAnything)
  .sort((a, b) => a.number - b.number)
