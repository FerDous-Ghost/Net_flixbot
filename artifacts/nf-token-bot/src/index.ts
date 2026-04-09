// @ts-nocheck
import { setupBot } from "./bot";
import * as http from "http";
import * as https from "https";

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

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  const pingUrl = `${RENDER_URL}/healthz`;
  const interval = 14 * 60 * 1000;
  setInterval(() => {
    const mod = pingUrl.startsWith("https") ? https : http;
    mod.get(pingUrl, (res) => {
      console.log(`🏓 Keep-alive ping → ${res.statusCode}`);
    }).on("error", (err) => {
      console.warn(`⚠️ Keep-alive ping failed: ${err.message}`);
    });
  }, interval);
  console.log(`🔁 Keep-alive enabled → pinging ${pingUrl} every 14 min`);
} else {
  console.log("ℹ️ RENDER_EXTERNAL_URL not set — keep-alive disabled (local mode)");
}
