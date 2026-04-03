import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/client';
import { getTodayDateString } from './lib/dateValidation';

const COLUMNS = 25; // Must match ActivityDotGrid

function useDotsCount(): number {
  const [count, setCount] = useState(400);

  useEffect(() => {
    const calculateDots = () => {
      // Get safe area inset for bottom navigation
      const safeAreaBottom = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0',
        10
      ) || 0;
      // Available height: viewport - header(56px) - todaySummary(~120px) - main-py-6(24px) - main-pb-20(80px) - nav(64px) - safeArea
      const availableHeight = window.innerHeight - 344 - safeAreaBottom;
      const cellSize = window.innerWidth / COLUMNS;
      const rows = Math.floor(availableHeight / cellSize);
      const dots = rows * COLUMNS;
      // Clamp between 100 and 800
      setCount(Math.max(100, Math.min(800, dots)));
    };

    calculateDots();
    window.addEventListener('resize', calculateDots);
    return () => window.removeEventListener('resize', calculateDots);
  }, []);

  return count;
}

// Lazy load meal pages
const MealDetail = lazy(() => import('./pages/MealDetail'));
const MealHistory = lazy(() => import('./pages/MealHistory'));

// Lazy load training image page
const TrainingImagePage = lazy(() => import('./pages/exercise/TrainingImagePage'));

// Home component - shows activity dots for logged-in users
function Home() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Health Tracker</h1>
          <p className="mt-2 text-sm text-gray-500">体重・食事・運動を記録して健康管理をしましょう</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/login" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              ログイン
            </a>
            <a href="/register" className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              新規登録
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AuthenticatedHome />;
}

// Separate component to avoid hook calls when not authenticated
function AuthenticatedHome() {
  const dotsCount = useDotsCount();
  const { data: activityData, isLoading: dotsLoading } = useActivityDots(dotsCount);
  const today = getTodayDateString();

  // Latest weight (no date filter - gets most recent)
  const { data: weightData, isLoading: weightLoading } = useQuery({
    queryKey: ['weights', 'latest-for-home'],
    queryFn: async () => {
      const res = await api.weights.$get({ query: {} });
      if (!res.ok) return null;
      return res.json();
    },
    select: (data) => data?.weights?.[0] ?? null,
  });

  // Today's meals
  const { data: mealsData, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', 'today-for-home', today],
    queryFn: async () => {
      const res = await api.meals.$get({ query: { startDate: today, endDate: today } });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Today's exercises
  const { data: exercisesData, isLoading: exercisesLoading } = useQuery({
    queryKey: ['exercises', 'today-for-home', today],
    queryFn: async () => {
      const res = await api.exercises.$get({ query: { startDate: today, endDate: today } });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const latestWeight = weightData?.weight ?? null;
  const todayMeals = mealsData?.meals ?? [];
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const todayMealCount = todayMeals.length;
  const todayExerciseSets = exercisesData?.exercises?.length ?? 0;
  const summaryLoading = weightLoading || mealsLoading || exercisesLoading;

  return (
    <div className="space-y-4">
      {/* Today's Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/weight" className="card p-3 hover:shadow-card-hover transition-shadow">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">体重</p>
          {summaryLoading ? (
            <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-100" />
          ) : latestWeight !== null ? (
            <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">{latestWeight.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span></p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-300">未記録</p>
          )}
        </Link>
        <Link to="/meals" className="card p-3 hover:shadow-card-hover transition-shadow">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">今日のカロリー</p>
          {summaryLoading ? (
            <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-100" />
          ) : todayMealCount > 0 ? (
            <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">{(todayCalories ?? 0).toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-0.5">kcal</span></p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-300">未記録</p>
          )}
        </Link>
        <Link to="/exercises" className="card p-3 hover:shadow-card-hover transition-shadow">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">今日の筋トレ</p>
          {summaryLoading ? (
            <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-100" />
          ) : todayExerciseSets > 0 ? (
            <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">{todayExerciseSets}<span className="text-xs font-normal text-gray-400 ml-0.5">set</span></p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-300">未記録</p>
          )}
        </Link>
      </div>

      {/* Activity Dots */}
      <ActivityDotGrid
        activities={activityData?.activities ?? []}
        isLoading={dotsLoading}
      />
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
