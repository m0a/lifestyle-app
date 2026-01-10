/**
 * Token TypeScript types
 *
 * Type definitions for token data structures
 */

import type { z } from 'zod';
import type {
  tokenSchema,
  tokenTypeSchema,
  emailChangeStatusSchema,
} from '../schemas/token';

/**
 * Token string (32 characters, base64url)
 */
export type Token = z.infer<typeof tokenSchema>;

/**
 * Token type
 */
export type TokenType = z.infer<typeof tokenTypeSchema>;

/**
 * Password reset token entry
 */
export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}

/**
 * Email verification token entry
 */
export interface EmailVerificationToken {
  id: number;
  userId: number;
  email: string;
  token: string;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}

/**
 * Email change request record (database entity)
 */
export interface EmailChangeRequestRecord {
  id: number;
  userId: number;
  oldEmail: string;
  newEmail: string;
  token: string;
  status: 'pending' | 'completed' | 'cancelled';
  expiresAt: number;
  createdAt: number;
}
