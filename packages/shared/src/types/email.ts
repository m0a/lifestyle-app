/**
 * Email TypeScript types
 *
 * Type definitions for email-related API requests and responses
 */

import type { z } from 'zod';
import type {
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  emailVerificationRequestSchema,
  emailVerificationConfirmSchema,
  emailChangeRequestSchema,
  emailChangeConfirmSchema,
  emailChangeCancelSchema,
} from '../schemas/email';
import type {
  emailTypeSchema,
  emailDeliveryStatusSchema,
  emailChangeStatusSchema,
} from '../schemas/token';

/**
 * Password reset request payload
 */
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset confirm payload
 */
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

/**
 * Email verification request payload
 */
export type EmailVerificationRequest = z.infer<
  typeof emailVerificationRequestSchema
>;

/**
 * Email verification confirm payload
 */
export type EmailVerificationConfirm = z.infer<
  typeof emailVerificationConfirmSchema
>;

/**
 * Email change request payload
 */
export type EmailChangeRequest = z.infer<typeof emailChangeRequestSchema>;

/**
 * Email change confirm payload
 */
export type EmailChangeConfirm = z.infer<typeof emailChangeConfirmSchema>;

/**
 * Email change cancel payload
 */
export type EmailChangeCancel = z.infer<typeof emailChangeCancelSchema>;

/**
 * Email type
 */
export type EmailType = z.infer<typeof emailTypeSchema>;

/**
 * Email delivery status
 */
export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>;

/**
 * Email change request status
 */
export type EmailChangeStatus = z.infer<typeof emailChangeStatusSchema>;

/**
 * Email delivery log entry
 */
export interface EmailDeliveryLog {
  id: number;
  userId: number | null;
  emailType: EmailType;
  recipientEmail: string;
  status: EmailDeliveryStatus;
  errorMessage: string | null;
  retryCount: number;
  createdAt: number;
}

/**
 * Email rate limit entry
 */
export interface EmailRateLimit {
  ip: string;
  count: number;
  expiresAt: number;
}
