// Start page. Pick how the two players are connected:
//   This Mac      → opens both windows here (split screen), BroadcastChannel
//   Two MacBooks  → player A here, player B on the other MacBook, WebSocket relay

import { useState } from 'react'
import { PLAYERS } from '../state/game'

/* global __LAN_ADDRESSES__, __LAN_MODE__ */
const LAN_ADDRESSES = __LAN_ADDRESSES__
const LAN_MODE = __LAN_MODE__
const STORAGE_KEY = 'poc2-room:net'

function savedMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'network' ? 'network' : 'local'
  } catch {
    return 'local'
  }
}

export function Launcher() {
  const [mode, setMode] = useState(savedMode)

  const choose = (m) => {
    setMode(m)
    try {
      localStorage.setItem(STORAGE_KEY, m)
    } catch {
      // private window: just don't remember
    }
  }

  return (
    <main className="launcher">
      <h1>Room, together</h1>
      <p>
        Two players, two different screens. One picks a material for the other; the other gets it and
        chooses where it goes in the room. Then the roles swap.
      </p>

      <div className="segmented" role="radiogroup" aria-label="Where are the players?">
        <button type="button" role="radio" aria-checked={mode === 'local'} onClick={() => choose('local')}>
          This Mac
        </button>
        <button type="button" role="radio" aria-checked={mode === 'network'} onClick={() => choose('network')}>
          Two MacBooks
        </button>
      </div>

      {mode === 'local' ? <LocalSetup /> : <NetworkSetup />}
    </main>
  )
}

function LocalSetup() {
  const openBoth = () => {
    PLAYERS.forEach((p, i) => {
      window.open(`?player=${p}`, `player-${p}`, `popup,left=${i * 80},top=${i * 80},width=1100,height=720`)
    })
  }

  return (
    <>
      <div className="launcher__links">
        {PLAYERS.map((p) => (
          <a key={p} href={`?player=${p}`} target={`player-${p}`}>
            Player {p}
          </a>
        ))}
      </div>
      <button type="button" className="primary" onClick={openBoth}>
        Open both windows
      </button>
      <p className="note">
        Both windows talk directly, no server. Put them side by side (split screen) or drag each to its own
        screen, and press <kbd>F</kbd> for fullscreen. Allow pop-ups if only one window opens.
      </p>
    </>
  )
}

function NetworkSetup() {
  if (!LAN_MODE) {
    return (
      <div className="steps">
        <p>The dev server only listens on this Mac right now. Stop it and start it for the network:</p>
        <pre>npm run dev:lan</pre>
        <p className="note">Then open the https link it prints and come back here.</p>
      </div>
    )
  }

  const port = location.port ? `:${location.port}` : ''
  const urls = LAN_ADDRESSES.map((ip) => `https://${ip}${port}/?player=B`)

  return (
    <div className="steps">
      <ol>
        <li>
          <span>Both MacBooks on the same Wi-Fi.</span>
        </li>
        <li>
          <span>On this MacBook:</span>
          <a className="primary" href="?player=A&net=network">
            Open player A
          </a>
        </li>
        <li>
          <span>On the other MacBook, open:</span>
          {urls.length ? (
            urls.map((url) => <CopyLink key={url} url={url} />)
          ) : (
            <span className="note">No network found. Is this Mac on Wi-Fi?</span>
          )}
        </li>
      </ol>
      <p className="note">
        The browser warns that the connection isn't private (it's a self-signed certificate for testing). Choose{' '}
        <em>Advanced → Proceed</em> in Chrome, or <em>Show details → visit this website</em> in Safari. https is
        needed for the camera.
      </p>
    </div>
  )
}

function CopyLink({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the link is still selectable
    }
  }
  return (
    <span className="copy">
      <code>{url}</code>
      <button type="button" className="link" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}
