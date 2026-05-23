import { getSupabaseServer } from "@/lib/supabase/server";

export const AI_LIMIT_PER_DAY = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date | null;
  /** True when no backend is available; we fail open in that case. */
  bypassed?: boolean;
}

/**
 * Per-IP daily rate limiter for the AI interpret endpoint, backed by Supabase.
 *
 * Reads the current window for this IP, decides if the call is allowed, and
 * (on allow) increments the counter. Race conditions are tolerated — at most a
 * few extra requests slip through, which is fine for a soft abuse limit.
 *
 * If Supabase isn't configured or a query fails, we fail OPEN (allow) so a
 * transient backend hiccup doesn't break the feature for legitimate users.
 */
export async function checkAiRateLimit(ip: string): Promise<RateLimitResult> {
  const client = getSupabaseServer();
  if (!client) return { allowed: true, remaining: AI_LIMIT_PER_DAY, resetAt: null, bypassed: true };

  try {
    const { data } = await client
      .from("ai_rate_limits")
      .select("count, window_start")
      .eq("ip", ip)
      .maybeSingle();

    const now = new Date();
    let count = 0;
    let windowStart = now;

    if (data) {
      const start = new Date(data.window_start);
      if (now.getTime() - start.getTime() < WINDOW_MS) {
        count = data.count;
        windowStart = start;
      }
      // else: window expired, reset (count stays 0, windowStart stays now)
    }

    if (count >= AI_LIMIT_PER_DAY) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(windowStart.getTime() + WINDOW_MS),
      };
    }

    await client.from("ai_rate_limits").upsert({
      ip,
      count: count + 1,
      window_start: count === 0 ? now.toISOString() : windowStart.toISOString(),
    });

    return {
      allowed: true,
      remaining: AI_LIMIT_PER_DAY - count - 1,
      resetAt: new Date(windowStart.getTime() + WINDOW_MS),
    };
  } catch {
    // Fail open on backend hiccups so legitimate users aren't blocked.
    return { allowed: true, remaining: AI_LIMIT_PER_DAY, resetAt: null, bypassed: true };
  }
}

/** Pull the calling IP from common proxy headers, with a stable fallback. */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}
