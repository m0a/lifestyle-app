import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { ConfirmEmailChange } from './pages/ConfirmEmailChange';
import { CancelEmailChange } from './pages/CancelEmailChange';
import { Weight } from './pages/Weight';
import { Meal } from './pages/Meal';
import { Exercise } from './pages/Exercise';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useAuthStore } from './stores/authStore';
import { useActivityDots } from './hooks/useActivityDots';
import { ActivityDotGrid } from './components/dashboard/ActivityDotGrid';

// Lazy load meal pages
const MealDetail = lazy(() => import('./pages/MealDetail'));
const MealHistory = lazy(() => import('./pages/MealHistory'));

// Lazy load training image page
const TrainingImagePage = lazy(() => import('./pages/exercise/TrainingImagePage'));

// Home component - shows activity dots for logged-in users
function Home() {
  const { isAuthenticated } = useAuthStore();
  const { data: activityData, isLoading } = useActivityDots(800);

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Health Tracker</h1>
        <p className="mt-4 text-gray-600">体重・食事・運動を記録して健康管理をしましょう</p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            ログイン
          </a>
          <a
            href="/register"
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
          >
            新規登録
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">あなたの記録</h1>
      </div>
      <ActivityDotGrid
        activities={activityData?.activities ?? []}
        isLoading={isLoading}
      />
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href="/weight"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          体重を記録
        </a>
        <a
          href="/meals"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          食事を記録
        </a>
        <a
          href="/exercises"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          運動を記録
        </a>
      </div>
    </div>
  );
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/login',
    element: <Layout><Login /></Layout>,
  },
  {
    path: '/register',
    element: <Layout><Register /></Layout>,
  },
  {
    path: '/forgot-password',
    element: <Layout><ForgotPassword /></Layout>,
  },
  {
    path: '/reset-password',
    element: <Layout><ResetPassword /></Layout>,
  },
  {
    path: '/verify-email',
    element: <Layout><VerifyEmail /></Layout>,
  },
  {
    path: '/change-email/confirm',
    element: <Layout><ConfirmEmailChange /></Layout>,
  },
  {
    path: '/change-email/cancel',
    element: <Layout><CancelEmailChange /></Layout>,
  },
  {
    path: '/dashboard',
    element: (
      <Layout>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/weight',
    element: (
      <Layout>
        <ProtectedRoute>
          <Weight />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals',
    element: (
      <Layout>
        <ProtectedRoute>
          <Meal />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals/history',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <MealHistory />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals/:mealId',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <MealDetail />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/exercises',
    element: (
      <Layout>
        <ProtectedRoute>
          <Exercise />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/exercises/image',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <TrainingImagePage />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/settings',
    element: (
      <Layout>
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Layout>
    ),
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
