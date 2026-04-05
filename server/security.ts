import type { Request } from "express";

export const getUserIP = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return (req.socket?.remoteAddress ?? req.ip ?? "unknown").replace("::ffff:", "");
};

export interface GeoData {
  country_name?: string;
  city?: string;
  region?: string;
  timezone?: string;
  org?: string;
  error?: boolean;
}

const PRIVATE_IP_RANGES = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost)/;

export const getGeoData = async (ip: string): Promise<GeoData | null> => {
  try {
    if (!ip || ip === "unknown" || PRIVATE_IP_RANGES.test(ip)) {
      return null;
    }
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as GeoData;
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
};
