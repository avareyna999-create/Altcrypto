import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
export const verificationStatusEnum = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export const tradeDirectionEnum = ["BUY", "SELL"] as const;
export const tradeStatusEnum = ["OPEN", "CLOSED"] as const;
export const tradeResultEnum = ["WIN", "LOSS"] as const;
export const tradeControlModeEnum = ["NORMAL", "FORCE_WIN", "FORCE_LOSE"] as const;
export const userTradeControlEnum = ["auto", "force_win", "force_lose"] as const;
export const transactionStatusEnum = ["PENDING", "APPROVED", "REJECTED"] as const;
export const accountStatusEnum = ["active", "frozen", "blocked"] as const;

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  usdtBalance: decimal("usdt_balance", { precision: 20, scale: 2 }).default("0").notNull(),
  btcBalance: decimal("btc_balance", { precision: 20, scale: 8 }).default("0").notNull(),
  ethBalance: decimal("eth_balance", { precision: 20, scale: 8 }).default("0").notNull(),
  bnbBalance: decimal("bnb_balance", { precision: 20, scale: 8 }).default("0").notNull(),
  usdcBalance: decimal("usdc_balance", { precision: 20, scale: 2 }).default("0").notNull(),
  role: text("role", { enum: roleEnum }).default("USER").notNull(),
  verificationStatus: text("verification_status", { enum: verificationStatusEnum }).default("UNVERIFIED").notNull(),
  kycData: jsonb("kyc_data").$type<{
    fullName?: string;
    dob?: string;
    nationality?: string;
    address?: string;
    phone?: string;
    idNumber?: string;
    idImageUrl?: string;
    selfieImageUrl?: string;
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>(),
  accountStatus: text("account_status", { enum: accountStatusEnum }).default("active").notNull(),
  tradeOutcomeControl: text("trade_outcome_control", { enum: userTradeControlEnum }).default("auto").notNull(),
  phoneNumber: text("phone_number"),
  withdrawalPin: text("withdrawal_pin"),
  walletAccessPin: text("wallet_access_pin"),
  registerIp: text("register_ip"),
  lastLoginIp: text("last_login_ip"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  assignedAdmin: integer("assigned_admin"),
  resetToken: text("reset_token"),
  resetTokenExpire: timestamp("reset_token_expire"),
  walletAddress: text("wallet_address").unique(),
  loginMethod: text("login_method").default("email"),
  lastOnlineAt: timestamp("last_online_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trades Table
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(), // e.g., "BTCUSDT"
  direction: text("direction", { enum: tradeDirectionEnum }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }),
  exitPrice: decimal("exit_price", { precision: 20, scale: 8 }),
  duration: integer("duration").notNull(), // in seconds
  profitPercent: integer("profit_percent").notNull(),
  status: text("status", { enum: tradeStatusEnum }).default("OPEN").notNull(),
  result: text("result", { enum: tradeResultEnum }),
  controlMode: text("control_mode", { enum: tradeControlModeEnum }).default("NORMAL").notNull(),
  openTime: timestamp("open_time").defaultNow(),
  expiryTime: timestamp("expiry_time").notNull(),
  closeTime: timestamp("close_time"),
});

// Deposits Table
export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  transferMethod: text("transfer_method").notNull(),
  proofImage: text("proof_image"),
  status: text("status", { enum: transactionStatusEnum }).default("PENDING").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawals Table
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  walletAddress: text("wallet_address").notNull(),
  network: text("network").notNull(),
  status: text("status", { enum: transactionStatusEnum }).default("PENDING").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deposit Wallets Table
export const networkEnum = ["TRC20", "ERC20", "BEP20", "BTC", "ETH", "BNB", "USDC", "SOL"] as const;

export const depositWallets = pgTable("deposit_wallets", {
  id: serial("id").primaryKey(),
  network: text("network", { enum: networkEnum }).notNull(),
  address: text("address").notNull(),
  qrCodeImage: text("qr_code_image"),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email OTPs Table
export const emailOtps = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  userData: jsonb("user_data").notNull(),
  resendCount: integer("resend_count").default(1).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets Table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "replied", "closed"] }).default("open").notNull(),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  unreadByAdmin: integer("unread_by_admin").default(0).notNull(),
  unreadByUser: integer("unread_by_user").default(0).notNull(),
});

