/**
 * Email change confirmation template
 *
 * Simple HTML template for email change confirmation
 * - Clear call-to-action button
 * - Expiration time (24 hours)
 * - Security notice
 * - Plain text fallback
 */

export interface EmailChangeTemplateData {
  /**
   * Email change confirmation link with token
   */
  confirmUrl: string;

  /**
   * Old email address
   */
  oldEmail: string;

  /**
   * New email address
   */
  newEmail: string;

  /**
   * Token expiration time in hours (default: 24)
   */
  expirationHours?: number;
}

/**
 * Generate email change confirmation email HTML
 *
 * @param data - Template data
 * @returns HTML email content
 */
export function generateEmailChangeEmail(
  data: EmailChangeTemplateData
): string {
  const { confirmUrl, oldEmail, newEmail, expirationHours = 24 } = data;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メールアドレス変更確認</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #f59e0b; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">メールアドレス変更確認</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 24px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                メールアドレスの変更リクエストを受け付けました。
              </p>

              <!-- Email Change Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px; background-color: #f3f4f6; border-radius: 6px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                      <strong>変更前:</strong> ${oldEmail}
                    </p>
                    <p style="margin: 0; color: #374151; font-size: 14px;">
                      <strong>変更後:</strong> ${newEmail}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                以下のボタンをクリックして、メールアドレスの変更を確定してください。
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 16px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      変更を確定
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                このリンクは<strong>${expirationHours}時間</strong>後に有効期限が切れます。
              </p>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
              </p>
              <p style="margin: 0; padding: 16px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151;">
                ${confirmUrl}
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 24px; background-color: #fef3c7; border-top: 1px solid #fcd34d;">
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">
                ⚠️ セキュリティに関する注意
              </p>
              <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.6;">
                このメールアドレス変更に心当たりがない場合は、アカウントが不正アクセスされている可能性があります。<br>
                すぐにパスワードを変更し、サポートにお問い合わせください。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                このメールに心当たりがない場合は、無視してください。<br>
                メールアドレスは変更されません。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
