import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { ethers } from "ethers";
import { storage } from "./storage";
import { pool } from "./db";
import { getIO, connectedAdmins } from "./socket";
import path from "path";
import fs from "fs";
import { api } from "@shared/routes";
import { TRADING_CONFIG, TRADING_PAIRS } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import express from "express";
import { Resend } from "resend";
import { getUserIP, getGeoData } from "./security";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = "no-reply@altcryptotrading.com";

async function recordPortfolioSnapshot(userId: number, newUsdtBalance: number) {
  try {
    await storage.createPortfolioSnapshot(userId, newUsdtBalance);
  } catch { /* non-blocking, best effort */ }
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(prefix: string = "ALT"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getUniqueReferralCode(prefix: string = "ALT"): Promise<string> {
  let code = generateReferralCode(prefix);
  let existing = await storage.getUserByReferralCode(code);
  while (existing) {
    code = generateReferralCode(prefix);
    existing = await storage.getUserByReferralCode(code);
  }
  return code;
}

async function getAdminUserIds(adminId: number): Promise<number[]> {
  const adminUsers = await storage.getUsersByAssignedAdmin(adminId);
  return adminUsers.map(u => u.id);
}

function getAssetFromNetwork(network: string): "usdtBalance" | "btcBalance" | "ethBalance" | "bnbBalance" | "usdcBalance" {
  switch (network) {
    case "BTC": return "btcBalance";
    case "ETH": return "ethBalance";
    case "BNB": return "bnbBalance";
    case "USDC": return "usdcBalance";
    default: return "usdtBalance";
  }
}

// Multer config - use memory storage so files persist in database, not on disk
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG allowed"));
    }
  }
});

// Multer config for support chat attachments (disk storage)
const supportUploadsDir = path.resolve("uploads/support");
if (!fs.existsSync(supportUploadsDir)) {
  fs.mkdirSync(supportUploadsDir, { recursive: true });
}

const supportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, supportUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, JPEG, and WEBP images are allowed"));
    }
  },
});

function fileToDataUrl(file: Express.Multer.File): string {
  const base64 = file.buffer.toString("base64");
  return `data:${file.mimetype};base64,${base64}`;
}

// Middleware
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_dev_only";

