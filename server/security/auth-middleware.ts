/**
 * Firebase Identity Middleware
 * Single responsibility: turn an `Authorization: Bearer <firebase-id-token>`
 * header into a verified uid on the request, so economy/player handlers can
 * derive the acting player server-side instead of trusting the request body.
 */

import { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import {
  INTERNAL_SERVICE_TOKEN_HEADER,
  isInternalServiceToken,
} from "./internal-token";

export interface AuthedRequest extends Request {
  authUid?: string;
  isInternalService?: boolean;
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const internalToken = req.headers[INTERNAL_SERVICE_TOKEN_HEADER];
  if (typeof internalToken === "string" && isInternalServiceToken(internalToken)) {
    const bodyPlayerId = (req.body || {}).playerId;
    if (typeof bodyPlayerId !== "string" || !bodyPlayerId) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "playerId is required." },
      });
      return;
    }
    req.authUid = bodyPlayerId;
    req.isInternalService = true;
    next();
    return;
  }

  const idToken = readBearerToken(req);
  if (!idToken) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Missing bearer token." },
    });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.authUid = decoded.uid;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Invalid or expired token." },
    });
  }
}

/**
 * Returns the verified uid, or null after responding 403 when the body carries
 * a different playerId than the authenticated identity.
 */
export function resolveAuthedPlayerId(req: AuthedRequest, res: Response): string | null {
  const uid = req.authUid;
  if (!uid) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Missing verified identity." },
    });
    return null;
  }

  const bodyPlayerId = (req.body || {}).playerId;
  if (typeof bodyPlayerId === "string" && bodyPlayerId && bodyPlayerId !== uid) {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "playerId does not match authenticated user." },
    });
    return null;
  }

  return uid;
}
