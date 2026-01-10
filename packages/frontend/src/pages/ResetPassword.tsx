/**
 * ResetPassword Page
 *
 * Allows users to set a new password using a reset token
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordResetConfirmSchema } from '@lifestyle-app/shared';
import { api } from '../lib/client';

// Extend schema to include password confirmation
const resetPasswordFormSchema = passwordResetConfirmSchema.extend({
  confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      token: token || '',
    },
  });

  // Redirect if no token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              無効なリンク
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              パスワードリセットリンクが無効です。
            </p>
          </div>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              パスワードリセットをやり直す
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.auth['password-reset'].confirm.$post({
        json: {
          token: data.token,
          newPassword: data.newPassword,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'パスワードのリセットに失敗しました');
      }

      // Success - redirect to login
      navigate('/login', {
        state: { message: 'パスワードを変更しました。新しいパスワードでログインしてください。' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            新しいパスワードを設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            新しいパスワードを入力してください。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <input type="hidden" {...register('token')} />

          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="sr-only">
                新しいパスワード
              </label>
              <input
                {...register('newPassword')}
                type="password"
                autoComplete="new-password"
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="新しいパスワード（8文字以上）"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                パスワード確認
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="パスワード確認"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '変更中...' : 'パスワードを変更'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
