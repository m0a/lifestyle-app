/**
 * Scheduled cleanup tasks
 *
 * Runs daily at 2:00 AM UTC to clean up:
 * 1. Unverified user accounts (>7 days old)
 * 2. Expired/used tokens (>7 days old)
 * 3. Expired WebAuthn challenges
 * 4. Append-only logs past their retention window (#104):
 *    email_delivery_logs and ai_usage_records (detail; lifetime AI total is kept
 *    in ai_usage_totals so pruning detail does not affect the displayed total).
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, lt } from 'drizzle-orm';
import * as schema from '../db/schema';
import * as emailSchema from '../db/schema/email';
import * as webauthnSchema from '../db/schema/webauthn';

const UNVERIFIED_ACCOUNT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EMAIL_LOG_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (operational logs, recipient PII)
const AI_USAGE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (detail; total kept in rollup)

interface CleanupResult {
  deletedUsers: number;
  deletedPasswordResetTokens: number;
  deletedEmailVerificationTokens: number;
  deletedEmailChangeRequests: number;
  deletedExpiredChallenges: number;
  deletedEmailLogs: number;
  deletedAiUsageRecords: number;
}

/**
 * Execute all scheduled cleanup tasks
 */
export async function executeScheduledCleanup(db: D1Database): Promise<CleanupResult> {
  const orm = drizzle(db, { schema: { ...schema, ...emailSchema, ...webauthnSchema } });
  const now = Date.now();
  const unverifiedCutoff = now - UNVERIFIED_ACCOUNT_RETENTION_MS;
  const tokenCutoff = now - TOKEN_CLEANUP_AGE_MS;
  // Type-matched cutoffs: email_delivery_logs.created_at is INTEGER epoch ms;
  // ai_usage_records.created_at is TEXT ISO8601.
  const emailLogCutoffEpoch = now - EMAIL_LOG_RETENTION_MS;
  const aiUsageCutoffIso = new Date(now - AI_USAGE_RETENTION_MS).toISOString();

  console.log('[Cleanup] Starting scheduled cleanup tasks...');

  // 1. Delete unverified users older than 7 days
  let deletedUsers = 0;
  try {
    const unverifiedUsers = await orm
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.emailVerified, 0),
          lt(schema.users.createdAt, new Date(unverifiedCutoff).toISOString())
        )
      )
      .all();

    if (unverifiedUsers.length > 0) {
      for (const user of unverifiedUsers) {
        await orm.delete(schema.users).where(eq(schema.users.id, user.id));
        deletedUsers++;
      }
      console.log(`[Cleanup] Deleted ${deletedUsers} unverified users older than 7 days`);
    } else {
      console.log('[Cleanup] No unverified users to delete');
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting unverified users:', error);
  }

  // 2. Delete used/expired password reset tokens older than 7 days
  let deletedPasswordResetTokens = 0;
  try {
    const oldTokens = await orm
      .select({ id: emailSchema.passwordResetTokens.id })
      .from(emailSchema.passwordResetTokens)
      .where(
        and(
          lt(emailSchema.passwordResetTokens.createdAt, tokenCutoff),
          // Delete tokens that are used OR expired
          // Used tokens have usedAt != null
          // Expired tokens have expiresAt < now
        )
      )
      .all();

    if (oldTokens.length > 0) {
      for (const token of oldTokens) {
        await orm
          .delete(emailSchema.passwordResetTokens)
          .where(eq(emailSchema.passwordResetTokens.id, token.id));
        deletedPasswordResetTokens++;
      }
      console.log(`[Cleanup] Deleted ${deletedPasswordResetTokens} old password reset tokens`);
    } else {
      console.log('[Cleanup] No old password reset tokens to delete');
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting password reset tokens:', error);
  }

  // 3. Delete used/expired email verification tokens older than 7 days
  let deletedEmailVerificationTokens = 0;
  try {
    const oldTokens = await orm
      .select({ id: emailSchema.emailVerificationTokens.id })
      .from(emailSchema.emailVerificationTokens)
      .where(lt(emailSchema.emailVerificationTokens.createdAt, tokenCutoff))
      .all();

    if (oldTokens.length > 0) {
      for (const token of oldTokens) {
        await orm
          .delete(emailSchema.emailVerificationTokens)
          .where(eq(emailSchema.emailVerificationTokens.id, token.id));
        deletedEmailVerificationTokens++;
      }
      console.log(
        `[Cleanup] Deleted ${deletedEmailVerificationTokens} old email verification tokens`
      );
    } else {
      console.log('[Cleanup] No old email verification tokens to delete');
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting email verification tokens:', error);
  }

  // 4. Delete confirmed/cancelled/expired email change requests older than 7 days
  let deletedEmailChangeRequests = 0;
  try {
    const oldRequests = await orm
      .select({ id: emailSchema.emailChangeRequests.id })
      .from(emailSchema.emailChangeRequests)
      .where(lt(emailSchema.emailChangeRequests.createdAt, tokenCutoff))
      .all();

    if (oldRequests.length > 0) {
      for (const request of oldRequests) {
        await orm
          .delete(emailSchema.emailChangeRequests)
          .where(eq(emailSchema.emailChangeRequests.id, request.id));
        deletedEmailChangeRequests++;
      }
      console.log(`[Cleanup] Deleted ${deletedEmailChangeRequests} old email change requests`);
    } else {
      console.log('[Cleanup] No old email change requests to delete');
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting email change requests:', error);
  }

  // 5. Delete expired WebAuthn challenges (5-minute TTL, so anything past now is dead)
  let deletedExpiredChallenges = 0;
  try {
    const nowIso = new Date(now).toISOString();
    const result = await orm
      .delete(webauthnSchema.webauthnChallenges)
      .where(lt(webauthnSchema.webauthnChallenges.expiresAt, nowIso))
      .run();
    deletedExpiredChallenges = result.meta?.changes ?? 0;
    if (deletedExpiredChallenges > 0) {
      console.log(`[Cleanup] Deleted ${deletedExpiredChallenges} expired WebAuthn challenges`);
    } else {
      console.log('[Cleanup] No expired WebAuthn challenges to delete');
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting expired WebAuthn challenges:', error);
  }

  // 6. Delete email delivery logs older than the retention window.
  //    created_at is INTEGER epoch ms; uses idx_email_logs_created_at.
  let deletedEmailLogs = 0;
  try {
    const result = await orm
      .delete(emailSchema.emailDeliveryLogs)
      .where(lt(emailSchema.emailDeliveryLogs.createdAt, emailLogCutoffEpoch))
      .run();
    deletedEmailLogs = result.meta?.changes ?? 0;
    console.log(
      deletedEmailLogs > 0
        ? `[Cleanup] Deleted ${deletedEmailLogs} old email delivery logs`
        : '[Cleanup] No old email delivery logs to delete'
    );
  } catch (error) {
    console.error('[Cleanup] Error deleting email delivery logs:', error);
  }

  // 7. Delete AI usage detail rows older than the retention window. The lifetime
  //    total lives in ai_usage_totals and daily/monthly views only read recent
  //    rows, so this does not affect any displayed figure. created_at is TEXT
  //    ISO8601; uses idx_ai_usage_user_date.
  let deletedAiUsageRecords = 0;
  try {
    const result = await orm
      .delete(schema.aiUsageRecords)
      .where(lt(schema.aiUsageRecords.createdAt, aiUsageCutoffIso))
      .run();
    deletedAiUsageRecords = result.meta?.changes ?? 0;
    console.log(
      deletedAiUsageRecords > 0
        ? `[Cleanup] Deleted ${deletedAiUsageRecords} old AI usage records`
        : '[Cleanup] No old AI usage records to delete'
    );
  } catch (error) {
    console.error('[Cleanup] Error deleting AI usage records:', error);
  }

  const result = {
    deletedUsers,
    deletedPasswordResetTokens,
    deletedEmailVerificationTokens,
    deletedEmailChangeRequests,
    deletedExpiredChallenges,
    deletedEmailLogs,
    deletedAiUsageRecords,
  };

  console.log('[Cleanup] Cleanup tasks completed:', result);
  return result;
}
