/**
 * Email payload Zod schemas
 *
 * Validation schemas for email-related API requests:
 * - Password reset request/confirm
 * - Email verification request/confirm
 * - Email change request/confirm
 */

import { z } from 'zod';

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

/**
 * Password reset confirm schema
 */
export const passwordResetConfirmSchema = z.object({
  token: z
    .string()
    .length(32, 'トークンは32文字である必要があります')
    .regex(/^[A-Za-z0-9\-_]+$/, '無効なトークン形式です'),
  newPassword: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .max(100, 'パスワードは100文字以下である必要があります'),
});

/**
 * Email verification request schema (for resend)
 */
export const emailVerificationRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

/**
 * Email verification confirm schema
 */
export const emailVerificationConfirmSchema = z.object({
  token: z
    .string()
    .length(32, 'トークンは32文字である必要があります')
    .regex(/^[A-Za-z0-9\-_]+$/, '無効なトークン形式です'),
});

/**
 * Email change request schema
 */
export const emailChangeRequestSchema = z.object({
  newEmail: z.string().email('有効なメールアドレスを入力してください'),
});

/**
 * Email change confirm schema
 */
export const emailChangeConfirmSchema = z.object({
  token: z
    .string()
    .length(32, 'トークンは32文字である必要があります')
    .regex(/^[A-Za-z0-9\-_]+$/, '無効なトークン形式です'),
});

/**
 * Email change cancel schema
 */
export const emailChangeCancelSchema = z.object({
  token: z
    .string()
    .length(32, 'トークンは32文字である必要があります')
    .regex(/^[A-Za-z0-9\-_]+$/, '無効なトークン形式です'),
});
