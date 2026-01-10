/**
 * VerifyEmail Page
 *
 * Handles email verification with token from URL
 * Automatically verifies on mount if token is present
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/client';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('確認トークンが見つかりません');
      return;
    }

    if (token.length !== 32) {
      setStatus('error');
      setError('無効なトークンです');
      return;
    }

    // Verify email with token
    const verifyEmail = async () => {
      try {
        const response = await api.email.verify.$post({
          json: { token },
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'メールアドレスの確認に失敗しました');
        }

        setStatus('success');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'メールアドレスを確認しました。ログインしてください。' },
          });
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  // No token or invalid token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              無効なリンク
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              メール確認リンクが無効です。
            </p>
          </div>
          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {status === 'verifying' && (
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              確認中...
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              メールアドレスを確認しています。しばらくお待ちください。
            </p>
            <div className="mt-8 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    メールアドレスを確認しました
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>アカウントが有効化されました。</p>
                    <p className="mt-1">3秒後にログイン画面に移動します...</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                今すぐログイン画面へ移動
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    確認に失敗しました
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  ログイン画面に戻る
                </Link>
              </div>
              <p className="text-center text-sm text-gray-600">
                トークンの有効期限が切れている場合は、ログイン後に確認メールを再送信してください。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
