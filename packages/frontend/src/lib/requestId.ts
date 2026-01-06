/**
 * Request ID generation utility for end-to-end request tracing
 *
 * Generates unique UUID v4 identifiers for each API request to enable
 * correlation of logs between frontend and backend.
 *
 * @module requestId
 */

/**
 * Generate a unique Request ID using UUID v4 format
 *
 * Uses the Web Crypto API's `crypto.randomUUID()` which is available in:
 * - Modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
 * - Node.js 16.7.0+
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - Version 4 UUID (random)
 * - 122 bits of randomness
 * - Collision probability is negligible for practical purposes
 *
 * @returns {string} UUID v4 string (36 characters with dashes)
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // => "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
