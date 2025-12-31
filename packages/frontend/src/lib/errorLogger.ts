import { api } from './client';
import type { FieldErrors } from 'react-hook-form';

interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

export async function logError(error: Error, extra?: Record<string, unknown>) {
  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
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
