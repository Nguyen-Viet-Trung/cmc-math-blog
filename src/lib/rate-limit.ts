export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 2000;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  nowMs: number = Date.now()
): RateLimitResult {
  const windowStart = nowMs - config.windowMs;
  const existing = buckets.get(key) ?? [];
  const active = existing.filter((ts) => ts > windowStart);

  if (active.length >= config.maxRequests) {
    const oldest = active[0] ?? nowMs;
    const retryAfterMs = Math.max(1000, oldest + config.windowMs - nowMs);
    buckets.set(key, active);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  active.push(nowMs);
  buckets.set(key, active);

  // Dọn nhẹ để tránh phình bộ nhớ khi chạy lâu dài
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, list] of buckets.entries()) {
      if (list.length === 0 || list[list.length - 1] <= windowStart) {
        buckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitStore(): void {
  buckets.clear();
}
