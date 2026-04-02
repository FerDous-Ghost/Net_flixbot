import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const apiServer = fork(path.join(root, "artifacts/api-server/dist/index.mjs"), [], {
  env: { ...process.env, PORT: process.env.PORT || "8080", NODE_ENV: "production" },
  stdio: "inherit",
});

const telegramBot = fork(path.join(root, "artifacts/telegram-bot/dist/index.js"), [], {
  env: { ...process.env, NODE_ENV: "production" },
  stdio: "inherit",
});

apiServer.on("exit", (code) => {
  console.error(`API server exited with code ${code}`);
  process.exit(code || 1);
});

telegramBot.on("exit", (code) => {
  console.error(`Telegram bot exited with code ${code}`);
});
