// How the two player windows talk. Two interchangeable transports with the
// same tiny interface:
//
//   local    BroadcastChannel: both windows on this Mac (split screen), no server
//   network  WebSocket via the relay in the dev server (relay.js): two MacBooks
//
// The mode comes from the URL (?net=local | ?net=network), chosen on the
// launcher. Opened from another machine (not localhost), it's always network.
//
//   const t = createTransport('poc-room-game', { onMessage, onStatus })
//   t.send(msg)   // plain JSON-able object; dropped while not connected
//   t.close()
// onStatus('open') fires on every (re)connect: the place to say hello.

export const NET_MODES = ['local', 'network']

export function netMode() {
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
  if (!local) return 'network'
  return new URLSearchParams(location.search).get('net') === 'network' ? 'network' : 'local'
}

export function createTransport(channel, handlers) {
  return netMode() === 'network' ? socketTransport(channel, handlers) : localTransport(channel, handlers)
}

function localTransport(channel, { onMessage, onStatus }) {
  const ch = new BroadcastChannel(channel)
  let closed = false
  ch.onmessage = ({ data }) => data && onMessage(data)
  queueMicrotask(() => !closed && onStatus?.('open'))
  return {
    send: (msg) => !closed && ch.postMessage(msg),
    close: () => {
      closed = true
      ch.close()
    },
  }
}

// Reconnects on its own (Wi-Fi hiccup, dev server restart).
function socketTransport(channel, { onMessage, onStatus }) {
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay/${channel}`
  let ws = null
  let closed = false
  let retry = null
  let delay = 500

  const connect = () => {
    onStatus?.('connecting')
    ws = new WebSocket(url)
    ws.onopen = () => {
      delay = 500
      onStatus?.('open')
    }
    ws.onmessage = ({ data }) => {
      try {
        onMessage(JSON.parse(data))
      } catch {
        // not ours
      }
    }
    ws.onclose = () => {
      if (closed) return
      onStatus?.('offline')
      retry = setTimeout(connect, delay)
      delay = Math.min(delay * 2, 4000)
    }
  }
  connect()

  return {
    send(msg) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
    close() {
      closed = true
      clearTimeout(retry)
      ws?.close()
    },
  }
}
