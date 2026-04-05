import { db } from "./db";
import { 
  users, trades, deposits, withdrawals, auditLogs, depositWallets, emailOtps, supportTickets, supportMessages, loans, conversions, securityLogs, portfolioHistory,
  type User, type InsertUser, type Trade, type Deposit, type Withdrawal, type AuditLog, type DepositWallet, type InsertDepositWallet, type EmailOtp, type SupportTicket, type SupportMessage, type Loan, type Conversion, type SecurityLog, type PortfolioSnapshot
} from "@shared/schema";
import { eq, desc, and, gt, gte, sql, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getUserByWalletAddress(address: string): Promise<User | undefined>;
  getUsersByAssignedAdmin(adminId: number): Promise<User[]>;
  createUser(user: InsertUser & { password: string; registerIp?: string }): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Trades
  createTrade(trade: any): Promise<Trade>;
  getTradesByUserId(userId: number): Promise<Trade[]>;
  getActiveTrades(): Promise<Trade[]>;
  getAllTrades(): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  updateTrade(id: number, updates: Partial<Trade>): Promise<Trade>;

  // Deposits
  createDeposit(deposit: any): Promise<Deposit>;
  getDepositsByUserId(userId: number): Promise<Deposit[]>;
  getAllDeposits(): Promise<Deposit[]>;
  updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit>;
  getDeposit(id: number): Promise<Deposit | undefined>;

  // Withdrawals
  createWithdrawal(withdrawal: any): Promise<Withdrawal>;
  getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]>;
  getAllWithdrawals(): Promise<Withdrawal[]>;
  updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal>;
  getWithdrawal(id: number): Promise<Withdrawal | undefined>;

  // Deposit Wallets
  createDepositWallet(wallet: InsertDepositWallet): Promise<DepositWallet>;
  getAllDepositWallets(): Promise<DepositWallet[]>;
  getDepositWallet(id: number): Promise<DepositWallet | undefined>;
  getActiveWalletByNetwork(network: string): Promise<DepositWallet | undefined>;
  updateDepositWallet(id: number, updates: Partial<DepositWallet>): Promise<DepositWallet>;
  deleteDepositWallet(id: number): Promise<void>;
  deactivateWalletsByNetwork(network: string): Promise<void>;

  // Email OTPs
  createEmailOtp(data: { email: string; otp: string; userData: any; expiresAt: Date }): Promise<EmailOtp>;
  getEmailOtpByEmail(email: string): Promise<EmailOtp | undefined>;
  deleteEmailOtpByEmail(email: string): Promise<void>;
  updateEmailOtp(id: number, updates: Partial<EmailOtp>): Promise<EmailOtp>;

  // Support Tickets
  createSupportTicket(ticket: any): Promise<SupportTicket>;
  getSupportTicketsByUserId(userId: number): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<SupportTicket>;
  getOrCreateTicketForUser(userId: number, username: string, email: string): Promise<SupportTicket>;

  // Support Messages
  createSupportMessage(msg: { ticketId: number; senderType: "user" | "admin"; senderId: number; message: string }): Promise<SupportMessage>;
  getSupportMessagesByTicketId(ticketId: number): Promise<SupportMessage[]>;

  // Loans
  createLoan(loan: any): Promise<Loan>;
  getLoansByUserId(userId: number): Promise<Loan[]>;
  getAllLoans(): Promise<Loan[]>;
  getLoan(id: number): Promise<Loan | undefined>;
  updateLoan(id: number, updates: Partial<Loan>): Promise<Loan>;

  // Conversions
  createConversion(conv: any): Promise<Conversion>;
  getConversionsByUserId(userId: number): Promise<Conversion[]>;

  // Audit
  createAuditLog(log: any): Promise<AuditLog>;
  // Security
  createSecurityLog(log: { userId: number; ip?: string; country?: string; city?: string; region?: string; timezone?: string; isp?: string; action: "register" | "login"; isSuspicious: boolean }): Promise<SecurityLog>;
  getLastSecurityLog(userId: number, action: "register" | "login"): Promise<SecurityLog | undefined>;
  getSecurityLogs(userId?: number, limit?: number): Promise<SecurityLog[]>;
  // Portfolio History
  createPortfolioSnapshot(userId: number, balance: number): Promise<PortfolioSnapshot>;
  getPortfolioHistory(userId: number, limit?: number, since?: Date): Promise<PortfolioSnapshot[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`lower(${users.username}) = lower(${username})`
    );
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, address.toLowerCase()));
    return user;
  }

  async getUsersByAssignedAdmin(adminId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.assignedAdmin, adminId)).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser & { password: string; registerIp?: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Trades
  async createTrade(trade: any): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async getTradesByUserId(userId: number): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.openTime));
  }

  async getActiveTrades(): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.status, "OPEN"));
  }

  async getAllTrades(): Promise<Trade[]> {
    return db.select().from(trades).orderBy(desc(trades.openTime));
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade;
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade> {
    const [trade] = await db.update(trades).set(updates).where(eq(trades.id, id)).returning();
    return trade;
  }

  // Deposits
  async createDeposit(deposit: any): Promise<Deposit> {
    const [newDeposit] = await db.insert(deposits).values(deposit).returning();
    return newDeposit;
  }

  async getDepositsByUserId(userId: number): Promise<Deposit[]> {
    return db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt));
  }

  async getAllDeposits(): Promise<Deposit[]> {
    return db.select().from(deposits).orderBy(desc(deposits.createdAt));
  }

  async updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit> {
    const [deposit] = await db.update(deposits).set(updates).where(eq(deposits.id, id)).returning();
    return deposit;
  }

  async getDeposit(id: number): Promise<Deposit | undefined> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
    return deposit;
  }

  // Withdrawals
  async createWithdrawal(withdrawal: any): Promise<Withdrawal> {
    const [newWithdrawal] = await db.insert(withdrawals).values(withdrawal).returning();
    return newWithdrawal;
  }

  async getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal> {
    const [withdrawal] = await db.update(withdrawals).set(updates).where(eq(withdrawals.id, id)).returning();
    return withdrawal;
  }

  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
    return withdrawal;
  }

  // Deposit Wallets
  async createDepositWallet(wallet: InsertDepositWallet): Promise<DepositWallet> {
    const [newWallet] = await db.insert(depositWallets).values(wallet).returning();
    return newWallet;
  }

  async getAllDepositWallets(): Promise<DepositWallet[]> {
    return db.select().from(depositWallets).orderBy(desc(depositWallets.updatedAt));
  }

  async getDepositWallet(id: number): Promise<DepositWallet | undefined> {
    const [wallet] = await db.select().from(depositWallets).where(eq(depositWallets.id, id));
    return wallet;
  }

  async getActiveWalletByNetwork(network: string): Promise<DepositWallet | undefined> {
    const [wallet] = await db.select().from(depositWallets).where(
      and(eq(depositWallets.network, network as any), eq(depositWallets.isActive, true))
    );
    return wallet;
  }

  async updateDepositWallet(id: number, updates: Partial<DepositWallet>): Promise<DepositWallet> {
    const [wallet] = await db.update(depositWallets).set({ ...updates, updatedAt: new Date() }).where(eq(depositWallets.id, id)).returning();
    return wallet;
  }

  async deleteDepositWallet(id: number): Promise<void> {
    await db.delete(depositWallets).where(eq(depositWallets.id, id));
  }

  async deactivateWalletsByNetwork(network: string): Promise<void> {
    await db.update(depositWallets).set({ isActive: false, updatedAt: new Date() }).where(eq(depositWallets.network, network as any));
  }

  // Email OTPs
  async createEmailOtp(data: { email: string; otp: string; userData: any; expiresAt: Date }): Promise<EmailOtp> {
    await db.delete(emailOtps).where(eq(emailOtps.email, data.email));
    const [otp] = await db.insert(emailOtps).values(data).returning();
    return otp;
  }

  async getEmailOtpByEmail(email: string): Promise<EmailOtp | undefined> {
    const [otp] = await db.select().from(emailOtps).where(eq(emailOtps.email, email));
    return otp;
  }

  async deleteEmailOtpByEmail(email: string): Promise<void> {
    await db.delete(emailOtps).where(eq(emailOtps.email, email));
  }

  async updateEmailOtp(id: number, updates: Partial<EmailOtp>): Promise<EmailOtp> {
    const [otp] = await db.update(emailOtps).set(updates).where(eq(emailOtps.id, id)).returning();
    return otp;
  }

  // Support Tickets
  async createSupportTicket(ticket: any): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets).values(ticket).returning();
    return newTicket;
  }

  async getSupportTicketsByUserId(userId: number): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const [ticket] = await db.update(supportTickets).set(updates).where(eq(supportTickets.id, id)).returning();
    return ticket;
  }

  async getOrCreateTicketForUser(userId: number, username: string, email: string): Promise<SupportTicket> {
    // Find any non-closed ticket — "open" OR "replied" both count as the active thread
    const existing = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.userId, userId), ne(supportTickets.status, "closed")))
      .orderBy(desc(supportTickets.createdAt))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [newTicket] = await db.insert(supportTickets).values({
      userId,
      name: username,
      email,
      subject: "Live Chat Support",
      message: "Chat session started",
      status: "open",
      unreadByAdmin: 0,
      unreadByUser: 0,
    }).returning();
    return newTicket;
  }

  async createSupportMessage(msg: { ticketId: number; senderType: "user" | "admin"; senderId: number; message: string; attachment?: string | null }): Promise<SupportMessage> {
    const [newMsg] = await db.insert(supportMessages).values(msg).returning();
    return newMsg;
  }

  async getSupportMessagesByTicketId(ticketId: number): Promise<SupportMessage[]> {
    return db.select().from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);
  }

  // Loans
  async createLoan(loan: any): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values(loan).returning();
    return newLoan;
  }

  async getLoansByUserId(userId: number): Promise<Loan[]> {
    return db.select().from(loans).where(eq(loans.userId, userId)).orderBy(desc(loans.createdAt));
  }

  async getAllLoans(): Promise<Loan[]> {
    return db.select().from(loans).orderBy(desc(loans.createdAt));
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, id));
    return loan;
  }

  async updateLoan(id: number, updates: Partial<Loan>): Promise<Loan> {
    const [loan] = await db.update(loans).set(updates).where(eq(loans.id, id)).returning();
    return loan;
  }

  // Conversions
  async createConversion(conv: any): Promise<Conversion> {
    const [entry] = await db.insert(conversions).values(conv).returning();
    return entry;
  }

  async getConversionsByUserId(userId: number): Promise<Conversion[]> {
    return db.select().from(conversions).where(eq(conversions.userId, userId)).orderBy(desc(conversions.createdAt));
  }

  // Audit
  async createAuditLog(log: any): Promise<AuditLog> {
    const [entry] = await db.insert(auditLogs).values(log).returning();
    return entry;
  }

  // Security
  async createSecurityLog(log: { userId: number; ip?: string; country?: string; city?: string; region?: string; timezone?: string; isp?: string; action: "register" | "login"; isSuspicious: boolean }): Promise<SecurityLog> {
    const [entry] = await db.insert(securityLogs).values(log).returning();
    return entry;
  }

  async getLastSecurityLog(userId: number, action: "register" | "login"): Promise<SecurityLog | undefined> {
    const [entry] = await db
      .select()
      .from(securityLogs)
      .where(and(eq(securityLogs.userId, userId), eq(securityLogs.action, action)))
      .orderBy(desc(securityLogs.createdAt))
      .limit(1);
    return entry;
  }

  async getSecurityLogs(userId?: number, limit = 200): Promise<SecurityLog[]> {
    if (userId) {
      return db.select().from(securityLogs).where(eq(securityLogs.userId, userId)).orderBy(desc(securityLogs.createdAt)).limit(limit);
    }
    return db.select().from(securityLogs).orderBy(desc(securityLogs.createdAt)).limit(limit);
  }

  async createPortfolioSnapshot(userId: number, balance: number): Promise<PortfolioSnapshot> {
    const [entry] = await db.insert(portfolioHistory).values({
      userId,
      balance: balance.toFixed(2),
    }).returning();
    return entry;
  }

  async getPortfolioHistory(userId: number, limit = 200, since?: Date): Promise<PortfolioSnapshot[]> {
    const conditions = since
      ? and(eq(portfolioHistory.userId, userId), gte(portfolioHistory.createdAt, since))
      : eq(portfolioHistory.userId, userId);
    return db.select().from(portfolioHistory)
      .where(conditions)
      .orderBy(desc(portfolioHistory.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
