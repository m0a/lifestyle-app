import { z } from 'zod';

/**
 * Schema for error log entries with request tracing support
 *
 * Includes requestId and userId for end-to-end traceability
 */
export const errorLogSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  stack: z.string().optional(),
  url: z.string().url('Valid URL required'),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime('ISO 8601 timestamp required'),
  requestId: z.string().uuid('Valid UUID v4 required').optional(),
  userId: z.string().min(1).optional(),
  extra: z.record(z.unknown()).optional(),
});

/**
 * TypeScript type inferred from errorLogSchema
 */
export type ErrorLog = z.infer<typeof errorLogSchema>;
