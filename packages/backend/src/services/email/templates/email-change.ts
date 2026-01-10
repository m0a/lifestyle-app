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
<html>
<head>
  <meta charset="UTF-8">
  <title>メールアドレス変更の確認</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2563eb; margin-top: 0;">メールアドレス変更の確認</h2>
    <p>あなたのアカウントで新しいメールアドレス（${data.newEmail}）への変更がリクエストされました。</p>
    <p>この変更を完了するには、下のボタンをクリックしてください:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.confirmationUrl}"
         style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        メールアドレス変更を確認
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      このリンクは${data.expirationHours}時間有効です。<br>
      ボタンがクリックできない場合は、以下のURLをブラウザにコピー&ペーストしてください:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: #666;">
      ${data.confirmationUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 14px; color: #666;">
      <strong>このリクエストに心当たりがない場合:</strong><br>
      このメールを無視してください。誰かがあなたのメールアドレスを誤って入力した可能性があります。
    </p>
  </div>

  <p style="font-size: 12px; color: #999; text-align: center;">
    このメールは自動送信されています。返信しないでください。
  </p>
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
<html>
<head>
  <meta charset="UTF-8">
  <title>メールアドレス変更のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #856404; margin-top: 0;">⚠️ メールアドレス変更のお知らせ</h2>
    <p>あなたのアカウント（${data.oldEmail}）で、新しいメールアドレス（${data.newEmail}）への変更がリクエストされました。</p>

    <p style="font-weight: bold; color: #856404;">
      この変更に心当たりがない場合は、すぐに下のボタンをクリックして変更をキャンセルしてください:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.cancelUrl}"
         style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        メールアドレス変更をキャンセル
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      このリンクは${data.expirationHours}時間有効です。<br>
      ボタンがクリックできない場合は、以下のURLをブラウザにコピー&ペーストしてください:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: #666;">
      ${data.cancelUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 14px; color: #666;">
      <strong>この変更をご自身で行った場合:</strong><br>
      このメールを無視してください。新しいメールアドレスで確認を完了すると、変更が適用されます。
    </p>

    <p style="font-size: 14px; color: #dc2626; font-weight: bold;">
      不正なアクセスの可能性がある場合は、すぐにパスワードを変更してください。
    </p>
  </div>

  <p style="font-size: 12px; color: #999; text-align: center;">
    このメールは自動送信されています。返信しないでください。
  </p>
</body>
</html>
  `.trim();
}
