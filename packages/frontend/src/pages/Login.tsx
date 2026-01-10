import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { loginSchema, type LoginInput } from '@lifestyle-app/shared';
import { api } from '../lib/client';
import { useAuthStore } from '../stores/authStore';
import { ForgotPasswordLink } from '../components/auth/ForgotPasswordLink';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || '/';
  const successMessage = (location.state as { message?: string })?.message;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setIsEmailNotVerified(false);
    try {
      const res = await api.auth.login.$post({ json: data });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'ログインに失敗しました' }));
        const errorObj = errorData as { message?: string; code?: string };

        // Check if error is EMAIL_NOT_VERIFIED
        if (errorObj.code === 'EMAIL_NOT_VERIFIED') {
          setIsEmailNotVerified(true);
        }

        throw new Error(errorObj.message || 'ログインに失敗しました');
      }
      const response = await res.json();
      setUser(response.user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ログインに失敗しました');
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">ログイン</h1>
          <p className="mt-2 text-gray-600">アカウントにログインしてください</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className={`rounded-md p-4 ${isEmailNotVerified ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-red-50'}`}>
              <div className="flex">
                {isEmailNotVerified && (
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={isEmailNotVerified ? 'ml-3' : ''}>
                  <p className={`text-sm ${isEmailNotVerified ? 'text-yellow-800' : 'text-red-700'}`}>
                    {error}
                  </p>
                  {isEmailNotVerified && (
                    <p className="mt-2 text-sm text-yellow-700">
                      確認メールが届いていない場合は、迷惑メールフォルダをご確認いただくか、
                      <Link to="/register" className="font-medium underline hover:text-yellow-900">
                        登録画面
                      </Link>
                      から再度登録してください。
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="current-password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>

          <ForgotPasswordLink />

          <p className="text-center text-sm text-gray-600">
            アカウントをお持ちでないですか？{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              登録する
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
