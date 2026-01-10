/**
 * Email-related database schema (Drizzle ORM)
 *
 * Tables:
 * - password_reset_tokens
 * - email_verification_tokens
 * - email_change_requests
 * - email_delivery_logs
 * - email_rate_limits
 */

import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from '../schema';

/**
 * Password reset tokens table
 *
 * Stores tokens for password reset requests
 * - 32-character tokens (256-bit entropy)
 * - 24-hour expiration
 * - One-time use (tracked via used_at)
 */
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_password_reset_token').on(table.token),
    userIdIdx: index('idx_password_reset_user_id').on(table.userId),
    expiresAtIdx: index('idx_password_reset_expires_at').on(table.expiresAt),
  })
);

/**
 * Email verification tokens table
 *
 * Stores tokens for email address verification during signup
 * - 32-character tokens (256-bit entropy)
 * - 24-hour expiration
 * - One-time use (tracked via used_at)
 */
export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_email_verification_token').on(table.token),
    userIdIdx: index('idx_email_verification_user_id').on(table.userId),
    expiresAtIdx: index('idx_email_verification_expires_at').on(table.expiresAt),
  })
);

/**
 * Email change requests table
 *
 * Stores email change requests for existing users
 * - 32-character tokens (256-bit entropy)
 * - 24-hour expiration
 * - One-time use (tracked via confirmed_at or cancelled_at)
 * - Sends confirmation emails to both old and new addresses
 */
export const emailChangeRequests = sqliteTable(
  'email_change_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    oldEmail: text('old_email').notNull(),
    newEmail: text('new_email').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    confirmedAt: integer('confirmed_at'),
    cancelledAt: integer('cancelled_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_email_change_token').on(table.token),
    userIdIdx: index('idx_email_change_user_id').on(table.userId),
    expiresAtIdx: index('idx_email_change_expires_at').on(table.expiresAt),
    newEmailIdx: index('idx_email_change_new_email').on(table.newEmail),
  })
);

/**
 * Email delivery logs table
 *
 * Tracks all email delivery attempts for debugging and monitoring
 */
export const emailDeliveryLogs = sqliteTable(
  'email_delivery_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    emailType: text('email_type', {
      enum: ['password_reset', 'email_verification', 'email_change'],
    }).notNull(),
    recipientEmail: text('recipient_email').notNull(),
    status: text('status', { enum: ['success', 'failed'] }).notNull(),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_email_logs_user_id').on(table.userId),
    statusIdx: index('idx_email_logs_status').on(table.status),
    createdAtIdx: index('idx_email_logs_created_at').on(table.createdAt),
    emailTypeIdx: index('idx_email_logs_email_type').on(table.emailType),
  })
);

/**
 * Email rate limits table
 *
 * Tracks email send rate limits by IP address
 * - 10 emails per hour per IP
 * - Automatic cleanup of expired records
 */
export const emailRateLimits = sqliteTable('email_rate_limits', {
  ip: text('ip').primaryKey(),
  count: integer('count').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
});
