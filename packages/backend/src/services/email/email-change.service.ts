/**
 * Email change service
 *
 * Handles email address change flow:
 * 1. Request: Create change request, send emails to both old and new addresses
 * 2. Confirm: User clicks link in new email, email is updated
 * 3. Cancel: User clicks link in old email, request is cancelled
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../../db/schema/email';
import { users } from '../../db/schema';
import { generateSecureToken } from '../token/crypto';
import { sendEmail } from './email.service';
import {
  generateEmailChangeConfirmationEmail,
  generateEmailChangeNotificationEmail,
} from './templates/email-change';

const EMAIL_CHANGE_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Request email change for a user
 *
 * - Creates email change request with token
 * - Sends confirmation email to NEW address
 * - Sends notification email to OLD address
 * - Returns token for testing
 */
export async function requestEmailChange(
  db: D1Database,
  userId: string,
  oldEmail: string,
  newEmail: string,
  resendApiKey: string,
  fromEmail: string,
  frontendUrl: string
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });

  try {
    // Check if new email is already in use
    const existingUser = await orm
      .select()
      .from(users)
      .where(eq(users.email, newEmail))
      .get();

    if (existingUser) {
      return { success: false, error: 'このメールアドレスは既に使用されています' };
    }

    // Check for pending email change requests to this email
    const pendingRequest = await orm
      .select()
      .from(schema.emailChangeRequests)
      .where(
        and(
          eq(schema.emailChangeRequests.newEmail, newEmail),
          isNull(schema.emailChangeRequests.confirmedAt),
          isNull(schema.emailChangeRequests.cancelledAt)
        )
      )
      .get();

    if (pendingRequest) {
      return {
        success: false,
        error: 'このメールアドレスへの変更リクエストが既に存在します',
      };
    }

    const token = await generateSecureToken();
    const now = Date.now();
    const expiresAt = now + EMAIL_CHANGE_TOKEN_EXPIRATION_MS;

    // Create email change request
    await orm.insert(schema.emailChangeRequests).values({
      userId,
      oldEmail,
      newEmail,
      token,
      expiresAt,
      confirmedAt: null,
      cancelledAt: null,
      createdAt: now,
    });

    // Send confirmation email to NEW address
    const confirmationUrl = `${frontendUrl}/change-email/confirm?token=${token}`;
    const confirmationResult = await sendEmail(db, resendApiKey, fromEmail, {
      to: newEmail,
      subject: 'メールアドレス変更の確認',
      html: generateEmailChangeConfirmationEmail({
        confirmationUrl,
        newEmail,
        expirationHours: 24,
      }),
      emailType: 'email_change',
      userId,
    });

    if (!confirmationResult.success) {
      return {
        success: false,
        error: confirmationResult.error || '確認メールの送信に失敗しました',
      };
    }

    // Send notification email to OLD address
    const cancelUrl = `${frontendUrl}/change-email/cancel?token=${token}`;
    const notificationResult = await sendEmail(db, resendApiKey, fromEmail, {
      to: oldEmail,
      subject: 'メールアドレス変更のお知らせ',
      html: generateEmailChangeNotificationEmail({
        cancelUrl,
        oldEmail,
        newEmail,
        expirationHours: 24,
      }),
      emailType: 'email_change',
      userId,
    });

    if (!notificationResult.success) {
      // Log warning but don't fail the request
      console.warn('Failed to send notification to old email:', notificationResult.error);
    }

    return { success: true, token };
  } catch (error) {
    console.error('Error in requestEmailChange:', error);
    return { success: false, error: 'メールアドレス変更リクエストの作成に失敗しました' };
  }
}

/**
 * Confirm email change with token
 *
 * - Validates token exists and not expired
 * - Checks not already confirmed or cancelled
 * - Updates user's email address
 * - Marks request as confirmed
 */
export async function confirmEmailChange(
  db: D1Database,
  token: string
): Promise<{ success: true; userId: string; newEmail: string } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });

  try {
    // Find the email change request
    const request = await orm
      .select()
      .from(schema.emailChangeRequests)
      .where(eq(schema.emailChangeRequests.token, token))
      .get();

    if (!request) {
      return { success: false, error: 'トークンが無効です' };
    }

    // Check if already confirmed
    if (request.confirmedAt) {
      return { success: false, error: 'このリクエストは既に確認済みです' };
    }

    // Check if cancelled
    if (request.cancelledAt) {
      return { success: false, error: 'このリクエストはキャンセルされました' };
    }

    // Check if expired
    const now = Date.now();
    if (now > request.expiresAt) {
      return {
        success: false,
        error: 'トークンの有効期限が切れています。設定画面から再度変更をリクエストしてください。',
      };
    }

    // Check if new email is now taken by someone else
    const existingUser = await orm
      .select()
      .from(users)
      .where(eq(users.email, request.newEmail))
      .get();

    if (existingUser && existingUser.id !== request.userId) {
      return { success: false, error: 'このメールアドレスは既に使用されています' };
    }

    // Update user's email
    await orm
      .update(users)
      .set({
        email: request.newEmail,
        updatedAt: new Date(now).toISOString(),
      })
      .where(eq(users.id, request.userId));

    // Mark request as confirmed
    await orm
      .update(schema.emailChangeRequests)
      .set({ confirmedAt: now })
      .where(eq(schema.emailChangeRequests.id, request.id));

    return { success: true, userId: request.userId, newEmail: request.newEmail };
  } catch (error) {
    console.error('Error in confirmEmailChange:', error);
    return { success: false, error: 'メールアドレスの変更に失敗しました' };
  }
}

/**
 * Cancel email change with token
 *
 * - Validates token exists and not expired
 * - Checks not already confirmed or cancelled
 * - Marks request as cancelled
 */
export async function cancelEmailChange(
  db: D1Database,
  token: string
): Promise<{ success: true } | { success: false; error: string }> {
  const orm = drizzle(db, { schema });

  try {
    // Find the email change request
    const request = await orm
      .select()
      .from(schema.emailChangeRequests)
      .where(eq(schema.emailChangeRequests.token, token))
      .get();

    if (!request) {
      return { success: false, error: 'トークンが無効です' };
    }

    // Check if already confirmed
    if (request.confirmedAt) {
      return {
        success: false,
        error: 'このリクエストは既に確認されており、キャンセルできません',
      };
    }

    // Check if already cancelled
    if (request.cancelledAt) {
      return { success: false, error: 'このリクエストは既にキャンセルされています' };
    }

    // Check if expired
    const now = Date.now();
    if (now > request.expiresAt) {
      return { success: false, error: 'トークンの有効期限が切れています' };
    }

    // Mark request as cancelled
    await orm
      .update(schema.emailChangeRequests)
      .set({ cancelledAt: now })
      .where(eq(schema.emailChangeRequests.id, request.id));

    return { success: true };
  } catch (error) {
    console.error('Error in cancelEmailChange:', error);
    return { success: false, error: 'メールアドレス変更のキャンセルに失敗しました' };
  }
}
