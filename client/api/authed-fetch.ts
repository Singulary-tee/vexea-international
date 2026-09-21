/**
 * Authenticated API Fetch
 * Single responsibility: attach the current Firebase ID token as a bearer
 * credential to server economy/player requests, so the server can derive the
 * acting player instead of trusting a body-supplied playerId.
 */

import { getAuth } from "firebase/auth";

export async function getIdToken(): Promise<string | null> {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    console.error("[API] Failed to retrieve Firebase ID token:", err);
    return null;
  }
}

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
