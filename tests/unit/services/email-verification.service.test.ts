/**
 * Unit tests for email verification service (resend rate limiting, #132)
 *
 * Tests:
 * - sendVerificationEmail inserts a token and sends the email
 * - resendVerificationEmail rejects unknown / already-verified users
 * - Resend limit is enforced self-correctingly: the token is inserted first,
 *   then counted INCLUDING itself; over the limit the just-inserted token is
 *   invalidated and no email is sent
 * - Under the limit, old unused tokens are invalidated and the email is sent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

const { mockOrm, sendEmailMock, insertValuesMock, updateSetMock, updateWhereMock } = vi.hoisted(
  () => {
    const insertValuesMock = vi.fn().mockResolvedValue(undefined);
    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const mockOrm = {
      query: {
        users: { findFirst: vi.fn() },
        emailVerificationTokens: { findFirst: vi.fn() },
      },
      insert: vi.fn(() => ({ values: insertValuesMock })),
      update: vi.fn(() => ({ set: updateSetMock })),
    };
    return {
      mockOrm,
      sendEmailMock: vi.fn(),
      insertValuesMock,
      updateSetMock,
      updateWhereMock,
    };
  }
);

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockOrm),
}));

vi.mock('../../../packages/backend/src/services/email/email.service', () => ({
  sendEmail: sendEmailMock,
}));

import {
  sendVerificationEmail,
  resendVerificationEmail,
} from '../../../packages/backend/src/services/email/email-verification.service';

/**
 * Raw D1 mock: only the COUNT(*) query used by the resend rate limit goes
 * through db.prepare; everything else goes through the (mocked) drizzle ORM.
 */
function createMockD1(recentTokenCount: () => number): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(async () => ({ count: recentTokenCount() })),
    })),
  } as unknown as D1Database;
}

const ARGS = ['user-1', 'user@example.com', 'api-key', 'noreply@yasedas.com', 'https://app'] as const;

describe('Email Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should insert a token hash and send the email', async () => {
      const db = createMockD1(() => 0);
      sendEmailMock.mockResolvedValue({ success: true });

      const result = await sendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.token).toHaveLength(32);
      }

      // Token hash (not the raw token) is stored
      expect(insertValuesMock).toHaveBeenCalledTimes(1);
      const inserted = insertValuesMock.mock.calls[0]?.[0] as { token: string };
      expect(inserted.token).toMatch(/^[0-9a-f]{64}$/);

      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it('should report failure when email delivery fails', async () => {
      const db = createMockD1(() => 0);
      sendEmailMock.mockResolvedValue({ success: false, error: 'delivery failed' });

      const result = await sendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('delivery failed');
      }
    });
  });

  describe('resendVerificationEmail', () => {
    it('should reject when user is not found', async () => {
      const db = createMockD1(() => 0);
      mockOrm.query.users.findFirst.mockResolvedValue(undefined);

      const result = await resendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ユーザーが見つかりません');
      }
      expect(insertValuesMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should reject when email is already verified', async () => {
      const db = createMockD1(() => 0);
      mockOrm.query.users.findFirst.mockResolvedValue({ id: 'user-1', emailVerified: 1 });

      const result = await resendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('メールアドレスは既に確認済みです');
      }
      expect(insertValuesMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should send the email when within the limit (count including new token <= 3)', async () => {
      // 2 existing tokens + the newly inserted one = 3 -> allowed
      const db = createMockD1(() => 3);
      mockOrm.query.users.findFirst.mockResolvedValue({ id: 'user-1', emailVerified: 0 });
      sendEmailMock.mockResolvedValue({ success: true });

      const result = await resendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(true);
      expect(insertValuesMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);

      // Old unused tokens are invalidated (usedAt set)
      expect(updateSetMock).toHaveBeenCalledTimes(1);
      expect(updateSetMock.mock.calls[0]?.[0]).toEqual({ usedAt: expect.any(Number) });
    });

    it('should rate limit and self-correct when count including new token exceeds 3 (#132)', async () => {
      // 3 existing tokens + the newly inserted one = 4 -> over the limit.
      // This is exactly the concurrent-race outcome: the token was already
      // inserted, so the service must invalidate it and not send any email.
      const db = createMockD1(() => 4);
      mockOrm.query.users.findFirst.mockResolvedValue({ id: 'user-1', emailVerified: 0 });

      const result = await resendVerificationEmail(db, ...ARGS);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          '確認メールの送信回数が上限に達しました。しばらくしてから再度お試しください'
        );
      }

      // Token was inserted first (insert-then-count strategy) ...
      expect(insertValuesMock).toHaveBeenCalledTimes(1);
      // ... and the just-inserted token was invalidated (self-correction)
      expect(updateSetMock).toHaveBeenCalledTimes(1);
      expect(updateSetMock.mock.calls[0]?.[0]).toEqual({ usedAt: expect.any(Number) });
      expect(updateWhereMock).toHaveBeenCalledTimes(1);

      // No email goes out for the over-limit request
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should not invalidate older tokens when rate limited', async () => {
      const db = createMockD1(() => 4);
      mockOrm.query.users.findFirst.mockResolvedValue({ id: 'user-1', emailVerified: 0 });

      await resendVerificationEmail(db, ...ARGS);

      // Exactly one update: the just-inserted token. The bulk invalidation of
      // old unused tokens must NOT run on the rate-limited path, so previous
      // verification links stay usable.
      expect(mockOrm.update).toHaveBeenCalledTimes(1);
    });
  });
});
