import { nanoid } from 'nanoid';

/**
 * Request ID generation utility for end-to-end request tracing
 *
 * Generates unique identifiers for each API request to enable
 * correlation of logs between frontend and backend.
 *
 * @module requestId
 */

/**
 * Generate a unique Request ID
 *
 * Uses crypto.randomUUID() when available (secure contexts),
 * falls back to nanoid for non-secure contexts (e.g., HTTP development).
 *
 * @returns {string} Unique request ID
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return nanoid();
}
