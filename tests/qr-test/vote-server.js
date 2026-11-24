// A small WebSocket relay that lives inside the Vite server (same port, path /ws).
//
//   screen  (index.html)  runs the questions, counts the votes
//   phones  (/play)       send a vote, show the current question
//
//   phone ──vote──► server ──vote (+ phone id)──► screen
//   screen ──state──► server ──state (+ that phone's own pick)──► every phone
//
// The server keeps the last state, so a phone that joins mid-question sees it
// right away. Phones keep an id in localStorage, so a reconnect keeps the vote.

import { networkInterfaces } from 'node:os'
import { WebSocketServer, WebSocket } from 'ws'

export function voteServer() {
  return {
    name: 'vote-server',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

function attach(server) {
  // /play is the short address the QR code points to
  server.middlewares.use((req, res, next) => {
    if (req.url === '/play' || req.url.startsWith('/play?')) req.url = '/phone.html'
    next()
  })

  const wss = new WebSocketServer({ noServer: true })
  server.httpServer.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://x').pathname !== '/ws') return // leave Vite's HMR alone
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  })

  const screens = new Set()
  const phones = new Map() // ws → id
  let lastState = null

  const send = (ws, msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg))
  const toScreens = (msg) => screens.forEach((ws) => send(ws, msg))
  const stateFor = (id) => {
    if (!lastState) return { type: 'state', phase: 'waiting' }
    const { picks, ...rest } = lastState
    return { ...rest, mine: picks?.[id] ?? null }
  }

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://x').searchParams

    if (params.get('role') === 'screen') {
      screens.add(ws)
      const port = server.httpServer.address().port
      send(ws, { type: 'hello', url: `http://${lanAddress()}:${port}/play`, phones: [...new Set(phones.values())] })
      ws.on('message', (data) => {
        const msg = parse(data)
        if (msg?.type !== 'state') return
        lastState = msg
        for (const [phone, id] of phones) send(phone, stateFor(id))
      })
      ws.on('close', () => screens.delete(ws))
      return
    }

    const id = (params.get('id') || '').slice(0, 40) || Math.random().toString(36).slice(2)
    phones.set(ws, id)
    toScreens({ type: 'join', id })
    send(ws, stateFor(id))

    ws.on('message', (data) => {
      const msg = parse(data)
      if (msg?.type === 'vote' && (msg.choice === 'A' || msg.choice === 'B')) {
        toScreens({ type: 'vote', id, choice: msg.choice, index: msg.index })
      }
    })
    ws.on('close', () => {
      phones.delete(ws)
      // the same phone may still be connected in another tab
      if (![...phones.values()].includes(id)) toScreens({ type: 'leave', id })
    })
  })
}

function parse(data) {
  try {
    return JSON.parse(data.toString())
  } catch {
    return null
  }
}

// The address phones on the same Wi-Fi can reach this computer at.
function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address
    }
  }
  return 'localhost'
}
