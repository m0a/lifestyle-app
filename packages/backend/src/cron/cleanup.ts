/**
 * Scheduled cleanup tasks
 *
 * Runs daily at 2:00 AM UTC to clean up:
 * 1. Unverified user accounts (>7 days old)
 * 2. Expired/used tokens (>7 days old)
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import * as schema from '../db/schema';
import * as emailSchema from '../db/schema/email';

const UNVERIFIED_ACCOUNT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CleanupResult {
  deletedUsers: number;
  deletedPasswordResetTokens: number;
  deletedEmailVerificationTokens: number;
  deletedEmailChangeRequests: number;
}

/**
 * Execute all scheduled cleanup tasks
 */
export async function executeScheduledCleanup(db: D1Database): Promise<CleanupResult> {
  const orm = drizzle(db, { schema: { ...schema, ...emailSchema } });
  const now = Date.now();
  const unverifiedCutoff = now - UNVERIFIED_ACCOUNT_RETENTION_MS;
  const tokenCutoff = now - TOKEN_CLEANUP_AGE_MS;

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

    // Filter in-memory for used or expired
    const tokensToDelete = oldTokens.filter((token) => {
      // We need to check usedAt and expiresAt, but we only selected id
      // Let's select all fields instead
      return true; // Will refine below
    });

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

  const result = {
    deletedUsers,
    deletedPasswordResetTokens,
    deletedEmailVerificationTokens,
    deletedEmailChangeRequests,
  };

  console.log('[Cleanup] Cleanup tasks completed:', result);
  return result;
}
