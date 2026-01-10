/**
 * ResendEmailButton Component
 *
 * Button to resend verification email
 * - Requires authentication
 * - Shows loading state during resend
 * - Displays success/error messages
 */

import { useState } from 'react';
import { api } from '../../lib/client';

interface ResendEmailButtonProps {
  /**
   * Optional className for styling
   */
  className?: string;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary';
}

export function ResendEmailButton({ className, variant = 'secondary' }: ResendEmailButtonProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      const response = await api.email.verify.resend.$post({});

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || '確認メールの再送信に失敗しました');
      }

      setMessage({
        type: 'success',
        text: '確認メールを再送信しました。メールをご確認ください。',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      });
    } finally {
      setIsResending(false);
    }
  };

  const baseClasses = 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 focus:ring-blue-500';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleResend}
        disabled={isResending}
        className={`${baseClasses} ${variantClasses}`}
      >
        {isResending ? '送信中...' : '確認メールを再送信'}
      </button>

      {message && (
        <div
          className={`mt-2 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
