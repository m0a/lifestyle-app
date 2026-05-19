import { describe, it, expect } from 'vitest';
import {
  base64urlToUint8Array,
  uint8ArrayToBase64url,
} from '../../packages/backend/src/services/webauthn.service';

describe('webauthn.service utilities', () => {
  describe('base64url round-trip', () => {
    it('roundtrips empty array', () => {
      const empty = new Uint8Array([]);
      expect(base64urlToUint8Array(uint8ArrayToBase64url(empty))).toEqual(empty);
    });

    it('roundtrips arbitrary bytes including 0xff/0x00 boundary values', () => {
      const bytes = new Uint8Array([0, 1, 2, 254, 255, 127, 128]);
      const encoded = uint8ArrayToBase64url(bytes);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      expect(base64urlToUint8Array(encoded)).toEqual(bytes);
    });

    it('handles values that require padding (length not multiple of 3)', () => {
      const lengths = [1, 2, 4, 5, 7, 8];
      for (const n of lengths) {
        const bytes = new Uint8Array(n).map((_, i) => (i * 37) & 0xff);
        expect(base64urlToUint8Array(uint8ArrayToBase64url(bytes))).toEqual(bytes);
      }
    });
  });

  describe('base64urlToUint8Array', () => {
    it('decodes a base64url string with no padding', () => {
      // "Man" -> base64 "TWFu" -> base64url "TWFu"
      const decoded = base64urlToUint8Array('TWFu');
      expect(Array.from(decoded)).toEqual([0x4d, 0x61, 0x6e]);
    });

    it('decodes a string using url-safe characters (- and _)', () => {
      // Bytes 0xfb, 0xff produce base64 "+/8=" -> base64url "-_8"
      const decoded = base64urlToUint8Array('-_8');
      expect(Array.from(decoded)).toEqual([0xfb, 0xff]);
    });
  });
});
