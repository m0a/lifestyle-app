/**
 * Token Zod schemas
 *
 * Validation schemas for token data structures:
 * - Token format validation
 * - Token type enums
 */

import { z } from 'zod';

/**
 * Token format schema (32 characters, base64url)
 */
export const tokenSchema = z
  .string()
  .length(32, 'トークンは32文字である必要があります')
  .regex(/^[A-Za-z0-9\-_]+$/, '無効なトークン形式です');

/**
 * Token type enum
 */
export const tokenTypeSchema = z.enum([
  'password_reset',
  'email_verification',
  'email_change',
]);

/**
 * Email type enum (for logging and rate limiting)
 */
export const emailTypeSchema = z.enum([
  'password_reset',
  'email_verification',
  'email_change',
]);

/**
 * Email delivery status enum
 */
export const emailDeliveryStatusSchema = z.enum(['success', 'failed']);

/**
 * Email change request status enum
 */
export const emailChangeStatusSchema = z.enum([
  'pending',
  'completed',
  'cancelled',
]);
