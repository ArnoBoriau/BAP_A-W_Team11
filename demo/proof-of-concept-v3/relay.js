// WebSocket relay (same idea as tests/websockets/server.js), as a Vite plugin
// so it runs inside the dev server: one command, no second server or port.
//
//   wss://<this-mac>:5173/relay/<channel>
//
// Every message is forwarded to all *other* clients on the same channel.
// The game state and the poses each use their own channel.

import { networkInterfaces } from 'node:os'
import { WebSocketServer, WebSocket } from 'ws'

export function relay() {
  const attach = (httpServer) => {
    if (!httpServer) return
    const wss = new WebSocketServer({ noServer: true })

    httpServer.on('upgrade', (req, socket, head) => {
      const { pathname } = new URL(req.url, 'http://x')
      if (!pathname.startsWith('/relay/')) return // leave Vite's own HMR socket alone
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.channel = pathname
        wss.emit('connection', ws, req)
      })
    })

    wss.on('connection', (ws, req) => {
      log(`+ ${req.socket.remoteAddress} on ${ws.channel} (${wss.clients.size} open)`)
      ws.on('message', (data, isBinary) => {
        for (const client of wss.clients) {
          if (client !== ws && client.channel === ws.channel && client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: isBinary })
          }
        }
      })
      ws.on('close', () => log(`- ${req.socket.remoteAddress} left ${ws.channel}`))
    })
  }

  return {
    name: 'room-relay',
    configureServer: (server) => attach(server.httpServer),
    configurePreviewServer: (server) => attach(server.httpServer),
  }
}

const log = (msg) => console.log(`[relay] ${msg}`)

// This Mac's addresses on the local network, so the launcher can show the
// link to open on the other MacBook.
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)
}
