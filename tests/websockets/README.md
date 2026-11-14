# WebSockets test

Two clients (A and B) on the same machine send the numbers 1–5 to each other through a local WebSocket server.

```
[ A ] ──ws://localhost:8080──► [ server.js ] ◄──ws://localhost:8080── [ B ]
```

## Run

```bash
npm install
npm start
```

Then open in two separate windows:

- http://localhost:8080/a
- http://localhost:8080/b

Click 1–5 (or press keys 1–5) in one window and the other window shows the number.

## How it works

- `server.js` serves the pages over HTTP and runs a WebSocket server on the same port. Every message it gets is forwarded to all *other* connected clients.
- `public/client.html` connects with `new WebSocket("ws://localhost:8080")` and sends `{ "from": "A", "value": 3 }`.

Any other program can join the same way: connect to `ws://localhost:8080` and send/receive that JSON. To use it from another device on the same Wi-Fi, replace `localhost` with this Mac's IP address.
