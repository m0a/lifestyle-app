/**
 * Resend API client for retrieving sent emails in tests
 *
 * Used in E2E tests to:
 * 1. Retrieve emails sent to test addresses
 * 2. Extract verification links from email HTML
 * 3. Complete email verification flow automatically
 */

export interface ResendEmail {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html: string;
  created_at: string;
}

export interface ResendEmailList {
  data: Array<{
    id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
  }>;
}

/**
 * Resend API client
 */
export class ResendClient {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * List recent emails
   *
   * @param limit - Number of emails to retrieve (default: 10)
   * @returns List of emails
   */
  async listEmails(limit = 10): Promise<ResendEmailList> {
    const response = await fetch(`${this.baseUrl}/emails?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list emails: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get email by ID
   *
   * @param emailId - Email ID from Resend
   * @returns Full email with HTML content
   */
  async getEmail(emailId: string): Promise<ResendEmail> {
    const response = await fetch(`${this.baseUrl}/emails/${emailId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get email: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Find email sent to specific address
   *
   * @param toEmail - Recipient email address
   * @param subject - Email subject (optional filter)
   * @param maxAgeMinutes - Maximum age in minutes (default: 5)
   * @returns Email if found, null otherwise
   */
  async findEmail(
    toEmail: string,
    subject?: string,
    maxAgeMinutes = 5
  ): Promise<ResendEmail | null> {
    const emails = await this.listEmails(20);
    const cutoffTime = Date.now() - maxAgeMinutes * 60 * 1000;

    // Find matching email
    const match = emails.data.find((email) => {
      const emailTime = new Date(email.created_at).getTime();
      const isRecent = emailTime >= cutoffTime;
      const isToMatch = email.to.includes(toEmail);
      const isSubjectMatch = !subject || email.subject.includes(subject);

      return isRecent && isToMatch && isSubjectMatch;
    });

    if (!match) {
      return null;
    }

    // Get full email with HTML
    return this.getEmail(match.id);
  }

  /**
   * Extract verification link from email HTML
   *
   * @param html - Email HTML content
   * @returns Verification link if found, null otherwise
   */
  extractVerificationLink(html: string): string | null {
    // Match href attribute in verification link
    // Expected format: <a href="http://localhost:5173/verify-email?token=...">
    const match = html.match(/href="([^"]*verify-email\?token=[^"]*)"/);
    return match ? match[1] : null;
  }

  /**
   * Wait for email and extract verification link
   *
   * @param toEmail - Recipient email address
   * @param maxWaitSeconds - Maximum wait time in seconds (default: 30)
   * @returns Verification link if found
   * @throws Error if email not received within timeout
   */
  async waitForVerificationEmail(
    toEmail: string,
    maxWaitSeconds = 30
  ): Promise<string> {
    const startTime = Date.now();
    const timeout = maxWaitSeconds * 1000;

    while (Date.now() - startTime < timeout) {
      const email = await this.findEmail(toEmail, 'メールアドレスを確認', 10);

      if (email && email.html) {
        const link = this.extractVerificationLink(email.html);
        if (link) {
          console.log(`[ResendClient] Found verification link for ${toEmail}`);
          return link;
        }
      }

      // Wait 2 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(
      `Verification email not received for ${toEmail} within ${maxWaitSeconds} seconds`
    );
  }
}
