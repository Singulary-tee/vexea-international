/**
 * API Rate Limiters
 * Single responsibility: bound request volume per client IP. `strictLimiter`
 * guards auth-adjacent and economy mutations; `generalLimiter` covers the rest
 * of the REST surface. Loopback server-to-server traffic is exempt.
 */

import rateLimit from "express-rate-limit";
import type { Request } from "express";

const MINUTE_MS = 60 * 1000;

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function isLoopback(req: Request): boolean {
  return LOOPBACK_ADDRESSES.has(req.ip || "");
}

function getClientRateLimitKey(req: Request): string {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return `token:${auth.slice(7).trim()}`;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export const strictLimiter = rateLimit({
  windowMs: MINUTE_MS,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: getClientRateLimitKey,
  skip: isLoopback,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests." },
  },
});

export const generalLimiter = rateLimit({
  windowMs: MINUTE_MS,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: getClientRateLimitKey,
  skip: isLoopback,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests." },
  },
});
