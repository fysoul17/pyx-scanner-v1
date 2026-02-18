// In-memory sliding window rate limiter (per-IP)

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

const MAX_WINDOW_MS = 60_000; // Maximum window across all tiers

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < MAX_WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  cleanup();

  let entry = store.get(ip);
  if (!entry) {
    // Evict oldest entries if store is too large
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + config.windowMs
    : now + config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetAt };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

// Pre-configured rate limit tiers
export const RATE_LIMITS = {
  check: { windowMs: 60_000, maxRequests: 60 },
  skills: { windowMs: 60_000, maxRequests: 30 },
  scan: { windowMs: 60_000, maxRequests: 10 },
} as const;
