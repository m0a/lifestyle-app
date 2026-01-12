/**
 * IP-based rate limiting service for email delivery
 *
 * Limits:
 * - 10 emails per hour per IP address
 * - Automatic cleanup of expired records
 * - UPSERT pattern for atomic increment
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Current count for this IP
   */
  currentCount: number;

  /**
   * Maximum allowed count
   */
  limit: number;

  /**
   * When the rate limit resets (UNIX timestamp in ms)
   */
  resetsAt: number;
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if an IP address is rate limited for email sending
 *
 * @param db - D1 database instance
 * @param ip - Client IP address
 * @returns Rate limit result
 */
export async function checkEmailRateLimit(
  db: D1Database,
  ip: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const expiresAt = now + RATE_LIMIT_WINDOW_MS;

  // Clean up expired records first (optimization: only when checking rate limit)
  await db
    .prepare('DELETE FROM email_rate_limits WHERE expires_at < ?')
    .bind(now)
    .run();

  // Get current rate limit record
  const record = await db
    .prepare('SELECT count, expires_at FROM email_rate_limits WHERE ip = ?')
    .bind(ip)
    .first<{ count: number; expires_at: number }>();

  if (!record) {
    // No record exists - first request from this IP
    return {
      allowed: true,
      currentCount: 0,
      limit: RATE_LIMIT_MAX,
      resetsAt: expiresAt,
    };
  }

  // Check if rate limit exceeded
  if (record.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      currentCount: record.count,
      limit: RATE_LIMIT_MAX,
      resetsAt: record.expires_at,
    };
  }

  // Rate limit not exceeded
  return {
    allowed: true,
    currentCount: record.count,
    limit: RATE_LIMIT_MAX,
    resetsAt: record.expires_at,
  };
}

/**
 * Increment rate limit counter for an IP address
 *
 * @param db - D1 database instance
 * @param ip - Client IP address
 */
export async function incrementEmailRateLimit(
  db: D1Database,
  ip: string
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + RATE_LIMIT_WINDOW_MS;

  // UPSERT: Insert new record or increment existing
  await db
    .prepare(
      `INSERT INTO email_rate_limits (ip, count, expires_at)
       VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET
         count = count + 1,
         expires_at = CASE
           WHEN expires_at < ? THEN ?
           ELSE expires_at
         END`
    )
    .bind(ip, expiresAt, now, expiresAt)
    .run();
}

/**
 * Get client IP address from request headers
 *
 * Checks headers in order:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (proxy)
 * 3. X-Real-IP (nginx)
 *
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIP(headers: Headers): string {
  // Cloudflare Workers provides CF-Connecting-IP
  const cfIP = headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Fallback to X-Forwarded-For
  const forwardedFor = headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // Take first IP in the list
    const firstIP = forwardedFor.split(',')[0];
    return firstIP ? firstIP.trim() : 'unknown';
  }

  // Fallback to X-Real-IP
  const realIP = headers.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
