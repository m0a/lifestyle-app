import { api } from './client';
import type { FieldErrors } from 'react-hook-form';
import type { ErrorLog } from '@lifestyle-app/shared';
import { ERROR_LOG_LIMITS } from '@lifestyle-app/shared';

/**
 * Best-effort fallback: id of the most recently started API request.
 *
 * Concurrent requests overwrite each other here, so this is only used when
 * an error carries no request id of its own (e.g. render errors caught by
 * an ErrorBoundary). Errors thrown by the API client get the exact request
 * id attached to the Error object by client.ts (see ErrorWithRequestId).
 */
let lastRequestId: string | undefined;

/**
 * Record the id of the most recently started API request.
 * Called by client.ts before each API request.
 */
export function setLastRequestId(requestId: string | undefined) {
  lastRequestId = requestId;
}

/** Error optionally tagged with the id of the request that caused it. */
interface ErrorWithRequestId extends Error {
  requestId?: string;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Bound `extra` so it passes the backend schema's serialized-size limit.
 * If it serializes too large, send a truncated preview instead of dropping
 * the whole log on the floor.
 */
function boundExtra(
  extra: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (extra === undefined) return undefined;
  let serialized: string;
  try {
    serialized = JSON.stringify(extra);
  } catch {
    return { truncated: true, preview: '[unserializable extra]' };
  }
  if (serialized.length <= ERROR_LOG_LIMITS.extraSerialized) {
    return extra;
  }
  // Escaping can at most double the preview's length when re-serialized,
  // so keep it well under the limit.
  return { truncated: true, preview: serialized.slice(0, 800) };
}

const SENSITIVE_KEY_PATTERN = /password|token|secret|email|credential/i;
const MAX_FORM_VALUE_LENGTH = 100;

/**
 * Sanitize form data before it is sent to the error log endpoint:
 * - values under sensitive-looking keys are masked
 * - long strings are truncated
 * - non-primitive values are omitted (unknown shape could nest secrets)
 */
function sanitizeFormData(
  formData: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (formData === undefined) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] =
        value.length > MAX_FORM_VALUE_LENGTH
          ? `${value.slice(0, MAX_FORM_VALUE_LENGTH)}…[truncated]`
          : value;
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[omitted]';
    }
  }
  return sanitized;
}

async function sendErrorLog(errorLog: ErrorLog, consoleLabel: string) {
  // Also log to console for local debugging
  console.error(consoleLabel, errorLog);

  try {
    await api.logs.error.$post({ json: errorLog });
  } catch (e) {
    // Don't throw if logging fails
    console.error('[Error Logger] Failed to send error log:', e);
  }
}

export async function logError(
  error: Error,
  extra?: Record<string, unknown>,
  requestId?: string
) {
  const errorLog: ErrorLog = {
    message: truncate(error.message || 'Unknown error', ERROR_LOG_LIMITS.message),
    stack: error.stack ? truncate(error.stack, ERROR_LOG_LIMITS.stack) : undefined,
    url: truncate(window.location.href, ERROR_LOG_LIMITS.url),
    userAgent: truncate(navigator.userAgent, ERROR_LOG_LIMITS.userAgent),
    timestamp: new Date().toISOString(),
    // Prefer an explicitly passed id, then the id attached to the error by
    // the API client, and only then the racy "last request" fallback.
    requestId: requestId ?? (error as ErrorWithRequestId).requestId ?? lastRequestId,
    extra: boundExtra(extra),
  };

  await sendErrorLog(errorLog, '[Error Logger]');
}

// Log validation errors from react-hook-form
export async function logValidationError(
  formName: string,
  errors: FieldErrors,
  formData?: Record<string, unknown>
) {
  const errorDetails = Object.entries(errors).map(([field, error]) => ({
    field,
    type: error?.type,
    message: error?.message,
  }));

  const errorLog: ErrorLog = {
    message: truncate(`Validation error in ${formName}`, ERROR_LOG_LIMITS.message),
    url: truncate(window.location.href, ERROR_LOG_LIMITS.url),
    userAgent: truncate(navigator.userAgent, ERROR_LOG_LIMITS.userAgent),
    timestamp: new Date().toISOString(),
    requestId: lastRequestId,
    extra: boundExtra({
      type: 'validation',
      formName,
      errors: errorDetails,
      formData: sanitizeFormData(formData),
    }),
  };

  await sendErrorLog(errorLog, '[Validation Error]');
}

// Global error handler
export function setupGlobalErrorHandler() {
  // Catch unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    logError(error || new Error(String(message)), {
      source,
      lineno,
      colno,
    });
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    logError(error, { type: 'unhandledrejection' });
  };
}
