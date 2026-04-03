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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg shadow-header">
        <nav className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-lg font-bold text-gray-900 tracking-tight">
                Health Tracker
              </Link>
              {isAuthenticated && (
                <div className="hidden md:flex items-center gap-1">
                  {[
                    { to: '/weight', label: '体重' },
                    { to: '/meals', label: '食事' },
                    { to: '/exercises', label: '運動' },
                    { to: '/dashboard', label: 'レポート' },
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive(to)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/settings"
                    className={`rounded-lg p-2 transition-colors ${
                      isActive('/settings')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    title="設定"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:block rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    ログイン
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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

      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 md:pb-6 sm:px-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-t border-gray-200/60 md:hidden pb-safe-bottom shadow-nav">
          <div className="flex justify-around py-1">
            {[
              {
                to: '/',
                label: 'ホーム',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                ),
                match: '/',
              },
              {
                to: '/weight',
                label: '体重',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                ),
                match: '/weight',
              },
              {
                to: '/meals',
                label: '食事',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" />
                  </svg>
                ),
                match: '/meals',
              },
              {
                to: '/exercises',
                label: '運動',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                match: '/exercises',
              },
            ].map(({ to, label, icon, match }) => {
              const active = location.pathname === match || (match !== '/' && location.pathname.startsWith(match));
              const isHome = match === '/' && location.pathname === '/';
              const isActiveTab = match === '/' ? isHome : active;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                    isActiveTab
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}
                >
                  {icon}
                  <span className={`text-[10px] font-medium ${isActiveTab ? 'text-blue-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {isActiveTab && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
