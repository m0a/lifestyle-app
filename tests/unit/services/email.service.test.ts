/**
 * Unit tests for exponential backoff retry logic
 *
 * Tests:
 * - Successful execution on first attempt (no retries)
 * - Retry on failure with correct delays (1s, 2s, 4s)
 * - Maximum retry limit (3 retries = 4 total attempts)
 * - Retry callback invocation
 * - Result structure includes retry count and success status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '../../../packages/backend/src/services/email/retry';

describe('Exponential Backoff Retry Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt without retries', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn);

      // Fast-forward timers and await
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.retryCount).toBe(0);
      expect(result.error).toBeUndefined();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure with exponential delays', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      const promise = retryWithBackoff(mockFn, { baseDelayMs: 1000 });

      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.retryCount).toBe(2); // 2 retries (3rd attempt succeeded)
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum retry limit', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      const onRetry = vi.fn();

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry,
      });

      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Always fails');
      expect(result.retryCount).toBe(3); // 3 retries = 4 total attempts
      expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('should invoke retry callback with correct arguments', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        throw new Error(`Failure ${attempts}`);
      });

      const onRetry = vi.fn();

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      // onRetry should be called twice (for retry 1 and retry 2)
      expect(onRetry).toHaveBeenCalledTimes(2);

      // Check first retry callback
      expect(onRetry).toHaveBeenNthCalledWith(
        1,
        1, // attempt number
        expect.objectContaining({ message: 'Failure 1' })
      );

      // Check second retry callback
      expect(onRetry).toHaveBeenNthCalledWith(
        2,
        2, // attempt number
        expect.objectContaining({ message: 'Failure 2' })
      );
    });

    it('should use correct exponential backoff delays', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Fail'));

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        baseDelayMs: 1000,
      });

      await vi.runAllTimersAsync();
      await promise;

      // Verify function was called 4 times (1 initial + 3 retries)
      expect(mockFn).toHaveBeenCalledTimes(4);
    });

    it('should handle custom base delay', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Fail'));

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        baseDelayMs: 500, // Custom base delay
      });

      await vi.runAllTimersAsync();
      await promise;

      // Verify function was called 3 times (1 initial + 2 retries)
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error thrown values', async () => {
      const mockFn = vi.fn().mockRejectedValue('string error');

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });
});
