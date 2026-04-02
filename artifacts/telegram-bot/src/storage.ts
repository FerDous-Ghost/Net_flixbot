// @ts-nocheck
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface User {
  id: string;
  telegramId: string;
  chatId?: string;
  username: string;
  points: number;
  gamePoints: number;
  balance: number;
  referralCode: string;
  referredBy?: string;
  isAdmin: boolean;
  isBanned: boolean;
  bannedReason?: string;
  warnings: number;
  tempBanUntil?: number;
  lastSpinDate?: string;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: Date;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  createdAt: Date;
}

export interface StockCode {
  id: string;
  itemId: string;
  code: string;
  claimed: boolean;
  claimedBy?: string;
  claimedAt?: Date;
  isClaimed?: boolean;
  claimedByUserId?: string;
}

export interface RedeemCode {
  id: string;
  code: string;
  points: number;
  maxUses: number;
  currentUses: number;
  creator?: string;
}

export interface AnimatrixCode {
  code: string;
  email: string;
  password: string;
  label: string;
  isUsed: boolean;
  usedBy?: string;
  usedByUsername?: string;
  usedAt?: Date;
}

export interface AnimatrixRedemption {
  code: string;
  userId: string;
  username: string;
  email: string;
  password: string;
  label: string;
  redeemedAt: Date;
}

export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  code: string;
  purchasedAt: Date;
}

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  message: string;
  status: "open" | "closed";
  reply?: string;
  createdAt: Date;
}

export interface AccountRating {
  id: string;
  userId: string;
  username: string;
  itemName: string;
  rating: number;
  source: "store" | "animatrix";
  createdAt: Date;
}

export interface BotConfig {
  rateLimitMs: number;
  enableNotifications: boolean;
  enableTickets: boolean;
  enableGames: boolean;
  maxRateLimitWarnings: number;
  ticketAutoReply: string;
}

export class MemStorage {
  private users: Map<string, User> = new Map();
  private items: Map<string, Item> = new Map();
  private stockCodes: Map<string, StockCode> = new Map();
  private redeemCodes: Map<string, RedeemCode> = new Map();
  private usedCodes: Set<string> = new Set();
  private purchases: Purchase[] = [];
  private admins: Set<string> = new Set();
  private tickets: Map<string, Ticket> = new Map();
  private animatrixCodes: AnimatrixCode[] = [];
  private animatrixRedemptions: AnimatrixRedemption[] = [];
  private accountRatings: AccountRating[] = [];
  private stockCodeCounter = 0;

  private dataDir = path.join(process.cwd(), ".data");
  private usersFile = path.join(this.dataDir, "users.json");
  private itemsFile = path.join(this.dataDir, "items.json");
  private stockFile = path.join(this.dataDir, "stock.json");
  private redeemFile = path.join(this.dataDir, "redeem.json");
  private purchasesFile = path.join(this.dataDir, "purchases.json");
  private adminsFile = path.join(this.dataDir, "admins.json");
  private ticketsFile = path.join(this.dataDir, "tickets.json");
  private animatrixCodesFile = path.join(this.dataDir, "animatrix_codes.json");
  private animatrixRedemptionsFile = path.join(this.dataDir, "animatrix_redemptions.json");
  private accountRatingsFile = path.join(this.dataDir, "account_ratings.json");

  private botConfig: BotConfig = {
    rateLimitMs: 700,
    enableNotifications: true,
    enableTickets: true,
    enableGames: false,
    maxRateLimitWarnings: 3,
    ticketAutoReply: "✅ Your ticket has been submitted. We will reply soon.",
  };

