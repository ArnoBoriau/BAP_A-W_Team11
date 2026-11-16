// Start page: opens one window per player. Drag each window to its own screen
// (then F for fullscreen in that window).

import { PLAYERS } from '../state/game'

export function Launcher() {
  const openBoth = () => {
    PLAYERS.forEach((p, i) => {
      window.open(`?player=${p}`, `player-${p}`, `popup,left=${i * 80},top=${i * 80},width=1100,height=720`)
    })
  }

  return (
    <main className="launcher">
      <h1>Room, together</h1>
      <p>
        Two players, two screens, one room. Players take turns: one picks a location, the other picks the
        material, then the roles swap.
      </p>
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
        Drag each window to its own screen and press <kbd>F</kbd> for fullscreen. Allow pop-ups if only one window
        opens.
      </p>
    </main>
  )
}
