/**
 * Email Verification Service
 *
 * Handles email address verification for new user signups
 *
 * Features:
 * - Generate verification tokens (32 chars, 24-hour expiration)
 * - Send verification emails via Resend
 * - Verify email with token
 * - Resend verification email (with rate limiting)
 */

import type { D1Database } from '@cloudflare/workers-types';
import { eq, and, isNull, gt, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { generateSecureToken, hashToken } from '../token/crypto';
import { sendEmail } from './email.service';
import { emailVerificationTemplate } from './templates/email-verification';

const EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_RATE_LIMIT_PER_HOUR = 3; // max tokens issued per user per hour
const RESEND_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type Orm = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Generate a new verification token and insert its hash into the database.
 * Only the SHA-256 hash is stored; the raw token goes in the verification
 * link (#98).
 */
async function insertVerificationToken(
  orm: Orm,
  userId: string
): Promise<{ token: string; tokenHash: string }> {
  const token = await generateSecureToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();

  await orm.insert(schema.emailVerificationTokens).values({
    userId,
    token: tokenHash,
    expiresAt: now + EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS,
    usedAt: null,
    createdAt: now,
  });

  return { token, tokenHash };
}

/**
 * Send the verification email carrying the raw token.
 */
async function deliverVerificationEmail(
  db: D1Database,
  userId: string,
  email: string,
  resendApiKey: string,
  fromEmail: string,
  frontendUrl: string,
  token: string
): Promise<{ success: true } | { success: false; error: string }> {
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

  const emailResult = await sendEmail(db, resendApiKey, fromEmail, {
    to: email,
    subject: 'メールアドレスの確認',
    html: emailVerificationTemplate(verificationLink, email),
    emailType: 'email_verification',
    userId,
  });

  if (!emailResult.success) {
    return { success: false, error: emailResult.error || 'メール送信に失敗しました' };
  }

  return { success: true };
}

/**
 * Send verification email to newly registered user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param email - User's email address
 * @param resendApiKey - Resend API key
 * @param fromEmail - Sender email address
 * @param frontendUrl - Frontend URL for verification link
 * @returns Success/error result with token (for testing)
 */
export async function sendVerificationEmail(
  db: D1Database,
  userId: string,
  email: string,
  resendApiKey: string,
  fromEmail: string,
  frontendUrl: string
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });

  try {
    const { token } = await insertVerificationToken(orm, userId);

    const emailResult = await deliverVerificationEmail(
      db,
      userId,
      email,
      resendApiKey,
      fromEmail,
      frontendUrl,
      token
    );

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    return { success: true, token }; // Return token for testing
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました',
    };
  }
}

/**
 * Verify email address with token
 *
 * @param db - D1 database instance
 * @param token - Verification token
 * @returns Success/error result
 */
export async function verifyEmail(
  db: D1Database,
  token: string
): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });
  const now = Date.now();

  try {
    // Look up by the token's hash (raw token is never stored).
    const tokenHash = await hashToken(token);

    // Find valid token (not used, not expired)
    const tokenRecord = await orm.query.emailVerificationTokens.findFirst({
      where: and(
        eq(schema.emailVerificationTokens.token, tokenHash),
        isNull(schema.emailVerificationTokens.usedAt),
        gt(schema.emailVerificationTokens.expiresAt, now)
      ),
    });

    if (!tokenRecord) {
      return { success: false, error: '無効なトークンまたは期限切れです' };
    }

    // Mark token as used
    await orm
      .update(schema.emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(schema.emailVerificationTokens.id, tokenRecord.id));

    // Update user's email_verified status
    await orm
      .update(schema.users)
      .set({ emailVerified: 1 })
      .where(eq(schema.users.id, tokenRecord.userId));

    return { success: true, userId: tokenRecord.userId };
  } catch (error) {
    console.error('Error verifying email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メールアドレスの確認に失敗しました',
    };
  }
}

/**
 * Resend verification email to authenticated user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param email - User's email address
 * @param resendApiKey - Resend API key
 * @param fromEmail - Sender email address
 * @param frontendUrl - Frontend URL for verification link
 * @returns Success/error result
 */
export async function resendVerificationEmail(
  db: D1Database,
  userId: string,
  email: string,
  resendApiKey: string,
  fromEmail: string,
  frontendUrl: string
): Promise<{ success: true } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });

  try {
    // Check if email already verified
    const user = await orm.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }

    if (user.emailVerified === 1) {
      return { success: false, error: 'メールアドレスは既に確認済みです' };
    }

    // Rate limit: max 3 tokens per user per hour.
    //
    // A pre-insert COUNT check alone is racy (#132): two concurrent requests
    // can both pass the check and over-issue. D1 has no interactive
    // transactions, so instead the limit is enforced self-correctingly:
    // insert the new token FIRST, then count tokens created in the last hour
    // INCLUDING the new one. Every request that sees the count above the
    // limit invalidates its own just-inserted token and bails out before any
    // email is sent, so concurrent over-issuance corrects itself.
    const { token, tokenHash } = await insertVerificationToken(orm, userId);

    const oneHourAgo = Date.now() - RESEND_RATE_LIMIT_WINDOW_MS;
    const recentTokens = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM email_verification_tokens
         WHERE user_id = ? AND created_at > ?`
      )
      .bind(userId, oneHourAgo)
      .first<{ count: number }>();

    if (recentTokens && recentTokens.count > RESEND_RATE_LIMIT_PER_HOUR) {
      // Over the limit: invalidate the token we just inserted. Older tokens
      // stay valid, so a rate-limited resend does not kill previous links.
      await orm
        .update(schema.emailVerificationTokens)
        .set({ usedAt: Date.now() })
        .where(eq(schema.emailVerificationTokens.token, tokenHash));

      return {
        success: false,
        error: '確認メールの送信回数が上限に達しました。しばらくしてから再度お試しください',
      };
    }

    // Within the limit: invalidate old unused tokens (the new one stays valid)
    await orm
      .update(schema.emailVerificationTokens)
      .set({ usedAt: Date.now() })
      .where(
        and(
          eq(schema.emailVerificationTokens.userId, userId),
          isNull(schema.emailVerificationTokens.usedAt),
          ne(schema.emailVerificationTokens.token, tokenHash)
        )
      );

    // Send new verification email
    const result = await deliverVerificationEmail(
      db,
      userId,
      email,
      resendApiKey,
      fromEmail,
      frontendUrl,
      token
    );

    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール再送に失敗しました',
    };
  }
}
