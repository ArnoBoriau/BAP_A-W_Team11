// Saving homes during the event. A Vite plugin, so it runs inside the dev
// server: no separate backend.
//
//   POST /api/homes   { config, glazing, name? }  →  { number, url }
//
// Every home becomes one file, homes/home-007.json. The street reads that
// folder (src/homes.js), so a saved home appears on the street right away,
// and `npm run build` bakes all of them into a static site that stays online
// after the event.
//
// CORS is open, so the game (another dev server, another port or another
// laptop on the same Wi-Fi) can post its finished house here.

import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { hasAnything, normalizeHome } from './src/house/homeData.js'

export const HOMES_DIR = fileURLToPath(new URL('./homes/', import.meta.url))
const MAX_BODY = 200_000 // bytes; a whole house is a few kB

export function homeStore() {
  return {
    name: 'home-store',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

function attach(server) {
  server.middlewares.use('/api/homes', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    if (req.method !== 'POST') return reply(res, 405, { error: 'POST a home' })

    try {
      const home = normalizeHome({ ...JSON.parse(await body(req)), number: 0 })
      if (!hasAnything(home)) return reply(res, 400, { error: 'This house has nothing filled in' })
      const saved = await saveHome(home)
      reply(res, 201, { number: saved.number, url: `/#/${saved.number}` })
    } catch (err) {
      reply(res, 400, { error: err.message })
    }
  })
}

// Gives the home the next free number on the street and writes it.
export async function saveHome(home) {
  await mkdir(HOMES_DIR, { recursive: true })
  const taken = (await readdir(HOMES_DIR)).map((f) => Number(f.match(/^home-(\d+)\.json$/)?.[1] ?? 0))
  const number = Math.max(0, ...taken) + 1
  const saved = { ...home, number, builtAt: home.builtAt ?? new Date().toISOString() }
  if (!saved.name) delete saved.name
  // `wx`: never overwrite, even if two saves race for the same number
  await writeFile(`${HOMES_DIR}home-${String(number).padStart(3, '0')}.json`, JSON.stringify(saved, null, 2) + '\n', {
    flag: 'wx',
  })
  return saved
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > MAX_BODY) reject(new Error('Too big'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function reply(res, status, json) {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(json))
}
