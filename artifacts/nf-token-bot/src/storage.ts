import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", ".data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export interface User {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  joinedAt: string;
  role: "owner" | "elite" | "free";
  expiry?: string;
  tokens: number;
  isBanned: boolean;
  dailyChecks: number;
  lastCheckDate: string;
  referredBy?: string;
  referralCount: number;
  pending: boolean;
  totalChecks: number;
  totalHits: number;
  totalDead: number;
}

interface Config {
  netflixLocked: boolean;
}

function loadJson(file: string, fallback: any = {}): any {
  const fp = path.join(DATA_DIR, file);
  try {
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {}
  return fallback;
}

function saveJson(file: string, data: any) {
  const fp = path.join(DATA_DIR, file);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf8");
}

export class Storage {
  private users: Record<string, User> = {};
  private config: Config = { netflixLocked: false };

  constructor() {
    const raw = loadJson("users.json", {});
    for (const [k, v] of Object.entries(raw)) {
      const u = v as any;
      this.users[k] = {
        id: u.id || k,
        telegramId: u.telegramId || k,
        username: u.username || "",
        firstName: u.firstName || "",
        joinedAt: u.joinedAt || new Date().toISOString(),
        role: u.role || (u.isVip ? "elite" : "free"),
        expiry: u.expiry || u.vipExpiresAt,
        tokens: u.tokens ?? u.bonusChecks ?? 0,
        isBanned: u.isBanned || false,
        dailyChecks: u.dailyChecks || 0,
        lastCheckDate: u.lastCheckDate || "",
        referredBy: u.referredBy,
        referralCount: u.referralCount || 0,
        pending: u.pending || false,
        totalChecks: u.totalChecks || 0,
        totalHits: u.totalHits || 0,
        totalDead: u.totalDead || 0,
      };
    }
    const cfg = loadJson("config.json", { netflixLocked: false });
    this.config = { ...this.config, ...cfg };
  }

  private saveUsers() { saveJson("users.json", this.users); }
  private saveConfig() { saveJson("config.json", this.config); }

  getOrCreateUser(telegramId: string, username: string, firstName: string, referredBy?: string): User {
    if (this.users[telegramId]) {
      this.users[telegramId].username = username;
      this.users[telegramId].firstName = firstName;
      this.saveUsers();
      return this.users[telegramId];
    }
    const user: User = {
      id: telegramId,
      telegramId,
      username,
      firstName,
      joinedAt: new Date().toISOString(),
      role: "free",
      tokens: 3,
      isBanned: false,
      dailyChecks: 0,
      lastCheckDate: "",
      referralCount: 0,
      pending: false,
      totalChecks: 0,
      totalHits: 0,
      totalDead: 0,
    };
    if (referredBy && referredBy !== telegramId && this.users[referredBy]) {
      user.referredBy = referredBy;
      this.users[referredBy].referralCount += 1;
      this.users[referredBy].tokens = Math.min((this.users[referredBy].tokens || 0) + 3, 3);
    }
    this.users[telegramId] = user;
    this.saveUsers();
    return user;
  }

  getUser(telegramId: string): User | undefined {
    return this.users[telegramId];
  }

  getAllUsers(): User[] {
    return Object.values(this.users);
  }

  getTodayStr(): string {
    return new Date().toISOString().split("T")[0];
  }

  getDailyChecks(telegramId: string): number {
    const u = this.users[telegramId];
    if (!u) return 0;
    if (u.lastCheckDate !== this.getTodayStr()) return 0;
    return u.dailyChecks;
  }

  addDailyChecks(telegramId: string, count: number) {
    const u = this.users[telegramId];
    if (!u) return;
    const today = this.getTodayStr();
    if (u.lastCheckDate !== today) {
      u.dailyChecks = 0;
      u.lastCheckDate = today;
    }
    u.dailyChecks += count;
    u.totalChecks = (u.totalChecks || 0) + count;
    this.saveUsers();
  }

  addHit(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.totalHits = (u.totalHits || 0) + 1;
    this.saveUsers();
  }

  addDead(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.totalDead = (u.totalDead || 0) + 1;
    this.saveUsers();
  }

  resetStats(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.totalChecks = 0;
    u.totalHits = 0;
    u.totalDead = 0;
    u.dailyChecks = 0;
    this.saveUsers();
  }

  grantElite(telegramId: string, days: number = 30) {
    const u = this.users[telegramId];
    if (!u) return;
    u.role = "elite";
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    u.expiry = exp.toISOString();
    u.pending = false;
    this.saveUsers();
  }

  extendElite(telegramId: string, days: number) {
    const u = this.users[telegramId];
    if (!u) return;
    let base = new Date();
    if (u.role === "elite" && u.expiry && new Date(u.expiry) > base) {
      base = new Date(u.expiry);
    }
    u.role = "elite";
    base.setDate(base.getDate() + days);
    u.expiry = base.toISOString();
    u.pending = false;
    this.saveUsers();
  }

  revokeElite(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.role = "free";
    u.expiry = undefined;
    this.saveUsers();
  }

  isEliteActive(telegramId: string): boolean {
    const u = this.users[telegramId];
    if (!u) return false;
    if (u.role !== "elite") return false;
    if (u.expiry && new Date(u.expiry) < new Date()) {
      u.role = "free";
      u.expiry = undefined;
      this.saveUsers();
      return false;
    }
    return true;
  }

  hasAccess(telegramId: string, ownerId: string): { allowed: boolean; usedToken: boolean } {
    if (telegramId === ownerId) return { allowed: true, usedToken: false };
    if (this.isEliteActive(telegramId)) return { allowed: true, usedToken: false };
    const u = this.users[telegramId];
    if (u && u.tokens > 0) {
      u.tokens -= 1;
      this.saveUsers();
      return { allowed: true, usedToken: true };
    }
    return { allowed: false, usedToken: false };
  }

  checkAccessWithoutConsuming(telegramId: string, ownerId: string): boolean {
    if (telegramId === ownerId) return true;
    if (this.isEliteActive(telegramId)) return true;
    const u = this.users[telegramId];
    if (u && u.tokens > 0) return true;
    return false;
  }

  getTokens(telegramId: string): number {
    return this.users[telegramId]?.tokens || 0;
  }

  setPending(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.pending = true;
    this.saveUsers();
  }

  clearPending(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.pending = false;
    this.saveUsers();
  }

  getPendingUsers(): User[] {
    return Object.values(this.users).filter(u => u.pending);
  }

  banUser(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.isBanned = true;
    this.saveUsers();
  }

  unbanUser(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.isBanned = false;
    this.saveUsers();
  }

  isBanned(telegramId: string): boolean {
    return this.users[telegramId]?.isBanned || false;
  }

  getConfig(): Config { return this.config; }
  setNetflixLocked(v: boolean) { this.config.netflixLocked = v; this.saveConfig(); }

  getStats() {
    const users = Object.values(this.users);
    const today = this.getTodayStr();
    const checksToday = users.reduce((s, u) => s + (u.lastCheckDate === today ? u.dailyChecks : 0), 0);
    const eliteCount = users.filter(u => this.isEliteActive(u.telegramId)).length;
    const bannedCount = users.filter(u => u.isBanned).length;
    const totalReferrals = users.reduce((s, u) => s + (u.referralCount || 0), 0);
    const pendingCount = users.filter(u => u.pending).length;
    return {
      totalUsers: users.length,
      checksToday,
      eliteMembers: eliteCount,
      bannedUsers: bannedCount,
      totalReferrals,
      pendingPayments: pendingCount,
    };
  }
}
