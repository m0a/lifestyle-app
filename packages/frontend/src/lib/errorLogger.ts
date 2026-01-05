import { api } from './client';
import type { FieldErrors } from 'react-hook-form';
import type { ErrorLog } from '@lifestyle-app/shared';
import { useAuthStore } from '../stores/authStore';

/**
 * Module-scoped requestId for correlating errors with their originating request
 * Set by client.ts when making API calls, consumed by error logger
 */
let currentRequestId: string | undefined;

/**
 * Set the current request ID for error correlation
 * Called by client.ts before each API request
 */
export function setCurrentRequestId(requestId: string | undefined) {
  currentRequestId = requestId;
}

/**
 * Get the current user ID from auth store
 */
function getCurrentUserId(): string | undefined {
  const state = useAuthStore.getState();
  return state.user?.id;
}

export async function logError(error: Error, extra?: Record<string, unknown>) {
  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    requestId: currentRequestId,
    userId: getCurrentUserId(),
    extra,
  };

  // Also log to console for local debugging
  console.error('[Error Logger]', errorLog);

  try {
    await api.logs.error.$post({ json: errorLog });
  } catch (e) {
    // Don't throw if logging fails
    console.error('[Error Logger] Failed to send error log:', e);
  }
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
    message: `Validation error in ${formName}`,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    requestId: currentRequestId,
    userId: getCurrentUserId(),
    extra: {
      type: 'validation',
      formName,
      errors: errorDetails,
      formData,
    },
  };

  console.error('[Validation Error]', errorLog);

  try {
    await api.logs.error.$post({ json: errorLog });
  } catch (e) {
    console.error('[Error Logger] Failed to send validation error log:', e);
  }
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