const lastOnlineThrottle = new Map<number, number>();

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    const now = Date.now();
    const last = lastOnlineThrottle.get(user.id) ?? 0;
    if (now - last > 5 * 60 * 1000) {
      lastOnlineThrottle.set(user.id, now);
      storage.updateUser(user.id, { lastOnlineAt: new Date() }).catch(() => {});
    }
    next();
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return res.sendStatus(403);
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "SUPER_ADMIN") return res.sendStatus(403);
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // --- Auth ---
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(input.username) || await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const hashedPassword = await bcrypt.hash(input.password, 10);
      await storage.createEmailOtp({
        email: input.email,
        otp,
        userData: { ...input, password: hashedPassword, registerIp: req.ip, phoneNumber: input.phoneNumber },
        expiresAt,
      });

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: input.email,
          subject: "Your Verification Code - AltCryptoTrade",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">Email Verification</h2>
              <p style="color: #94a3b8; margin-bottom: 24px;">Use the code below to verify your email address:</p>
              <div style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send OTP email:", emailErr);
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }

      res.status(200).json({ requireOTP: true, email: input.email, message: "OTP sent to your email" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const record = await storage.getEmailOtpByEmail(email);
      if (!record) {
        return res.status(400).json({ message: "No OTP found. Please register again." });
      }

      if (new Date() > record.expiresAt) {
        await storage.deleteEmailOtpByEmail(email);
        return res.status(400).json({ message: "OTP has expired. Please register again." });
      }

      if (record.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP code" });
      }

      const userData = record.userData as any;
      
      let referredBy: string | null = null;
      let assignedAdmin: number | null = null;
      if (userData.referralCode && userData.referralCode.trim()) {
        const code = userData.referralCode.trim().toUpperCase();
        const referralOwner = await storage.getUserByReferralCode(code);
        if (referralOwner) {
          referredBy = code;
          if (referralOwner.role === "ADMIN" || referralOwner.role === "SUPER_ADMIN") {
            assignedAdmin = referralOwner.id;
          } else if (referralOwner.assignedAdmin) {
            assignedAdmin = referralOwner.assignedAdmin;
          }
        }
      }

      const userReferralCode = await getUniqueReferralCode("USR");
      const user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        registerIp: userData.registerIp,
        phoneNumber: userData.phoneNumber,
        referralCode: userReferralCode,
        referredBy,
        assignedAdmin,
      });

      await storage.deleteEmailOtpByEmail(email);

      // Security log — non-blocking
      (async () => {
        try {
          const ip = getUserIP(req);
          const geo = await getGeoData(ip);
          await storage.createSecurityLog({
            userId: user.id, ip,
            country: geo?.country_name, city: geo?.city,
            region: geo?.region, timezone: geo?.timezone, isp: geo?.org,
            action: "register", isSuspicious: false,
          });
        } catch {}
      })();

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { password, ...safeUser } = user;
      res.status(201).json({ token, user: safeUser });
    } catch (err) {
      console.error("Verify OTP error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const record = await storage.getEmailOtpByEmail(email);
      if (!record) {
        return res.status(400).json({ message: "No pending registration found. Please register again." });
      }

      if (record.resendCount >= 3) {
        return res.status(429).json({ message: "Maximum resend attempts reached. Please register again." });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await storage.updateEmailOtp(record.id, {
        otp,
        expiresAt,
        resendCount: record.resendCount + 1,
      });

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: "Your Verification Code - AltCryptoTrade",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">Email Verification</h2>
              <p style="color: #94a3b8; margin-bottom: 24px;">Use the code below to verify your email address:</p>
              <div style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to resend OTP email:", emailErr);
        return res.status(500).json({ message: "Failed to resend verification email." });
      }

      res.json({ message: "New OTP sent to your email", remainingResends: 3 - (record.resendCount + 1) });
    } catch (err) {
      console.error("Resend OTP error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);

      if (!user || !(await bcrypt.compare(input.password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.accountStatus === "blocked") {
        return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
      }

      // Update last login IP
      await storage.updateUser(user.id, { lastLoginIp: req.ip });

      // Security log — non-blocking
      (async () => {
        try {
          const ip = getUserIP(req);
          const geo = await getGeoData(ip);
          const lastLog = await storage.getLastSecurityLog(user.id, "login");
          const isSuspicious = !!(lastLog?.country && geo?.country_name && lastLog.country !== geo.country_name);
          if (isSuspicious) {
            console.warn(`[SECURITY] Suspicious login for "${user.username}" — last country: ${lastLog?.country}, current: ${geo?.country_name}, IP: ${ip}`);
          }
          await storage.createSecurityLog({
            userId: user.id, ip,
            country: geo?.country_name, city: geo?.city,
            region: geo?.region, timezone: geo?.timezone, isp: geo?.org,
            action: "login", isSuspicious,
          });
        } catch {}
      })();

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      
      const { password, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/metamask-login", async (req, res) => {
    try {
      const { walletAddress, signature } = req.body;
      if (!walletAddress || !signature) {
        return res.status(400).json({ message: "walletAddress and signature are required" });
      }

      const METAMASK_MESSAGE = "Sign this message to login to AltCrypto";
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(METAMASK_MESSAGE, signature);
      } catch {
        return res.status(401).json({ message: "Invalid signature" });
      }

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({ message: "Signature does not match wallet address" });
      }

      const normalizedAddress = walletAddress.toLowerCase();
      let user = await storage.getUserByWalletAddress(normalizedAddress);

      if (!user) {
        // Auto-create account for new MetaMask users
        const shortAddr = normalizedAddress.slice(2, 10);
        let username = `user_${shortAddr}`;
        // Ensure unique username
        const existing = await storage.getUserByUsername(username);
        if (existing) username = `user_${shortAddr}_${Date.now()}`;

        const placeholderEmail = `${normalizedAddress}@metamask.local`;
        const placeholderPassword = await bcrypt.hash(Math.random().toString(36), 10);
        const referralCode = `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        user = await storage.createUser({
          username,
          email: placeholderEmail,
          password: placeholderPassword,
          walletAddress: normalizedAddress,
          loginMethod: "metamask",
          referralCode,
          registerIp: req.ip,
        } as any);
      }

      if (user.accountStatus === "blocked") {
        return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
      }

      await storage.updateUser(user.id, { lastLoginIp: req.ip });

      // Security log — non-blocking
      (async () => {
        try {
          const ip = getUserIP(req);
          const geo = await getGeoData(ip);
          const lastLog = await storage.getLastSecurityLog(user.id, "login");
          const isSuspicious = !!(lastLog?.country && geo?.country_name && lastLog.country !== geo.country_name);
          if (isSuspicious) {
            console.warn(`[SECURITY] Suspicious MetaMask login for "${user.username}" — last country: ${lastLog?.country}, current: ${geo?.country_name}, IP: ${ip}`);
          }
          await storage.createSecurityLog({
            userId: user.id, ip,
            country: geo?.country_name, city: geo?.city,
            region: geo?.region, timezone: geo?.timezone, isp: geo?.org,
            action: "login", isSuspicious,
          });
        } catch {}
      })();

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
      const { password, withdrawalPin, ...safeUser } = user as any;
      res.json({ token, user: safeUser });
    } catch (err) {
      console.error("MetaMask login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req, res) => {
    const user = await storage.getUser((req as any).user.id);
    if (!user) return res.sendStatus(404);
    const { password, withdrawalPin, ...safeUser } = user;
    res.json({ ...safeUser, hasWithdrawalPin: !!withdrawalPin });
  });

  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser((req as any).user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Set Withdrawal PIN ---
  app.post("/api/auth/set-withdrawal-pin", authenticateToken, async (req, res) => {
    try {
      const { pin, currentPassword } = req.body;

      if (!pin || !currentPassword) {
        return res.status(400).json({ message: "PIN and current password are required" });
      }

      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }

      const user = await storage.getUser((req as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      await storage.updateUser(user.id, { withdrawalPin: hashedPin });

      res.json({ message: "Withdrawal PIN set successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Send OTP for password/PIN reset ---
  app.post("/api/auth/send-reset-otp", async (req, res) => {
    try {
      const { email, type } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "No account found with this email" });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await storage.createEmailOtp({
        email,
        otp,
        userData: { userId: user.id, type: type || "reset_password" },
        expiresAt,
      });

      const resetType = type === "reset_pin" ? "Withdrawal PIN" : "Login Password";

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: `Reset ${resetType} - AltCryptoTrade`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">Reset ${resetType}</h2>
              <p style="color: #94a3b8; margin-bottom: 24px;">Use the code below to reset your ${resetType.toLowerCase()}:</p>
              <div style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send reset OTP:", emailErr);
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "OTP sent to your email" });
    } catch (err) {
      console.error("Send reset OTP error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Reset login password via OTP ---
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const record = await storage.getEmailOtpByEmail(email);
      if (!record) {
        return res.status(400).json({ message: "No OTP found. Please request a new one." });
      }

      if (new Date() > record.expiresAt) {
        await storage.deleteEmailOtpByEmail(email);
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }

      if (record.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP code" });
      }

      const userData = record.userData as any;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.deleteEmailOtpByEmail(email);

      res.json({ message: "Password reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Reset withdrawal PIN via OTP ---
  app.post("/api/auth/reset-withdrawal-pin", async (req, res) => {
    try {
      const { email, otp, newPin } = req.body;

      if (!email || !otp || !newPin) {
        return res.status(400).json({ message: "Email, OTP, and new PIN are required" });
      }

      if (!/^\d{6}$/.test(newPin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }

      const record = await storage.getEmailOtpByEmail(email);
      if (!record) {
        return res.status(400).json({ message: "No OTP found. Please request a new one." });
      }

      if (new Date() > record.expiresAt) {
        await storage.deleteEmailOtpByEmail(email);
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }

      if (record.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP code" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const hashedPin = await bcrypt.hash(newPin, 10);
      await storage.updateUser(user.id, { withdrawalPin: hashedPin });
      await storage.deleteEmailOtpByEmail(email);

      res.json({ message: "Withdrawal PIN reset successfully" });
    } catch (err) {
      console.error("Reset PIN error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Trades ---
  app.get(api.trades.list.path, authenticateToken, async (req, res) => {
    const trades = await storage.getTradesByUserId((req as any).user.id);
    res.json(trades);
  });

  app.post(api.trades.create.path, authenticateToken, async (req, res) => {
    try {
      const input = api.trades.create.input.parse(req.body);
      const user = await storage.getUser((req as any).user.id);

      if (!user) return res.sendStatus(404);
      if (user.accountStatus === "frozen") {
        return res.status(403).json({ message: "Your account is frozen. Trading is not allowed." });
      }

      const config = TRADING_CONFIG.find(c => c.duration === input.duration);
      if (!config) {
        return res.status(400).json({ message: "Invalid trade configuration" });
      }

      if (input.amount < config.minAmount) {
        return res.status(400).json({ message: `Minimum amount for ${config.label} duration is ${config.minAmount} USDT` });
      }

      if (Number(user.usdtBalance) < input.amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const activeTrades = await storage.getActiveTrades();
      const userActiveTrade = activeTrades.find(t => t.userId === user.id);
      if (userActiveTrade) {
        return res.status(400).json({ message: "You already have an active trade" });
      }

      const expiryTime = new Date(Date.now() + input.duration * 1000);
      const profitPercent = config.profitPercent;

      const newBalanceAfterTrade = Number(user.usdtBalance) - input.amount;
      await storage.updateUser(user.id, { 
        usdtBalance: newBalanceAfterTrade.toString() 
      });
      recordPortfolioSnapshot(user.id, newBalanceAfterTrade).catch(() => {});

      let entryPrice = "0";
      try {
        const priceRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${input.pair}`);
        const priceData = await priceRes.json();
        entryPrice = priceData.price || "0";
      } catch {}
      if (entryPrice === "0" && marketCache.data.length > 0) {
        const cached = marketCache.data.find((d: any) => d.symbol === input.pair);
        if (cached?.lastPrice) entryPrice = String(cached.lastPrice);
      }
      if (entryPrice === "0") {
        try {
          const kRes = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${input.pair}&interval=1m&limit=1`);
          const kData = await kRes.json();
          if (Array.isArray(kData) && kData.length > 0) entryPrice = String(kData[0][4]);
        } catch {}
      }

      const trade = await storage.createTrade({
        userId: user.id,
        pair: input.pair,
        direction: input.direction,
        amount: input.amount.toString(),
        profitPercent,
        duration: input.duration,
        expiryTime,
        entryPrice,
        status: "OPEN"
      });

      res.status(201).json(trade);
    } catch (err) {
      res.status(400).json({ message: "Invalid trade configuration" });
    }
  });

  // --- KYC ---
  app.post(api.kyc.submit.path, authenticateToken, upload.fields([{ name: 'idImage', maxCount: 1 }, { name: 'selfieImage', maxCount: 1 }]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const idImage = files['idImage']?.[0];
      const selfieImage = files['selfieImage']?.[0];

      if (!idImage || !selfieImage) {
        return res.status(400).json({ message: "Both ID and Selfie images are required" });
      }

      const kycData = {
        ...req.body,
        idImageUrl: fileToDataUrl(idImage),
        selfieImageUrl: fileToDataUrl(selfieImage),
        submittedAt: new Date().toISOString()
      };

      const user = await storage.updateUser((req as any).user.id, {
        verificationStatus: "PENDING",
        kycData
      });

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "KYC submission failed" });
    }
  });

  // --- Deposits ---
  app.get(api.deposits.list.path, authenticateToken, async (req, res) => {
    const deposits = await storage.getDepositsByUserId((req as any).user.id);
    res.json(deposits);
  });

  app.post(api.deposits.create.path, authenticateToken, upload.single('proofImage'), async (req, res) => {
    try {
      const depositUser = await storage.getUser((req as any).user.id);
      if (!depositUser) return res.sendStatus(404);
      if (depositUser.accountStatus === "frozen") {
        return res.status(403).json({ message: "Your account is frozen. Deposits are not allowed." });
      }
      if (!req.file) return res.status(400).json({ message: "Proof image required" });
      
      const deposit = await storage.createDeposit({
        userId: (req as any).user.id,
        amount: req.body.amount,
        transferMethod: req.body.transferMethod,
        proofImage: fileToDataUrl(req.file),
        status: "PENDING"
      });

      res.status(201).json(deposit);
    } catch (err) {
      res.status(500).json({ message: "Deposit failed" });
    }
  });

  // --- Withdrawals ---
  app.get(api.withdrawals.list.path, authenticateToken, async (req, res) => {
    const withdrawals = await storage.getWithdrawalsByUserId((req as any).user.id);
    res.json(withdrawals);
  });

  app.post(api.withdrawals.create.path, authenticateToken, async (req, res) => {
    try {
      const { withdrawalPin, ...rest } = req.body;
      const input = api.withdrawals.create.input.parse(rest);
      const user = await storage.getUser((req as any).user.id);

      if (!user) return res.sendStatus(404);
      if (user.accountStatus === "frozen") {
        return res.status(403).json({ message: "Your account is frozen. Withdrawals are not allowed." });
      }
      if (user.verificationStatus !== "VERIFIED") {
        return res.status(403).json({ message: "KYC verification required" });
      }
      if (!user.withdrawalPin) {
        return res.status(400).json({ message: "Please set your withdrawal PIN first in the Change Password page" });
      }
      if (!withdrawalPin) {
        return res.status(400).json({ message: "Withdrawal PIN is required" });
      }

      const pinMatch = await bcrypt.compare(withdrawalPin, user.withdrawalPin);
      if (!pinMatch) {
        return res.status(400).json({ message: "Incorrect withdrawal PIN" });
      }

      const balanceField = getAssetFromNetwork(input.network);
      const currentBalance = Number(user[balanceField]);
      if (currentBalance < input.amount) {
        const assetName = input.network === "BTC" ? "BTC" : input.network === "ETH" ? "ETH" : input.network === "BNB" ? "BNB" : "USDT";
        return res.status(400).json({ message: `Insufficient ${assetName} balance` });
      }

      const newWithdrawBal = currentBalance - input.amount;
      await storage.updateUser(user.id, {
        [balanceField]: newWithdrawBal.toString()
      });
      if (balanceField === "usdtBalance") recordPortfolioSnapshot(user.id, newWithdrawBal).catch(() => {});

      const withdrawal = await storage.createWithdrawal({
        userId: user.id,
        ...input,
        status: "PENDING"
      });

      res.status(201).json(withdrawal);
    } catch (err: any) {
      const message = err?.issues ? "Invalid withdrawal data" : (err?.message || "Withdrawal failed");
      res.status(400).json({ message });
    }
  });

  // --- Admin ---
  app.get(api.admin.users.path, authenticateToken, requireAdmin, async (req, res) => {
    const adminUser = (req as any).user;
    let userList;
    if (adminUser.role === "SUPER_ADMIN") {
      userList = await storage.getAllUsers();
    } else {
      userList = await storage.getUsersByAssignedAdmin(adminUser.id);
    }
    res.json(userList.map(u => { const { password, ...s } = u; return s; }));
  });

  app.post(api.admin.kycReview.path, authenticateToken, requireAdmin, async (req, res) => {
    const userId = Number(req.params.userId);
    const { status, reason } = req.body;
    const adminUser = (req as any).user;
    
    const user = await storage.getUser(userId);
    if (!user) return res.sendStatus(404);
    if (adminUser.role !== "SUPER_ADMIN" && user.assignedAdmin !== adminUser.id) return res.status(403).json({ message: "Access denied" });

    const kycData = user.kycData as any || {};
    if (status === "REJECTED") kycData.rejectionReason = reason;
    kycData.reviewedAt = new Date().toISOString();

    const updatedUser = await storage.updateUser(userId, {
      verificationStatus: status,
      kycData
    });

    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "KYC_REVIEW",
      targetUserId: userId,
      description: `KYC ${status}`,
      ipAddress: req.ip
    });

    const { password, ...safeUser } = updatedUser;
    res.json(safeUser);
  });

  app.post(api.admin.depositReview.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    const depositId = Number(req.params.id);
    const { status } = req.body;
    const adminUser = (req as any).user;

    const deposit = await storage.getDeposit(depositId);
    if (!deposit) return res.sendStatus(404);
    if (deposit.status !== "PENDING") return res.status(400).json({ message: "Already reviewed" });
    if (adminUser.role !== "SUPER_ADMIN") {
      const depositUser = await storage.getUser(deposit.userId);
      if (!depositUser || depositUser.assignedAdmin !== adminUser.id) return res.status(403).json({ message: "Access denied" });
    }

    if (status === "APPROVED") {
      const user = await storage.getUser(deposit.userId);
      if (user) {
        const balanceField = getAssetFromNetwork(deposit.transferMethod);
        const newBal = Number(user[balanceField]) + Number(deposit.amount);
        await storage.updateUser(user.id, {
          [balanceField]: newBal.toString()
        });
        if (balanceField === "usdtBalance") recordPortfolioSnapshot(user.id, newBal).catch(() => {});
      }
    }

    const updatedDeposit = await storage.updateDeposit(depositId, {
      status,
      reviewedBy: (req as any).user.id,
      reviewedAt: new Date()
    });

    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "DEPOSIT_REVIEW",
      description: `Deposit ${depositId} ${status} (${deposit.transferMethod})`,
      ipAddress: req.ip
    });

    res.json(updatedDeposit);
  });

  // --- Admin: Deposits List --- SUPER_ADMIN ONLY
  app.get(api.admin.deposits.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    const allDeposits = await storage.getAllDeposits();
    res.json(allDeposits);
  });

  // --- Admin: Withdrawals List --- SUPER_ADMIN ONLY
  app.get(api.admin.withdrawals.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    const allWithdrawals = await storage.getAllWithdrawals();
    res.json(allWithdrawals);
  });

  // --- Admin: Withdrawal Review --- SUPER_ADMIN ONLY
  app.post(api.admin.withdrawalReview.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    const withdrawalId = Number(req.params.id);
    const { status } = req.body;
    const adminUser = (req as any).user;

    const withdrawal = await storage.getWithdrawal(withdrawalId);
    if (!withdrawal) return res.sendStatus(404);
    if (withdrawal.status !== "PENDING") return res.status(400).json({ message: "Already reviewed" });
    if (adminUser.role !== "SUPER_ADMIN") {
      const wUser = await storage.getUser(withdrawal.userId);
      if (!wUser || wUser.assignedAdmin !== adminUser.id) return res.status(403).json({ message: "Access denied" });
    }

    if (status === "REJECTED") {
      const user = await storage.getUser(withdrawal.userId);
      if (user) {
        const balanceField = getAssetFromNetwork(withdrawal.network);
        const restoredBal = Number(user[balanceField]) + Number(withdrawal.amount);
        await storage.updateUser(user.id, {
          [balanceField]: restoredBal.toString()
        });
        if (balanceField === "usdtBalance") recordPortfolioSnapshot(user.id, restoredBal).catch(() => {});
      }
    }

    const updated = await storage.updateWithdrawal(withdrawalId, {
      status,
      reviewedBy: (req as any).user.id,
      reviewedAt: new Date()
    });

    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "WITHDRAWAL_REVIEW",
      description: `Withdrawal ${withdrawalId} ${status} (${withdrawal.network})`,
      ipAddress: req.ip
    });

    res.json(updated);
  });

  // --- Admin: Edit Withdrawal Wallet Address --- SUPER_ADMIN ONLY
  app.patch("/api/admin/withdrawals/:id/wallet", authenticateToken, requireSuperAdmin, async (req, res) => {
    const withdrawalId = Number(req.params.id);
    const { walletAddress } = req.body;
    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.trim().length < 5) {
      return res.status(400).json({ message: "Valid wallet address is required" });
    }
    const withdrawal = await storage.getWithdrawal(withdrawalId);
    if (!withdrawal) return res.sendStatus(404);
    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({ message: "Can only edit wallet address on PENDING withdrawals" });
    }
    const updated = await storage.updateWithdrawal(withdrawalId, { walletAddress: walletAddress.trim() });
    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "WITHDRAWAL_REVIEW",
      description: `Withdrawal ${withdrawalId} wallet address updated by admin`,
      ipAddress: req.ip
    });
    res.json(updated);
  });

  // --- Admin: All Trades ---
  app.get(api.admin.allTrades.path, authenticateToken, requireAdmin, async (req, res) => {
    const adminUser = (req as any).user;
    const allTrades = await storage.getAllTrades();
    if (adminUser.role === "SUPER_ADMIN") {
      res.json(allTrades);
    } else {
      const userIds = await getAdminUserIds(adminUser.id);
      res.json(allTrades.filter(t => userIds.includes(t.userId)));
    }
  });

  // --- Admin: User Trade Control ---
  app.post(api.admin.userTradeControl.path, authenticateToken, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const adminUser = (req as any).user;
    const parsed = api.admin.userTradeControl.input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid trade control value" });
    const { tradeOutcomeControl } = parsed.data;

    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Cannot modify admin trade controls" });
    }
    if (adminUser.role !== "SUPER_ADMIN" && targetUser.assignedAdmin !== adminUser.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updated = await storage.updateUser(userId, { tradeOutcomeControl });

    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "USER_TRADE_CONTROL",
      targetUserId: userId,
      description: `User ${userId} trade control set to ${tradeOutcomeControl}`,
      ipAddress: req.ip
    });

    const { password, ...safeUser } = updated;
    res.json(safeUser);
  });

  // --- Admin: Set User Role --- SUPER_ADMIN ONLY
  app.post("/api/admin/users/:id/role", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { role } = req.body;
      if (!["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Can only set USER or ADMIN." });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot modify super admin role" });

      const updateData: any = { role };
      if (role === "ADMIN" && !targetUser.referralCode?.startsWith("ADM")) {
        updateData.referralCode = await getUniqueReferralCode("ADM");
      }
      const updated = await storage.updateUser(userId, updateData);
      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "USER_ROLE_CHANGE",
        targetUserId: userId,
        description: `User ${userId} role changed to ${role}`,
        ipAddress: req.ip
      });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // --- Admin: Manually assign user to an admin --- SUPER_ADMIN ONLY
  app.post("/api/admin/users/:id/assign-admin", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { adminId } = req.body; // null to unassign, or an admin user id

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot reassign super admin" });

      if (adminId !== null && adminId !== undefined) {
        const adminUser = await storage.getUser(Number(adminId));
        if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "SUPER_ADMIN")) {
          return res.status(400).json({ message: "Target must be an admin user" });
        }
      }

      const updated = await storage.updateUser(userId, { assignedAdmin: adminId ?? null });
      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "USER_ASSIGN_ADMIN",
        targetUserId: userId,
        description: `User ${userId} assigned to admin ${adminId ?? "none"}`,
        ipAddress: req.ip,
      });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to assign admin" });
    }
  });

  // --- Admin: Account Status (freeze/block) --- SUPER_ADMIN ONLY
  app.post("/api/admin/users/:id/status", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { accountStatus } = req.body;
      if (!["active", "frozen", "blocked"].includes(accountStatus)) {
        return res.status(400).json({ message: "Invalid account status" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot modify admin account" });

      const updated = await storage.updateUser(userId, { accountStatus });
      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "USER_ACCOUNT_STATUS",
        targetUserId: userId,
        description: `User ${userId} account status set to ${accountStatus}`,
        ipAddress: req.ip
      });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to update account status" });
    }
  });

  // --- Admin: Delete User --- SUPER_ADMIN ONLY
  app.delete("/api/admin/users/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot delete admin account" });

      await storage.deleteUser(userId);
      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "USER_DELETED",
        targetUserId: userId,
        description: `User ${userId} (${targetUser.username}) deleted`,
        ipAddress: req.ip
      });
      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // --- User: My Last Security Log ---
  app.get("/api/auth/my-security", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const last = await storage.getLastSecurityLog(userId, "login");
      res.json(last ?? null);
    } catch {
      res.json(null);
    }
  });

  // --- User: Portfolio History ---
  app.get("/api/portfolio/history", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const range = (req.query.range as string) || "7d";
      const now = new Date();
      let since: Date | undefined;
      if (range === "1d") since = new Date(now.getTime() - 86400000);
      else if (range === "7d") since = new Date(now.getTime() - 7 * 86400000);
      else if (range === "30d") since = new Date(now.getTime() - 30 * 86400000);

      const rows = await storage.getPortfolioHistory(userId, 200, since);
      const sorted = [...rows].reverse();

      if (sorted.length === 0) {
        const user = await storage.getUser(userId);
        const bal = Number(user?.usdtBalance ?? 0);
        return res.json([
          { date: now.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), balance: bal, timestamp: now.getTime() }
        ]);
      }

      const data = sorted.map(r => ({
        date: new Date(r.createdAt!).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        balance: Number(r.balance),
        timestamp: new Date(r.createdAt!).getTime(),
      }));

      res.json(data);
    } catch {
      res.status(500).json([]);
    }
  });

  // --- User: Real-time Portfolio Value ---
  app.get("/api/portfolio/value", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const priceOf = (symbol: string) => {
        const item = marketCache.data.find((d: any) => d.symbol === symbol);
        return item ? (parseFloat(String(item.lastPrice)) || 0) : 0;
      };

      const btcPrice = priceOf("BTCUSDT");
      const ethPrice = priceOf("ETHUSDT");
      const bnbPrice = priceOf("BNBUSDT");

      const usdt = Number(user.usdtBalance || 0);
      const usdc = Number(user.usdcBalance || 0);
      const btc = Number(user.btcBalance || 0);
      const eth = Number(user.ethBalance || 0);
      const bnb = Number(user.bnbBalance || 0);

      const total = usdt + usdc + btc * btcPrice + eth * ethPrice + bnb * bnbPrice;

      res.json({
        total: parseFloat(total.toFixed(2)),
        breakdown: {
          usdt: parseFloat(usdt.toFixed(2)),
          usdc: parseFloat(usdc.toFixed(2)),
          btc: { amount: btc, price: btcPrice, usd: parseFloat((btc * btcPrice).toFixed(2)) },
          eth: { amount: eth, price: ethPrice, usd: parseFloat((eth * ethPrice).toFixed(2)) },
          bnb: { amount: bnb, price: bnbPrice, usd: parseFloat((bnb * bnbPrice).toFixed(2)) },
        },
        pricesFrom: marketCache.data.length > 0 ? "live" : "unavailable",
      });
    } catch {
      res.status(500).json({ message: "Failed to compute portfolio value" });
    }
  });

  // --- Admin: Security Logs ---
  app.get("/api/admin/security-logs", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const logs = await storage.getSecurityLogs(userId, 300);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch security logs" });
    }
  });

  // --- Admin: Balance Adjustment (SUPER_ADMIN only) ---
  app.post("/api/admin/users/:id/balance", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { asset, amount } = req.body;

      const validAssets = ["usdt", "usdc", "btc", "eth", "bnb"];
      if (!validAssets.includes(asset)) return res.status(400).json({ message: "Invalid asset" });
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount === 0) return res.status(400).json({ message: "Amount must be a non-zero number" });

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot modify super admin balance" });

      const fieldMap: Record<string, keyof typeof targetUser> = {
        usdt: "usdtBalance", usdc: "usdcBalance", btc: "btcBalance", eth: "ethBalance", bnb: "bnbBalance"
      };
      const field = fieldMap[asset];
      const currentBalance = parseFloat(targetUser[field] as string) || 0;
      const newBalance = currentBalance + numAmount;
      if (newBalance < 0) return res.status(400).json({ message: `Insufficient ${asset.toUpperCase()} balance` });

      await storage.updateUser(userId, { [field]: newBalance.toFixed(asset === "usdt" || asset === "usdc" ? 2 : 8) });
      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "BALANCE_ADJUSTED",
        targetUserId: userId,
        description: `${asset.toUpperCase()} balance ${numAmount > 0 ? "increased" : "decreased"} by ${Math.abs(numAmount)} for user ${targetUser.username}`,
        ipAddress: req.ip
      });
      res.json({ message: "Balance updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  // --- Admin: Trade Control ---
  app.post(api.admin.tradeControl.path, authenticateToken, requireAdmin, async (req, res) => {
    const tradeId = Number(req.params.id);
    const { controlMode } = req.body;

    const trade = await storage.getTrade(tradeId);
    if (!trade) return res.sendStatus(404);

    const updated = await storage.updateTrade(tradeId, { controlMode });

    await storage.createAuditLog({
      adminId: (req as any).user.id,
      actionType: "TRADE_CONTROL",
      targetTradeId: tradeId,
      description: `Trade ${tradeId} set to ${controlMode}`,
      ipAddress: req.ip
    });

    res.json(updated);
  });

  // --- Admin: Deposit Wallets --- SUPER_ADMIN ONLY
  app.get(api.admin.depositWallets.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    const wallets = await storage.getAllDepositWallets();
    res.json(wallets);
  });

  app.post(api.admin.createDepositWallet.path, authenticateToken, requireSuperAdmin, upload.single('qrCodeImage'), async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.isActive === "string") body.isActive = body.isActive === "true";
      const input = api.admin.createDepositWallet.input.parse(body);

      if (input.isActive) {
        await storage.deactivateWalletsByNetwork(input.network);
      }

      let qrCodeImage: string | undefined;
      if (req.file) {
        qrCodeImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const wallet = await storage.createDepositWallet({ ...input, qrCodeImage });

      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "DEPOSIT_WALLET_CREATE",
        description: `Created ${input.network} wallet: ${input.address}`,
        ipAddress: req.ip
      });

      res.status(201).json(wallet);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  app.put(api.admin.updateDepositWallet.path, authenticateToken, requireSuperAdmin, upload.single('qrCodeImage'), async (req, res) => {
    try {
      const walletId = Number(req.params.id);
      const wallet = await storage.getDepositWallet(walletId);
      if (!wallet) return res.sendStatus(404);

      const updates: any = {};
      if (req.body.address) updates.address = req.body.address;
      if (req.body.network) updates.network = req.body.network;
      if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
      if (req.file) {
        updates.qrCodeImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const updated = await storage.updateDepositWallet(walletId, updates);

      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "DEPOSIT_WALLET_UPDATE",
        description: `Updated wallet ${walletId}`,
        ipAddress: req.ip
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });

  app.patch(api.admin.activateDepositWallet.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const walletId = Number(req.params.id);
      const wallet = await storage.getDepositWallet(walletId);
      if (!wallet) return res.sendStatus(404);

      await storage.deactivateWalletsByNetwork(wallet.network);
      const updated = await storage.updateDepositWallet(walletId, { isActive: true });

      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "DEPOSIT_WALLET_ACTIVATE",
        description: `Activated ${wallet.network} wallet ${walletId}, deactivated others`,
        ipAddress: req.ip
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to activate wallet" });
    }
  });

  app.delete(api.admin.deleteDepositWallet.path, authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const walletId = Number(req.params.id);
      const wallet = await storage.getDepositWallet(walletId);
      if (!wallet) return res.sendStatus(404);

      await storage.deleteDepositWallet(walletId);

      await storage.createAuditLog({
        adminId: (req as any).user.id,
        actionType: "DEPOSIT_WALLET_DELETE",
        description: `Deleted ${wallet.network} wallet ${walletId}`,
        ipAddress: req.ip
      });

      res.json({ message: "Wallet deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // --- Admin: Verify Wallet Access PIN ---
  app.post("/api/admin/wallet-pin/verify", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { pin } = req.body;
      const user = await storage.getUser((req as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.walletAccessPin) {
        return res.status(400).json({ message: "NO_PIN_SET" });
      }

      const valid = await bcrypt.compare(pin, user.walletAccessPin);
      if (!valid) return res.status(401).json({ message: "Incorrect PIN" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  // --- Admin: Set/Change Wallet Access PIN (requires login password) ---
  app.post("/api/admin/wallet-pin/change", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { password, newPin } = req.body;
      if (!password || !newPin || !/^\d{6}$/.test(newPin)) {
        return res.status(400).json({ message: "Password and a valid 6-digit PIN are required" });
      }

      const user = await storage.getUser((req as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) return res.status(401).json({ message: "Incorrect password" });

      const hashedPin = await bcrypt.hash(newPin, 10);
      await storage.updateUser(user.id, { walletAccessPin: hashedPin });

      await storage.createAuditLog({
        adminId: user.id,
        actionType: "WALLET_PIN_CHANGE",
        description: "Wallet access PIN changed",
        ipAddress: req.ip
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to change PIN" });
    }
  });

  // --- User: Get Active Deposit Wallet by Network ---
  app.get(api.depositWallet.getByNetwork.path, authenticateToken, async (req, res) => {
    const network = req.params.network;
    const wallet = await storage.getActiveWalletByNetwork(network);
    if (!wallet) {
      return res.status(404).json({ message: "Deposit wallet not available for this network" });
    }
    res.json(wallet);
  });

  // --- Market Prices ---
  app.get(api.market.prices.path, async (req, res) => {
    try {
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"];
      const prices: Record<string, string> = {};
      
      const responses = await Promise.allSettled(
        symbols.map(symbol =>
          fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}`)
            .then(r => r.json())
        )
      );
      
      responses.forEach((result, i) => {
        if (result.status === "fulfilled" && result.value?.price) {
          prices[symbols[i]] = result.value.price;
        }
      });
      
      res.json(prices);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  // --- Market data cache ---
  const COINGECKO_IDS = [
    "bitcoin","ethereum","binancecoin","solana","ripple","cardano","dogecoin",
    "tron","shiba-inu","litecoin",
    "avalanche-2","matic-network","polkadot","cosmos","near","aptos",
    "sui","sei-network","fantom","optimism","arbitrum","blockstack",
    "chainlink","uniswap","aave","curve-dao-token","lido-dao",
    "compound-governance-token","havven","1inch","dydx-chain",
    "fetch-ai","singularitynet","ocean-protocol","render-token","arkham",
    "okb","kucoin-token",
    "the-sandbox","decentraland","axie-infinity","gala","immutable-x",
    "pepe","floki","bonk","dogwifcoin",
    "filecoin","the-graph","theta-token",
  ].join(",");
  const COINGECKO_TO_SYMBOL: Record<string, string> = {
    bitcoin: "BTCUSDT", ethereum: "ETHUSDT", binancecoin: "BNBUSDT",
    solana: "SOLUSDT", ripple: "XRPUSDT", cardano: "ADAUSDT",
    dogecoin: "DOGEUSDT", tron: "TRXUSDT", "shiba-inu": "SHIBUSDT", litecoin: "LTCUSDT",
    "avalanche-2": "AVAXUSDT", "matic-network": "MATICUSDT", polkadot: "DOTUSDT",
    cosmos: "ATOMUSDT", near: "NEARUSDT", aptos: "APTUSDT",
    sui: "SUIUSDT", "sei-network": "SEIUSDT", fantom: "FTMUSDT",
    optimism: "OPUSDT", arbitrum: "ARBUSDT", blockstack: "STXUSDT",
    chainlink: "LINKUSDT", uniswap: "UNIUSDT", aave: "AAVEUSDT",
    "curve-dao-token": "CRVUSDT", "lido-dao": "LDOUSDT",
    "compound-governance-token": "COMPUSDT", havven: "SNXUSDT",
    "1inch": "1INCHUSDT", "dydx-chain": "DYDXUSDT",
    "fetch-ai": "FETUSDT", singularitynet: "AGIXUSDT",
    "ocean-protocol": "OCEANUSDT", "render-token": "RNDRUSDT", arkham: "ARKMUSDT",
    okb: "OKBUSDT", "kucoin-token": "KCSUSDT",
    "the-sandbox": "SANDUSDT", decentraland: "MANAUSDT",
    "axie-infinity": "AXSUSDT", gala: "GALAUSDT", "immutable-x": "IMXUSDT",
    pepe: "PEPEUSDT", floki: "FLOKIUSDT", bonk: "BONKUSDT", dogwifcoin: "WIFUSDT",
    filecoin: "FILUSDT", "the-graph": "GRTUSDT", "theta-token": "THETAUSDT",
  };

  let marketCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };
  const CACHE_TTL = 30000;

  // --- Trading Pairs ---
  app.get("/api/pairs", (_req, res) => {
    res.json(TRADING_PAIRS);
  });

  app.get("/api/price/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      if (marketCache.data.length > 0) {
        const cached = marketCache.data.find((d: any) => d.symbol === symbol);
        if (cached) return res.json({ symbol, price: cached.lastPrice });
      }
      const priceRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}`);
      const priceData = await priceRes.json();
      res.json({ symbol, price: priceData.price || "0" });
    } catch {
      res.json({ symbol: req.params.symbol, price: "0" });
    }
  });

  // --- Klines (candlestick) data from Binance ---
  const klinesCache: Record<string, { data: any; timestamp: number }> = {};
  const KLINES_CACHE_TTL = 10000;

  app.get("/api/klines/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const interval = (req.query.interval as string) || "1m";
      const limit = Math.min(Number(req.query.limit) || 500, 1000);

      const validIntervals = ["1s", "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"];
      if (!validIntervals.includes(interval)) {
        return res.status(400).json({ message: "Invalid interval" });
      }

      const cacheKey = `${symbol}_${interval}_${limit}`;
      const now = Date.now();
      if (klinesCache[cacheKey] && now - klinesCache[cacheKey].timestamp < KLINES_CACHE_TTL) {
        return res.json(klinesCache[cacheKey].data);
      }

      const binanceRes = await fetch(
        `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (!binanceRes.ok) {
        return res.status(502).json({ message: "Failed to fetch klines from Binance" });
      }

      const rawData = await binanceRes.json();
      const klines = rawData.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      klinesCache[cacheKey] = { data: klines, timestamp: now };
      res.json(klines);
    } catch (err) {
      console.error("Klines fetch error:", err);
      res.status(500).json({ message: "Failed to fetch candlestick data" });
    }
  });

  // --- Market 24hr ticker (proxy via CoinGecko with cache) ---

  app.get("/api/market/24hr", async (_req, res) => {
    try {
      const now = Date.now();
      if (marketCache.data.length > 0 && now - marketCache.timestamp < CACHE_TTL) {
        return res.json(marketCache.data);
      }

      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINGECKO_IDS}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
      );
      if (!cgRes.ok) {
        if (marketCache.data.length > 0) {
          return res.json(marketCache.data);
        }
        throw new Error("CoinGecko API error");
      }
      const cgData = await cgRes.json();

      const data = cgData.map((coin: any) => ({
        symbol: COINGECKO_TO_SYMBOL[coin.id] || coin.symbol.toUpperCase() + "USDT",
        lastPrice: String(coin.current_price),
        priceChangePercent: String(coin.price_change_percentage_24h || 0),
        volume: String(coin.total_volume),
        highPrice: String(coin.high_24h),
        lowPrice: String(coin.low_24h),
        quoteVolume: String(coin.total_volume),
        image: coin.image || "",
      }));

      marketCache = { data, timestamp: now };
      res.json(data);
    } catch (err) {
      console.error("Market 24hr error:", err);
      if (marketCache.data.length > 0) {
        return res.json(marketCache.data);
      }
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // --- Trade Engine (singleton guard) ---
  if (!(global as any).__tradeEngineRunning) {
    (global as any).__tradeEngineRunning = true;

    async function checkExpiredTrades() {
      try {
        const activeTrades = await storage.getActiveTrades();
        const now = new Date();

        for (const trade of activeTrades) {
          if (new Date(trade.expiryTime) <= now) {
            let result: "WIN" | "LOSS";
            const entryPrice = parseFloat(trade.entryPrice || "0");

            const tradeUser = await storage.getUser(trade.userId);
            const userControl = tradeUser?.tradeOutcomeControl;

            if (trade.controlMode === "FORCE_WIN" || userControl === "force_win") {
              result = "WIN";
            } else if (trade.controlMode === "FORCE_LOSE" || userControl === "force_lose") {
              result = "LOSS";
            } else if (entryPrice === 0) {
              // Entry price missing - refund user
              const user = await storage.getUser(trade.userId);
              if (user) {
                await storage.updateUser(user.id, {
                  usdtBalance: (Number(user.usdtBalance) + Number(trade.amount)).toString()
                });
              }
              await storage.updateTrade(trade.id, {
                status: "CLOSED",
                result: "LOSS",
                closeTime: now
              });
              continue;
            } else {
              try {
                let exitPrice = 0;
                try {
                  const priceRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${trade.pair}`);
                  const priceData = await priceRes.json();
                  exitPrice = parseFloat(priceData.price || "0");
                } catch {}
                if (exitPrice === 0 && marketCache.data.length > 0) {
                  const cached = marketCache.data.find((d: any) => d.symbol === trade.pair);
                  if (cached?.lastPrice) exitPrice = parseFloat(String(cached.lastPrice));
                }
                if (exitPrice === 0) {
                  try {
                    const kRes = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${trade.pair}&interval=1m&limit=1`);
                    const kData = await kRes.json();
                    if (Array.isArray(kData) && kData.length > 0) exitPrice = parseFloat(kData[0][4]);
                  } catch {}
                }

                await storage.updateTrade(trade.id, { exitPrice: exitPrice.toString() });

                if (trade.direction === "BUY") {
                  result = exitPrice > entryPrice ? "WIN" : "LOSS";
                } else {
                  result = exitPrice < entryPrice ? "WIN" : "LOSS";
                }
              } catch {
                result = Math.random() > 0.5 ? "WIN" : "LOSS";
              }
            }

            await storage.updateTrade(trade.id, {
              status: "CLOSED",
              result,
              closeTime: now
            });

            if (result === "WIN") {
              const user = await storage.getUser(trade.userId);
              if (user) {
                const profit = Number(trade.amount) * (trade.profitPercent / 100);
                const payout = Number(trade.amount) + profit;
                const newWinBal = Number(user.usdtBalance) + payout;
                await storage.updateUser(user.id, {
                  usdtBalance: newWinBal.toString()
                });
                recordPortfolioSnapshot(user.id, newWinBal).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.error("Trade engine error:", err);
      }
    }

    setInterval(checkExpiredTrades, 1000);
  }

  // --- Asset Conversion (bidirectional) ---
  app.post("/api/convert", authenticateToken, async (req, res) => {
    try {
      const { fromAsset, toAsset, amount } = req.body;
      const CRYPTO = ["BTC", "ETH", "BNB"];
      const STABLECOINS = ["USDT", "USDC"];
      const ALL_ASSETS = [...STABLECOINS, ...CRYPTO];

      if (!ALL_ASSETS.includes(fromAsset) || !ALL_ASSETS.includes(toAsset)) {
        return res.status(400).json({ message: "Invalid asset pair" });
      }
      if (fromAsset === toAsset) {
        return res.status(400).json({ message: "Cannot convert to the same asset" });
      }
      const isStableToStable = STABLECOINS.includes(fromAsset) && STABLECOINS.includes(toAsset);
      const isCryptoToStable = CRYPTO.includes(fromAsset) && STABLECOINS.includes(toAsset);
      const isStableToCrypto = STABLECOINS.includes(fromAsset) && CRYPTO.includes(toAsset);
      if (!isCryptoToStable && !isStableToCrypto && !isStableToStable) {
        return res.status(400).json({ message: "Conversions only supported between stablecoins and crypto assets" });
      }
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }

      const user = await storage.getUser((req as any).user.id);
      if (!user) return res.sendStatus(404);
      if (user.accountStatus === "frozen") {
        return res.status(403).json({ message: "Your account is frozen" });
      }

      const numAmount = Number(amount);

      let price = 1;
      if (isStableToStable) {
        price = 1;
      } else {
        const cryptoAsset = isCryptoToStable ? fromAsset : toAsset;
        price = 0;
        try {
          const priceRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${cryptoAsset}USDT`);
          const priceData = await priceRes.json();
          price = parseFloat(priceData.price) || 0;
        } catch {}

        if (price <= 0 && marketCache.data.length > 0) {
          const cached = marketCache.data.find((d: any) => d.symbol === `${cryptoAsset}USDT`);
          if (cached?.lastPrice) price = parseFloat(cached.lastPrice) || 0;
        }

        if (price <= 0) {
          return res.status(400).json({ message: "Unable to fetch market price. Try again." });
        }
      }

      const toDbCol = (asset: string) => {
        if (asset === "BTC") return "btc_balance";
        if (asset === "ETH") return "eth_balance";
        if (asset === "BNB") return "bnb_balance";
        if (asset === "USDC") return "usdc_balance";
        return "usdt_balance";
      };

      const fromCol = toDbCol(fromAsset);
      const toCol = toDbCol(toAsset);
      const isFromStable = STABLECOINS.includes(fromAsset);
      const isToStable = STABLECOINS.includes(toAsset);

      let received: number;
      let receivedStr: string;
      if (isStableToStable) {
        received = numAmount;
        receivedStr = received.toFixed(2);
      } else if (isCryptoToStable) {
        received = numAmount * price;
        receivedStr = received.toFixed(2);
      } else {
        received = numAmount / price;
        receivedStr = received.toFixed(8);
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const freshUser = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [user.id]);
        if (!freshUser.rows[0]) throw new Error("User not found");
        const freshFromBalance = Number(freshUser.rows[0][fromCol]) || 0;
        if (freshFromBalance < numAmount) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: `Insufficient ${fromAsset} balance` });
        }
        const newFromBalance = isFromStable
          ? (freshFromBalance - numAmount).toFixed(2)
          : (freshFromBalance - numAmount).toFixed(8);
        const freshToBalance = Number(freshUser.rows[0][toCol]) || 0;
        const newToBalance = isToStable
          ? (freshToBalance + received).toFixed(2)
          : (freshToBalance + received).toFixed(8);
        await client.query(`UPDATE users SET ${fromCol} = $1, ${toCol} = $2 WHERE id = $3`, [newFromBalance, newToBalance, user.id]);
        const convResult = await client.query(
          `INSERT INTO conversions (user_id, from_asset, to_asset, amount, price, received) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [user.id, fromAsset, toAsset, numAmount.toFixed(8), price.toFixed(8), receivedStr]
        );
        await client.query("COMMIT");
        res.json(convResult.rows[0]);
      } catch (txErr) {
        await client.query("ROLLBACK");
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Conversion failed" });
    }
  });

  app.get("/api/conversions", authenticateToken, async (req, res) => {
    const conversions = await storage.getConversionsByUserId((req as any).user.id);
    res.json(conversions);
  });

  // --- Support Tickets ---
  app.post("/api/support/submit", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      let userId = null;
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch {}
      }

      const ticket = await storage.createSupportTicket({
        userId,
        name,
        email,
        subject,
        message,
      });

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: "support@altcryptotrading.com",
          replyTo: email,
          subject: `[Support #${ticket.id}] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">New Support Ticket #${ticket.id}</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="color: #94a3b8; padding: 8px 0; width: 100px;">From:</td><td style="color: #ffffff; padding: 8px 0;">${name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 8px 0;">Email:</td><td style="color: #ffffff; padding: 8px 0;"><a href="mailto:${email}" style="color: #22c55e;">${email}</a></td></tr>
                ${userId ? `<tr><td style="color: #94a3b8; padding: 8px 0;">User ID:</td><td style="color: #ffffff; padding: 8px 0;">${userId}</td></tr>` : ''}
                <tr><td style="color: #94a3b8; padding: 8px 0;">Subject:</td><td style="color: #ffffff; padding: 8px 0;">${subject}</td></tr>
              </table>
              <div style="background: #1e293b; padding: 20px; border-radius: 8px;">
                <p style="color: #e2e8f0; white-space: pre-wrap; margin: 0;">${message}</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send support email:", emailErr);
      }

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: `Support Ticket #${ticket.id} Received - AltCryptoTrade`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">We've received your message</h2>
              <p style="color: #94a3b8; margin-bottom: 16px;">Hi ${name},</p>
              <p style="color: #94a3b8; margin-bottom: 24px;">Thank you for reaching out. Your support ticket <strong style="color: #22c55e;">#${ticket.id}</strong> has been received. Our team will get back to you as soon as possible.</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 4px;">Subject: <span style="color: #e2e8f0;">${subject}</span></p>
              </div>
              <p style="color: #64748b; font-size: 13px;">If you need further assistance, simply reply to this email or submit another ticket on our website.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }

      res.status(201).json({ message: "Your message has been sent. We'll get back to you soon!", ticketId: ticket.id });
    } catch (err) {
      console.error("Support submit error:", err);
      res.status(500).json({ message: "Failed to submit your message. Please try again." });
    }
  });

  app.get("/api/support/tickets", authenticateToken, async (req, res) => {
    const tickets = await storage.getSupportTicketsByUserId((req as any).user.id);
    res.json(tickets);
  });

  app.get("/api/admin/support-tickets", authenticateToken, requireSuperAdmin, async (req, res) => {
    const adminUser = (req as any).user;
    const tickets = await storage.getAllSupportTickets();
    if (adminUser.role === "SUPER_ADMIN") {
      res.json(tickets);
    } else {
      const userIds = await getAdminUserIds(adminUser.id);
      res.json(tickets.filter(t => t.userId && userIds.includes(t.userId)));
    }
  });

  app.post("/api/admin/support-tickets/:id/reply", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;

      if (!reply) return res.status(400).json({ message: "Reply is required" });

      const ticket = await storage.getSupportTicket(Number(id));
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      const adminUser = (req as any).user;
      if (adminUser.role !== "SUPER_ADMIN" && ticket.userId) {
        const ticketUser = await storage.getUser(ticket.userId);
        if (!ticketUser || ticketUser.assignedAdmin !== adminUser.id) return res.status(403).json({ message: "Access denied" });
      }

      await storage.updateSupportTicket(Number(id), {
        adminReply: reply,
        status: "replied",
        repliedAt: new Date(),
      });

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: ticket.email,
          subject: `Re: Support Ticket #${ticket.id} - AltCryptoTrade`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1729; color: #ffffff; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-bottom: 16px;">Support Response - Ticket #${ticket.id}</h2>
              <p style="color: #94a3b8; margin-bottom: 16px;">Hi ${ticket.name},</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">Your message:</p>
                <p style="color: #94a3b8; white-space: pre-wrap; margin: 0;">${ticket.message}</p>
              </div>
              <div style="background: #1e3a2f; padding: 16px; border-radius: 8px; border-left: 3px solid #22c55e; margin-bottom: 16px;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">Our response:</p>
                <p style="color: #e2e8f0; white-space: pre-wrap; margin: 0;">${reply}</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">If you need further assistance, simply reply to this email or submit another ticket.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send reply email:", emailErr);
      }

      res.json({ message: "Reply sent successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  app.patch("/api/admin/support-tickets/:id/status", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminUser = (req as any).user;
      if (!["open", "replied", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const ticket = await storage.getSupportTicket(Number(id));
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (adminUser.role !== "SUPER_ADMIN" && ticket.userId) {
        const ticketUser = await storage.getUser(ticket.userId);
        if (!ticketUser || ticketUser.assignedAdmin !== adminUser.id) return res.status(403).json({ message: "Access denied" });
      }
      await storage.updateSupportTicket(Number(id), { status });
      res.json({ message: "Status updated" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // --- Live Chat Support ---

  // Get or create user's open ticket
  app.get("/api/support/chat/ticket", authenticateToken, async (req, res) => {
    try {
      const jwtUser = (req as any).user;
      const fullUser = await storage.getUser(jwtUser.id);
      if (!fullUser) return res.status(404).json({ message: "User not found" });
      const email = fullUser.email || `user${fullUser.id}@platform.local`;
      const ticket = await storage.getOrCreateTicketForUser(fullUser.id, fullUser.username, email);
      res.json(ticket);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to get ticket" });
    }
  });

  // Get messages for a ticket (user can only access their own)
  app.get("/api/support/chat/messages/:ticketId", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const ticketId = Number(req.params.ticketId);
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (user.role === "USER" && ticket.userId !== user.id) return res.status(403).json({ message: "Access denied" });
      const messages = await storage.getSupportMessagesByTicketId(ticketId);
      // Mark as read
      if (user.role === "USER") {
        await storage.updateSupportTicket(ticketId, { unreadByUser: 0 });
      } else {
        await storage.updateSupportTicket(ticketId, { unreadByAdmin: 0 });
      }
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // User sends a message
  app.post("/api/support/chat/message", authenticateToken, async (req, res) => {
    try {
      const jwtUser = (req as any).user;
      const user = await storage.getUser(jwtUser.id) || jwtUser;
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

      const email = (user as any).email || `user${user.id}@platform.local`;
      const ticket = await storage.getOrCreateTicketForUser(user.id, user.username, email);
      if (ticket.status === "closed") return res.status(400).json({ message: "This ticket is closed. Please contact support." });

      const msg = await storage.createSupportMessage({
        ticketId: ticket.id,
        senderType: "user",
        senderId: user.id,
        message: message.trim(),
      });

      await storage.updateSupportTicket(ticket.id, {
        status: "open",
        lastMessageAt: new Date(),
        unreadByAdmin: (ticket.unreadByAdmin || 0) + 1,
      });

      try {
        const io = getIO();
        io.to(`ticket_${ticket.id}`).emit("support_new_message", { message: msg, ticket: { ...ticket, status: "open" } });
        io.to("admins").emit("support_new_ticket_message", { ticketId: ticket.id, userId: user.id, username: user.username });
      } catch (_) {}

      res.json({ message: msg, ticket });
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // User uploads a file attachment in support chat
  app.post("/api/support/upload", authenticateToken, supportUpload.single("file"), async (req, res) => {
    try {
      const jwtUser = (req as any).user;
      const user = await storage.getUser(jwtUser.id) || jwtUser;
      const multerFile = req.file;
      if (!multerFile) return res.status(400).json({ message: "No file uploaded" });

      const email = (user as any).email || `user${user.id}@platform.local`;
      const ticket = await storage.getOrCreateTicketForUser(user.id, user.username, email);
      if (ticket.status === "closed") return res.status(400).json({ message: "This ticket is closed." });

      const attachmentPath = `/uploads/support/${multerFile.filename}`;
      const messageText = (req.body.message || "").trim() || "📎 Image attachment";

      const msg = await storage.createSupportMessage({
        ticketId: ticket.id,
        senderType: "user",
        senderId: user.id,
        message: messageText,
        attachment: attachmentPath,
      });

      await storage.updateSupportTicket(ticket.id, {
        status: "open",
        lastMessageAt: new Date(),
        unreadByAdmin: (ticket.unreadByAdmin || 0) + 1,
      });

      try {
        const io = getIO();
        io.to(`ticket_${ticket.id}`).emit("support_new_message", { message: msg, ticket: { ...ticket, status: "open" } });
        io.to(`ticket_${ticket.id}`).emit("support_new_attachment", { message: msg, ticketId: ticket.id });
        io.to("admins").emit("support_new_ticket_message", { ticketId: ticket.id, userId: user.id, username: user.username });
      } catch (_) {}

      res.json({ message: msg, ticket });
    } catch (err: any) {
      if (err.message?.includes("Only PNG")) {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Admin sends a reply
  app.post("/api/admin/support/chat/reply", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const admin = (req as any).user;
      const { ticketId, message } = req.body;
      if (!ticketId || !message?.trim()) return res.status(400).json({ message: "ticketId and message are required" });

      const ticket = await storage.getSupportTicket(Number(ticketId));
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.status === "closed") return res.status(400).json({ message: "Ticket is closed" });

      const msg = await storage.createSupportMessage({
        ticketId: Number(ticketId),
        senderType: "admin",
        senderId: admin.id,
        message: message.trim(),
      });

      await storage.updateSupportTicket(Number(ticketId), {
        status: "replied",
        repliedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByUser: (ticket.unreadByUser || 0) + 1,
      });

      try {
        const io = getIO();
        io.to(`ticket_${ticketId}`).emit("support_admin_reply", { message: msg, ticketId: Number(ticketId) });
        if (ticket.userId) {
          io.to(`user_${ticket.userId}`).emit("support_admin_reply", { message: msg, ticketId: Number(ticketId) });
        }
      } catch (_) {}

      res.json({ message: msg });
    } catch (err) {
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  // Admin list all chat tickets — deduplicated: 1 thread per user (latest non-closed first)
  app.get("/api/admin/support/chat/tickets", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const allTickets = await storage.getAllSupportTickets();

      // Deduplicate: for each userId keep the latest non-closed ticket, or the latest closed one if all closed
      const byUser = new Map<number | null, typeof allTickets[0]>();
      for (const t of allTickets) {
        const key = t.userId ?? t.id; // anonymous tickets use their own id as key
        const existing = byUser.get(key);
        if (!existing) {
          byUser.set(key, t);
        } else {
          // Prefer non-closed over closed; among same status prefer more recent id
          const existingClosed = existing.status === "closed";
          const currentClosed = t.status === "closed";
          if (existingClosed && !currentClosed) {
            byUser.set(key, t); // replace closed with non-closed
          } else if (existingClosed === currentClosed && t.id > existing.id) {
            byUser.set(key, t); // same status, take the newer one
          }
        }
      }

      const deduped = Array.from(byUser.values()).sort((a, b) => {
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt!).getTime();
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt!).getTime();
        return bt - at;
      });

      // Enrich with last message
      const enriched = await Promise.all(deduped.map(async (t) => {
        const messages = await storage.getSupportMessagesByTicketId(t.id);
        const lastMsg = messages[messages.length - 1];
        return { ...t, lastMessage: lastMsg?.message || null, messageCount: messages.length };
      }));

      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get unread count for user (for badge)
  app.get("/api/support/chat/unread", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const tickets = await storage.getSupportTicketsByUserId(user.id);
      const unread = tickets.reduce((sum, t) => sum + (t.unreadByUser || 0), 0);
      res.json({ unread });
    } catch (err) {
      res.json({ unread: 0 });
    }
  });

  // Admin status endpoint
  app.get("/api/support/chat/admin-status", authenticateToken, async (req, res) => {
    res.json({ online: connectedAdmins.size > 0 });
  });

  // --- Loans ---
  app.post("/api/loans", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { amount, term } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      if (!["7", "14", "30", "60", "90"].includes(term)) {
        return res.status(400).json({ message: "Invalid loan term" });
      }

      const dailyInterest = 0.05;
      const termDays = parseInt(term);
      const totalInterest = parseFloat((amount * dailyInterest / 100 * termDays).toFixed(2));
      const serviceFee = parseFloat((amount * 0.01).toFixed(2));
      const totalRepayment = parseFloat((amount + totalInterest + serviceFee).toFixed(2));

      const loan = await storage.createLoan({
        userId,
        amount: amount.toString(),
        term,
        dailyInterest: dailyInterest.toString(),
        totalInterest: totalInterest.toString(),
        serviceFee: serviceFee.toString(),
        totalRepayment: totalRepayment.toString(),
      });

      res.json(loan);
    } catch (err) {
      res.status(500).json({ message: "Failed to create loan request" });
    }
  });

  app.get("/api/loans", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userLoans = await storage.getLoansByUserId(userId);
      res.json(userLoans);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/admin/loans", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).user;
      const allLoans = await storage.getAllLoans();
      if (adminUser.role === "SUPER_ADMIN") {
        res.json(allLoans);
      } else {
        const userIds = await getAdminUserIds(adminUser.id);
        res.json(allLoans.filter(l => userIds.includes(l.userId)));
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.post("/api/admin/loans/:id/approve", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;
      const adminId = adminUser.id;
      const { note } = req.body;

      const loan = await storage.getLoan(Number(id));
      if (!loan) return res.status(404).json({ message: "Loan not found" });
      if (loan.status !== "PENDING") return res.status(400).json({ message: "Loan already reviewed" });

      const user = await storage.getUser(loan.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (adminUser.role !== "SUPER_ADMIN" && user.assignedAdmin !== adminUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const newBalance = (parseFloat(user.usdtBalance) + parseFloat(loan.amount)).toFixed(2);
      await storage.updateUser(loan.userId, { usdtBalance: newBalance });

      await storage.updateLoan(Number(id), {
        status: "APPROVED",
        adminNote: note || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      res.json({ message: "Loan approved and funds credited" });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve loan" });
    }
  });

  app.post("/api/admin/loans/:id/reject", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;
      const adminId = adminUser.id;
      const { note } = req.body;

      const loan = await storage.getLoan(Number(id));
      if (!loan) return res.status(404).json({ message: "Loan not found" });
      if (loan.status !== "PENDING") return res.status(400).json({ message: "Loan already reviewed" });
      
      if (adminUser.role !== "SUPER_ADMIN") {
        const loanUser = await storage.getUser(loan.userId);
        if (!loanUser || loanUser.assignedAdmin !== adminUser.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.updateLoan(Number(id), {
        status: "REJECTED",
        adminNote: note || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      res.json({ message: "Loan rejected" });
    } catch (err) {
      res.status(500).json({ message: "Failed to reject loan" });
    }
  });

  // --- Migrate user IDs to start at 1000 ---
  async function migrateUserIds() {
    try {
      const result = await pool.query("SELECT MIN(id) as min_id FROM users");
      const minId = result.rows[0]?.min_id;
      if (minId !== null && minId < 1000) {
        const usersResult = await pool.query("SELECT id FROM users ORDER BY id ASC");
        const userIds = usersResult.rows.map((r: any) => r.id);

        const offset = 1000 - Math.min(...userIds);

        await pool.query("BEGIN");
        for (const oldId of [...userIds].reverse()) {
          const newId = oldId + offset;
          await pool.query("UPDATE trades SET user_id = $1 WHERE user_id = $2", [newId, oldId]);
          await pool.query("UPDATE deposits SET user_id = $1 WHERE user_id = $2", [newId, oldId]);
          await pool.query("UPDATE withdrawals SET user_id = $1 WHERE user_id = $2", [newId, oldId]);
        }
        for (const oldId of [...userIds].reverse()) {
          const newId = oldId + offset;
          await pool.query("UPDATE users SET id = $1 WHERE id = $2", [newId, oldId]);
        }
        const maxNewId = Math.max(...userIds) + offset;
        await pool.query(`SELECT setval('users_id_seq', $1, true)`, [maxNewId]);
        await pool.query("COMMIT");
        console.log(`Migrated user IDs: offset +${offset}, sequence set to ${maxNewId}`);
      }
    } catch (err) {
      await pool.query("ROLLBACK").catch(() => {});
      console.error("User ID migration error:", err);
    }
  }

  // --- Admin: My Referrals ---
  app.get("/api/admin/my-referrals", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).user;
      const referredUsers = await storage.getUsersByAssignedAdmin(adminUser.id);
      const safeUsers = referredUsers.map(u => {
        const { password, ...s } = u;
        return s;
      });
      
      const admin = await storage.getUser(adminUser.id);
      res.json({
        referralCode: admin?.referralCode || null,
        totalUsers: safeUsers.length,
        users: safeUsers,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch referral data" });
    }
  });

  // --- Super Admin: Referral Stats (all admins) ---
  app.get("/api/admin/referral-stats", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === "ADMIN" || u.role === "SUPER_ADMIN");
      
      const stats = admins.map(admin => {
        const referredUsers = allUsers.filter(u => u.assignedAdmin === admin.id);
        return {
          adminId: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          referralCode: admin.referralCode || "N/A",
          totalUsers: referredUsers.length,
        };
      });
      
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // --- Seed Data ---
  async function seed() {
    await migrateUserIds();
    const admin = await storage.getUserByUsername("admin");
    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const referralCode = await getUniqueReferralCode("ADM");
      await storage.createUser({
        username: "admin",
        email: "admin@altcryptotrade.com",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        usdtBalance: "1000000",
        verificationStatus: "VERIFIED",
        referralCode,
      });
      console.log("Admin account created: admin / admin123");
    } else {
      if (admin.role === "ADMIN") {
        await storage.updateUser(admin.id, { role: "SUPER_ADMIN" });
      }
      if (!admin.referralCode) {
        const referralCode = await getUniqueReferralCode("ADM");
        await storage.updateUser(admin.id, { referralCode });
        console.log("Admin referral code generated:", referralCode);
      }
    }

    const allUsers = await storage.getAllUsers();
    for (const u of allUsers) {
      if (!u.referralCode) {
        const prefix = (u.role === "ADMIN" || u.role === "SUPER_ADMIN") ? "ADM" : "USR";
        const code = await getUniqueReferralCode(prefix);
        await storage.updateUser(u.id, { referralCode: code });
        console.log(`Backfilled referral code for ${u.username}: ${code}`);
      }
    }

    const demo = await storage.getUserByUsername("demo");
    if (!demo) {
      const hashedPassword = await bcrypt.hash("demo1234", 10);
      const referralCode = await getUniqueReferralCode("USR");
      await storage.createUser({
        username: "demo",
        email: "demo@altcryptotrade.com",
        password: hashedPassword,
        role: "USER",
        usdtBalance: "100000",
        verificationStatus: "VERIFIED",
        phone: "+1234567890",
        referralCode,
      });
      console.log("Demo account created: demo / demo1234 (balance: 100,000 USDT)");
    } else if (!demo.referralCode) {
      const referralCode = await getUniqueReferralCode("USR");
      await storage.updateUser(demo.id, { referralCode });
    }
  }
  
  // --- Periodic Portfolio Snapshot Job ---
  // Runs every 20 minutes: saves a market-priced portfolio snapshot for every user
  // so the portfolio chart reflects real market movement even without trading activity.
  const PORTFOLIO_SNAPSHOT_INTERVAL = 20 * 60 * 1000;
  setInterval(async () => {
    try {
      if (marketCache.data.length === 0) return;

      const priceOf = (symbol: string): number => {
        const item = marketCache.data.find((d: any) => d.symbol === symbol);
        return item ? (parseFloat(String(item.lastPrice)) || 0) : 0;
      };
      const btcPrice = priceOf("BTCUSDT");
      const ethPrice = priceOf("ETHUSDT");
      const bnbPrice = priceOf("BNBUSDT");

      const allUsers = await storage.getAllUsers();
      for (const u of allUsers) {
        const total =
          Number(u.usdtBalance || 0) +
          Number(u.usdcBalance || 0) +
          Number(u.btcBalance || 0) * btcPrice +
          Number(u.ethBalance || 0) * ethPrice +
          Number(u.bnbBalance || 0) * bnbPrice;
        if (total <= 0) continue;
        storage.createPortfolioSnapshot(u.id, total).catch(() => {});
      }
    } catch (err) {
      console.error("[portfolio-job] snapshot error:", err);
    }
  }, PORTFOLIO_SNAPSHOT_INTERVAL);

  seed();

  return httpServer;
}
