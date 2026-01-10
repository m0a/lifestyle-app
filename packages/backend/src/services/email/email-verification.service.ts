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
import { eq, and, isNull, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { generateSecureToken } from '../token/crypto';
import { sendEmail } from './email.service';
import { emailVerificationTemplate } from './templates/email-verification';

const EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    // Generate secure token
    const token = await generateSecureToken();
    const now = Date.now();
    const expiresAt = now + EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS;

    // Insert token into database
    await orm.insert(schema.emailVerificationTokens).values({
      userId,
      token,
      expiresAt,
      usedAt: null,
      createdAt: now,
    });

    // Generate verification link
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    // Send email
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
    // Find valid token (not used, not expired)
    const tokenRecord = await orm.query.emailVerificationTokens.findFirst({
      where: and(
        eq(schema.emailVerificationTokens.token, token),
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

    // Check rate limit: max 3 resends per hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentTokens = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM email_verification_tokens
         WHERE user_id = ? AND created_at > ?`
      )
      .bind(userId, oneHourAgo)
      .first<{ count: number }>();

    if (recentTokens && recentTokens.count >= 3) {
      return {
        success: false,
        error: '確認メールの送信回数が上限に達しました。しばらくしてから再度お試しください',
      };
    }

    // Invalidate old unused tokens for this user
    await orm
      .update(schema.emailVerificationTokens)
      .set({ usedAt: Date.now() })
      .where(
        and(
          eq(schema.emailVerificationTokens.userId, userId),
          isNull(schema.emailVerificationTokens.usedAt)
        )
      );

    // Send new verification email
    const result = await sendVerificationEmail(
      db,
      userId,
      email,
      resendApiKey,
      fromEmail,
      frontendUrl
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
