import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
