// @ts-nocheck
import { setupBot } from "./bot";
import * as http from "http";
import * as https from "https";

const PORT = process.env.PORT || 3002;

const isRender = !!process.env.RENDER;
const allowPolling = isRender || process.env.ALLOW_POLLING === "true";

const server = http.createServer((req, res) => {
  if (req.url === "/healthz" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", bot: "nf-token-bot", polling: allowPolling }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`✅ NF Token Bot is running!`);
  console.log(`NF Token Bot health check on port ${PORT}`);

  if (allowPolling) {
    console.log(`🤖 Telegram polling ACTIVE — running on ${isRender ? "Render" : "custom (ALLOW_POLLING=true)"}`);
    setupBot();
  } else {
    console.log(`⏸️  Telegram polling DISABLED — Replit dev/deploy mode (no duplicate responses).`);
    console.log(`   Bot is running on Render. This instance serves health checks only.`);
  }
});

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL && allowPolling) {
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
}
