import { z } from 'zod';
import { insertUserSchema, insertTradeSchema, insertDepositSchema, insertWithdrawalSchema, insertDepositWalletSchema, users, trades, deposits, withdrawals, auditLogs, depositWallets } from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Authentication Schemas
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().min(7, "Phone number is too short").regex(/^\+\d{7,15}$/, "Invalid phone number format").optional().or(z.literal("")),
  referralCode: z.string().optional().or(z.literal("")),
});

// API Contract
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  trades: {
    create: {
      method: 'POST' as const,
      path: '/api/trades' as const,
      input: insertTradeSchema,
      responses: {
        201: z.custom<typeof trades.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/trades' as const,
      responses: {
        200: z.array(z.custom<typeof trades.$inferSelect>()),
      },
    },
  },
  kyc: {
    submit: {
      method: 'POST' as const,
      path: '/api/kyc' as const,
      input: z.any(), // FormData handled by middleware
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  deposits: {
    create: {
      method: 'POST' as const,
      path: '/api/deposits' as const,
      input: z.any(), // FormData for proof image
      responses: {
        201: z.custom<typeof deposits.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/deposits' as const,
      responses: {
        200: z.array(z.custom<typeof deposits.$inferSelect>()),
      },
    },
  },
  withdrawals: {
    create: {
      method: 'POST' as const,
      path: '/api/withdrawals' as const,
      input: insertWithdrawalSchema,
      responses: {
        201: z.custom<typeof withdrawals.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/withdrawals' as const,
      responses: {
        200: z.array(z.custom<typeof withdrawals.$inferSelect>()),
      },
    },
  },
  market: {
    prices: {
      method: 'GET' as const,
      path: '/api/market/prices' as const,
      responses: {
        200: z.record(z.string(), z.string()), // Symbol -> Price
      },
    },
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    kycReview: {
      method: 'POST' as const,
      path: '/api/admin/kyc/:userId/review' as const,
      input: z.object({ status: z.enum(["VERIFIED", "REJECTED"]), reason: z.string().optional() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    depositReview: {
      method: 'POST' as const,
      path: '/api/admin/deposits/:id/review' as const,
      input: z.object({ status: z.enum(["APPROVED", "REJECTED"]) }),
      responses: {
        200: z.custom<typeof deposits.$inferSelect>(),
      },
    },
    deposits: {
      method: 'GET' as const,
      path: '/api/admin/deposits' as const,
      responses: {
        200: z.array(z.custom<typeof deposits.$inferSelect>()),
      },
    },
    withdrawals: {
      method: 'GET' as const,
      path: '/api/admin/withdrawals' as const,
      responses: {
        200: z.array(z.custom<typeof withdrawals.$inferSelect>()),
      },
    },
    withdrawalReview: {
      method: 'POST' as const,
      path: '/api/admin/withdrawals/:id/review' as const,
      input: z.object({ status: z.enum(["APPROVED", "REJECTED"]) }),
      responses: {
        200: z.custom<typeof withdrawals.$inferSelect>(),
      },
    },
    tradeControl: {
      method: 'POST' as const,
      path: '/api/admin/trades/:id/control' as const,
      input: z.object({ controlMode: z.enum(["NORMAL", "FORCE_WIN", "FORCE_LOSE"]) }),
      responses: {
        200: z.custom<typeof trades.$inferSelect>(),
      },
    },
    userTradeControl: {
      method: 'POST' as const,
      path: '/api/admin/user/:id/trade-control' as const,
      input: z.object({ tradeOutcomeControl: z.enum(["auto", "force_win", "force_lose"]) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    allTrades: {
      method: 'GET' as const,
      path: '/api/admin/trades' as const,
      responses: {
        200: z.array(z.custom<typeof trades.$inferSelect>()),
      },
    },
    depositWallets: {
      method: 'GET' as const,
      path: '/api/admin/deposit-wallets' as const,
      responses: {
        200: z.array(z.custom<typeof depositWallets.$inferSelect>()),
      },
    },
    createDepositWallet: {
      method: 'POST' as const,
      path: '/api/admin/deposit-wallet' as const,
      input: insertDepositWalletSchema,
      responses: {
        201: z.custom<typeof depositWallets.$inferSelect>(),
      },
    },
    updateDepositWallet: {
      method: 'PUT' as const,
      path: '/api/admin/deposit-wallet/:id' as const,
      input: insertDepositWalletSchema.partial(),
      responses: {
        200: z.custom<typeof depositWallets.$inferSelect>(),
      },
    },
    activateDepositWallet: {
      method: 'PATCH' as const,
      path: '/api/admin/deposit-wallet/:id/activate' as const,
      responses: {
        200: z.custom<typeof depositWallets.$inferSelect>(),
      },
    },
    deleteDepositWallet: {
      method: 'DELETE' as const,
      path: '/api/admin/deposit-wallet/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  depositWallet: {
    getByNetwork: {
      method: 'GET' as const,
      path: '/api/deposit/wallet/:network' as const,
      responses: {
        200: z.custom<typeof depositWallets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
