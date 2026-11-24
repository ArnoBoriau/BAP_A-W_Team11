# Vote with your phone

The screen asks a question with two answers. A small QR code sits in the corner: scan it,
and your phone becomes a controller with two big buttons, **A** and **B** (Kahoot-style).
The screen counts the votes live.

## Run

```bash
npm install
npm run dev
```

Open the screen at the **Network** address Vite prints (or `localhost`). The QR code points to
`http://<this-computer's-ip>:<port>/play`, so the phone must be on the **same Wi-Fi**.

## How a question works

1. No phone connected → the question waits ("Scan the code to join").
2. Phones tap A or B. You can change your vote until it locks.
3. It locks when every connected phone voted and nothing changed for 2 s (never in the first
   3 s), or after 20 s.
4. The result shows for 5 s, on the screen and on every phone, then the next question.

A phone keeps its id in `localStorage`, so a reload or a locked phone screen doesn't lose the vote.

Keys on the screen: `space` lock now / next question · `r` restart · `q` hide the QR code · `f` fullscreen.

## Files

- `vote-server.js`: Vite plugin. WebSocket relay on `/ws` (same port), `/play` → phone page, LAN address for the QR.
- `src/screen.js`: the main screen: round logic, QR code, drawing.
- `src/phone.js`: the phone: two buttons.
- `src/socket.js`: WebSocket that reconnects by itself.
- `src/questions.js`: the questions.
