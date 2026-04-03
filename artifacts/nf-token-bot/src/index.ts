// @ts-nocheck
import { setupBot } from "./bot";
import * as http from "http";

setupBot();

const PORT = process.env.PORT || 3002;
const server = http.createServer((req, res) => {
  if (req.url === "/healthz" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", bot: "nf-token-bot-running" }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(PORT, () => {
  console.log(`NF Token Bot health check on port ${PORT}`);
});
