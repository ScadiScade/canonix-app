// Simple in-memory rate limiter for API routes.
// For production at scale, replace with Upstash Redis @upstash/ratelimit.

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Cleanup expired entries every 60s
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (now > entry.resetAt) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => store.delete(key));
}, 60_000);

export interface RateLimitOpts {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

/**
 * Check rate limit for a given key (e.g. userId or IP).
 * Returns { allowed, remaining, resetAt }.
 */
export function rateLimit(key: string, opts: RateLimitOpts): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + opts.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }

  if (entry.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt };
}

/** Per-route rate limit presets */
export const RATE_LIMITS = {
  auth: { limit: 10, windowSec: 60 },       // login/register: 10/min
  ai: { limit: 20, windowSec: 60 },         // AI generation: 20/min
  api: { limit: 60, windowSec: 60 },        // General API: 60/min
  invite: { limit: 5, windowSec: 300 },     // Team invites: 5/5min
} as const;

/** Helper: apply rate limit to a request, return error response if limited */
export function checkRateLimit(userId: string, preset: keyof typeof RATE_LIMITS): Response | null {
  const result = rateLimit(`rl:${preset}:${userId}`, RATE_LIMITS[preset]);
  if (!result.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    });
  }
  return null;
}