// Support Messages Table (for real-time chat)
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderType: text("sender_type", { enum: ["user", "admin"] }).notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  attachment: text("attachment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });

// Loans Table
export const loanStatusEnum = ["PENDING", "APPROVED", "REJECTED"] as const;
export const loanTermEnum = ["7", "14", "30", "60", "90"] as const;

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  term: text("term", { enum: loanTermEnum }).notNull(),
  dailyInterest: decimal("daily_interest", { precision: 10, scale: 4 }).default("0.05").notNull(),
  totalInterest: decimal("total_interest", { precision: 20, scale: 2 }).default("0").notNull(),
  serviceFee: decimal("service_fee", { precision: 20, scale: 2 }).default("0").notNull(),
  totalRepayment: decimal("total_repayment", { precision: 20, scale: 2 }).default("0").notNull(),
  status: text("status", { enum: loanStatusEnum }).default("PENDING").notNull(),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversions Table
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fromAsset: text("from_asset").notNull(),
  toAsset: text("to_asset").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  received: decimal("received", { precision: 20, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security Logs Table
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ip: text("ip"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  timezone: text("timezone"),
  isp: text("isp"),
  action: text("action", { enum: ["register", "login"] }).notNull(),
  isSuspicious: boolean("is_suspicious").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Portfolio History Table
export const portfolioHistory = pgTable("portfolio_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  balance: decimal("balance", { precision: 20, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PortfolioSnapshot = typeof portfolioHistory.$inferSelect;

// Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  actionType: text("action_type").notNull(),
  targetUserId: integer("target_user_id"),
  targetTradeId: integer("target_trade_id"),
  description: text("description").notNull(),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  lastLoginIp: true, 
  resetToken: true, 
  resetTokenExpire: true,
  usdtBalance: true,
  role: true,
  verificationStatus: true,
  kycData: true
});

export const insertTradeSchema = createInsertSchema(trades).omit({ 
  id: true, 
  status: true, 
  result: true, 
  controlMode: true, 
  openTime: true, 
  closeTime: true,
  entryPrice: true,
  exitPrice: true,
  profitPercent: true,
  expiryTime: true,
  userId: true,
}).extend({
  amount: z.number().min(1),
  duration: z.number().int().refine(
    (d) => [30, 60, 90, 120, 180, 240, 300].includes(d),
    { message: "Invalid duration" }
  )
});

export const insertDepositSchema = createInsertSchema(deposits).omit({ 
  id: true, 
  status: true, 
  reviewedBy: true, 
  reviewedAt: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({ 
  id: true, 
  userId: true,
  status: true, 
  reviewedBy: true, 
  reviewedAt: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
});

export const insertDepositWalletSchema = createInsertSchema(depositWallets).omit({
  id: true,
  updatedAt: true,
}).extend({
  address: z.string().min(10, "Address must be at least 10 characters"),
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  userId: true,
  dailyInterest: true,
  totalInterest: true,
  serviceFee: true,
  totalRepayment: true,
  status: true,
  adminNote: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
}).extend({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

export const TRADING_CONFIG = [
  { duration: 30,  label: "30s",  minAmount: 100,     profitPercent: 10 },
  { duration: 60,  label: "60s",  minAmount: 1000,    profitPercent: 15 },
  { duration: 90,  label: "90s",  minAmount: 5000,    profitPercent: 20 },
  { duration: 120, label: "120s", minAmount: 20000,   profitPercent: 25 },
  { duration: 180, label: "180s", minAmount: 50000,   profitPercent: 30 },
  { duration: 240, label: "240s", minAmount: 100000,  profitPercent: 40 },
  { duration: 300, label: "300s", minAmount: 150000,  profitPercent: 50 },
] as const;

export const VALID_DURATIONS = TRADING_CONFIG.map(c => c.duration);

export const TRADING_PAIRS = [
  // Large caps
  { symbol: "BTCUSDT",   baseAsset: "BTC",   quoteAsset: "USDT", name: "Bitcoin",            basePrice: 44000 },
  { symbol: "ETHUSDT",   baseAsset: "ETH",   quoteAsset: "USDT", name: "Ethereum",            basePrice: 2400 },
  { symbol: "BNBUSDT",   baseAsset: "BNB",   quoteAsset: "USDT", name: "BNB",                 basePrice: 310 },
  { symbol: "SOLUSDT",   baseAsset: "SOL",   quoteAsset: "USDT", name: "Solana",              basePrice: 100 },
  { symbol: "XRPUSDT",   baseAsset: "XRP",   quoteAsset: "USDT", name: "XRP",                 basePrice: 0.62 },
  { symbol: "ADAUSDT",   baseAsset: "ADA",   quoteAsset: "USDT", name: "Cardano",             basePrice: 0.45 },
  { symbol: "DOGEUSDT",  baseAsset: "DOGE",  quoteAsset: "USDT", name: "Dogecoin",            basePrice: 0.08 },
  { symbol: "TRXUSDT",   baseAsset: "TRX",   quoteAsset: "USDT", name: "TRON",                basePrice: 0.11 },
  { symbol: "SHIBUSDT",  baseAsset: "SHIB",  quoteAsset: "USDT", name: "Shiba Inu",           basePrice: 0.000009 },
  { symbol: "LTCUSDT",   baseAsset: "LTC",   quoteAsset: "USDT", name: "Litecoin",            basePrice: 70 },
  // Layer 1s
  { symbol: "AVAXUSDT",  baseAsset: "AVAX",  quoteAsset: "USDT", name: "Avalanche",           basePrice: 35 },
  { symbol: "MATICUSDT", baseAsset: "MATIC", quoteAsset: "USDT", name: "Polygon",             basePrice: 0.85 },
  { symbol: "DOTUSDT",   baseAsset: "DOT",   quoteAsset: "USDT", name: "Polkadot",            basePrice: 7 },
  { symbol: "ATOMUSDT",  baseAsset: "ATOM",  quoteAsset: "USDT", name: "Cosmos",              basePrice: 9 },
  { symbol: "NEARUSDT",  baseAsset: "NEAR",  quoteAsset: "USDT", name: "NEAR Protocol",       basePrice: 5 },
  { symbol: "APTUSDT",   baseAsset: "APT",   quoteAsset: "USDT", name: "Aptos",               basePrice: 8 },
  { symbol: "SUIUSDT",   baseAsset: "SUI",   quoteAsset: "USDT", name: "Sui",                 basePrice: 1.2 },
  { symbol: "SEIUSDT",   baseAsset: "SEI",   quoteAsset: "USDT", name: "Sei",                 basePrice: 0.5 },
  { symbol: "FTMUSDT",   baseAsset: "FTM",   quoteAsset: "USDT", name: "Fantom",              basePrice: 0.55 },
  { symbol: "OPUSDT",    baseAsset: "OP",    quoteAsset: "USDT", name: "Optimism",            basePrice: 2.5 },
  { symbol: "ARBUSDT",   baseAsset: "ARB",   quoteAsset: "USDT", name: "Arbitrum",            basePrice: 1.1 },
  { symbol: "STXUSDT",   baseAsset: "STX",   quoteAsset: "USDT", name: "Stacks",              basePrice: 1.8 },
  // DeFi
  { symbol: "LINKUSDT",  baseAsset: "LINK",  quoteAsset: "USDT", name: "Chainlink",           basePrice: 14 },
  { symbol: "UNIUSDT",   baseAsset: "UNI",   quoteAsset: "USDT", name: "Uniswap",             basePrice: 6 },
  { symbol: "AAVEUSDT",  baseAsset: "AAVE",  quoteAsset: "USDT", name: "Aave",                basePrice: 90 },
  { symbol: "CRVUSDT",   baseAsset: "CRV",   quoteAsset: "USDT", name: "Curve DAO",           basePrice: 0.45 },
  { symbol: "LDOUSDT",   baseAsset: "LDO",   quoteAsset: "USDT", name: "Lido DAO",            basePrice: 2.0 },
  { symbol: "COMPUSDT",  baseAsset: "COMP",  quoteAsset: "USDT", name: "Compound",            basePrice: 55 },
  { symbol: "SNXUSDT",   baseAsset: "SNX",   quoteAsset: "USDT", name: "Synthetix",           basePrice: 2.5 },
  { symbol: "1INCHUSDT", baseAsset: "1INCH", quoteAsset: "USDT", name: "1inch",               basePrice: 0.38 },
  { symbol: "DYDXUSDT",  baseAsset: "DYDX",  quoteAsset: "USDT", name: "dYdX",                basePrice: 1.8 },
  // AI
  { symbol: "FETUSDT",   baseAsset: "FET",   quoteAsset: "USDT", name: "Fetch.ai",            basePrice: 1.5 },
  { symbol: "AGIXUSDT",  baseAsset: "AGIX",  quoteAsset: "USDT", name: "SingularityNET",      basePrice: 0.7 },
  { symbol: "OCEANUSDT", baseAsset: "OCEAN", quoteAsset: "USDT", name: "Ocean Protocol",      basePrice: 0.6 },
  { symbol: "RNDRUSDT",  baseAsset: "RNDR",  quoteAsset: "USDT", name: "Render",              basePrice: 5.5 },
  { symbol: "ARKMUSDT",  baseAsset: "ARKM",  quoteAsset: "USDT", name: "Arkham",              basePrice: 1.2 },
  // Exchange tokens
  { symbol: "OKBUSDT",   baseAsset: "OKB",   quoteAsset: "USDT", name: "OKB",                 basePrice: 45 },
  { symbol: "KCSUSDT",   baseAsset: "KCS",   quoteAsset: "USDT", name: "KuCoin Token",        basePrice: 10 },
  // Gaming / Metaverse
  { symbol: "SANDUSDT",  baseAsset: "SAND",  quoteAsset: "USDT", name: "The Sandbox",         basePrice: 0.45 },
  { symbol: "MANAUSDT",  baseAsset: "MANA",  quoteAsset: "USDT", name: "Decentraland",        basePrice: 0.35 },
  { symbol: "AXSUSDT",   baseAsset: "AXS",   quoteAsset: "USDT", name: "Axie Infinity",       basePrice: 7.5 },
  { symbol: "GALAUSDT",  baseAsset: "GALA",  quoteAsset: "USDT", name: "Gala",                basePrice: 0.03 },
  { symbol: "IMXUSDT",   baseAsset: "IMX",   quoteAsset: "USDT", name: "Immutable X",         basePrice: 1.6 },
  // Meme coins
  { symbol: "PEPEUSDT",  baseAsset: "PEPE",  quoteAsset: "USDT", name: "Pepe",                basePrice: 0.000008 },
  { symbol: "FLOKIUSDT", baseAsset: "FLOKI", quoteAsset: "USDT", name: "Floki",               basePrice: 0.00015 },
  { symbol: "BONKUSDT",  baseAsset: "BONK",  quoteAsset: "USDT", name: "Bonk",                basePrice: 0.000018 },
  { symbol: "WIFUSDT",   baseAsset: "WIF",   quoteAsset: "USDT", name: "dogwifhat",           basePrice: 2.0 },
  // Other
  { symbol: "FILUSDT",   baseAsset: "FIL",   quoteAsset: "USDT", name: "Filecoin",            basePrice: 5 },
  { symbol: "GRTUSDT",   baseAsset: "GRT",   quoteAsset: "USDT", name: "The Graph",           basePrice: 0.18 },
  { symbol: "THETAUSDT", baseAsset: "THETA", quoteAsset: "USDT", name: "Theta Network",       basePrice: 1.5 },
] as const;

// Types
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type DepositWallet = typeof depositWallets.$inferSelect;
export type EmailOtp = typeof emailOtps.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type Conversion = typeof conversions.$inferSelect;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertDepositWallet = z.infer<typeof insertDepositWalletSchema>;
