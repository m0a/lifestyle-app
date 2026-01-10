/**
 * Password reset service
 *
 * Handles password reset requests and confirmations:
 * - Generate secure tokens
 * - Send password reset emails
 * - Validate and use tokens
 * - Update passwords
 */

import type { D1Database } from '@cloudflare/workers-types';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { generateSecureToken } from '../token/crypto';
import { sendEmail } from '../email/email.service';
import { generatePasswordResetEmail } from '../email/templates/password-reset';
import {
  checkEmailRateLimit,
  incrementEmailRateLimit,
} from '../rate-limit/email-rate-limit';
import bcrypt from 'bcryptjs';

const PASSWORD_RESET_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PasswordResetRequestResult {
  success: boolean;
  error?: string;
}

export interface PasswordResetConfirmResult {
  success: boolean;
  error?: string;
}

/**
 * Request a password reset email
 *
 * @param db - D1 database instance
 * @param email - User email address
 * @param clientIP - Client IP address for rate limiting
 * @param resendApiKey - Resend API key
 * @param fromEmail - Sender email address
 * @param frontendUrl - Frontend base URL for reset link
 * @returns Result with success status
 */
export async function requestPasswordReset(
  db: D1Database,
  email: string,
  clientIP: string,
  resendApiKey: string,
  fromEmail: string,
  frontendUrl: string
): Promise<PasswordResetRequestResult> {
  // Check rate limit
  const rateLimitResult = await checkEmailRateLimit(db, clientIP);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'レート制限に達しました。1時間後に再試行してください。',
    };
  }

  const orm = drizzle(db, { schema });

  // Find user by email
  const user = await orm.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  // Security: Always return success even if user doesn't exist
  // This prevents email enumeration attacks
  if (!user) {
    // Increment rate limit anyway to prevent abuse
    await incrementEmailRateLimit(db, clientIP);
    return { success: true };
  }

  try {
    // Generate secure token
    const token = await generateSecureToken();
    const now = Date.now();
    const expiresAt = now + PASSWORD_RESET_TOKEN_EXPIRATION_MS;

    // Save token to database
    await orm.insert(schema.passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      usedAt: null,
      createdAt: now,
    });

    // Generate reset URL
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Send email
    const emailResult = await sendEmail(
      db,
      resendApiKey,
      fromEmail,
      {
        to: email,
        subject: 'パスワードリセット',
        html: generatePasswordResetEmail({ resetUrl }),
        emailType: 'password_reset',
        userId: user.id,
      }
    );

    if (!emailResult.success) {
      return {
        success: false,
        error: 'メール送信に失敗しました。後でもう一度お試しください。',
      };
    }

    // Increment rate limit after successful send
    await incrementEmailRateLimit(db, clientIP);

    return { success: true };
  } catch (error) {
    console.error('Password reset request failed:', error);
    return {
      success: false,
      error: 'パスワードリセットのリクエストに失敗しました。',
    };
  }
}

/**
 * Confirm password reset with token and new password
 *
 * @param db - D1 database instance
 * @param token - Password reset token
 * @param newPassword - New password (plaintext)
 * @returns Result with success status
 */
export async function confirmPasswordReset(
  db: D1Database,
  token: string,
  newPassword: string
): Promise<PasswordResetConfirmResult> {
  const orm = drizzle(db, { schema });
  const now = Date.now();

  try {
    // Find valid token (not used, not expired)
    const tokenRecord = await orm.query.passwordResetTokens.findFirst({
      where: and(
        eq(schema.passwordResetTokens.token, token),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, now)
      ),
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: 'トークンが無効または有効期限切れです。',
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await orm
      .update(schema.users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(now).toISOString(),
      })
      .where(eq(schema.users.id, tokenRecord.userId));

    // Mark token as used
    await orm
      .update(schema.passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

    return { success: true };
  } catch (error) {
    console.error('Password reset confirmation failed:', error);
    return {
      success: false,
      error: 'パスワードのリセットに失敗しました。',
    };
  }
}
