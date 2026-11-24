// WebSocket to the vote server (same host and port as the page, path /ws).
// Reconnects by itself: phones drop the connection when their screen locks.

export function connect(params, { open, close, message }) {
  const url = new URL('/ws', location.href)
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let ws = null
  function start() {
    ws = new WebSocket(url)
    ws.onopen = () => open?.()
    ws.onmessage = (e) => {
      try {
        message(JSON.parse(e.data))
      } catch {}
    }
    ws.onclose = () => {
      close?.()
      setTimeout(start, 1000)
    }
  }
  start()

  return {
    send(msg) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
  }
}
