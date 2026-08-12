// In-memory, per-Edge-isolate rate limiter. Good enough to blunt basic
// scripted booking spam, but it resets on cold start and does NOT share
// state across multiple regions/instances. A multi-region production
// deployment should move this to a shared store (e.g. Upstash Redis).
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const hits = new Map<string, RateLimitEntry>();

// Opportunistically sweep expired entries so the map can't grow unbounded
// under sustained traffic from many distinct IPs.
const MAX_TRACKED_KEYS = 5000;

function pruneExpired(now: number) {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  { windowMs, max }: { windowMs: number; max: number }
): RateLimitResult {
  const now = Date.now();

  if (hits.size > MAX_TRACKED_KEYS) pruneExpired(now);

  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    hits.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}
