/**
 * Unit tests for secure token generation service
 *
 * Tests:
 * - Token generation produces 32-character tokens
 * - Tokens use valid base64url character set
 * - Tokens are unique (no collisions in reasonable sample)
 * - Token format validation works correctly
 */

import { describe, it, expect } from 'vitest';
import {
  generateSecureToken,
  isValidTokenFormat,
  hashToken,
} from '../../../packages/backend/src/services/token/crypto';

describe('Token Generation Service', () => {
  describe('generateSecureToken', () => {
    it('should generate a 32-character token', async () => {
      const token = await generateSecureToken();
      expect(token).toHaveLength(32);
    });

    it('should generate tokens with valid base64url characters only', async () => {
      const token = await generateSecureToken();
      // base64url uses: A-Z, a-z, 0-9, -, _
      const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
      expect(token).toMatch(base64urlPattern);
    });

    it('should generate unique tokens (no collisions)', async () => {
      // Generate 1000 tokens and check for uniqueness
      const tokens = new Set<string>();
      const sampleSize = 1000;

      for (let i = 0; i < sampleSize; i++) {
        const token = await generateSecureToken();
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(sampleSize);
    });

    it('should be cryptographically random (no predictable patterns)', async () => {
      // Generate multiple tokens and verify they don't share common prefixes/suffixes
      const token1 = await generateSecureToken();
      const token2 = await generateSecureToken();
      const token3 = await generateSecureToken();

      // Check that tokens are different
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);

      // Check that they don't share long common prefixes (first 8 chars)
      const prefix1 = token1.substring(0, 8);
      const prefix2 = token2.substring(0, 8);
      const prefix3 = token3.substring(0, 8);

      expect(prefix1).not.toBe(prefix2);
      expect(prefix2).not.toBe(prefix3);
      expect(prefix1).not.toBe(prefix3);
    });
  });

  describe('isValidTokenFormat', () => {
    it('should accept valid 32-character base64url tokens', () => {
      const validToken = 'abcdefghijklmnopqrstuvwxyz012345';
      expect(isValidTokenFormat(validToken)).toBe(true);
    });

    it('should accept tokens with hyphens and underscores', () => {
      const validToken = 'abc-def_ghi-jkl_mno-pqr_stu-vw01'; // 32 chars
      expect(isValidTokenFormat(validToken)).toBe(true);
    });

    it('should reject tokens that are too short', () => {
      const shortToken = 'abc123';
      expect(isValidTokenFormat(shortToken)).toBe(false);
    });

    it('should reject tokens that are too long', () => {
      const longToken = 'abcdefghijklmnopqrstuvwxyz0123456789';
      expect(isValidTokenFormat(longToken)).toBe(false);
    });

    it('should reject tokens with invalid characters', () => {
      const invalidTokens = [
        'abcdefghijklmnopqrstuvwxyz01234+', // Contains +
        'abcdefghijklmnopqrstuvwxyz01234/', // Contains /
        'abcdefghijklmnopqrstuvwxyz01234=', // Contains =
        'abcdefghijklmnopqrstuvwxyz01234!', // Contains !
        'abcdefghijklmnopqrstuvwxyz01234 ', // Contains space
      ];

      invalidTokens.forEach((token) => {
        expect(isValidTokenFormat(token)).toBe(false);
      });
    });

    it('should reject empty strings', () => {
      expect(isValidTokenFormat('')).toBe(false);
    });
  });

  describe('hashToken', () => {
    it('should return a 64-character lowercase hex digest', async () => {
      const hash = await hashToken(await generateSecureToken());
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic for the same input', async () => {
      const token = await generateSecureToken();
      expect(await hashToken(token)).toBe(await hashToken(token));
    });

    it('should produce different hashes for different inputs', async () => {
      const a = await hashToken(await generateSecureToken());
      const b = await hashToken(await generateSecureToken());
      expect(a).not.toBe(b);
    });

    it('should match the known SHA-256 vector for "abc"', async () => {
      // SHA-256("abc") — confirms hex encoding/byte order, so a stored hash is
      // reproducible from the raw token submitted at verification time (#98).
      expect(await hashToken('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      );
    });

    it('should not return the raw token (token is not stored in the clear)', async () => {
      const token = await generateSecureToken();
      expect(await hashToken(token)).not.toBe(token);
    });
  });
});
