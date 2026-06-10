import { describe, it, expect } from 'vitest';
import { errorLogSchema, ERROR_LOG_LIMITS } from '../../packages/shared/src/schemas/log';

const validLog = {
  message: 'Something broke',
  stack: 'Error: Something broke\n  at foo (app.js:1:1)',
  url: 'https://example.com/meals',
  userAgent: 'Mozilla/5.0',
  timestamp: '2026-06-11T10:00:00.000Z',
  requestId: '12345678-1234-4234-8234-123456789abc',
  extra: { component: 'PhotoUploadButton' },
};

describe('errorLogSchema (abuse protection limits)', () => {
  it('accepts a valid error log', () => {
    expect(errorLogSchema.safeParse(validLog).success).toBe(true);
  });

  it('accepts a minimal anonymous error log (no requestId, no extra)', () => {
    const result = errorLogSchema.safeParse({
      message: 'Pre-login error',
      url: 'https://example.com/login',
      timestamp: '2026-06-11T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('strips a client-sent userId instead of trusting it', () => {
    const result = errorLogSchema.safeParse({ ...validLog, userId: 'someone-else' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('userId' in result.data).toBe(false);
    }
  });

  it(`rejects message longer than ${ERROR_LOG_LIMITS.message} chars`, () => {
    const result = errorLogSchema.safeParse({
      ...validLog,
      message: 'a'.repeat(ERROR_LOG_LIMITS.message + 1),
    });
    expect(result.success).toBe(false);
  });

  it(`rejects stack longer than ${ERROR_LOG_LIMITS.stack} chars`, () => {
    const result = errorLogSchema.safeParse({
      ...validLog,
      stack: 'a'.repeat(ERROR_LOG_LIMITS.stack + 1),
    });
    expect(result.success).toBe(false);
  });

  it(`rejects extra serializing to more than ${ERROR_LOG_LIMITS.extraSerialized} chars`, () => {
    const result = errorLogSchema.safeParse({
      ...validLog,
      extra: { payload: 'a'.repeat(ERROR_LOG_LIMITS.extraSerialized + 1) },
    });
    expect(result.success).toBe(false);
  });

  it('accepts boundary-length fields', () => {
    const result = errorLogSchema.safeParse({
      ...validLog,
      message: 'a'.repeat(ERROR_LOG_LIMITS.message),
      stack: 'a'.repeat(ERROR_LOG_LIMITS.stack),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID requestId', () => {
    const result = errorLogSchema.safeParse({ ...validLog, requestId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
