/**
 * Exponential backoff retry logic for email delivery
 *
 * Retry strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: 1 second delay
 * - Attempt 3: 2 seconds delay
 * - Attempt 4: 4 seconds delay
 * - Max retries: 3 (4 total attempts)
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds (default: 1000ms = 1s)
   */
  baseDelayMs?: number;

  /**
   * Callback invoked before each retry
   */
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  /**
   * The successful result, or undefined if all retries failed
   */
  result?: T;

  /**
   * The final error if all retries failed
   */
  error?: Error;

  /**
   * Number of retry attempts made (0 = success on first try)
   */
  retryCount: number;

  /**
   * Whether the operation succeeded
   */
  success: boolean;
}

/**
 * Execute an async function with exponential backoff retry
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result with retry metadata
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options;

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      return {
        result,
        retryCount: attempt,
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we've exhausted retries, return failure
      if (attempt >= maxRetries) {
        break;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Calculate exponential backoff delay: baseDelay * 2^attempt
      const delayMs = baseDelayMs * Math.pow(2, attempt);

      // Wait before next retry
      await sleep(delayMs);

      attempt++;
    }
  }

  // All retries failed
  return {
    error: lastError,
    retryCount: attempt,
    success: false,
  };
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
