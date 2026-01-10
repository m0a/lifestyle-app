/**
 * CancelEmailChange Page
 *
 * Handles email change cancellation with token from URL
 * Automatically cancels on mount if token is present
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/client';

export function CancelEmailChange() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'cancelling' | 'success' | 'error'>('cancelling');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('キャンセルトークンが見つかりません');
      return;
    }

    if (token.length !== 32) {
      setStatus('error');
      setError('無効なトークンです');
      return;
    }

    // Cancel email change with token
    const cancelEmail = async () => {
      try {
        const response = await api.email.change.cancel.$post({
          json: { token },
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'メールアドレス変更のキャンセルに失敗しました');
        }

        setStatus('success');

        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      }
    };

    cancelEmail();
  }, [token, navigate]);

  // No token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              無効なリンク
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              メールアドレス変更のキャンセルリンクが無効です。
            </p>
          </div>
          <div className="text-center">
            <Link
              to="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {status === 'cancelling' && (
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              キャンセル中...
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              メールアドレス変更をキャンセルしています。しばらくお待ちください。
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
                    メールアドレス変更をキャンセルしました
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>メールアドレスの変更リクエストが無効になりました。</p>
                    <p className="mt-1">現在のメールアドレスは変更されていません。</p>
                    <p className="mt-1">3秒後にホーム画面に移動します...</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                今すぐホームへ移動
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
                    キャンセルに失敗しました
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
                  to="/"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  ホームに戻る
                </Link>
              </div>
              <p className="text-center text-sm text-gray-600">
                既にキャンセルされているか、確認が完了している可能性があります。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
