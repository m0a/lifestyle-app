/**
 * Base email service with Resend integration
 *
 * Features:
 * - Send emails via Resend API
 * - Exponential backoff retry (up to 3 retries)
 * - Delivery logging to D1
 * - Error handling and reporting
 */

import type { D1Database } from '@cloudflare/workers-types';
import { Resend } from 'resend';
import { retryWithBackoff } from './retry';

export interface EmailOptions {
  /**
   * Recipient email address
   */
  to: string;

  /**
   * Email subject
   */
  subject: string;

  /**
   * HTML email body
   */
  html: string;

  /**
   * Email type for logging
   */
  emailType: 'password_reset' | 'email_verification' | 'email_change';

  /**
   * User ID for logging (optional - may not exist for some flows)
   */
  userId?: string;
}

export interface SendEmailResult {
  /**
   * Whether the email was sent successfully
   */
  success: boolean;

  /**
   * Resend message ID (if successful)
   */
  messageId?: string;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Number of retry attempts
   */
  retryCount: number;
}

/**
 * Send an email with retry and logging
 *
 * @param db - D1 database instance
 * @param resendApiKey - Resend API key
 * @param fromEmail - Sender email address
 * @param options - Email options
 * @returns Send result with metadata
 */
export async function sendEmail(
  db: D1Database,
  resendApiKey: string,
  fromEmail: string,
  options: EmailOptions
): Promise<SendEmailResult> {
  const resend = new Resend(resendApiKey);

  // Send email with retry
  console.log('[DEBUG email.service] Sending email:', {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    emailType: options.emailType,
  });

  const result = await retryWithBackoff(
    async () => {
      const response = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log('[DEBUG email.service] Resend API response:', response);

      // Check if Resend returned an error
      if ('error' in response && response.error) {
        throw new Error(`Resend API error: ${JSON.stringify(response.error)}`);
      }

      return response;
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      onRetry: (attempt, error) => {
        console.warn(
          `Email send retry ${attempt}/3 for ${options.emailType} to ${options.to}:`,
          error.message
        );
      },
    }
  );

  // Log delivery result
  await logEmailDelivery(db, {
    userId: options.userId,
    emailType: options.emailType,
    recipientEmail: options.to,
    status: result.success ? 'success' : 'failed',
    errorMessage: result.error?.message,
    retryCount: result.retryCount,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Unknown error',
      retryCount: result.retryCount,
    };
  }

  return {
    success: true,
    messageId: result.result?.data?.id,
    retryCount: result.retryCount,
  };
}

interface EmailDeliveryLog {
  userId?: string;
  emailType: 'password_reset' | 'email_verification' | 'email_change';
  recipientEmail: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  retryCount: number;
}

/**
 * Log email delivery to database
 *
 * @param db - D1 database instance
 * @param log - Delivery log data
 */
async function logEmailDelivery(
  db: D1Database,
  log: EmailDeliveryLog
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO email_delivery_logs
         (user_id, email_type, recipient_email, status, error_message, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.userId ?? null,
        log.emailType,
        log.recipientEmail,
        log.status,
        log.errorMessage ?? null,
        log.retryCount,
        Date.now()
      )
      .run();
  } catch (error) {
    // Log error but don't throw - email delivery should not fail due to logging issues
    console.error('Failed to log email delivery:', error);
  }
}
