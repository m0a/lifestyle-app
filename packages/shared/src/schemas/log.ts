import { z } from 'zod';

/**
 * Field size limits for error log entries.
 *
 * The /api/logs/error endpoint is intentionally unauthenticated (frontend
 * errors can happen before login), so these strict caps are the first line
 * of defense against log-flooding abuse. The frontend truncates fields to
 * these limits before sending (see frontend lib/errorLogger.ts).
 */
export const ERROR_LOG_LIMITS = {
  message: 1000,
  stack: 5000,
  url: 2000,
  userAgent: 500,
  /** Max length of JSON.stringify(extra) */
  extraSerialized: 2000,
} as const;

/**
 * Schema for error log entries with request tracing support.
 *
 * Note: there is intentionally no `userId` field. The backend derives the
 * user id from the (optional) session cookie instead of trusting a
 * client-sent value.
 */
export const errorLogSchema = z.object({
  message: z.string().min(1, 'Message is required').max(ERROR_LOG_LIMITS.message),
  stack: z.string().max(ERROR_LOG_LIMITS.stack).optional(),
  url: z.string().url('Valid URL required').max(ERROR_LOG_LIMITS.url),
  userAgent: z.string().max(ERROR_LOG_LIMITS.userAgent).optional(),
  timestamp: z.string().datetime('ISO 8601 timestamp required'),
  requestId: z.string().uuid('Valid UUID v4 required').optional(),
  extra: z
    .record(z.unknown())
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        JSON.stringify(value).length <= ERROR_LOG_LIMITS.extraSerialized,
      { message: `extra must serialize to at most ${ERROR_LOG_LIMITS.extraSerialized} characters` }
    ),
});

/**
 * TypeScript type inferred from errorLogSchema
 */
export type ErrorLog = z.infer<typeof errorLogSchema>;
