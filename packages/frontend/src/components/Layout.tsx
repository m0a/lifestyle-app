import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/client';
import { EmailVerificationBanner } from './auth/EmailVerificationBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.auth.logout.$post();
    } catch {
      // Continue with logout even if API fails
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-gray-900">
                Health Tracker
              </Link>
              {isAuthenticated && (
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/weight" className="text-gray-600 hover:text-gray-900">
                    体重
                  </Link>
                  <Link to="/meals" className="text-gray-600 hover:text-gray-900">
                    食事
                  </Link>
                  <Link to="/exercises" className="text-gray-600 hover:text-gray-900">
                    運動
                  </Link>
                  <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                    ダッシュボード
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="hidden sm:block text-sm text-gray-600">{user?.email}</span>
                  <Link
                    to="/settings"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    設定
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    ログイン
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    登録
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>
      {isAuthenticated && user?.emailVerified === false && (
        <EmailVerificationBanner />
      )}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8 sm:px-6 lg:px-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex justify-around py-2">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center px-3 py-2 text-xs ${
                location.pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              ホーム
            </Link>
            <Link
              to="/weight"
              className={`flex flex-col items-center px-3 py-2 text-xs ${
                location.pathname === '/weight' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              体重
            </Link>
            <Link
              to="/meals"
              className={`flex flex-col items-center px-3 py-2 text-xs ${
                location.pathname === '/meals' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              食事
            </Link>
            <Link
              to="/exercises"
              className={`flex flex-col items-center px-3 py-2 text-xs ${
                location.pathname === '/exercises' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              運動
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