  constructor() {
    this.ensureDataDir();
    this.loadFromFiles();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadFromFiles() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const data = JSON.parse(fs.readFileSync(this.usersFile, "utf-8"));
        this.users = new Map(data);
        for (const [k, u] of this.users) {
          u.createdAt = new Date(u.createdAt);
        }
      }
      if (fs.existsSync(this.itemsFile)) {
        const data = JSON.parse(fs.readFileSync(this.itemsFile, "utf-8"));
        this.items = new Map(data);
        for (const [k, item] of this.items) {
          item.createdAt = new Date(item.createdAt);
        }
      }
      if (fs.existsSync(this.stockFile)) {
        const data = JSON.parse(fs.readFileSync(this.stockFile, "utf-8"));
        this.stockCodes = new Map(data);
      }
      if (fs.existsSync(this.redeemFile)) {
        const data = JSON.parse(fs.readFileSync(this.redeemFile, "utf-8"));
        if (Array.isArray(data)) {
          this.redeemCodes = new Map(data);
        } else if (data.codes) {
          this.redeemCodes = new Map(data.codes);
          if (data.usedCodes) this.usedCodes = new Set(data.usedCodes);
        }
      }
      if (fs.existsSync(this.purchasesFile)) {
        const data = JSON.parse(fs.readFileSync(this.purchasesFile, "utf-8"));
        this.purchases = data.map((p: any) => ({ ...p, purchasedAt: new Date(p.purchasedAt) }));
      }
      if (fs.existsSync(this.adminsFile)) {
        const data = JSON.parse(fs.readFileSync(this.adminsFile, "utf-8"));
        this.admins = new Set(data);
      }
      if (fs.existsSync(this.ticketsFile)) {
        const data = JSON.parse(fs.readFileSync(this.ticketsFile, "utf-8"));
        this.tickets = new Map(data);
        for (const [k, t] of this.tickets) {
          t.createdAt = new Date(t.createdAt);
        }
      }
      if (fs.existsSync(this.animatrixCodesFile)) {
        this.animatrixCodes = JSON.parse(fs.readFileSync(this.animatrixCodesFile, "utf-8"));
      }
      if (fs.existsSync(this.animatrixRedemptionsFile)) {
        this.animatrixRedemptions = JSON.parse(fs.readFileSync(this.animatrixRedemptionsFile, "utf-8"));
      }
      if (fs.existsSync(this.accountRatingsFile)) {
        this.accountRatings = JSON.parse(fs.readFileSync(this.accountRatingsFile, "utf-8"));
        for (const r of this.accountRatings) r.createdAt = new Date(r.createdAt);
      }
    } catch (err: any) {
      console.log("Could not load data files, starting fresh:", err.message);
    }
  }

  private saveToFiles() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(this.usersFile, JSON.stringify(Array.from(this.users.entries())), "utf-8");
      fs.writeFileSync(this.itemsFile, JSON.stringify(Array.from(this.items.entries())), "utf-8");
      fs.writeFileSync(this.stockFile, JSON.stringify(Array.from(this.stockCodes.entries())), "utf-8");
      fs.writeFileSync(
        this.redeemFile,
        JSON.stringify({ codes: Array.from(this.redeemCodes.entries()), usedCodes: Array.from(this.usedCodes) }),
        "utf-8"
      );
      fs.writeFileSync(this.purchasesFile, JSON.stringify(this.purchases), "utf-8");
      fs.writeFileSync(this.adminsFile, JSON.stringify(Array.from(this.admins)), "utf-8");
      fs.writeFileSync(this.ticketsFile, JSON.stringify(Array.from(this.tickets.entries())), "utf-8");
      fs.writeFileSync(this.animatrixCodesFile, JSON.stringify(this.animatrixCodes), "utf-8");
      fs.writeFileSync(this.animatrixRedemptionsFile, JSON.stringify(this.animatrixRedemptions), "utf-8");
      fs.writeFileSync(this.accountRatingsFile, JSON.stringify(this.accountRatings), "utf-8");
    } catch (err: any) {
      console.error("Error saving data files:", err.message);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.telegramId === telegramId);
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.referralCode === code);
  }

  async createUser(userData: any): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      ...userData,
      id,
      points: 0,
      gamePoints: 0,
      balance: 0,
      isAdmin: false,
      isBanned: false,
      warnings: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    this.saveToFiles();
    return newUser;
  }

  async updateUserChatAndTelegramId(userId: string, chatId: string, telegramId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.chatId = chatId;
      user.telegramId = telegramId;
      this.saveToFiles();
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersSince(timestamp: Date): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => new Date(u.createdAt) >= timestamp);
  }

  async getTotalUsers(): Promise<number> {
    return this.users.size;
  }

  async banUser(userId: string, reason: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isBanned = true;
      user.bannedReason = reason;
      user.tempBanUntil = undefined;
      this.saveToFiles();
    }
  }

  async unbanUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isBanned = false;
      user.bannedReason = undefined;
      user.tempBanUntil = undefined;
      this.saveToFiles();
    }
  }

  async addPoints(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.points = (user.points || 0) + amount;
      this.saveToFiles();
    }
  }

  async deductPoints(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.points = Math.max(0, (user.points || 0) - amount);
      this.saveToFiles();
    }
  }

  async addGamePoints(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.gamePoints = (user.gamePoints || 0) + amount;
      this.saveToFiles();
    }
  }

  async deductGamePoints(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.gamePoints = Math.max(0, (user.gamePoints || 0) - amount);
      this.saveToFiles();
    }
  }

  async getTopUsersByPoints(limit = 5): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limit);
  }

  async createItem(item: Omit<Item, "id" | "createdAt">): Promise<Item> {
    const newItem: Item = { ...item, id: randomUUID(), createdAt: new Date() };
    this.items.set(newItem.id, newItem);
    this.saveToFiles();
    return newItem;
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      Object.assign(item, updates);
      this.saveToFiles();
    }
  }

  async deleteItem(id: string): Promise<void> {
    this.items.delete(id);
    this.saveToFiles();
  }

  async addStockCodes(codes: { itemId: string; code: string }[]): Promise<void> {
    for (const codeObj of codes) {
      this.stockCodeCounter++;
      const stockCode: StockCode = {
        id: randomUUID(),
        itemId: codeObj.itemId,
        code: codeObj.code,
        claimed: false,
        isClaimed: false,
      };
      this.stockCodes.set(stockCode.id, stockCode);
    }
    this.saveToFiles();
  }

  async getAvailableCode(itemId: string): Promise<StockCode | undefined> {
    return Array.from(this.stockCodes.values()).find(
      (sc) => sc.itemId === itemId && !sc.claimed && !sc.isClaimed
    );
  }

  async getAvailableCodeCount(itemId: string): Promise<number> {
    return Array.from(this.stockCodes.values()).filter(
      (sc) => sc.itemId === itemId && !sc.claimed && !sc.isClaimed
    ).length;
  }

  async claimCode(codeId: string, userId: string): Promise<StockCode> {
    const code = this.stockCodes.get(codeId);
    if (!code) throw new Error("Code not found");
    code.claimed = true;
    code.isClaimed = true;
    code.claimedBy = userId;
    code.claimedByUserId = userId;
    code.claimedAt = new Date();
    this.saveToFiles();
    return code;
  }

  async getAllStockCodes(): Promise<StockCode[]> {
    return Array.from(this.stockCodes.values());
  }

  async deleteStockCodes(itemId: string): Promise<number> {
    let count = 0;
    for (const [key, code] of Array.from(this.stockCodes.entries())) {
      if (code.itemId === itemId) {
        this.stockCodes.delete(key);
        count++;
      }
    }
    this.saveToFiles();
    return count;
  }

  async deleteStockCodesAvailable(itemId: string): Promise<number> {
    let count = 0;
    for (const [key, code] of Array.from(this.stockCodes.entries())) {
      if (code.itemId === itemId && !code.claimed && !code.isClaimed) {
        this.stockCodes.delete(key);
        count++;
      }
    }
    this.saveToFiles();
    return count;
  }

  async createRedeemCode(code: string, points: number, maxUses: number, creator: string): Promise<RedeemCode> {
    const id = randomUUID();
    const newCode: RedeemCode = { id, code, points, maxUses, currentUses: 0, creator };
    this.redeemCodes.set(id, newCode);
    this.saveToFiles();
    return newCode;
  }

  async getRedeemCode(code: string): Promise<RedeemCode | undefined> {
    return Array.from(this.redeemCodes.values()).find((c) => c.code === code);
  }

  async getAllRedeemCodes(): Promise<RedeemCode[]> {
    return Array.from(this.redeemCodes.values());
  }

  async hasUsedRedeemCode(codeId: string, userId: string): Promise<boolean> {
    return this.usedCodes.has(`${codeId}_${userId}`);
  }

  async useRedeemCode(codeId: string, userId: string): Promise<void> {
    this.usedCodes.add(`${codeId}_${userId}`);
    const code = this.redeemCodes.get(codeId);
    if (code) code.currentUses = (code.currentUses || 0) + 1;
    this.saveToFiles();
  }

  async deleteRedeemCode(id: string): Promise<void> {
    this.redeemCodes.delete(id);
    this.saveToFiles();
  }

  async createPurchase(userId: string, itemId: string, code: string): Promise<Purchase> {
    const purchase: Purchase = {
      id: randomUUID(),
      userId,
      itemId,
      code,
      purchasedAt: new Date(),
    };
    this.purchases.push(purchase);
    this.saveToFiles();
    return purchase;
  }

  async getPurchasesSince(timestamp: Date): Promise<Purchase[]> {
    return this.purchases.filter((p) => new Date(p.purchasedAt) >= timestamp);
  }

  async getTotalPurchases(): Promise<number> {
    return this.purchases.length;
  }

  async addAdmin(telegramId: string, username?: string): Promise<void> {
    this.admins.add(telegramId);
    this.saveToFiles();
  }

  async removeAdmin(telegramId: string): Promise<void> {
    this.admins.delete(telegramId);
    this.saveToFiles();
  }

  async isAdmin(telegramId: string): Promise<boolean> {
    return this.admins.has(telegramId);
  }

  async getAdmins(): Promise<string[]> {
    return Array.from(this.admins.values());
  }

  async getReferredUsers(userId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.referredBy === userId);
  }

  async getReferralStats(): Promise<{ user: User; referralCount: number }[]> {
    const refCounts = new Map<string, number>();
    for (const u of this.users.values()) {
      if (u.referredBy) {
        refCounts.set(u.referredBy, (refCounts.get(u.referredBy) || 0) + 1);
      }
    }
    const result: { user: User; referralCount: number }[] = [];
    for (const [userId, count] of refCounts.entries()) {
      const user = this.users.get(userId);
      if (user) result.push({ user, referralCount: count });
    }
    return result.sort((a, b) => b.referralCount - a.referralCount).slice(0, 10);
  }

  async createTicket(userId: string, username: string, message: string): Promise<Ticket> {
    const id = randomUUID();
    const ticket: Ticket = { id, userId, username, message, status: "open", createdAt: new Date() };
    this.tickets.set(id, ticket);
    this.saveToFiles();
    return ticket;
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getOpenTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter((t) => t.status === "open");
  }

  async closeTicket(id: string, reply?: string): Promise<void> {
    const ticket = this.tickets.get(id);
    if (ticket) {
      ticket.status = "closed";
      if (reply) ticket.reply = reply;
      this.saveToFiles();
    }
  }

  async getUserTickets(userId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter((t) => t.userId === userId);
  }

  async getConfig(): Promise<BotConfig> {
    return { ...this.botConfig };
  }

  async updateConfig(updates: Partial<BotConfig>): Promise<void> {
    Object.assign(this.botConfig, updates);
  }

  async warnUser(userId: string): Promise<number> {
    const user = this.users.get(userId);
    if (user) {
      user.warnings = (user.warnings || 0) + 1;
      this.saveToFiles();
      return user.warnings;
    }
    return 0;
  }

  async setWarnings(userId: string, count: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.warnings = count;
      this.saveToFiles();
    }
  }

  async tempBanUser(userId: string, until: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.tempBanUntil = until;
      user.isBanned = true;
      user.bannedReason = `Temp banned until ${new Date(until).toLocaleString()}`;
      this.saveToFiles();
    }
  }

  async isTempBanned(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.tempBanUntil) return false;
    if (Date.now() >= user.tempBanUntil) {
      user.isBanned = false;
      user.tempBanUntil = undefined;
      user.bannedReason = undefined;
      this.saveToFiles();
      return false;
    }
    return true;
  }

  async setLastSpin(userId: string, date: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastSpinDate = date;
      this.saveToFiles();
    }
  }

  async getLastSpin(userId: string): Promise<string | undefined> {
    const user = this.users.get(userId);
    return user?.lastSpinDate;
  }

  async addAllUsersPoints(amount: number): Promise<number> {
    let count = 0;
    for (const user of this.users.values()) {
      if (!user.isBanned) {
        user.points = (user.points || 0) + amount;
        count++;
      }
    }
    this.saveToFiles();
    return count;
  }

  async resetAllPoints(): Promise<number> {
    let count = 0;
    for (const user of this.users.values()) {
      user.points = 0;
      user.gamePoints = 0;
      count++;
    }
    this.saveToFiles();
    return count;
  }

  async incrementGamesPlayed(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.gamesPlayed = (user.gamesPlayed || 0) + 1;
      this.saveToFiles();
    }
  }

  async incrementGamesWon(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.gamesWon = (user.gamesWon || 0) + 1;
      this.saveToFiles();
    }
  }

  async transferPoints(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);
    if (fromUser && toUser) {
      fromUser.points = (fromUser.points || 0) - amount;
      toUser.points = (toUser.points || 0) + amount;
      this.saveToFiles();
    }
  }

  async createAnimatrixCode(data: { code: string; email: string; password: string; label: string }): Promise<AnimatrixCode> {
    const entry: AnimatrixCode = { ...data, isUsed: false };
    this.animatrixCodes.push(entry);
    this.saveToFiles();
    return entry;
  }

  async getAnimatrixCode(code: string): Promise<AnimatrixCode | undefined> {
    return this.animatrixCodes.find(c => c.code === code);
  }

  async getAllAnimatrixCodes(): Promise<AnimatrixCode[]> {
    return [...this.animatrixCodes];
  }

  async markAnimatrixCodeUsed(code: string, userId: string, username: string): Promise<void> {
    const entry = this.animatrixCodes.find(c => c.code === code);
    if (entry) {
      entry.isUsed = true;
      entry.usedBy = userId;
      entry.usedByUsername = username;
      entry.usedAt = new Date();
      this.saveToFiles();
    }
  }

  async deleteAnimatrixCode(code: string): Promise<void> {
    this.animatrixCodes = this.animatrixCodes.filter(c => c.code !== code);
    this.saveToFiles();
  }

  async createAnimatrixRedemption(data: Omit<AnimatrixRedemption, "redeemedAt">): Promise<AnimatrixRedemption> {
    const redemption: AnimatrixRedemption = { ...data, redeemedAt: new Date() };
    this.animatrixRedemptions.push(redemption);
    this.saveToFiles();
    return redemption;
  }

  async getAnimatrixRedemptions(): Promise<AnimatrixRedemption[]> {
    return [...this.animatrixRedemptions];
  }

  async createAccountRating(data: Omit<AccountRating, "id" | "createdAt">): Promise<AccountRating> {
    const rating: AccountRating = { ...data, id: randomUUID(), createdAt: new Date() };
    this.accountRatings.push(rating);
    this.saveToFiles();
    return rating;
  }

  async getAccountRatings(): Promise<AccountRating[]> {
    return [...this.accountRatings];
  }

  async getAccountRatingsByUser(userId: string): Promise<AccountRating[]> {
    return this.accountRatings.filter(r => r.userId === userId);
  }

  async getAverageRating(): Promise<{ avg: number; total: number }> {
    if (this.accountRatings.length === 0) return { avg: 0, total: 0 };
    const sum = this.accountRatings.reduce((s, r) => s + r.rating, 0);
    return { avg: sum / this.accountRatings.length, total: this.accountRatings.length };
  }
}

export const storage = new MemStorage();
