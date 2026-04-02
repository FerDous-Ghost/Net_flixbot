import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", ".data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

interface User {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  joinedAt: string;
  isVip: boolean;
  vipExpiresAt?: string;
  isBanned: boolean;
  dailyChecks: number;
  lastCheckDate: string;
  referredBy?: string;
  referralCount: number;
  bonusChecks: number;
}

interface Config {
  netflixLocked: boolean;
  primeLocked: boolean;
  referralBonus: number;
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
  private config: Config = { netflixLocked: false, primeLocked: false, referralBonus: 50 };

  constructor() {
    const raw = loadJson("users.json", {});
    for (const [k, v] of Object.entries(raw)) {
      const u = v as any;
      this.users[k] = {
        ...u,
        referralCount: u.referralCount || 0,
        bonusChecks: u.bonusChecks || 0,
      };
    }
    const cfg = loadJson("config.json", { netflixLocked: false, primeLocked: false, referralBonus: 50 });
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
      isVip: false,
      isBanned: false,
      dailyChecks: 0,
      lastCheckDate: "",
      referralCount: 0,
      bonusChecks: 0,
    };
    if (referredBy && referredBy !== telegramId && this.users[referredBy]) {
      user.referredBy = referredBy;
      this.users[referredBy].referralCount += 1;
      this.users[referredBy].bonusChecks += this.config.referralBonus;
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

  getBonusChecks(telegramId: string): number {
    return this.users[telegramId]?.bonusChecks || 0;
  }

  getRemainingChecks(telegramId: string, dailyLimit: number): number {
    const u = this.users[telegramId];
    if (!u) return 0;
    const today = this.getTodayStr();
    const used = u.lastCheckDate === today ? u.dailyChecks : 0;
    return Math.max(0, dailyLimit + (u.bonusChecks || 0) - used);
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
    this.saveUsers();
  }

  useBonusChecks(telegramId: string, count: number) {
    const u = this.users[telegramId];
    if (!u) return;
    u.bonusChecks = Math.max(0, (u.bonusChecks || 0) - count);
    this.saveUsers();
  }

  isVip(telegramId: string): boolean {
    const u = this.users[telegramId];
    if (!u) return false;
    if (!u.isVip) return false;
    if (u.vipExpiresAt) {
      if (new Date(u.vipExpiresAt) < new Date()) {
        u.isVip = false;
        u.vipExpiresAt = undefined;
        this.saveUsers();
        return false;
      }
    }
    return true;
  }

  setVip(telegramId: string, days?: number) {
    const u = this.users[telegramId];
    if (!u) return;
    u.isVip = true;
    if (days) {
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      u.vipExpiresAt = exp.toISOString();
    } else {
      u.vipExpiresAt = undefined;
    }
    this.saveUsers();
  }

  removeVip(telegramId: string) {
    const u = this.users[telegramId];
    if (!u) return;
    u.isVip = false;
    u.vipExpiresAt = undefined;
    this.saveUsers();
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

  getConfig(): Config { return this.config; }

  setNetflixLocked(v: boolean) { this.config.netflixLocked = v; this.saveConfig(); }
  setPrimeLocked(v: boolean) { this.config.primeLocked = v; this.saveConfig(); }
  setReferralBonus(v: number) { this.config.referralBonus = v; this.saveConfig(); }

  getStats() {
    const users = Object.values(this.users);
    const today = this.getTodayStr();
    const checksToday = users.reduce((s, u) => s + (u.lastCheckDate === today ? u.dailyChecks : 0), 0);
    const vipCount = users.filter(u => this.isVip(u.telegramId)).length;
    const bannedCount = users.filter(u => u.isBanned).length;
    const totalReferrals = users.reduce((s, u) => s + (u.referralCount || 0), 0);
    return {
      totalUsers: users.length,
      checksToday,
      activeVips: vipCount,
      bannedUsers: bannedCount,
      totalReferrals,
    };
  }
}
