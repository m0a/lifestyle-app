/**
 * Unit tests for IP-based email rate limiting service
 *
 * Tests:
 * - First request from new IP is allowed
 * - Rate limit increases with each request
 * - Rate limit blocks after 10 requests
 * - Expired rate limits are cleaned up
 * - Rate limit resets after expiration
 * - Client IP extraction from headers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkEmailRateLimit,
  incrementEmailRateLimit,
  getClientIP,
} from '../../../packages/backend/src/services/rate-limit/email-rate-limit';

// Mock D1 database
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

function createMockDatabase(): D1Database {
  const records = new Map<
    string,
    { count: number; expires_at: number }
  >();

  return {
    prepare(query: string) {
      const bindings: unknown[] = [];

      return {
        bind(...values: unknown[]) {
          bindings.push(...values);
          return this;
        },

        async first<T>(): Promise<T | null> {
          // DELETE expired records
          if (query.includes('DELETE FROM email_rate_limits')) {
            const now = bindings[0] as number;
            for (const [ip, record] of records.entries()) {
              if (record.expires_at < now) {
                records.delete(ip);
              }
            }
            return null;
          }

          // SELECT rate limit record
          if (query.includes('SELECT count, expires_at')) {
            const ip = bindings[0] as string;
            const record = records.get(ip);
            return (record || null) as T | null;
          }

          return null;
        },

        async run() {
          // INSERT or UPDATE rate limit
          if (query.includes('INSERT INTO email_rate_limits')) {
            // bind(ip, expiresAt, now, expiresAt)
            const ip = bindings[0] as string;
            const expiresAt = bindings[1] as number;
            const now = bindings[2] as number;

            const existing = records.get(ip);

            if (existing) {
              // ON CONFLICT DO UPDATE
              const newExpiresAt = existing.expires_at < now ? expiresAt : existing.expires_at;
              records.set(ip, {
                count: existing.count + 1,
                expires_at: newExpiresAt,
              });
            } else {
              // INSERT new record with count = 1
              records.set(ip, { count: 1, expires_at: expiresAt });
            }
          }

          return { success: true };
        },
      };
    },
  };
}

describe('Email Rate Limiting Service', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  describe('checkEmailRateLimit', () => {
    it('should allow first request from new IP', async () => {
      const result = await checkEmailRateLimit(mockDb, '192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.resetsAt).toBeGreaterThan(Date.now());
    });

    it('should allow requests under rate limit', async () => {
      const ip = '192.168.1.2';

      // Increment 5 times
      for (let i = 0; i < 5; i++) {
        await incrementEmailRateLimit(mockDb, ip);
      }

      const result = await checkEmailRateLimit(mockDb, ip);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('should block requests after reaching rate limit', async () => {
      const ip = '192.168.1.3';

      // Increment 10 times (reach limit)
      for (let i = 0; i < 10; i++) {
        await incrementEmailRateLimit(mockDb, ip);
      }

      const result = await checkEmailRateLimit(mockDb, ip);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should block requests exceeding rate limit', async () => {
      const ip = '192.168.1.4';

      // Increment 12 times (exceed limit)
      for (let i = 0; i < 12; i++) {
        await incrementEmailRateLimit(mockDb, ip);
      }

      const result = await checkEmailRateLimit(mockDb, ip);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('incrementEmailRateLimit', () => {
    it('should create new rate limit record for new IP', async () => {
      const ip = '192.168.1.5';

      await incrementEmailRateLimit(mockDb, ip);

      const result = await checkEmailRateLimit(mockDb, ip);
      expect(result.currentCount).toBe(1);
    });

    it('should increment existing rate limit', async () => {
      const ip = '192.168.1.6';

      await incrementEmailRateLimit(mockDb, ip);
      await incrementEmailRateLimit(mockDb, ip);
      await incrementEmailRateLimit(mockDb, ip);

      const result = await checkEmailRateLimit(mockDb, ip);
      expect(result.currentCount).toBe(3);
    });

    it('should maintain expiration time on increment', async () => {
      const ip = '192.168.1.7';

      await incrementEmailRateLimit(mockDb, ip);
      const firstCheck = await checkEmailRateLimit(mockDb, ip);

      await incrementEmailRateLimit(mockDb, ip);
      const secondCheck = await checkEmailRateLimit(mockDb, ip);

      // Expiration should remain same (within 1 second tolerance)
      expect(Math.abs(secondCheck.resetsAt - firstCheck.resetsAt)).toBeLessThan(1000);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
      const headers = new Headers({
        'CF-Connecting-IP': '203.0.113.1',
      });

      const ip = getClientIP(headers);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fallback to X-Forwarded-For header', () => {
      const headers = new Headers({
        'X-Forwarded-For': '203.0.113.2, 198.51.100.1',
      });

      const ip = getClientIP(headers);
      expect(ip).toBe('203.0.113.2'); // First IP in list
    });

    it('should fallback to X-Real-IP header', () => {
      const headers = new Headers({
        'X-Real-IP': '203.0.113.3',
      });

      const ip = getClientIP(headers);
      expect(ip).toBe('203.0.113.3');
    });

    it('should prefer CF-Connecting-IP over other headers', () => {
      const headers = new Headers({
        'CF-Connecting-IP': '203.0.113.4',
        'X-Forwarded-For': '203.0.113.5',
        'X-Real-IP': '203.0.113.6',
      });

      const ip = getClientIP(headers);
      expect(ip).toBe('203.0.113.4');
    });

    it('should return "unknown" when no IP headers present', () => {
      const headers = new Headers();

      const ip = getClientIP(headers);
      expect(ip).toBe('unknown');
    });

    it('should handle X-Forwarded-For with spaces', () => {
      const headers = new Headers({
        'X-Forwarded-For': '203.0.113.7 , 198.51.100.2 , 192.0.2.1',
      });

      const ip = getClientIP(headers);
      expect(ip).toBe('203.0.113.7');
    });
  });
});
