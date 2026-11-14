import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { WebSocketServer, WebSocket } from "ws";

const PORT = 8080;

// --- HTTP: serves the two client pages -------------------------------------
const pages = {
  "/": "index.html",
  "/a": "client.html",
  "/b": "client.html",
};

const http = createServer(async (req, res) => {
  const file = pages[req.url];
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  const html = await readFile(new URL(`./public/${file}`, import.meta.url));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
});

// --- WebSocket: relays every message to all *other* clients ----------------
const wss = new WebSocketServer({ server: http });

wss.on("connection", (socket) => {
  console.log(`client connected (${wss.clients.size} total)`);

  socket.on("message", (data) => {
    const text = data.toString();
    console.log("relay:", text);
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  });

  socket.on("close", () => {
    console.log(`client left (${wss.clients.size} total)`);
  });
});

http.listen(PORT, () => {
  console.log(`Server running:`);
  console.log(`  A → http://localhost:${PORT}/a`);
  console.log(`  B → http://localhost:${PORT}/b`);
});
