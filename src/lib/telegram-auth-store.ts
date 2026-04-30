import crypto from "crypto";

// In-memory store for Telegram auth tokens (resets on server restart)
const tokenStore = new Map<string, { createdAt: number; userData: Record<string, string> | null }>();

// Cleanup expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  tokenStore.forEach((v, k) => {
    // Delete tokens older than 5 min (with or without userData)
    if (now - v.createdAt > 300000) tokenStore.delete(k);
  });
}, 60000);

export function getTokenStore() { return tokenStore; }

export function generateToken() {
  const token = crypto.randomBytes(16).toString("hex");
  tokenStore.set(token, { createdAt: Date.now(), userData: null });
  return token;
}
