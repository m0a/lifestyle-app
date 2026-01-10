/**
 * Password reset email template
 *
 * Simple HTML template for password reset emails
 * - Clear call-to-action button
 * - Expiration time (24 hours)
 * - Plain text fallback
 */

export interface PasswordResetTemplateData {
  /**
   * Password reset link with token
   */
  resetUrl: string;

  /**
   * Token expiration time in hours (default: 24)
   */
  expirationHours?: number;
}

/**
 * Generate password reset email HTML
 *
 * @param data - Template data
 * @returns HTML email content
 */
export function generatePasswordResetEmail(
  data: PasswordResetTemplateData
): string {
  const { resetUrl, expirationHours = 24 } = data;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスワードリセット</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #3b82f6; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700;">Health Tracker</h1>
              <p style="margin: 0; color: #bfdbfe; font-size: 16px;">パスワードリセット</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 24px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Health Trackerアカウントのパスワードリセットのリクエストを受け付けました。
              </p>
              <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                以下のボタンをクリックして、新しいパスワードを設定してください。
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      パスワードをリセット
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
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                このメールに心当たりがない場合は、無視してください。<br>
                パスワードは変更されません。
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © Health Tracker - 体重・食事・運動を記録して健康管理
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
