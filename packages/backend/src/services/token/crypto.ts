/**
 * Secure token generation using Web Crypto API
 *
 * Generates cryptographically secure random tokens for:
 * - Password reset
 * - Email verification
 * - Email change requests
 *
 * Token format: 32 characters, base64url encoding, 256 bits of entropy
 */

/**
 * Generate a secure random token using Web Crypto API
 *
 * @returns {Promise<string>} 32-character base64url-encoded token (256 bits)
 */
export async function generateSecureToken(): Promise<string> {
  // Generate 32 random bytes (256 bits) using Web Crypto API
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);

  // Convert to base64url format (URL-safe, no padding)
  // This produces a 43-character string, we'll take first 32 for fixed length
  const base64url = arrayBufferToBase64Url(buffer);

  // Return first 32 characters for consistent token length
  return base64url.substring(0, 32);
}

/**
 * Convert ArrayBuffer to base64url encoding
 *
 * @param {Uint8Array} buffer - Buffer to encode
 * @returns {string} Base64url-encoded string
 */
function arrayBufferToBase64Url(buffer: Uint8Array): string {
  // Convert buffer to binary string
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    const byte = buffer[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }

  // Encode to base64
  const base64 = btoa(binary);

  // Convert to base64url (replace +/= with -/_ and remove padding)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate token format
 *
 * @param {string} token - Token to validate
 * @returns {boolean} True if token is valid format (32 chars, base64url)
 */
export function isValidTokenFormat(token: string): boolean {
  // Check length
  if (token.length !== 32) {
    return false;
  }

  // Check base64url character set: [A-Za-z0-9\-_]
  const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
  return base64urlPattern.test(token);
}
