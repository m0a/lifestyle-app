/**
 * Email change notification templates
 *
 * Templates for:
 * - New email confirmation (with confirmation link)
 * - Old email notification (with cancel link)
 */

interface EmailChangeConfirmationData {
  confirmationUrl: string;
  newEmail: string;
  expirationHours: number;
}

interface EmailChangeCancellationData {
  cancelUrl: string;
  oldEmail: string;
  newEmail: string;
  expirationHours: number;
}

/**
 * Generate email change confirmation email (sent to NEW email address)
 */
export function generateEmailChangeConfirmationEmail(
  data: EmailChangeConfirmationData
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メールアドレス変更の確認</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #8b5cf6; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700;">Health Tracker</h1>
              <p style="margin: 0; color: #ede9fe; font-size: 16px;">メールアドレス変更の確認</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 24px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Health Trackerアカウントで新しいメールアドレス（<strong>${data.newEmail}</strong>）への変更がリクエストされました。
              </p>
              <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                この変更を完了するには、下のボタンをクリックしてください。
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${data.confirmationUrl}" style="display: inline-block; padding: 16px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      メールアドレス変更を確認
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                このリンクは<strong>${data.expirationHours}時間</strong>後に有効期限が切れます。
              </p>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
              </p>
              <p style="margin: 0; padding: 16px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151;">
                ${data.confirmationUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                このメールに心当たりがない場合は、無視してください。<br>
                誰かがあなたのメールアドレスを誤って入力した可能性があります。
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

/**
 * Generate email change notification email (sent to OLD email address)
 */
export function generateEmailChangeNotificationEmail(
  data: EmailChangeCancellationData
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メールアドレス変更のお知らせ</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #ef4444; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700;">Health Tracker</h1>
              <p style="margin: 0; color: #fee2e2; font-size: 16px;">⚠️ メールアドレス変更のお知らせ</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 24px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Health Trackerアカウント（<strong>${data.oldEmail}</strong>）で、新しいメールアドレス（<strong>${data.newEmail}</strong>）への変更がリクエストされました。
              </p>
              <p style="margin: 0 0 32px; color: #dc2626; font-size: 16px; line-height: 1.6; font-weight: 600;">
                この変更に心当たりがない場合は、すぐに下のボタンをクリックして変更をキャンセルしてください。
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${data.cancelUrl}" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      メールアドレス変更をキャンセル
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                このリンクは<strong>${data.expirationHours}時間</strong>後に有効期限が切れます。
              </p>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
              </p>
              <p style="margin: 0 0 32px; padding: 16px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151;">
                ${data.cancelUrl}
              </p>

              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #374151; font-size: 14px; line-height: 1.6;">
                  <strong>この変更をご自身で行った場合:</strong><br>
                  このメールを無視してください。新しいメールアドレスで確認を完了すると、変更が適用されます。
                </p>
                <p style="margin: 0; color: #dc2626; font-size: 14px; line-height: 1.6; font-weight: 600;">
                  不正なアクセスの可能性がある場合は、すぐにパスワードを変更してください。
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                このメールはセキュリティ通知です。
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
