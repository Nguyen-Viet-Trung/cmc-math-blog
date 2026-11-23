export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface BucketEntry {
  timestamps: number[];
  expiresAt: number;
}

const buckets = new Map<string, BucketEntry>();
const MAX_TRACKED_KEYS = 2000;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  nowMs: number = Date.now()
): RateLimitResult {
  const windowStart = nowMs - config.windowMs;
  const existing = buckets.get(key);
  const active = existing
    ? existing.timestamps.filter((ts) => ts > windowStart)
    : [];

  if (active.length >= config.maxRequests) {
    const oldest = active[0] ?? nowMs;
    const retryAfterMs = Math.max(1000, oldest + config.windowMs - nowMs);
    buckets.delete(key);
    buckets.set(key, {
      timestamps: active,
      expiresAt: (active[active.length - 1] ?? nowMs) + config.windowMs,
    });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  active.push(nowMs);
  buckets.delete(key);
  buckets.set(key, {
    timestamps: active,
    expiresAt: nowMs + config.windowMs,
  });

  // Dọn các key đã hết hạn theo `expiresAt` riêng của từng key (tránh xóa nhầm window dài)
  // và áp trần LRU nếu bị spam quá nhiều key khác nhau.
  if (buckets.size > MAX_TRACKED_KEYS) {
        for (const [k, entry] of buckets.entries()) {
          if (entry.timestamps.length === 0 || entry.expiresAt <= nowMs) {
            buckets.delete(k);
          }
        }
        while (buckets.size > MAX_TRACKED_KEYS) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey === undefined) break;
          buckets.delete(oldestKey);
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
